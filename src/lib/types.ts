import type { Timestamp } from 'firebase/firestore'

export const categories = [
  'productivity', 'finance', 'health', 'family', 'education', 'housing',
  'transport', 'food', 'social', 'work', 'other',
] as const
export type Category = (typeof categories)[number]

export const roles = ['user', 'builder', 'both'] as const
export type Role = (typeof roles)[number]

export const stacks = ['web', 'ios', 'android', 'flutter', 'react-native', 'ai', 'backend', 'no-code', 'design'] as const

export interface Profile {
  name: string
  photo: string
  role: Role
  /** ISO 3166-1 alpha-2, or '' */
  country: string
  city?: string
  stack: string[]
  link: string
  lang: 'en' | 'el'
  source: string
  lastIssueAt?: Timestamp
  lastSolutionAt?: Timestamp
  /** daily quotas (see src/lib/quota.ts) */
  issuesDay?: number
  issuesToday?: number
  solutionsDay?: number
  solutionsToday?: number
  onboardedAt: Timestamp
  createdAt: Timestamp
}

export interface Issue {
  id: string
  title: string
  body: string
  category: Category
  /** '' = anywhere, else ISO 3166-1 alpha-2 */
  country: string
  /** only when country is set */
  city: string
  authorId: string
  authorName: string
  authorPhoto: string
  votes: number
  builders: number
  solutions: number
  createdAt: Timestamp | null
}

/** Fields of an issue the author controls. */
export interface IssueInput {
  title: string
  body: string
  category: Category
  country: string
  city: string
}

export interface Solution {
  id: string
  issueId: string
  title: string
  url: string
  body: string
  authorId: string
  authorName: string
  authorPhoto: string
  votes: number
  createdAt: Timestamp | null
}

export const limits = {
  issueTitle: [8, 120],
  issueBody: [0, 2000],
  solutionTitle: [2, 80],
  solutionBody: [0, 1000],
  name: [1, 60],
  city: [0, 60],
} as const
