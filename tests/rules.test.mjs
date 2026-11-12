// Run with: npm run test:rules
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, test } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import {
  addDoc, collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, increment, limit, query,
  serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'

// Same as dayKey() in src/lib/quota.ts and todayKey() in the rules.
const today = () => {
  const d = new Date()
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}
const hoursAgo = (h) => Timestamp.fromMillis(Date.now() - h * 3600_000)

let env
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-buildthis',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
after(() => env.cleanup())
beforeEach(() => env.clearFirestore())

const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore()

const profile = (extra = {}) => ({
  name: 'Alice', photo: '', role: 'both', country: 'GR', stack: ['web'], link: '', lang: 'en',
  source: 'direct', onboardedAt: serverTimestamp(), createdAt: serverTimestamp(), ...extra,
})

const issue = (uid, extra = {}) => ({
  title: 'An app to split bills', body: 'Details', category: 'finance', country: '',
  authorId: uid, authorName: 'Alice', authorPhoto: '', votes: 0, builders: 0, solutions: 0,
  createdAt: serverTimestamp(), ...extra,
})

// Seed data bypassing rules.
async function seed(fn) {
  await env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()))
}
async function seedUser(uid, extra = {}) {
  await seed((f) => setDoc(doc(f, 'users', uid), { ...profile(), onboardedAt: Timestamp.now(), createdAt: Timestamp.now(), ...extra }))
}
async function seedIssue(id = 'i1', extra = {}) {
  await seed((f) => setDoc(doc(f, 'issues', id), { ...issue('author'), createdAt: Timestamp.now(), ...extra }))
}

function postIssue(uid, data = issue(uid), daily = { issuesDay: today(), issuesToday: 1 }) {
  const f = db(uid)
  const b = writeBatch(f)
  b.set(doc(collection(f, 'issues')), data)
  b.update(doc(f, 'users', uid), { lastIssueAt: serverTimestamp(), ...daily })
  return b.commit()
}

describe('users', () => {
  test('can create own profile', () => assertSucceeds(setDoc(doc(db('a'), 'users', 'a'), profile())))
  test('cannot create someone else\'s profile', () => assertFails(setDoc(doc(db('a'), 'users', 'b'), profile())))
  test('cannot set a cooldown on create', () =>
    assertFails(setDoc(doc(db('a'), 'users', 'a'), profile({ lastIssueAt: serverTimestamp() }))))
  test('cannot read others', async () => {
    await seedUser('b')
    await assertFails(getDoc(doc(db('a'), 'users', 'b')))
  })
  test('cannot backdate cooldown', async () => {
    await seedUser('a')
    await assertFails(updateDoc(doc(db('a'), 'users', 'a'), { lastIssueAt: Timestamp.fromMillis(0) }))
  })
  test('cannot set a free-text country', () =>
    assertFails(setDoc(doc(db('a'), 'users', 'a'), profile({ country: 'Greece' }))))
  test('cannot reset the daily counter', async () => {
    await seedUser('a', { issuesDay: today(), issuesToday: 5 })
    await assertFails(updateDoc(doc(db('a'), 'users', 'a'), { issuesToday: 0 }))
  })
  test('can edit profile', async () => {
    await seedUser('a')
    await assertSucceeds(updateDoc(doc(db('a'), 'users', 'a'), { name: 'Bob', stack: ['ios'] }))
  })
})

