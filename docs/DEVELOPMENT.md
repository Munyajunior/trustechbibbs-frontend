# Development Guide

---

## 1. Prerequisites

| Tool   | Version | Notes                              |
| ------ | ------- | ---------------------------------- |
| Node   | ≥ 20    | Developed against Node 23          |
| npm    | ≥ 10    | Lockfile is npm — don't mix in pnpm/yarn |
| Docker | latest  | Only if you want the backend locally |
| Git    | latest  |                                    |

**Network access is required for the first build**: `next/font` fetches Poppins,
Inter and JetBrains Mono from Google Fonts at build time (then self-hosts them).
Behind a restrictive proxy/CI sandbox, allowlist `fonts.googleapis.com` and
`fonts.gstatic.com` or the build fails with
`Failed to fetch 'Inter' from Google Fonts`.

---

## 2. Setup

```bash
git clone <repo-url>
cd trustechbibbs-frontend

npm install
cp .env.example .env.local     # defaults work as-is
npm run dev
```

Open **http://localhost:3000** — you'll be redirected to `/en`.

The site renders fine with the backend down: content sections fall back to
placeholder text (see [ARCHITECTURE.md](ARCHITECTURE.md) §4). To get real data,
start the backend (see `../trustechbibbs-backend/README.md`) — it listens on
`:8000`.

---

## 3. Scripts

| Command          | What it does                                  |
| ---------------- | --------------------------------------------- |
| `npm run dev`    | Dev server, HMR, on :3000                     |
| `npm run build`  | Production build (type-checks + prerenders)   |
| `npm start`      | Serve the production build                    |
| `npm run lint`   | ESLint                                        |
| `npm test`       | Jest + React Testing Library                  |
| `npm run test:watch` | Jest in watch mode                        |

CI must run `lint`, `test` and `build`. Next 16 removed the `eslint` key from
`next.config.ts`, so **the build no longer lints** — `npm run lint` is a separate
gate now. `build` still type-checks and fails on type errors.

---

## 4. Environment variables

In [`.env.example`](../.env.example). Copy to `.env.local` (gitignored).

| Variable                   | Purpose                                        | Local default                  |
| -------------------------- | ---------------------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL, **including** `/api/v1`      | `http://localhost:8000/api/v1` |
| `NEXT_PUBLIC_SITE_URL`     | Public origin — canonical URLs, sitemap, OG    | `http://localhost:3000`        |
| `NEXT_PUBLIC_ENV`          | `development` / `staging` / `production`       | `development`                  |

> **`NEXT_PUBLIC_` is inlined into the browser bundle at build time.** It is
> public and it is baked in — never put a secret behind that prefix, and remember
> that changing one requires a rebuild, not just a restart. Anything secret must
> stay server-side.

`NEXT_PUBLIC_ENV=production` is what flips `robots.ts` from "disallow all" to
crawlable. Set it on the production deploy and nowhere else.

---

## 5. Folder guide

| Path                  | Put this here                                              |
| --------------------- | ---------------------------------------------------------- |
| `src/app/[locale]/`   | Pages. Every route needs the locale segment.               |
| `src/components/ui/`  | Generic primitives (button, input, card). No domain logic. |
| `src/components/layout/` | Header, footer, switcher                                |
| `src/components/shared/` | Reused non-domain pieces (container, skip link)         |
| `src/components/features/` | Domain components (contact form, program filters)     |
| `src/lib/api/`        | **All** network access. Never `fetch` in a component.       |
| `src/lib/`            | Pure helpers (utils, fonts, json-ld, i18n-field)            |
| `src/stores/`         | Zustand — client state only, never server data              |
| `src/messages/`       | UI strings, EN + FR in lockstep                             |
| `src/i18n/`           | Locale config; edit `routing.ts` to change locales          |

---

## 6. Conventions worth knowing before your first PR

