import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as fbSignOut, type User } from 'firebase/auth'
import { collectionGroup, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { useSyncExternalStore } from 'react'

import { auth, db, track } from '@/lib/firebase'
import type { Profile } from '@/lib/types'

interface AuthState {
  user: User | null
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

let started = false
function start() {
  if (started || typeof window === 'undefined') return
  started = true
  let unsubs: (() => void)[] = []

  onAuthStateChanged(auth, (user) => {
    unsubs.forEach((u) => u())
    unsubs = []
    if (!user) {
      if (state.user) lastSignOut = Date.now()
      set({ ...initial, loading: false, profile: null })
      return
    }
    set({ user, profile: undefined, loading: true, isAdmin: false, blocked: false })
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
  })
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

export function signOut() {
  return fbSignOut(auth)
}
