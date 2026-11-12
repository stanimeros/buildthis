import { deleteUser, EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup } from 'firebase/auth'
import {
  collection, collectionGroup, deleteDoc, doc, getDocs, increment, limit, orderBy, type Query, query,
  type QueryDocumentSnapshot, serverTimestamp, startAfter, updateDoc, where, type WriteBatch, writeBatch,
} from 'firebase/firestore'

import { auth, db, track } from '@/lib/firebase'
import { bumpDaily } from '@/lib/quota'
import type { IssueInput, Profile, Role } from '@/lib/types'

/** Only Google-hosted avatars are allowed by the rules. */
export function googlePhoto(url: string | null | undefined) {
  return url && /^https:\/\/lh3\.googleusercontent\.com\/\S{1,480}$/.test(url) ? url : ''
}

/** Mirrors reservedName() in the rules. */
export function isReservedName(name: string) {
  return ['buildthis', 'build this'].includes(name.trim().toLowerCase())
}

function me() {
  const user = auth.currentUser
  if (!user) throw new Error('not-signed-in')
  return user
}

export interface ProfileInput {
  name: string
  /** Google avatar, or '' to show initials instead */
  photo: string
  role: Role
  country: string
  stack: string[]
  link: string
  lang: 'en' | 'el'
  /** show on the landing page (builders only) */
  public: boolean
}

const DELETED = 'Deleted user'

type Counted = Pick<Profile, 'name' | 'role'> | null

/** Moves `stats/global` by this user's change (signup, role change, deletion); mirrors statsInStep(). */
function bumpStats(batch: WriteBatch, before: Counted, after: Counted) {
  const counted = (p: Counted) => (p && p.name !== DELETED ? 1 : 0)
  const building = (p: Counted) => (counted(p) && p!.role !== 'user' ? 1 : 0)
  const users = counted(after) - counted(before)
  const builders = building(after) - building(before)
  if (!users && !builders) return
  batch.set(doc(db, 'stats', 'global'), { users: increment(users), builders: increment(builders) }, { merge: true })
}

/** Keeps `community/{uid}` in step with the profile, in the same batch (the rules check both). */
function syncCommunity(batch: WriteBatch, uid: string, input: ProfileInput) {
  const ref = doc(db, 'community', uid)
  if (input.public) batch.set(ref, { name: input.name, photo: input.photo, updatedAt: serverTimestamp() })
  else batch.delete(ref)
}

export async function createProfile(fields: Omit<ProfileInput, 'photo'>, source: string) {
  const user = me()
  const input = { ...fields, photo: googlePhoto(user.photoURL) }
  const batch = writeBatch(db)
  batch.set(doc(db, 'users', user.uid), {
    ...input,
    source,
    onboardedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  })
  if (input.public) syncCommunity(batch, user.uid, input)
  bumpStats(batch, null, input)
  await batch.commit()
  track('onboarding_complete', { role: input.role })
}

/** A new name or photo is also copied onto the user's problems and solutions. */
export async function updateProfile(profile: Profile, input: ProfileInput) {
  const uid = me().uid
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', uid), { ...input })
  syncCommunity(batch, uid, input)
  bumpStats(batch, profile, input)
  await batch.commit()
  if (input.name !== profile.name || input.photo !== profile.photo) {
    // Blocked users can't edit their posts; the profile itself is still saved.
    await relabelContent(uid, { authorName: input.name, authorPhoto: input.photo }).catch((err) => console.error(err))
  }
}

export async function postIssue(
  profile: Profile,
  input: IssueInput,
) {
  const user = me()
  const ref = doc(collection(db, 'issues'))
  const batch = writeBatch(db)
  batch.set(ref, {
    ...input,
    authorId: user.uid,
    authorName: profile.name,
    authorPhoto: profile.photo,
    votes: 0,
    builders: 0,
    solutions: 0,
    hidden: false,
    createdAt: serverTimestamp(),
  })
  batch.update(doc(db, 'users', user.uid), {
    lastIssueAt: serverTimestamp(),
    lastIssueId: ref.id,
    ...bumpDaily(profile, 'issues'),
  })
  await batch.commit()
  track('post_issue', { category: input.category })
  return ref.id
}

/** Edits also refresh the author label, which the rules require to match the current profile. */
export async function updateIssue(profile: Profile, id: string, input: IssueInput) {
  await updateDoc(doc(db, 'issues', id), { ...input, authorName: profile.name, authorPhoto: profile.photo })
}

export async function toggleIssueVote(issueId: string, voted: boolean) {
  const uid = me().uid
  const batch = writeBatch(db)
  const ref = doc(db, 'issues', issueId, 'votes', uid)
  if (voted) batch.delete(ref)
  else batch.set(ref, { uid, issueId, createdAt: serverTimestamp() })
  batch.update(doc(db, 'issues', issueId), { votes: increment(voted ? -1 : 1) })
  await batch.commit()
  if (!voted) track('vote', { target: 'issue' })
}

/** Claiming makes a plain "user" a builder too (role 'both'); rules require a builder role. */
export async function toggleBuilder(profile: Profile, issueId: string, building: boolean) {
  const uid = me().uid
  const batch = writeBatch(db)
  if (!building && profile.role === 'user') {
    batch.update(doc(db, 'users', uid), { role: 'both' })
    bumpStats(batch, profile, { ...profile, role: 'both' })
  }
  const ref = doc(db, 'issues', issueId, 'builders', uid)
  if (building) batch.delete(ref)
  else batch.set(ref, { uid, issueId, createdAt: serverTimestamp() })
  batch.update(doc(db, 'issues', issueId), { builders: increment(building ? -1 : 1) })
  await batch.commit()
  if (!building) track('claim')
}

