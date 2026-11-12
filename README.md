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
- `/issues/:id`, `/issues/:id/edit` and `/issues/:id/submit` are served by `issue*.html` through
  Firebase Hosting rewrites (mirrored in `astro.config.mjs` for dev).

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

Admins: create an (empty) document `admins/{uid}` in the Firebase console. Admins can delete issues and solutions.
