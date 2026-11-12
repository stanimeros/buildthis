import { deleteUser } from 'firebase/auth'
import {
  collection, deleteDoc, doc, getDocs, increment, limit, orderBy, query, type QueryDocumentSnapshot,
  serverTimestamp, setDoc, startAfter, updateDoc, where, writeBatch,
} from 'firebase/firestore'

import { auth, db, track } from '@/lib/firebase'
import { bumpDaily } from '@/lib/quota'
import type { IssueInput, Profile, Role } from '@/lib/types'

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
    photo: user.photoURL ?? '',
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
  batch.update(doc(db, 'users', user.uid), { lastIssueAt: serverTimestamp(), ...bumpDaily(profile, 'issues') })
  await batch.commit()
  track('post_issue', { category: input.category })
  return ref.id
}

export async function updateIssue(
  id: string,
  input: IssueInput,
) {
  await updateDoc(doc(db, 'issues', id), input)
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
  const batch = writeBatch(db)
  batch.set(doc(db, 'solutions', solutionId(issueId, uid)), {
    ...input,
    issueId,
    authorId: uid,
    authorName: profile.name,
    authorPhoto: profile.photo,
    votes: 0,
    createdAt: serverTimestamp(),
  })
  batch.update(doc(db, 'issues', issueId), { solutions: increment(1) })
  batch.update(doc(db, 'users', uid), { lastSolutionAt: serverTimestamp(), ...bumpDaily(profile, 'solutions') })
  await batch.commit()
  track('submit_solution')
}

export async function updateSolution(id: string, input: { title: string; url: string; body: string }) {
  await updateDoc(doc(db, 'solutions', id), input)
}

export async function removeSolution(id: string, issueId: string, asAdmin = false) {
  if (asAdmin) return deleteDoc(doc(db, 'solutions', id))
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

/** GDPR: anonymise authored content, delete the profile, then the auth account. */
export async function deleteAccount() {
  const user = me()
  const anon = { authorName: 'Deleted user', authorPhoto: '' }
  // Lists are capped at 50 per request by the rules, so page through.
  for (const path of ['issues', 'solutions']) {
    let cursor: QueryDocumentSnapshot | undefined
    for (;;) {
      const page = await getDocs(
        query(
          collection(db, path),
          where('authorId', '==', user.uid),
          orderBy('createdAt'),
          ...(cursor ? [startAfter(cursor)] : []),
          limit(50),
        ),
      )
      if (page.empty) break
      const batch = writeBatch(db)
      page.forEach((d) => batch.update(d.ref, anon))
      await batch.commit()
      cursor = page.docs.at(-1)
    }
  }
  await deleteDoc(doc(db, 'users', user.uid))
  await deleteUser(user)
}