describe('issues', () => {
  test('anyone can read', async () => {
    await seedIssue()
    await assertSucceeds(getDoc(doc(db(), 'issues', 'i1')))
  })
  test('onboarded user can post with cooldown stamp', async () => {
    await seedUser('a')
    await assertSucceeds(postIssue('a'))
  })
  test('not onboarded cannot post', () => assertFails(postIssue('a')))
  test('post without cooldown stamp fails', async () => {
    await seedUser('a')
    await assertFails(addDoc(collection(db('a'), 'issues'), issue('a')))
  })
  test('second post within 10 minutes fails', async () => {
    await seedUser('a', { lastIssueAt: Timestamp.now() })
    await assertFails(postIssue('a'))
  })
  test('post after cooldown works', async () => {
    await seedUser('a', { lastIssueAt: Timestamp.fromMillis(Date.now() - 11 * 60_000) })
    await assertSucceeds(postIssue('a'))
  })
  test('cannot start with votes', async () => {
    await seedUser('a')
    await assertFails(postIssue('a', issue('a', { votes: 50 })))
  })
  test('cannot post as someone else', async () => {
    await seedUser('a')
    await assertFails(postIssue('a', issue('b')))
  })
  test('short title rejected', async () => {
    await seedUser('a')
    await assertFails(postIssue('a', issue('a', { title: 'hi' })))
  })
  test('6th problem in a day is rejected', async () => {
    await seedUser('a', { issuesDay: today(), issuesToday: 5 })
    await assertFails(postIssue('a', issue('a'), { issuesDay: today(), issuesToday: 6 }))
  })
  test('5th problem in a day is fine', async () => {
    await seedUser('a', { issuesDay: today(), issuesToday: 4 })
    await assertSucceeds(postIssue('a', issue('a'), { issuesDay: today(), issuesToday: 5 }))
  })
  test('counter restarts at 1 on a new day', async () => {
    await seedUser('a', { issuesDay: 20200101, issuesToday: 5 })
    await assertSucceeds(postIssue('a'))
  })
  test('post without bumping the counter fails', async () => {
    await seedUser('a')
    await assertFails(postIssue('a', issue('a'), {}))
  })
  test('scoped to a country', async () => {
    await seedUser('a')
    await assertSucceeds(postIssue('a', issue('a', { country: 'GR' })))
  })
  test('city field not allowed', async () => {
    await seedUser('a')
    await assertFails(postIssue('a', issue('a', { country: 'GR', city: 'Athens' })))
  })
  test('bad country code rejected', async () => {
    await seedUser('a')
    await assertFails(postIssue('a', issue('a', { country: 'Greece' })))
  })
  test('platform field no longer allowed', async () => {
    await seedUser('a')
    await assertFails(postIssue('a', issue('a', { platform: 'ios' })))
  })
  test('lists are capped at 50', async () => {
    await assertSucceeds(getDocs(query(collection(db(), 'issues'), limit(50))))
    await assertFails(getDocs(query(collection(db(), 'issues'), limit(51))))
    await assertFails(getDocs(collection(db(), 'issues')))
  })
  test('bad category rejected', async () => {
    await seedUser('a')
    await assertFails(postIssue('a', issue('a', { category: 'crypto' })))
  })
  test('author can edit title', async () => {
    await seedIssue('i1', { authorId: 'a' })
    await assertSucceeds(updateDoc(doc(db('a'), 'issues', 'i1'), { title: 'A better title here' }))
  })
  test('others cannot edit', async () => {
    await seedIssue('i1', { authorId: 'a' })
    await assertFails(updateDoc(doc(db('b'), 'issues', 'i1'), { title: 'A hijacked title' }))
  })
  test('author cannot delete, admin can', async () => {
    await seedIssue('i1', { authorId: 'a' })
    await seed((f) => setDoc(doc(f, 'admins', 'boss'), {}))
    await assertFails(deleteDoc(doc(db('a'), 'issues', 'i1')))
    await assertSucceeds(deleteDoc(doc(db('boss'), 'issues', 'i1')))
  })
})

function vote(uid, up = true, id = 'i1') {
  const f = db(uid)
  const b = writeBatch(f)
  const v = doc(f, 'issues', id, 'votes', uid)
  if (up) b.set(v, { uid, issueId: id, createdAt: serverTimestamp() })
  else b.delete(v)
  b.update(doc(f, 'issues', id), { votes: increment(up ? 1 : -1) })
  return b.commit()
}

describe('issue votes', () => {
  beforeEach(() => seedIssue())
  test('vote + counter in one batch', () => assertSucceeds(vote('a')))
  test('cannot vote twice', async () => {
    await vote('a')
    await assertFails(vote('a'))
  })
  test('can unvote', async () => {
    await vote('a')
    await assertSucceeds(vote('a', false))
  })
  test('cannot unvote without a vote', () => assertFails(vote('a', false)))
  test('counter alone fails', () => assertFails(updateDoc(doc(db('a'), 'issues', 'i1'), { votes: increment(1) })))
  test('vote doc alone fails', () =>
    assertFails(setDoc(doc(db('a'), 'issues', 'i1', 'votes', 'a'), { uid: 'a', issueId: 'i1', createdAt: serverTimestamp() })))
  test('+2 fails', async () => {
    const f = db('a')
    const b = writeBatch(f)
    b.set(doc(f, 'issues', 'i1', 'votes', 'a'), { uid: 'a', issueId: 'i1', createdAt: serverTimestamp() })
    b.update(doc(f, 'issues', 'i1'), { votes: increment(2) })
    await assertFails(b.commit())
  })
  test('anonymous cannot vote', () => {
    const f = db()
    const b = writeBatch(f)
    b.set(doc(f, 'issues', 'i1', 'votes', 'anon'), { uid: 'anon', issueId: 'i1', createdAt: serverTimestamp() })
    b.update(doc(f, 'issues', 'i1'), { votes: increment(1) })
    return assertFails(b.commit())
  })
  test('my votes via collection group', async () => {
    await vote('a')
    await assertSucceeds(getDocs(query(collectionGroup(db('a'), 'votes'), where('uid', '==', 'a'))))
    await assertFails(getDocs(query(collectionGroup(db('a'), 'votes'), where('uid', '==', 'b'))))
  })
})

