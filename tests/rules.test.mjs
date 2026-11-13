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

// Signed in with Google unless another provider is given.
const db = (uid, provider = 'google.com', emailVerified = true) =>
  (uid
    ? env.authenticatedContext(uid, { firebase: { sign_in_provider: provider }, email_verified: emailVerified })
    : env.unauthenticatedContext()
  ).firestore()

const profile = (extra = {}) => ({
  name: 'Alice', photo: '', role: 'both', country: 'GR', stack: ['web'], link: '', lang: 'en',
  source: 'direct', onboardedAt: serverTimestamp(), createdAt: serverTimestamp(), ...extra,
})

const issue = (uid, extra = {}) => ({
  title: 'An app to split bills', body: 'Details', category: 'finance', country: '',
  authorId: uid, authorName: 'Alice', authorPhoto: '', votes: 0, builders: 0, solutions: 0,
  hidden: false, createdAt: serverTimestamp(), ...extra,
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
  const ref = doc(collection(f, 'issues'))
  b.set(ref, data)
  b.update(doc(f, 'users', uid), { lastIssueAt: serverTimestamp(), lastIssueId: ref.id, ...daily })
  return b.commit()
}

// Signup: the profile plus the public counters, in one batch (see statsInStep in the rules).
function signUp(uid, data = profile(), stats = { users: increment(1), builders: increment(data.role === 'user' ? 0 : 1) }, f = db(uid)) {
  const b = writeBatch(f)
  b.set(doc(f, 'users', uid), data)
  if (stats) b.set(doc(f, 'stats', 'global'), stats, { merge: true })
  return b.commit()
}

describe('users', () => {
  test('can create own profile', () => assertSucceeds(signUp('a')))
  test('cannot create someone else\'s profile', () => assertFails(setDoc(doc(db('a'), 'users', 'b'), profile())))
  test('cannot set a cooldown on create', () => assertFails(signUp('a', profile({ lastIssueAt: serverTimestamp() }))))
  test('cannot read others', async () => {
    await seedUser('b')
    await assertFails(getDoc(doc(db('a'), 'users', 'b')))
  })
  test('cannot backdate cooldown', async () => {
    await seedUser('a')
    await assertFails(updateDoc(doc(db('a'), 'users', 'a'), { lastIssueAt: Timestamp.fromMillis(0) }))
  })
  test('cannot set a free-text country', () => assertFails(signUp('a', profile({ country: 'Greece' }))))
  test('cannot reset the daily counter', async () => {
    await seedUser('a', { issuesDay: today(), issuesToday: 5 })
    await assertFails(updateDoc(doc(db('a'), 'users', 'a'), { issuesToday: 0 }))
  })
  test('email notifications can be turned off, only with a boolean', async () => {
    await seedUser('a')
    await assertSucceeds(updateDoc(doc(db('a'), 'users', 'a'), { emails: false }))
    await assertFails(updateDoc(doc(db('a'), 'users', 'a'), { emails: 'no' }))
  })
  test('can edit profile', async () => {
    await seedUser('a')
    await assertSucceeds(updateDoc(doc(db('a'), 'users', 'a'), { name: 'Bob', stack: ['ios'] }))
  })
})

describe('issues', () => {
  test('author can delete own problem until it has a solution', async () => {
    await seedIssue('i1', { authorId: 'a' })
    await seedIssue('i2', { authorId: 'a', solutions: 1 })
    await assertFails(deleteDoc(doc(db('b'), 'issues', 'i1')))
    await assertFails(deleteDoc(doc(db('a'), 'issues', 'i2')))
    await assertSucceeds(deleteDoc(doc(db('a'), 'issues', 'i1')))
  })
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
  test('lists are capped at 50 and must skip hidden ones', async () => {
    const visible = (n) => query(collection(db(), 'issues'), where('hidden', '==', false), limit(n))
    await assertSucceeds(getDocs(visible(50)))
    await assertFails(getDocs(visible(51)))
    await assertFails(getDocs(query(collection(db(), 'issues'), limit(50))))
  })
  test('bad category rejected', async () => {
    await seedUser('a')
    await assertFails(postIssue('a', issue('a', { category: 'crypto' })))
  })
  test('author can edit title', async () => {
    await seedUser('a')
    await seedIssue('i1', { authorId: 'a' })
    await assertSucceeds(updateDoc(doc(db('a'), 'issues', 'i1'), { title: 'A better title here' }))
  })
  test('others cannot edit', async () => {
    await seedIssue('i1', { authorId: 'a' })
    await assertFails(updateDoc(doc(db('b'), 'issues', 'i1'), { title: 'A hijacked title' }))
  })
  test('admin can delete even with solutions', async () => {
    await seedIssue('i1', { authorId: 'a', solutions: 2 })
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
    if (upgrade) {
      b.update(doc(f, 'users', uid), { role: 'both' })
      b.set(doc(f, 'stats', 'global'), { builders: increment(1) }, { merge: true })
    }
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
    authorName: 'Alice', authorPhoto: '', votes: 0, hidden: false, createdAt: serverTimestamp(), ...extra,
  })
  b.update(doc(f, 'issues', issueId), { solutions: increment(1) })
  b.update(doc(f, 'users', uid), { lastSolutionAt: serverTimestamp(), lastSolutionId: `${issueId}_${uid}`, ...daily })
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
  test('admin removes a solution and the counter follows', async () => {
    await submit('a')
    await seed((f) => setDoc(doc(f, 'admins', 'boss'), {}))
    const f = db('boss')
    const b = writeBatch(f)
    b.delete(doc(f, 'solutions', 'i1_a'))
    b.update(doc(f, 'issues', 'i1'), { solutions: increment(-1) })
    await assertSucceeds(b.commit())
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

describe('security review', () => {
  test('two problems in one batch are rejected', async () => {
    await seedUser('a')
    const f = db('a')
    const b = writeBatch(f)
    const r1 = doc(collection(f, 'issues'))
    const r2 = doc(collection(f, 'issues'))
    b.set(r1, issue('a'))
    b.set(r2, issue('a'))
    b.update(doc(f, 'users', 'a'), { lastIssueAt: serverTimestamp(), lastIssueId: r2.id, issuesDay: today(), issuesToday: 1 })
    await assertFails(b.commit())
  })
  test('two solutions in one batch are rejected', async () => {
    await seedIssue('i1')
    await seedIssue('i2')
    await seedUser('a')
    await seedClaim('a', hoursAgo(2), 'i1')
    await seedClaim('a', hoursAgo(2), 'i2')
    const f = db('a')
    const b = writeBatch(f)
    for (const id of ['i1', 'i2']) {
      b.set(doc(f, 'solutions', `${id}_a`), {
        issueId: id, title: 'Spam', url: 'https://spam.example', body: '', authorId: 'a',
        authorName: 'Alice', authorPhoto: '', votes: 0, createdAt: serverTimestamp(),
      })
      b.update(doc(f, 'issues', id), { solutions: increment(1) })
    }
    b.update(doc(f, 'users', 'a'), { lastSolutionAt: serverTimestamp(), lastSolutionId: 'i2_a', solutionsDay: today(), solutionsToday: 1 })
    await assertFails(b.commit())
  })
  test('own user doc cannot be deleted (would reset limits)', async () => {
    await seedUser('a')
    await assertFails(deleteDoc(doc(db('a'), 'users', 'a')))
  })
  test('account deletion can blank the profile', async () => {
    await seedUser('a')
    await seed((f) => setDoc(doc(f, 'stats', 'global'), { users: 5, builders: 2 }))
    const blank = { name: 'Deleted user', photo: '', country: '', stack: [], link: '', source: '', public: false }
    await assertFails(updateDoc(doc(db('a'), 'users', 'a'), blank))
    const f = db('a')
    const b = writeBatch(f)
    b.update(doc(f, 'users', 'a'), blank)
    b.set(doc(f, 'stats', 'global'), { users: increment(-1), builders: increment(-1) }, { merge: true })
    await assertSucceeds(b.commit())
  })
  test('cannot pose as BuildThis', async () => {
    await seedUser('a')
    await assertFails(postIssue('a', issue('a', { authorName: 'BuildThis', authorPhoto: '' })))
    await assertFails(updateDoc(doc(db('a'), 'users', 'a'), { name: 'Build This' }))
  })
  test('author name must match the profile', async () => {
    await seedUser('a')
    await assertFails(postIssue('a', issue('a', { authorName: 'Someone else' })))
  })
  test('avatars only from Google', async () => {
    await assertFails(signUp('a', profile({ photo: 'https://evil.example/pixel.gif' })))
    await assertSucceeds(signUp('b', profile({ photo: 'https://lh3.googleusercontent.com/a/abc=s96-c' })))
  })
  test('custom issue ids are rejected', async () => {
    await seedUser('a')
    const f = db('a')
    const b = writeBatch(f)
    b.set(doc(f, 'issues', 'my-own-id'), issue('a'))
    b.update(doc(f, 'users', 'a'), { lastIssueAt: serverTimestamp(), lastIssueId: 'my-own-id', issuesDay: today(), issuesToday: 1 })
    await assertFails(b.commit())
  })
  test('email accounts vote only once verified; other providers never', async () => {
    await seedIssue('i1')
    const vote = (f) => {
      const b = writeBatch(f)
      b.set(doc(f, 'issues', 'i1', 'votes', 'a'), { uid: 'a', issueId: 'i1', createdAt: serverTimestamp() })
      b.update(doc(f, 'issues', 'i1'), { votes: increment(1) })
      return b.commit()
    }
    await assertFails(vote(db('a', 'anonymous')))
    await assertFails(vote(db('a', 'password', false)))
    await assertSucceeds(vote(db('a', 'password')))
  })
  test('unverified email accounts cannot sign up', () => assertFails(signUp('a', profile(), undefined, db('a', 'password', false))))
  test('own claims via collection group, nobody else\'s', async () => {
    await seedClaim('a', hoursAgo(1), 'i1')
    await assertSucceeds(getDocs(query(collectionGroup(db('a'), 'builders'), where('uid', '==', 'a'))))
    await assertFails(getDocs(query(collectionGroup(db('b'), 'builders'), where('uid', '==', 'a'))))
    await assertFails(getDoc(doc(db('b'), 'issues', 'i1', 'builders', 'a')))
  })
  test('nobody can read who voted', async () => {
    await seedIssue('i1')
    await seed((f) => setDoc(doc(f, 'issues', 'i1', 'votes', 'a'), { uid: 'a', issueId: 'i1', createdAt: Timestamp.now() }))
    await assertFails(getDocs(collection(db('b'), 'issues', 'i1', 'votes')))
    await assertFails(getDoc(doc(db('b'), 'issues', 'i1', 'votes', 'a')))
    await assertFails(getDocs(collection(db(), 'issues', 'i1', 'votes')))
  })
  test('legacy signups are closed', () =>
    assertFails(addDoc(collection(db(), 'signups'), { email: 'a@b.co', type: 'problem', text: '', lang: 'en', source: '', createdAt: serverTimestamp() })))
})

describe('closed by default', () => {
  test('signups cannot be read', () => assertFails(getDocs(collection(db('a'), 'signups'))))
  test('unknown collection closed', () => assertFails(setDoc(doc(db('a'), 'secrets', 'x'), { a: 1 })))
  test('admins not self-assignable', () => assertFails(setDoc(doc(db('a'), 'admins', 'a'), {})))
})

// ---------- moderation: reports, hiding, strikes ----------

function reportIt(uid, { coll = 'issues', id = 'i1', author = 'author', hide = false } = {}) {
  const f = db(uid)
  const b = writeBatch(f)
  b.set(doc(f, coll, id, 'reports', uid), { uid, createdAt: serverTimestamp() })
  b.set(doc(f, coll, id, 'meta', 'moderation'), { reports: increment(1) }, { merge: true })
  if (hide) {
    b.update(doc(f, coll, id), { hidden: true })
    b.set(doc(f, 'strikes', author), { count: increment(1), lastColl: coll, lastId: id }, { merge: true })
  }
  return b.commit()
}

describe('moderation', () => {
  beforeEach(() => seedIssue('i1', { authorId: 'author' }))

  test('one report per user', async () => {
    await assertSucceeds(reportIt('r1'))
    await assertFails(reportIt('r1'))
  })
  test('cannot hide before 3 reports', async () => {
    await reportIt('r1')
    await assertFails(reportIt('r2', { hide: true }))
  })
  test('3rd report must hide (and strike the author)', async () => {
    await reportIt('r1')
    await reportIt('r2')
    await assertFails(reportIt('r3'))
    await assertSucceeds(reportIt('r3', { hide: true }))
  })
  test('hiding without a strike is rejected', async () => {
    await reportIt('r1')
    await reportIt('r2')
    const f = db('r3')
    const b = writeBatch(f)
    b.set(doc(f, 'issues', 'i1', 'reports', 'r3'), { uid: 'r3', createdAt: serverTimestamp() })
    b.set(doc(f, 'issues', 'i1', 'meta', 'moderation'), { reports: increment(1) }, { merge: true })
    b.update(doc(f, 'issues', 'i1'), { hidden: true })
    await assertFails(b.commit())
  })
  test('report counts and other reports are private', async () => {
    await reportIt('r1')
    await assertFails(getDoc(doc(db('r1'), 'issues', 'i1', 'meta', 'moderation')))
    await assertFails(getDoc(doc(db('r2'), 'issues', 'i1', 'reports', 'r1')))
    await assertSucceeds(getDoc(doc(db('r1'), 'issues', 'i1', 'reports', 'r1')))
  })
  test('hidden: gone for others, visible to its author', async () => {
    for (const r of ['r1', 'r2']) await reportIt(r)
    await reportIt('r3', { hide: true })
    await assertFails(getDoc(doc(db('someone'), 'issues', 'i1')))
    await assertFails(getDoc(doc(db(), 'issues', 'i1')))
    await assertSucceeds(getDoc(doc(db('author'), 'issues', 'i1')))
  })
  test('strikes cannot be forged', async () => {
    await assertFails(setDoc(doc(db('r1'), 'strikes', 'author'), { count: 1, lastColl: 'issues', lastId: 'i1' }))
  })
  test('strikes are private', async () => {
    await seed((f) => setDoc(doc(f, 'strikes', 'author'), { count: 1, lastColl: 'issues', lastId: 'i1' }))
    await assertFails(getDoc(doc(db('r1'), 'strikes', 'author')))
    await assertSucceeds(getDoc(doc(db('author'), 'strikes', 'author')))
  })

  describe('blocked user (2 strikes)', () => {
    beforeEach(async () => {
      await seedUser('author')
      await seed((f) => setDoc(doc(f, 'strikes', 'author'), { count: 2, lastColl: 'issues', lastId: 'x' }))
      await seedIssue('i2', { authorId: 'someone' })
    })
    test('cannot post', () => assertFails(postIssue('author', issue('author'))))
    test('cannot vote', () => assertFails(vote('author', true, 'i2')))
    test('cannot report', () => assertFails(reportIt('author', { id: 'i2', author: 'someone' })))
    test('cannot claim', async () => {
      const f = db('author')
      const b = writeBatch(f)
      b.set(doc(f, 'issues', 'i2', 'builders', 'author'), { uid: 'author', issueId: 'i2', createdAt: serverTimestamp() })
      b.update(doc(f, 'issues', 'i2'), { builders: increment(1) })
      await assertFails(b.commit())
    })
    test('cannot edit own problem', () =>
      assertFails(updateDoc(doc(db('author'), 'issues', 'i1'), { title: 'Edited after being blocked' })))
    test('can still delete the account (relabel content)', () =>
      assertSucceeds(updateDoc(doc(db('author'), 'issues', 'i1'), { authorName: 'Deleted user', authorPhoto: '' })))
    test('1 strike is still fine', async () => {
      await seed((f) => setDoc(doc(f, 'strikes', 'author'), { count: 1, lastColl: 'issues', lastId: 'x' }))
      await assertSucceeds(vote('author', true, 'i2'))
    })
  })
})

describe('stats', () => {
  test('anyone can read the counters', async () => {
    await seed((f) => setDoc(doc(f, 'stats', 'global'), { users: 3, builders: 1 }))
    await assertSucceeds(getDoc(doc(db(null), 'stats', 'global')))
  })
  test('signup must bump the counters, and by the right amount', async () => {
    await assertFails(signUp('a', profile(), null))
    await assertFails(signUp('a', profile(), { users: increment(2), builders: increment(1) }))
    await assertFails(signUp('a', profile({ role: 'user' }), { users: increment(1), builders: increment(1) }))
    await assertSucceeds(signUp('a', profile({ role: 'user' })))
  })
  test('cannot bump the counters without a matching change', async () => {
    await seedUser('a')
    await assertFails(setDoc(doc(db('a'), 'stats', 'global'), { users: increment(1) }, { merge: true }))
  })
  test('role changes move the builder count', async () => {
    await seedUser('a', { role: 'user' })
    await assertFails(updateDoc(doc(db('a'), 'users', 'a'), { role: 'builder' }))
    const f = db('a')
    const b = writeBatch(f)
    b.update(doc(f, 'users', 'a'), { role: 'builder' })
    b.set(doc(f, 'stats', 'global'), { builders: increment(1) }, { merge: true })
    await assertSucceeds(b.commit())
  })
})

describe('community', () => {
  function join(uid, data = { name: 'Alice', photo: '' }, userPatch = { public: true }) {
    const f = db(uid)
    const b = writeBatch(f)
    b.update(doc(f, 'users', uid), userPatch)
    b.set(doc(f, 'community', uid), { ...data, updatedAt: serverTimestamp() })
    return b.commit()
  }
  function leave(uid) {
    const f = db(uid)
    const b = writeBatch(f)
    b.update(doc(f, 'users', uid), { public: false })
    b.delete(doc(f, 'community', uid))
    return b.commit()
  }
  test('anyone can list a page of the community', async () => {
    await assertSucceeds(getDocs(query(collection(db(null), 'community'), limit(40))))
    await assertFails(getDocs(collection(db(null), 'community')))
  })
  test('builder can join and leave', async () => {
    await seedUser('a')
    await assertSucceeds(join('a'))
    await assertSucceeds(leave('a'))
  })
  test('must opt in on the profile, and copy its name and photo', async () => {
    await seedUser('a')
    await assertFails(join('a', undefined, { link: '' }))
    await assertFails(join('a', { name: 'Someone else', photo: '' }))
  })
  test('plain users cannot be public', async () => {
    await seedUser('a', { role: 'user' })
    await assertFails(join('a'))
  })
  test('opting out must remove the community doc', async () => {
    await seedUser('a')
    await assertSucceeds(join('a'))
    await assertFails(updateDoc(doc(db('a'), 'users', 'a'), { public: false }))
  })
  test('cannot join for someone else', async () => {
    await seedUser('b')
    await assertFails(setDoc(doc(db('a'), 'community', 'b'), { name: 'Alice', photo: '', updatedAt: serverTimestamp() }))
  })
})
