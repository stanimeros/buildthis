// Run with: npm run test:rules
import { readFileSync } from 'node:fs'
import { after, before, test } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore'

let env
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-buildthis',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
after(() => env.cleanup())

const valid = () => ({
  email: 'a@b.co',
  type: 'problem',
  text: 'I want an app that…',
  lang: 'en',
  source: 'direct',
  createdAt: serverTimestamp(),
})
const signups = () => collection(env.unauthenticatedContext().firestore(), 'signups')

test('valid signup is accepted', () => assertSucceeds(addDoc(signups(), valid())))
test('bad email is rejected', () => assertFails(addDoc(signups(), { ...valid(), email: 'nope' })))
test('unknown type is rejected', () => assertFails(addDoc(signups(), { ...valid(), type: 'admin' })))
test('extra field is rejected', () => assertFails(addDoc(signups(), { ...valid(), admin: true })))
test('long text is rejected', () => assertFails(addDoc(signups(), { ...valid(), text: 'x'.repeat(1001) })))
test('client createdAt is rejected', () => assertFails(addDoc(signups(), { ...valid(), createdAt: new Date() })))
test('signups cannot be read', () => assertFails(getDocs(signups())))
test('other collections are closed', () =>
  assertFails(addDoc(collection(env.unauthenticatedContext().firestore(), 'issues'), { title: 'x' })))
