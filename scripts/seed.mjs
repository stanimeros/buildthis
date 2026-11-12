// Seeds example problems so a fresh board shows what BuildThis is about.
// They're posted by "BuildThis" with 0 votes: votes must come from real people.
//
//   node scripts/seed.mjs            # local emulator (npm run emulators)
//   node scripts/seed.mjs --prod     # production, uses your `gcloud auth` login
//
// Doc ids are fixed (seed-*), so running it again overwrites instead of duplicating.
import { execSync } from 'node:child_process'

const prod = process.argv.includes('--prod')
const project = prod ? 'buildthis-stanimeros' : 'demo-buildthis'
const base = prod
  ? `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`
  : `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`
const token = prod ? execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim() : 'owner'

const problems = [
  {
    title: 'Θέλω μια εφαρμογή που να μου λέει ποιο φαρμακείο εφημερεύει κοντά μου τώρα',
    body: 'Κάθε φορά ψάχνω σε τρία διαφορετικά site και κανένα δεν δείχνει χάρτη με ωράριο. Θέλω να ανοίγω την εφαρμογή και να βλέπω το πιο κοντινό ανοιχτό φαρμακείο.',
    category: 'health',
    country: 'GR',
  },
  {
    title: 'Μια εφαρμογή που να δείχνει πότε έρχεται πραγματικά το λεωφορείο στη στάση μου',
    body: 'Οι χρόνοι αναμονής στις στάσεις συχνά είναι λάθος. Θα ήθελα πρόβλεψη με βάση το πού βρίσκεται το λεωφορείο τώρα και ειδοποίηση όταν πρέπει να φύγω από το σπίτι.',
    category: 'transport',
    country: 'GR',
  },
  {
    title: 'Όλες οι ανακοινώσεις του σχολείου των παιδιών σε ένα σημείο',
    body: 'Αυτή τη στιγμή έρχονται από email, Viber, χαρτάκια στην τσάντα και την πλατφόρμα του σχολείου. Χάνω εκδρομές και προθεσμίες.',
    category: 'family',
    country: 'GR',
  },
  {
    title: 'Ειδοποίηση όταν βγαίνει σπίτι για ενοίκιο στην περιοχή μου, μέσα στο budget μου',
    body: 'Τα καλά σπίτια φεύγουν σε λίγες ώρες. Θέλω να ορίζω περιοχή, τιμή και τετραγωνικά και να ειδοποιούμαι αμέσως, από όλα τα site μαζί.',
    category: 'housing',
    country: 'GR',
  },
  {
    title: 'Να βρίσκω ελεύθερο γήπεδο padel ή 5x5 και να το κλείνω με δύο κλικ',
    body: 'Τώρα παίρνω τηλέφωνο σε τρία γήπεδα για να βρω ώρα. Θέλω να βλέπω διαθεσιμότητα και να κλείνω και να μοιράζω το κόστος με την παρέα.',
    category: 'social',
    country: 'GR',
  },
  {
    title: 'Να μοιράζομαι αυτόματα τα κοινά έξοδα του σπιτιού με τους συγκατοίκους',
    body: 'Ρεύμα, νερό, internet, σούπερ μάρκετ. Θέλω να ανεβάζω την απόδειξη και να βγαίνει ποιος χρωστάει τι, χωρίς spreadsheet.',
    category: 'finance',
    country: '',
  },
  {
    title: 'Να φωτογραφίζω αποδείξεις και εγγυήσεις και να μου θυμίζει πότε λήγουν',
    body: 'Όταν χαλάσει κάτι δεν βρίσκω ποτέ την απόδειξη. Θέλω φωτογραφία, αυτόματη ανάγνωση ημερομηνίας και υπενθύμιση πριν λήξει η εγγύηση.',
    category: 'productivity',
    country: '',
  },
  {
    title: 'Compare supermarket prices for my weekly shopping list',
    body: 'I buy roughly the same 30 things every week. Tell me which supermarket near me is cheapest for my list this week, and when something I buy is on offer.',
    category: 'food',
    country: '',
  },
  {
    title: 'Find a doctor or dentist with a free slot this week without calling ten clinics',
    body: 'Booking a simple appointment takes a morning of phone calls. I want to see real availability nearby and book in one tap.',
    category: 'health',
    country: 'CY',
  },
  {
    title: "Track my freelance invoices and tell me who hasn't paid yet",
    body: 'I send invoices from different tools and lose track. One list of what is due, what is late, and a polite reminder I can send with one click.',
    category: 'work',
    country: '',
  },
  {
    title: 'Practice a language with short daily conversations about my real day',
    body: 'Apps teach me words like "the owl drinks milk". I want five minutes a day of conversation about things I actually did, at my level.',
    category: 'education',
    country: '',
  },
  {
    title: 'Remind me to water each plant based on its type and the weather',
    body: 'Some plants need water every two days, some every two weeks, and it changes in summer. A simple reminder per plant that knows when it rained.',
    category: 'other',
    country: '',
  },
]

const now = Date.now()
let done = 0
for (const [i, p] of problems.entries()) {
  // Spread over the last few days so "New" has a natural order.
  const createdAt = new Date(now - (i * 7 + 2) * 3600_000).toISOString()
  const fields = {
    title: { stringValue: p.title },
    body: { stringValue: p.body },
    category: { stringValue: p.category },
    country: { stringValue: p.country },
    authorId: { stringValue: 'buildthis' },
    authorName: { stringValue: 'BuildThis' },
    authorPhoto: { stringValue: '/favicon.svg' },
    votes: { integerValue: '0' },
    builders: { integerValue: '0' },
    solutions: { integerValue: '0' },
    hidden: { booleanValue: false },
    createdAt: { timestampValue: createdAt },
  }
  const res = await fetch(`${base}/issues/seed-${String(i + 1).padStart(2, '0')}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(prod ? { 'x-goog-user-project': project } : {}),
    },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) {
    console.error(`seed-${i + 1}: ${res.status} ${await res.text()}`)
    process.exit(1)
  }
  done++
}
console.log(`Seeded ${done} problems into ${prod ? 'PRODUCTION' : 'the emulator'} (${project}).`)