export function solutionId(issueId: string, uid: string) {
  return `${issueId}_${uid}`
}

export async function submitSolution(
  profile: Profile,
  issueId: string,
  input: { title: string; url: string; body: string },
) {
  const uid = me().uid
  const id = solutionId(issueId, uid)
  const batch = writeBatch(db)
  batch.set(doc(db, 'solutions', id), {
    ...input,
    issueId,
    authorId: uid,
    authorName: profile.name,
    authorPhoto: profile.photo,
    votes: 0,
    hidden: false,
    createdAt: serverTimestamp(),
  })
  batch.update(doc(db, 'issues', issueId), { solutions: increment(1) })
  batch.update(doc(db, 'users', uid), {
    lastSolutionAt: serverTimestamp(),
    lastSolutionId: id,
    ...bumpDaily(profile, 'solutions'),
  })
  await batch.commit()
  track('submit_solution')
}

export async function updateSolution(profile: Profile, id: string, input: { title: string; url: string; body: string }) {
  await updateDoc(doc(db, 'solutions', id), { ...input, authorName: profile.name, authorPhoto: profile.photo })
}

export async function removeSolution(id: string, issueId: string) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'solutions', id))
  batch.update(doc(db, 'issues', issueId), { solutions: increment(-1) })
  await batch.commit()
}

export async function toggleSolutionVote(id: string, voted: boolean) {
  const uid = me().uid
  const batch = writeBatch(db)
  const ref = doc(db, 'solutions', id, 'votes', uid)
  if (voted) batch.delete(ref)
  else batch.set(ref, { uid, solutionId: id, createdAt: serverTimestamp() })
  batch.update(doc(db, 'solutions', id), { votes: increment(voted ? -1 : 1) })
  await batch.commit()
  if (!voted) track('vote', { target: 'solution' })
}

export async function adminDeleteIssue(id: string) {
  await deleteDoc(doc(db, 'issues', id))
}

export type Reportable = 'issues' | 'solutions'

/**
 * Report as inappropriate: one report per user. The count is private (admins only); when it reaches
 * the limit in firestore.rules the same batch must hide the doc and give its author a strike. We can't read the count, so try
 * without hiding first and, if the rules say this report reaches the limit, again with hiding.
 */
export async function report(coll: Reportable, id: string, authorId: string) {
  const uid = me().uid
  const attempt = (hide: boolean) => {
    const batch = writeBatch(db)
    batch.set(doc(db, coll, id, 'reports', uid), { uid, createdAt: serverTimestamp() })
    batch.set(doc(db, coll, id, 'meta', 'moderation'), { reports: increment(1) }, { merge: true })
    if (hide) {
      batch.update(doc(db, coll, id), { hidden: true })
      // A hidden post is a strike for its author; at the limit they're blocked from every action.
      batch.set(doc(db, 'strikes', authorId), { count: increment(1), lastColl: coll, lastId: id }, { merge: true })
    }
    return batch.commit()
  }
  try {
    await attempt(false)
  } catch (err) {
    if ((err as { code?: string }).code !== 'permission-denied') throw err
    await attempt(true)
  }
  track('report', { target: coll })
}

// Lists are capped at 50 per request by the rules, so page through.
async function eachPage(q: (cursor?: QueryDocumentSnapshot) => Query, fn: (docs: QueryDocumentSnapshot[]) => Promise<void>) {
  let cursor: QueryDocumentSnapshot | undefined
  for (;;) {
    const page = await getDocs(q(cursor))
    if (page.empty) return
    await fn(page.docs)
    cursor = page.docs.at(-1)
  }
}

/** Rewrites the author label on everything this user posted. */
async function relabelContent(uid: string, label: { authorName: string; authorPhoto: string }) {
  for (const path of ['issues', 'solutions']) {
    await eachPage(
      (cursor) =>
        query(
          collection(db, path),
          where('authorId', '==', uid),
          orderBy('createdAt', 'desc'),
          ...(cursor ? [startAfter(cursor)] : []),
          limit(50),
        ),
      async (docs) => {
        const batch = writeBatch(db)
        docs.forEach((d) => batch.update(d.ref, label))
        await batch.commit()
      },
    )
  }
}

/**
 * GDPR delete. Order matters for the rules:
 * 1. fresh sign-in (Firebase requires it to delete an account): Google popup, or the password again,
 * 2. blank the profile (it is never deleted: that would reset the posting limits) and leave the community,
 * 3. relabel authored content to match the blanked profile,
 * 4. drop "I'm building this" claims (keeps counters right),
 * 5. delete the Auth account.
 * Votes stay as anonymous counts; their docs only hold the (now orphaned) uid.
 */
export async function deleteAccount(profile: Profile, password?: string) {
  const user = me()
  if (password !== undefined) await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? '', password))
  else await reauthenticateWithPopup(user, new GoogleAuthProvider())
  const blank = writeBatch(db)
  bumpStats(blank, profile, { ...profile, name: DELETED })
  blank.update(doc(db, 'users', user.uid), {
    name: DELETED,
    photo: '',
    country: '',
    stack: [],
    link: '',
    source: '',
    public: false,
  })
  blank.delete(doc(db, 'community', user.uid))
  await blank.commit()

  await relabelContent(user.uid, { authorName: DELETED, authorPhoto: '' })
  const claims = await getDocs(query(collectionGroup(db, 'builders'), where('uid', '==', user.uid)))
  for (const claim of claims.docs) {
    const batch = writeBatch(db)
    batch.delete(claim.ref)
    batch.update(doc(db, 'issues', claim.get('issueId')), { builders: increment(-1) })
    await batch.commit().catch(() => {}) // issue may be gone
  }
  await deleteUser(user)
}
