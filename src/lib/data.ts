import { deleteUser, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth'
import {
  collection, collectionGroup, deleteDoc, doc, getDocs, increment, limit, orderBy, type Query, query,
  type QueryDocumentSnapshot, serverTimestamp, setDoc, startAfter, updateDoc, where, writeBatch,
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
  role: Role
  country: string
  stack: string[]
  link: string
  lang: 'en' | 'el'
}

export async function createProfile(input: ProfileInput, source: string) {
  const user = me()
  await setDoc(doc(db, 'users', user.uid), {
    ...input,
    photo: googlePhoto(user.photoURL),
    source,
    onboardedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  })
  track('onboarding_complete', { role: input.role })
}

export async function updateProfile(input: ProfileInput) {
  await updateDoc(doc(db, 'users', me().uid), { ...input })
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
  if (!building && profile.role === 'user') batch.update(doc(db, 'users', uid), { role: 'both' })
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

const DELETED = 'Deleted user'

/**
 * GDPR delete. Order matters for the rules:
 * 1. fresh Google sign-in (Firebase requires it to delete an account),
 * 2. blank the profile (it is never deleted: that would reset the posting limits),
 * 3. relabel authored content to match the blanked profile,
 * 4. drop "I'm building this" claims (keeps counters right),
 * 5. delete the Auth account.
 * Votes stay as anonymous counts; their docs only hold the (now orphaned) uid.
 */
export async function deleteAccount() {
  const user = me()
  await reauthenticateWithPopup(user, new GoogleAuthProvider())
  await updateDoc(doc(db, 'users', user.uid), {
    name: DELETED,
    photo: '',
    country: '',
    stack: [],
    link: '',
    source: '',
  })

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
  for (const path of ['issues', 'solutions']) {
    await eachPage(
      (cursor) =>
        query(
          collection(db, path),
          where('authorId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          ...(cursor ? [startAfter(cursor)] : []),
          limit(50),
        ),
      async (docs) => {
        const batch = writeBatch(db)
        docs.forEach((d) => batch.update(d.ref, { authorName: DELETED, authorPhoto: '' }))
        await batch.commit()
      },
    )
  }
  const claims = await getDocs(query(collectionGroup(db, 'builders'), where('uid', '==', user.uid)))
  for (const claim of claims.docs) {
    const batch = writeBatch(db)
    batch.delete(claim.ref)
    batch.update(doc(db, 'issues', claim.get('issueId')), { builders: increment(-1) })
    await batch.commit().catch(() => {}) // issue may be gone
  }
  await deleteUser(user)
}
