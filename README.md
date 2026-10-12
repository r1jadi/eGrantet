# eGrantet

**eGrantet** is a municipal grants and subsidies management platform. Municipalities publish grant programmes with structured requirements; applicants discover grants, check eligibility, apply online with documents, and track every step; municipal staff review, assign evaluators, and make funding decisions — transparently and auditably.

> **Core principle: AI assists. Deterministic rules verify. Humans make final funding decisions.**
>
> AI may summarize applications, analyze documents, and flag inconsistencies. It never approves or rejects funding. Final decisions always belong to authorized humans.

- Production: `https://egrantet.vercel.app`
- Repository: `https://github.com/r1jadi/eGrantet`
- Languages: Albanian (Shqip), English, Serbian (Srpski, Latin)

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database and migrations](#database-and-migrations)
- [Project structure](#project-structure)
- [Authentication and authorization](#authentication-and-authorization)
- [Security notes](#security-notes)
- [SEO, robots, and sitemap](#seo-robots-and-sitemap)
- [Cookies and legal pages](#cookies-and-legal-pages)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Current status and known limitations](#current-status-and-known-limitations)
- [Documentation map](#documentation-map)
- [License](#license)

---

## Features

Applicant side:

- Public grant discovery with search, category, municipality, and sorting filters.
- Grant detail pages with funding, deadline, eligibility, and document requirements.
- Guided multi-step application wizard (applicant info, project plan, budget, documents, eligibility pre-check, review and submit).
- Draft lifecycle with correction-requested resubmission and appeal submission.
- Document upload (PDF, PNG, JPEG up to 10 MB) to private storage with ownership checks.
- Application dashboard, awarded-project portal with milestone evidence submission, notifications inbox, and notification/language preferences.

Municipality side:

- Grant lifecycle management (`DRAFT → PUBLISHED → CLOSED → ARCHIVED`), ordered requirements, and evaluation criteria.
- Application review queue with deterministic eligibility results, AI-assisted document verification panel, AI summaries, and decision letters (generated, human-reviewed, then sent).
- Evaluator assignment (including blind evaluation), milestone tracking, and audit history per application.

Platform administration:

- Platform-wide registry of municipalities, users and roles, grants, applications, evaluations, email deliveries, and the audit trail, protected by the server-side admin allowlist in addition to the `ADMIN` role.

Cross-cutting:

- Deterministic eligibility engine independent of any AI provider.
- Server-side audit logging of important state changes.
- Transactional emails (status changes, decisions, milestones, evaluations) with per-user preferences and deduplication.
- Trilingual UI (sq / en / sr) with cookie-persisted language and light/dark theme.
- Cookie consent with accept / reject / customize, persisted on-device and changeable from the footer.
- Privacy Policy and Terms pages in all three languages, based on the real implementation.
- Content-specific skeleton loaders on all major routes, reduced-motion aware.
- Security headers (CSP, HSTS, `nosniff`, referrer and permissions policies, frame denial) and best-effort in-memory rate limiting on auth, uploads, AI, and email actions.

---

## Tech stack

| Layer      | Technology                                                              |
| ---------- | ----------------------------------------------------------------------- |
| Framework  | Next.js App Router (v16), React 19, TypeScript strict                   |
| Styling    | Tailwind CSS v4, shadcn/ui-compatible components in `src/components/ui` |
| Backend    | Next.js Server Actions (route handlers only for downloads/redirects)    |
| Database   | Supabase PostgreSQL, Auth, and private Storage                          |
| Validation | Zod (server and client), React Hook Form                                |
| AI         | Provider-independent contracts + OpenAI-compatible gateway adapter      |
| Email      | Resend (transactional only)                                             |
| Hosting    | Vercel                                                                  |

Architecture is a modular monolith: UI → Server Actions / Route Handlers → domain services → Supabase. See [ARCHITECTURE.md](./ARCHITECTURE.md). The UI never calls OpenAI or Resend directly and never touches a service-role client.

---

## Getting started

Prerequisites: Node.js 20+ and npm, plus a Supabase project (local via the Supabase CLI or hosted).

```bash
npm install
cp .env.example .env   # then fill in the values, see below
npm run dev            # http://localhost:3000
```

Verify a change with the quality gate:

```bash
npm test          # unit tests (integration tests are opt-in, see below)
npm run lint
npm run build
```

---

## Environment variables

Copy `.env.example` to `.env` and set the values. **Never commit `.env`** (it is git-ignored) and never put secrets in `NEXT_PUBLIC_*` variables.

| Variable                            | Scope      | Purpose                                                                                       |
| ----------------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`              | Public     | Canonical site URL, e.g. `https://egrantet.vercel.app`. Used for metadata, sitemap, and links. |
| `NEXT_PUBLIC_SUPABASE_URL`          | Public     | Supabase project URL.                                                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Public     | Supabase anonymous key (safe for the browser; RLS still applies).                             |
| `SUPABASE_SERVICE_ROLE_KEY`         | Server only | Service-role key. Used exclusively by server-side services after authorization checks.        |
| `AI_API_KEY`                        | Server only | Key for the OpenAI-compatible AI gateway.                                                     |
| `AI_BASE_URL`                       | Server only | Gateway base URL (defaults to the hackathon gateway).                                        |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Server only | Transactional email sending.                                                             |
| `ADMIN_EMAILS`                      | Server only | Comma-separated platform-admin allowlist. Empty = database role/membership model governs.     |
| `RUN_SUPABASE_INTEGRATION_TESTS` + `SUPABASE_TEST_*` | Test only | Opt-in integration tests against a dedicated **non-production** project.       |

`NEXT_PUBLIC_APP_URL` is still honored as a legacy fallback for the app URL, but new deployments should set `NEXT_PUBLIC_SITE_URL`.

Integration tests never run by default. To enable them you must explicitly set `RUN_SUPABASE_INTEGRATION_TESTS=true` with dedicated non-production credentials and fixture IDs.

---

## Database and migrations

- Schema changes live as ordered SQL files in `supabase/migrations/` and follow the existing naming convention (`YYYYMMDDHHMMSS_short_description.sql`).
- **Apply migrations manually through the Supabase Dashboard SQL Editor.** Do not run `supabase db push` against a database that may already contain manually applied migrations, and never reset or mutate the production database from a workstation.
- Row Level Security stays enabled on all domain tables. Never disable RLS to make a feature work; fix the policy or the query scope instead.
- Refresh generated types after schema changes: `npm run db:types` (requires a linked Supabase CLI session).

No migration is required for the current working tree beyond what is already in `supabase/migrations/`.

---

## Project structure

```text
src/
├── app/                    # App Router: public pages, route groups, API routes,
│                           # loading/error states, robots.ts, sitemap.ts, icons
│   ├── (account)/          # notifications + settings (authenticated, any role)
│   ├── (admin)/            # platform administration (ADMIN + allowlist)
│   ├── (applicant)/        # applications, projects, business profile
│   ├── (evaluator)/        # evaluator workspace (assignment-scoped)
│   ├── (municipality)/     # municipality workspace (membership-scoped)
│   ├── (public)/           # home, grant directory, grant details
│   ├── api/documents/      # signed-URL download (auth-checked, 307)
│   ├── api/evidence/       # milestone-evidence download (auth-checked, 307)
│   ├── privacy/ terms/     # legal pages (sq/en/sr content)
│   └── robots.ts sitemap.ts manifest.ts icon.svg apple-icon.png
├── components/
│   ├── ui/                 # generic design-system primitives (no domain logic)
│   ├── shared/             # shells, footer, skeletons, tables, states
│   ├── consent/            # cookie-consent banner + persistence logic + tests
│   └── legal/              # privacy/terms content per locale + tests
├── config/site.ts          # public site metadata (name, URL)
├── lib/
│   ├── auth/               # server session, profile, roles, guards, redirects
│   ├── errors/             # AppError + safe user-facing messages
│   ├── i18n/               # locales (sq/en/sr), dictionaries, provider
│   ├── logging/            # server-side JSON logger (no PII in context)
│   ├── openai/             # server-only AI client + failure mapping
│   ├── resend/             # server-only email client
│   ├── security/           # best-effort in-memory rate limiting + tests
│   ├── supabase/           # browser / server / admin clients + middleware
│   └── validation/         # shared form validation helpers
├── modules/                # domain modules with public contracts via index.ts
│   ├── grants/ applications/ documents/ eligibility/ ai/ evaluations/
│   ├── grantee/ verification/ notifications/ audit/ users/
└── types/database.ts       # generated Supabase types (refresh via db:types)
```

Module rules: `eligibility` never depends on AI; `ai` exposes provider-independent contracts; `documents` owns storage metadata while analysis lives in `ai`/`verification`; services use the service-role client only after server-side authentication and authorization.

---

## Authentication and authorization

Roles: `APPLICANT`, `MUNICIPAL_EMPLOYEE`, `EVALUATOR`, `ADMIN`.

- Authentication is verified server-side from the Supabase session on every sensitive operation. Role, ownership, municipality, and assignment values from the client are never trusted.
- Applicants access only their own applications and documents (IDOR-safe ownership checks on reads, updates, uploads, downloads, and deletions).
- Municipal employees are scoped to municipalities where they hold membership; evaluators only to explicitly assigned applications; admins additionally require the `ADMIN_EMAILS` allowlist when configured.
- The edge proxy refreshes sessions and applies coarse routing; it is not the authorization boundary — layouts, services, RLS policies, and storage checks each re-verify.
- Application downloads and milestone-evidence downloads resolve to short-lived signed URLs only after an authorization check; buckets stay private.

---

## Security notes

Implemented in this codebase:

- Security headers on all routes via `next.config.ts`: Content Security Policy tailored to Next.js inline scripts and Google Fonts, HSTS, `X-Content-Type-Options: nosniff`, strict referrer policy, restrictive permissions policy, and frame denial (`X-Frame-Options: DENY` + `frame-ancestors 'none'`). API routes additionally send `X-Robots-Tag: noindex`.
- Server-side Zod validation at action/route boundaries, strict UUID checks on download IDs (replacing length-only checks), sanitized filenames and storage paths, upload type/size enforcement, and safe error mapping (no stack traces, database internals, or secrets reach users).
- Rate limiting on sign-in/sign-up/password flows, document uploads, AI verification/summary/letter generation, and decision-letter sending. It is intentionally dependency-free and per-instance, so on serverless hosting it is approximate — Supabase Auth's own provider-side limits apply in addition.
- `server-only` boundaries with automated tests asserting no client component (in `app`, `components`, or domain-module components) imports the service-role client.
- `.env` is git-ignored; `.env.example` contains variable names and placeholders only.

Honest limits (see also [Current status](#current-status-and-known-limitations)): no audit can promise zero vulnerabilities. `npm audit` still reports the `braces` chain (fix requires a breaking `eslint-config-next` downgrade, deliberately not applied). Review the [Deployment](#deployment) notes before going live.

---

## SEO, robots, and sitemap

- `metadataBase` uses `NEXT_PUBLIC_SITE_URL` (production fallback `https://egrantet.vercel.app`); root layout defines the `eGrantet` title template, descriptions, Open Graph, Twitter, icons, theme colors, and `WebSite` structured data.
- Public pages (`/`, `/grants`, published `/grants/[id]` via `generateMetadata`, `/privacy`, `/terms`) carry canonical URLs. Authenticated, admin, evaluator, and API routes are `noindex` via metadata or `X-Robots-Tag` — robots rules are a crawling hint only; data protection comes from authentication and authorization.
- `app/robots.ts` allows only canonical public paths and points to the production sitemap. `app/sitemap.ts` lists static public pages plus published grant URLs (with a static-only fallback when the database is unreachable); drafts, applications, documents, and private IDs are never included.
- After deploying, verify the live `/robots.txt` and `/sitemap.xml` on the production domain and register the property in Google Search Console (manual step, code-side prerequisites are in place).

---

## Cookies and legal pages

- The consent banner offers **Accept all / Reject optional / Customize** with equal visual weight, persists the choice on-device, and never treats dismissal as consent. Essential session/security storage always runs; language/theme memory is a preference; no analytics or advertising scripts exist, and none load before consent.
- Reopen preferences anytime via the **Cookie preferences** link in the footer.
- `/privacy` and `/terms` describe the real data practices and rules of this implementation in Albanian, English, and Serbian. They deliberately do not invent a legal entity, address, retention period, or official-government status — the deploying operator must confirm the data-controller identity, contact channel, and retention schedule (tracked below).

---

## Scripts

| Command                  | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `npm run dev`            | Local development server                                       |
| `npm run build`          | Production build                                               |
| `npm run start`          | Serve a production build                                       |
| `npm run lint`           | ESLint (Next.js core-web-vitals)                               |
| `npm test`               | Unit tests (`tsx --test src/**/*.test.ts`)                     |
| `npm run test:integration` | Opt-in Supabase integration tests (needs test credentials)  |
| `npm run db:types`       | Regenerate `src/types/database.ts` via the Supabase CLI        |

---

## Deployment

- Deploy on Vercel from this repository (`vercel.json` uses the Next.js framework preset). Set all [environment variables](#environment-variables) in the project dashboard — never commit them.
- Apply any pending SQL in `supabase/migrations/` manually via the Supabase Dashboard SQL Editor, in filename order, and verify RLS policies afterwards.
- If Supabase runs on a custom domain, extend `connect-src` in `next.config.ts` accordingly.
- After first deploy: open `/robots.txt`, `/sitemap.xml`, `/icon.svg`, `/apple-icon.png`, `/manifest.webmanifest`, `/privacy`, and `/terms` on the production domain; submit the sitemap in Google Search Console; confirm security headers on a public page.

---

## Current status and known limitations

What is implemented and verified (`npm test`, `npm run lint`, `npm run build` all pass; live-route smoke test against dummy backends passes):

- Full grant lifecycle, applications with drafts/corrections/appeals, document uploads and signed-URL downloads, deterministic eligibility, AI-assisted verification/summaries/decision letters (advisory only), evaluations with blind assignments, notifications with preferences, audit trail, milestones with evidence, trilingual UI, cookie consent, footer with legal pages, skeletons, SEO foundation, and the hardening listed above.

What the owner must still confirm or do manually (not code defects):

1. **Legal details:** confirm the data-controller identity, privacy-contact channel, and retention schedule, then reflect them in `/privacy` and the Terms contact section.
2. **Database:** apply migrations manually in the Supabase Dashboard; never `db push` blindly. No new migration is included in this change set.
3. **Search:** register the site in Google Search Console and submit `/sitemap.xml`; indexing itself is Google's decision, not something a sitemap guarantees.
4. **GitHub/Vercel:** review the working tree, commit, push, and deploy manually — publishing was intentionally left untouched.
5. **Security:** remaining `npm audit` high finding (`braces` via `eslint-config-next`) needs an upstream non-breaking fix; rate limiting is per-instance best-effort; the evidence-download endpoint currently serves municipality members (fail-closed for others) — applicant self-service evidence download is a possible follow-up, not a vulnerability.

Task tracking lives in [TASKS.md](./TASKS.md); architecture decisions in [ARCHITECTURE.md](./ARCHITECTURE.md); agent workflow rules in [AGENTS.md](./AGENTS.md).

---

## License

ISC — see `package.json`.
