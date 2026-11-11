# BuildThis

People post the problems they want an app for, everyone upvotes the ones they share,
and builders ship solutions and compete on the same problem.

See [plan.md](plan.md) for the full plan. Currently at **milestone 1: validation landing**.

## Stack

Vite + React + TypeScript · Tailwind + shadcn/ui · react-i18next (EN/GR) · Firebase (Hosting, Firestore, App Check, Analytics)

## Setup

```sh
npm install
cp .env.example .env.local   # fill in your Firebase web app config
npm run dev
```

`.env.local` is gitignored. Firebase web config values are not secret (they ship in the client bundle),
but keeping them out of the repo lets forks point at their own project. Access is enforced by
[`firestore.rules`](firestore.rules) and App Check.

## Translations

English is the source. After editing `src/i18n/locales/en/*.json`:

```sh
npx github:stanimeros/i18n-sync   # needs GEMINI_API_KEY in .env.local
```

Commit `i18n.lock.json` with the locale files.

## Deploy

```sh
npm run build
firebase deploy --only hosting,firestore:rules
```
