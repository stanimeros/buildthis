# BuildThis

People post the problems they want an app for, everyone upvotes the ones they share,
and builders ship solutions and compete on the same problem.

See [plan.md](plan.md) for the product plan.

## Stack

Astro (static) + React islands · Tailwind + shadcn/ui · Motion · Phosphor icons ·
react-i18next (EN/GR) · Firebase (Hosting, Auth, Firestore, Analytics)

- Every route is a pre-rendered Astro page (`src/pages`). The landing page is rendered to HTML at
  build time; app pages mount a client-only React island (`src/islands` → `src/views`).
- Navigation uses Astro's `<ClientRouter />` (view transitions). Header and footer persist across pages.
- Auth state is a module-level store (`src/lib/auth.tsx`) shared by all islands.
- The home page is the vote board. `/p/:id`, `/p/:id/edit` and `/p/:id/submit` are served by
  `problem*.html` through Firebase Hosting rewrites (mirrored in `astro.config.mjs` for dev).
  Old `/issues…` URLs redirect. Internally (Firestore, code) a problem is still called an `issue`.

## Setup

```sh
npm install
cp .env.example .env.local   # fill in your Firebase web app config
npm run dev
```

`.env.local` is gitignored. Firebase web config values are not secret (they ship in the client bundle),
but keeping them out of the repo lets forks use their own project. Access is enforced by
[`firestore.rules`](firestore.rules).

### Local, against emulators (no production data)

```sh
npm run emulators     # Auth + Firestore emulators (demo project)
npm run dev:local     # Astro dev server wired to the emulators
```

Google sign-in works in the emulator: the popup lets you create a fake account.

## Security

`firestore.rules` is the whole backend (no Cloud Functions), covered by `tests/rules.test.mjs`:

- Votes and "I'm building this" claims are one doc per user (`…/votes/{uid}`, `…/builders/{uid}`),
  readable only by that user. Everyone else only sees the counters.
- Counters move by exactly ±1, in the same batch as the vote/claim/solution doc.
- One solution per user per problem; builders only; the problem must be claimed at least 1 hour earlier.
- Limits: 10 min between problems, 2 min between solutions, max 5 problems / 3 solutions per UTC day,
  one create per batch. The user doc that holds these is never deletable from the client.
- Lists are paged (max 50 per request). Google sign-in only. Avatars only from Google.
- App Check (reCAPTCHA Enterprise) proves requests come from this site. After deploying, turn on
  enforcement for Firestore in the Firebase console (App Check → APIs).

## Seed data

`node scripts/seed.mjs` adds a dozen example problems (posted by BuildThis, 0 votes) to the emulator;
`--prod` writes them to production with your `gcloud` login.

## Tests

```sh
npm run test:rules    # Firestore security rules (emulator)
```

## Translations

English is the source. After editing `src/i18n/locales/en/*.json`:

```sh
npx github:stanimeros/i18n-sync   # needs GEMINI_API_KEY in .env.local
```

Commit `i18n.lock.json` with the locale files.

## Deploy

```sh
npm run build
firebase deploy --only hosting,firestore
```

Admins: create an (empty) document `admins/{uid}` in the Firebase console. Admins can delete problems and solutions.
