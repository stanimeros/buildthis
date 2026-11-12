import {
  createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, sendEmailVerification,
  sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut as fbSignOut, type User,
} from 'firebase/auth'
import { collectionGroup, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { useSyncExternalStore } from 'react'

import { auth, db, track } from '@/lib/firebase'
import type { Profile } from '@/lib/types'

interface AuthState {
  user: User | null
  /** signed up with email + password, address not verified yet: treated as signed out until then */
  unverified: User | null
  /** undefined = still loading, null = signed in but not onboarded */
  profile: Profile | null | undefined
  loading: boolean
  isAdmin: boolean
  /** too many of this user's posts were hidden by reports: read-only from now on */
  blocked: boolean
  /** ids of issues / solutions the current user has voted on */
  issueVotes: Set<string>
  solutionVotes: Set<string>
}

// A module-level store rather than React context: every Astro island (header, page, …) is its
// own React root, and modules survive <ClientRouter /> navigations, so auth is shared and instant.
const initial: AuthState = {
  user: null,
  unverified: null,
  profile: undefined,
  loading: true,
  isAdmin: false,
  blocked: false,
  issueVotes: new Set(),
  solutionVotes: new Set(),
}

let state = initial
const listeners = new Set<() => void>()

function set(patch: Partial<AuthState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

let lastSignOut = 0
/** True right after a sign-out or account deletion (so pages don't pop the sign-in dialog). */
export function justSignedOut() {
  return Date.now() - lastSignOut < 5000
}

/** Google accounts count as verified; email + password ones once the link in the email was opened. */
export function isGoogle(user: User) {
  return user.providerData.some((p) => p.providerId === 'google.com')
}

function verified(user: User) {
  return user.emailVerified || isGoogle(user)
}

let started = false
let unsubs: (() => void)[] = []

function attach(user: User | null) {
  unsubs.forEach((u) => u())
  unsubs = []
  if (!user) {
    if (state.user) lastSignOut = Date.now()
    set({ ...initial, loading: false, profile: null })
    return
  }
  // The rules reject unverified accounts, so don't even listen yet.
  if (!verified(user)) {
    set({ ...initial, loading: false, profile: null, unverified: user })
    // The saved session may predate opening the link: check once with the server.
    checkVerified().catch(() => {})
    return
  }
  set({ user, unverified: null, profile: undefined, loading: true, isAdmin: false, blocked: false })
  unsubs.push(
    onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => set({ profile: snap.exists() ? (snap.data() as Profile) : null, loading: false }),
      () => set({ profile: null, loading: false }),
    ),
    onSnapshot(
      query(collectionGroup(db, 'votes'), where('uid', '==', user.uid)),
      (snap) => {
        const issueVotes = new Set<string>()
        const solutionVotes = new Set<string>()
        snap.forEach((d) => {
          const data = d.data()
          if (data.issueId) issueVotes.add(data.issueId)
          if (data.solutionId) solutionVotes.add(data.solutionId)
        })
        set({ issueVotes, solutionVotes })
      },
      (err) => console.error('votes', err),
    ),
    // Same limit as strikeLimit() in firestore.rules.
    onSnapshot(
      doc(db, 'strikes', user.uid),
      (snap) => set({ blocked: (snap.get('count') ?? 0) >= 2 }),
      () => set({ blocked: false }),
    ),
  )
  getDoc(doc(db, 'admins', user.uid))
    .then((s) => set({ isAdmin: s.exists() }))
    .catch(() => set({ isAdmin: false }))
}

function start() {
  if (started || typeof window === 'undefined') return
  started = true
  onAuthStateChanged(auth, attach)
}

function subscribe(listener: () => void) {
  start()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAuth() {
  return useSyncExternalStore(subscribe, () => state, () => initial)
}

export async function signInWithGoogle() {
  const res = await signInWithPopup(auth, new GoogleAuthProvider())
  track('login', { method: 'google' })
  return res.user
}

/** The email links come back to this site (Firebase's own page confirms, then offers "Continue"). */
const emailLink = () => ({ url: location.origin })

export async function signInWithEmail(email: string, password: string) {
  const res = await signInWithEmailAndPassword(auth, email, password)
  track('login', { method: 'password' })
  return res.user
}

export async function signUpWithEmail(email: string, password: string) {
  const res = await createUserWithEmailAndPassword(auth, email, password)
  await sendEmailVerification(res.user, emailLink())
  track('sign_up', { method: 'password' })
  return res.user
}

export function resendVerification() {
  const user = state.unverified
  return user ? sendEmailVerification(user, emailLink()) : Promise.resolve()
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email, emailLink())
}

/** After the user opened the link: reload, refresh the token (the rules read email_verified) and go on. */
export async function checkVerified() {
  const user = state.unverified
  if (!user) return false
  await user.reload()
  if (!user.emailVerified) return false
  await user.getIdToken(true)
  attach(user)
  return true
}

export function signOut() {
  return fbSignOut(auth)
}
