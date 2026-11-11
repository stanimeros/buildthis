# BuildThis — plan

> Working name. Swap it once validation picks a winner (see "Name ideas").

## Core idea

Most apps start from one founder's own pain, plus the hope that other people share it.
BuildThis turns that around: **people post the problems they want an app for, everyone votes,
and developers/founders build solutions and compete on the same problem.**

- **People with problems** → post an issue ("I want an app that…"), upvote the ones they share.
- **Builders** → pick a top-voted issue, ship a solution, link it on the issue page.
- **Competition** → several builders can solve the same issue; users vote on the solutions too.
  The best solution rises to the top.

Builders get validated demand and their first users before they write code. Users get the app they asked for.

## Step 1: validate before building

Goal: find out if people will actually **post and vote**, and if builders care.

1. Landing page (EN/GR) with the pitch, a few example issues, and two CTAs:
   - "I have a problem to solve" → email + short text of the issue
   - "I'm a builder" → email + what they build with
2. Posts on social media: X, LinkedIn, Instagram, Reddit (r/SideProject, r/startups, r/indiehackers), Greek dev groups.
   - Hook: "Stop guessing what to build. Tell us what you'd pay for."
   - Show 3–5 real seed issues and ask people to vote in the comments.
3. Run it for **2 weeks**. Success if:
   - ≥ 100 sign-ups total
   - ≥ 30 issues submitted (not seeded by us)
   - ≥ 15 builders sign up
4. Pass → build the MVP below. Fail → change the pitch or drop it.

## MVP scope (keep it small)

### Pages
- `/` — landing: pitch, top issues, CTA
- `/issues` — list, sorted by **Top / New**, simple category filter
- `/issues/:id` — issue details, upvote, list of solutions, "I'm building this" button
- `/new` — post an issue (title, description, category, platform: web / iOS / Android / any)
- `/issues/:id/submit` — submit a solution (name, URL, short description)
- `/me` — my issues, my votes, my solutions

### Features
- Sign in with Google + email link (Firebase Auth)
- Post issue, upvote issue (one vote per user)
- "I'm building this" — builders claim interest, the count is shown on the issue
- Submit a solution, upvote solutions
- EN/GR toggle (UI only; user content stays in the language it was written in)
- Light/dark theme

### Onboarding / account (minimal, but collects data)
An account is required to post, vote or claim. Onboarding happens once, right after first sign-in, as 2 short steps:
1. **What brings you here?** → I have problems / I build things / Both
2. **About you** → display name (prefilled from Google), country, and for builders: main stack (chips: web, iOS, Android, AI, no-code…) + optional link (GitHub/site)

Stored on `users/{uid}` with `onboardedAt`, `lang`, and the sign-up source (`utm_source` / referrer, so we know which social post brought them).
The `/me` page lets users edit these fields and delete their account (GDPR).

### Out of scope for MVP
Comments, notifications, builder profiles/portfolios, moderation tools beyond admin delete, search.

## Monetisation

**Free for now. No payments in the MVP.** Ideas for later, once there are users:
- Paid access to "unlocking" ideas (full details / contact with the people who voted) vs. free random listings only
- Featured listing for builders' solutions
- Bounties: users pledge money to an issue

Keep the data model open to this (an issue can get a `visibility` field later), but don't build it now.

## Tech

- **Vite + React + TypeScript**
- **shadcn/ui + Tailwind** — clean, minimal theme (neutral base, one accent colour, rounded, lots of whitespace)
- **i18n:** `react-i18next`, files at `src/i18n/locales/{lang}/{ns}.json`, languages `en` (primary) + `el`.
  Translations are kept in sync with the local **i18n-sync** CLI (`~/Developer/i18n-sync`): write the English strings,
  run `npx i18n-sync`, then commit `i18n.lock.json` with the locale files. The `i18n-sync.config.json` gets a `context` about BuildThis
  and a glossary (BuildThis, upvote, builder, issue → keep in English where natural).
- **Firebase:** Hosting, Auth, Firestore, App Check. Project `buildthis-stanimeros` (Spark plan), hosting site `buildthis-stanimeros`
- **Domain:** `buildthis.stanimeros.com`: connected as a custom domain on Firebase Hosting, with a CNAME (DNS-only) in Cloudflare pointing to `buildthis-stanimeros.web.app`
- Analytics: Firebase Analytics for sign-up / onboarding / post / vote / claim events

### Rate limiting / abuse: rules first, Functions only if needed
Firestore rules alone can do this, so the MVP can stay on the free Spark plan:
- **Write cooldown:** each user has `users/{uid}.lastIssueAt` and `users/{uid}.lastSolutionAt`. Creating an issue must be a batched write that also sets
  `lastIssueAt = request.time`, and the rule checks `getAfter(user).lastIssueAt == request.time` **and** that the previous value is older than, e.g., 10 minutes.
  The same pattern gives "max 1 solution per issue per user".
- **Votes:** the vote doc id is the voter's `uid`, so there is only one vote per user. The counter update (`votes + 1`) is allowed only when the same batch creates the
  vote doc (`existsAfter` / `!exists`), and only by exactly ±1.
- **Field validation:** title/body lengths, allowed categories/platforms, `authorId == request.auth.uid`, `createdAt == request.time`.
- **App Check (reCAPTCHA Enterprise)** to block scripted clients.

What rules **cannot** do well: daily caps (e.g. max 5 issues/day), IP-based limits, spam/profanity filtering, sign-up form abuse on the landing page.
→ Add **Cloud Functions** (needs the Blaze plan, cost is ~0 at this scale) only if that shows up, or for the landing sign-up form if it gets spammed.

### Firestore model
```
users/{uid}            { name, photo, role: "user"|"builder"|"both", country, stack[], link, lang, source,
                         lastIssueAt, lastSolutionAt, onboardedAt, createdAt }
issues/{id}            { title, body, category, platform, authorId, votes, builders, solutions, createdAt }
issues/{id}/votes/{uid}        { createdAt }
issues/{id}/builders/{uid}     { createdAt }
solutions/{id}         { issueId, title, url, body, authorId, votes, createdAt }
solutions/{id}/votes/{uid}     { createdAt }
signups/{id}           { email, type: "problem"|"builder", text, lang, createdAt }   // validation landing
```
Vote counts are updated in the same batched write as the vote doc, and the rules enforce it (see Rate limiting). Only the author can edit their own issue/solution.

## Milestones

1. **Validation landing** — landing + sign-up form + Firebase Hosting (1–2 days)
2. Social media push, 2 weeks, track numbers above
3. **MVP** — auth, issues, votes, solutions, EN/GR (≈ 1 week)
4. Seed with the issues from validation, invite the builders who signed up

## Open questions
- Final name (hosting is `buildthis.stanimeros.com` for now)
- Moderate new issues before they go public, or post-moderate?

## Name ideas
BuildThis · Wishboard · PainPoint · Ask2Build · NeedIt