1. **Navigation**: import `Link` / `useRouter` / `usePathname` from
   `@/i18n/navigation`, never `next/link` or `next/navigation`. The wrappers keep
   the locale prefix.
2. **Server-first**: only add `"use client"` for state, events or browser APIs —
   and put it on the leaf component, not the page or layout.
3. **No hex codes**: use design tokens (`bg-primary`, `text-accent`). See
   [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
4. **Strings**: every user-visible string goes in `en.json` **and** `fr.json`.
5. **API content**: resolve `name_en`/`name_fr` with `localizedField()`.
6. **`revalidate` must be a literal number**, not an imported constant.
7. **Mobile-first**: it must work at 320px.

---

## 7. Adding a UI component

Hand-written Shadcn-*style* primitives live in `src/components/ui/` — same
conventions (cva variants + the `cn` helper), no generator dependency.

Add a real Shadcn component when you want one:

```bash
npx shadcn@latest add dialog
```

Then reconcile it with the design system: swap its default palette for our
tokens (`bg-primary`, `border-gray-200`) and check the focus ring still matches
the global `:focus-visible` rule. Don't merge a component carrying Shadcn's
stock colours.

---

## 8. Adding a page

```
src/app/[locale]/admissions/page.tsx
```

```tsx
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

/** Mirrors REVALIDATE.static; must be a literal for Next to apply it. */
export const revalidate = 86400;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admissions.meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}/admissions`,
      languages: { en: "/en/admissions", fr: "/fr/admissions" },
    },
  };
}

export default async function AdmissionsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);   // required for static rendering
  const t = await getTranslations("admissions");
  return <h1>{t("title")}</h1>;
}
```

`params` is a **Promise** — await it. (Changed in Next 15; a synchronous
`params.locale` is a type error.) `setRequestLocale(locale)` is required or the
route silently opts out of static rendering.

Then: add `admissions` to `en.json`/`fr.json`, add the nav item in
`components/layout/header.tsx`, add the route to `app/sitemap.ts`.

---

## 9. Adding an API call

1. Type the resource in `lib/api/types.ts`.
2. Add the function to `lib/api/public.ts` (or a new module file):

```ts
export function getFaqs(query: ListQuery = {}, { locale = "en" }: LocaleOption = {}) {
  return apiList<Faq>("/public/faqs", {
    locale,
    query,
    next: { revalidate: REVALIDATE.static, tags: ["faqs"] },
  });
}
```

3. Add a query key in `lib/query-keys.ts` if it'll be used client-side.
4. Server component: `await getFaqs()` (wrap in `safeFetch` if decorative).
   Client component: `useQuery({ queryKey: queryKeys.faqs.list(), queryFn: ... })`.

---

## 10. Troubleshooting

| Symptom                                          | Cause / fix                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| `Failed to fetch 'Inter' from Google Fonts`      | No network at build time. Allowlist `fonts.googleapis.com`/`fonts.gstatic.com`. |
| `Invalid segment configuration export detected`  | `revalidate`/`dynamic` isn't a literal. See §6.6.                            |
| CORS error in the browser                        | Backend's `CORS_ORIGINS` must include `http://localhost:3000`.               |
| Links drop the `/fr` prefix                      | Imported `Link` from `next/link` instead of `@/i18n/navigation`.             |
| `MISSING_MESSAGE`                                | Key absent from `en.json` (French falls back; English is the floor).         |
| Page unexpectedly dynamic (`ƒ`) in the build table | A `cache: "no-store"` fetch or missing `setRequestLocale`.                 |
| `params.locale` is undefined                     | `params` is a Promise — `const { locale } = await params`.                   |
| Env var change has no effect                     | `NEXT_PUBLIC_*` is inlined at build time — rebuild.                          |
| Warning: `middleware` file convention deprecated | Ensure the file is `src/proxy.ts`, not `src/middleware.ts`.                  |
| Homepage shows placeholder text                  | Backend is down — expected. Start it on :8000.                              |
