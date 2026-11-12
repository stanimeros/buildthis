import {
  collection, doc, documentId, getDocs, limit, onSnapshot, orderBy, query, type QueryConstraint,
  where,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { db } from '@/lib/firebase'
import type { Category, Issue, Solution } from '@/lib/types'

export type Sort = 'top' | 'new'

interface Result<T> {
  data: T
  loading: boolean
  error: Error | null
}

function useQuery<T>(key: string, build: () => QueryConstraint[] | null, path: string, fallback: T[]) {
  const [state, setState] = useState<Result<T[]> & { key: string }>({
    data: fallback,
    loading: true,
    error: null,
    key,
  })

  useEffect(() => {
    const constraints = build()
    if (!constraints) {
      setState({ data: [], loading: false, error: null, key })
      return
    }
    return onSnapshot(
      query(collection(db, path), ...constraints),
      (snap) =>
        setState({
          data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T),
          loading: false,
          error: null,
          key,
        }),
      (error) => {
        console.error(path, error)
        setState({ data: [], loading: false, error, key })
      },
    )
    // `key` captures every input of `build`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state.key === key ? state : { data: fallback, loading: true, error: null }
}

export function useIssues(sort: Sort, category: Category | 'all', max = 50) {
  return useQuery<Issue>(
    `issues:${sort}:${category}:${max}`,
    () => [
      ...(category === 'all' ? [] : [where('category', '==', category)]),
      orderBy(sort === 'top' ? 'votes' : 'createdAt', 'desc'),
      limit(max),
    ],
    'issues',
    [],
  )
}

export function useMyIssues(uid: string | undefined) {
  return useQuery<Issue>(
    `my-issues:${uid}`,
    () => (uid ? [where('authorId', '==', uid), orderBy('createdAt', 'desc')] : null),
    'issues',
    [],
  )
}

export function useSolutions(issueId: string) {
  return useQuery<Solution>(
    `solutions:${issueId}`,
    () => [where('issueId', '==', issueId), orderBy('votes', 'desc')],
    'solutions',
    [],
  )
}

export function useMySolutions(uid: string | undefined) {
  return useQuery<Solution>(
    `my-solutions:${uid}`,
    () => (uid ? [where('authorId', '==', uid), orderBy('createdAt', 'desc')] : null),
    'solutions',
    [],
  )
}

export function useIssue(id: string) {
  const [state, setState] = useState<{ id: string; issue: Issue | null; loading: boolean }>({
    id,
    issue: null,
    loading: true,
  })
  useEffect(
    () =>
      onSnapshot(
        doc(db, 'issues', id),
        (snap) =>
          setState({ id, issue: snap.exists() ? ({ id: snap.id, ...snap.data() } as Issue) : null, loading: false }),
        () => setState({ id, issue: null, loading: false }),
      ),
    [id],
  )
  return state.id === id ? state : { issue: null, loading: true }
}

/** Whether the current user has claimed "I'm building this" on an issue. */
export function useBuilding(issueId: string) {
  const { user } = useAuth()
  const [building, setBuilding] = useState(false)
  useEffect(() => {
    if (!user) return
    return onSnapshot(
      doc(db, 'issues', issueId, 'builders', user.uid),
      (snap) => setBuilding(snap.exists()),
      () => setBuilding(false),
    )
  }, [issueId, user])
  return !!user && building
}

/** Issues the current user voted on (for /me), fetched by id in chunks of 30. */
export function useVotedIssues() {
  const { issueVotes } = useAuth()
  const ids = [...issueVotes].sort()
  const key = ids.join(',')
  const [state, setState] = useState<{ key: string; data: Issue[] }>({ key: '', data: [] })

  useEffect(() => {
    if (!key) return
    const list = key.split(',')
    const chunks: string[][] = []
    for (let i = 0; i < list.length; i += 30) chunks.push(list.slice(i, i + 30))
    let cancelled = false
    Promise.all(chunks.map((c) => getDocs(query(collection(db, 'issues'), where(documentId(), 'in', c)))))
      .then((snaps) => {
        if (cancelled) return
        const data = snaps.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }) as Issue))
        setState({ key, data: data.sort((a, b) => b.votes - a.votes) })
      })
      .catch((err) => console.error('voted issues', err))
    return () => {
      cancelled = true
    }
  }, [key])

  if (!key) return { data: [] as Issue[], loading: false }
  return { data: state.data, loading: state.key !== key }
}
