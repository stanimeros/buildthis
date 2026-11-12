// Recounts the public counters in `stats/global` ({ users, builders }) from the user docs.
// The app keeps them in step from then on; run this once after first deploying them, or to fix drift.
//
//   node scripts/stats.mjs            # local emulator (npm run emulators)
//   node scripts/stats.mjs --prod     # production, uses your `gcloud auth` login
import { execSync } from 'node:child_process'

const prod = process.argv.includes('--prod')
const project = prod ? 'buildthis-stanimeros' : 'demo-buildthis'
const base = prod
  ? `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`
  : `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`
const token = prod ? execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim() : 'owner'
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  ...(prod ? { 'x-goog-user-project': project } : {}),
}

// Same as counted() / building() in firestore.rules.
let users = 0
let builders = 0
let pageToken = ''
do {
  const params = new URLSearchParams({ pageSize: '300' })
  params.append('mask.fieldPaths', 'name')
  params.append('mask.fieldPaths', 'role')
  if (pageToken) params.set('pageToken', pageToken)
  const res = await fetch(`${base}/users?${params}`, { headers })
  if (!res.ok) {
    console.error(`list users: ${res.status} ${await res.text()}`)
    process.exit(1)
  }
  const page = await res.json()
  for (const d of page.documents ?? []) {
    if ((d.fields?.name?.stringValue ?? 'Deleted user') === 'Deleted user') continue
    users++
    if (['builder', 'both'].includes(d.fields?.role?.stringValue)) builders++
  }
  pageToken = page.nextPageToken ?? ''
} while (pageToken)

const res = await fetch(`${base}/stats/global`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({ fields: { users: { integerValue: String(users) }, builders: { integerValue: String(builders) } } }),
})
if (!res.ok) {
  console.error(`stats/global: ${res.status} ${await res.text()}`)
  process.exit(1)
}
console.log(`stats/global in ${prod ? 'PRODUCTION' : 'the emulator'}: ${users} users, ${builders} builders.`)
