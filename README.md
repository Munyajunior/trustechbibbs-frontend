# THIBBS Frontend — Digital Campus Platform

Next.js frontend for TRUSTECH UNIVERSITY INSTITUTE OF BUSINESS MANAGEMENT AND
BIOMEDICAL SCIENCES (internal project code: THIBBS) — the bilingual (EN/FR) public website
and, in later phases, the student and staff portals.

Talks to the FastAPI backend in [`../trustechbibbs-backend`](../trustechbibbs-backend).

> **New here? Start with [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).**

---

## Stack

| Concern      | Choice                                    |
| ------------ | ----------------------------------------- |
| Framework    | Next.js 16 (App Router) + React 19        |
| Language     | TypeScript 5                              |
| Styling      | TailwindCSS 4 (CSS-first `@theme` tokens) |
| Components   | Shadcn-style primitives + lucide-react    |
| Server state | TanStack Query v5                         |
| Client state | Zustand                                   |
| Forms        | react-hook-form + Zod v4                  |
| i18n         | next-intl v4 (`/en`, `/fr`)               |
| Animation    | motion (Framer Motion)                    |
| Testing      | Jest + React Testing Library              |

Design system: **Trustech Design Language (TDL v1.0)** — see
[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).

---

## Quickstart

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

→ **http://localhost:3000** (redirects to `/en`)

The site runs with the backend down — content sections degrade to placeholders.
For real data, start the backend on `:8000`.

> First build needs internet: `next/font` fetches Poppins/Inter/JetBrains Mono
> from Google Fonts, then self-hosts them.

### Docker

```bash
pnpm build:docker
docker run -p 3000:3000 thibbs-frontend
```

---

## Scripts

| Command              | What it does                                |
| -------------------- | ------------------------------------------- |
| `pnpm dev`          | Dev server with HMR                         |
| `pnpm build`        | Native production build                    |
| `pnpm build:docker` | Production build in Linux Docker           |
| `pnpm start`        | Serve the production build                 |
| `pnpm lint`         | ESLint                                     |

On Windows, native `pnpm build` can fail if the machine's security policy
rejects SWC's native binding cache (`ERR_SWC_NATIVE_CACHE`). Use
`pnpm build:docker` in that environment. This command builds and type-checks
the same production application in Linux. For deployment, supply the required
`NEXT_PUBLIC_*` values with `docker build --build-arg ...` because they are
embedded at build time; passing them only to `docker run` does not update the
browser bundle.

Next 16 dropped the `eslint` key from `next.config.ts`, so **`build` no longer
lints** — run `lint` as its own CI gate.

---

## Environment

| Variable                   | Purpose                                  | Default                        |
| -------------------------- | ---------------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL, including `/api/v1`    | `http://localhost:8000/api/v1` |
| `NEXT_PUBLIC_SITE_URL`     | Public origin (canonical, sitemap, OG)   | `http://localhost:3000`        |
| `NEXT_PUBLIC_ENV`          | `development` / `staging` / `production` | `development`                  |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Public reCAPTCHA v2 checkbox key for the contact form | unset |

`NEXT_PUBLIC_*` is inlined into the browser bundle at build time — public, and
baked in. Never put a secret there.
Set the matching reCAPTCHA secret and allowed frontend hostname in the backend
environment. Staging and production contact forms remain unavailable until the
site key and backend verification settings are configured.

---

## Layout

```
src/
  app/[locale]/     Pages (home, about, programs[/slug], news, events, contact)
  components/       ui/ · layout/ · shared/ · features/ · providers
  lib/api/          Typed API client — the only place that calls fetch
  lib/              utils · fonts · json-ld · i18n-field · query-keys
  i18n/             routing · navigation · request · deep-merge
  messages/         en.json · fr.json
  stores/           Zustand (client state only)
  proxy.ts          Locale negotiation (Next 16's name for middleware)
```

---

## Documentation

| Document                                      | What's in it                                                  |
| --------------------------------------------- | ------------------------------------------------------------- |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md)         | Setup, env, scripts, adding pages/components, troubleshooting  |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)       | App Router, server vs client, data fetching, state boundaries  |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)     | Colour, type, spacing, components, a11y checklist              |
| [I18N.md](docs/I18N.md)                       | next-intl setup, EN/FR parity, fallback, new locales           |
| [PERFORMANCE_SEO.md](docs/PERFORMANCE_SEO.md) | Budgets, ISR, images, metadata, structured data                |
| [CONTRIBUTING.md](CONTRIBUTING.md)            | Branches, commits, style, PR checklist                         |

Product specs (BRD, SRS, FRS, UAS) live in the parent directory.

---

## Non-negotiables

- **Mobile-first**: everything works at **320px**.
- **Bilingual**: every string in `en.json` *and* `fr.json`; French runs ~15–20% longer.
- **WCAG 2.2 AA**: keyboard reachable, visible focus, labelled inputs, ≥4.5:1 contrast.
- **Budget**: initial JS < 200KB, LCP < 2.5s on 3G. Server components by default.
- **Tokens, not hex codes.**
- Navigation imports come from `@/i18n/navigation`, never `next/link`.

---

## Status

Phase 1 scaffold. Homepage, program catalogue + detail (with Schema.org JSON-LD),
about, news, events and a working contact form are wired to the API client with
graceful degradation. Pages marked `TODO(Phase 1)` still need their filters,
calendar views, CMS content and the admissions wizard — the plumbing is in place.