describe('builders', () => {
  beforeEach(() => seedIssue())
  function claim(uid, on = true, upgrade = false) {
    const f = db(uid)
    const b = writeBatch(f)
    if (upgrade) b.update(doc(f, 'users', uid), { role: 'both' })
    const d = doc(f, 'issues', 'i1', 'builders', uid)
    if (on) b.set(d, { uid, issueId: 'i1', createdAt: serverTimestamp() })
    else b.delete(d)
    b.update(doc(f, 'issues', 'i1'), { builders: increment(on ? 1 : -1) })
    return b.commit()
  }
  test('onboarded user can claim and unclaim', async () => {
    await seedUser('a')
    await assertSucceeds(claim('a'))
    await assertFails(claim('a'))
    await assertSucceeds(claim('a', false))
  })
  test('not onboarded cannot claim', () => assertFails(claim('a')))
  test('plain user must upgrade to builder in the same batch', async () => {
    await seedUser('a', { role: 'user' })
    await assertFails(claim('a'))
    await assertSucceeds(claim('a', true, true))
  })
})

function submit(uid, extra = {}, issueId = 'i1', daily = { solutionsDay: today(), solutionsToday: 1 }) {
  const f = db(uid)
  const b = writeBatch(f)
  b.set(doc(f, 'solutions', `${issueId}_${uid}`), {
    issueId, title: 'Splitly', url: 'https://splitly.app', body: '', authorId: uid,
    authorName: 'Alice', authorPhoto: '', votes: 0, createdAt: serverTimestamp(), ...extra,
  })
  b.update(doc(f, 'issues', issueId), { solutions: increment(1) })
  b.update(doc(f, 'users', uid), { lastSolutionAt: serverTimestamp(), ...daily })
  return b.commit()
}

async function seedClaim(uid, at = hoursAgo(2), issueId = 'i1') {
  await seed((f) => setDoc(doc(f, 'issues', issueId, 'builders', uid), { uid, issueId, createdAt: at }))
}

describe('solutions', () => {
  beforeEach(async () => {
    await seedIssue()
    await seedUser('a')
    await seedClaim('a')
  })
  test('submit with counter + cooldown', () => assertSucceeds(submit('a')))
  test('no claim → rejected', async () => {
    await seed((f) => deleteDoc(doc(f, 'issues', 'i1', 'builders', 'a')))
    await assertFails(submit('a'))
  })
  test('claim younger than an hour → rejected', async () => {
    await seedClaim('a', Timestamp.fromMillis(Date.now() - 10 * 60_000))
    await assertFails(submit('a'))
  })
  test('plain user role → rejected', async () => {
    await seedUser('a', { role: 'user' })
    await assertFails(submit('a'))
  })
  test('4th solution in a day → rejected', async () => {
    await seedUser('a', { solutionsDay: today(), solutionsToday: 3 })
    await assertFails(submit('a', {}, 'i1', { solutionsDay: today(), solutionsToday: 4 }))
  })
  test('only one per issue per user', async () => {
    await submit('a')
    await seedUser('a') // reset cooldown + daily counter
    await assertFails(submit('a'))
  })
  test('wrong id rejected', async () => {
    const f = db('a')
    const b = writeBatch(f)
    b.set(doc(f, 'solutions', 'random'), {
      issueId: 'i1', title: 'Splitly', url: 'https://splitly.app', body: '', authorId: 'a',
      authorName: 'Alice', authorPhoto: '', votes: 0, createdAt: serverTimestamp(),
    })
    b.update(doc(f, 'issues', 'i1'), { solutions: increment(1) })
    b.update(doc(f, 'users', 'a'), { lastSolutionAt: serverTimestamp() })
    await assertFails(b.commit())
  })
  test('non-https url rejected', () => assertFails(submit('a', { url: 'javascript:alert(1)' })))
  test('vote on solution', async () => {
    await submit('a')
    const f = db('b')
    const b = writeBatch(f)
    b.set(doc(f, 'solutions', 'i1_a', 'votes', 'b'), { uid: 'b', solutionId: 'i1_a', createdAt: serverTimestamp() })
    b.update(doc(f, 'solutions', 'i1_a'), { votes: increment(1) })
    await assertSucceeds(b.commit())
  })
  test('author can remove own solution with counter', async () => {
    await submit('a')
    const f = db('a')
    const b = writeBatch(f)
    b.delete(doc(f, 'solutions', 'i1_a'))
    b.update(doc(f, 'issues', 'i1'), { solutions: increment(-1) })
    await assertSucceeds(b.commit())
  })
})

describe('closed by default', () => {
  test('signups cannot be read', () => assertFails(getDocs(collection(db('a'), 'signups'))))
  test('unknown collection closed', () => assertFails(setDoc(doc(db('a'), 'secrets', 'x'), { a: 1 })))
  test('admins not self-assignable', () => assertFails(setDoc(doc(db('a'), 'admins', 'a'), {})))
})
