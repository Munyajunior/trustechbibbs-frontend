# Frontend Architecture

Next.js 16 (App Router) + React 19 + TypeScript, talking to the FastAPI backend
over REST. Decoupled: the frontend renders and caches; the backend owns all
business rules.

---

## 1. Directory map

```
src/
  app/
    [locale]/            Every user-facing route lives under a locale segment
      layout.tsx         Root layout: <html lang>, fonts, providers, chrome
      page.tsx           Homepage
      programs/          Catalogue + [slug] detail
      about/ news/ events/ contact/
      not-found.tsx      404 inside the locale shell
      error.tsx          Route error boundary (client component)
    globals.css          Design tokens (@theme) + base layer
    sitemap.ts robots.ts Generated at build
  components/
    ui/                  Primitives: button, input, card
    layout/              Header, footer, language switcher
    shared/              Container, skip link, page header
    features/            Domain components (e.g. contact-form)
    providers.tsx        React Query provider
  i18n/
    routing.ts           Locale config (single source of truth)
    navigation.ts        Locale-aware Link / router / usePathname
    request.ts           Per-request messages (with EN fallback merge)
    deep-merge.ts        Recursive fallback overlay
  lib/
    api/                 client.ts · public.ts · types.ts · safe.ts
    fonts.ts utils.ts json-ld.ts i18n-field.ts query-keys.ts
  messages/              en.json · fr.json
  stores/                Zustand (client state only)
  proxy.ts               Locale negotiation (Next 16 name for middleware)
```

---

## 2. Routing & locale

Every route sits under `app/[locale]/`. `src/proxy.ts` negotiates the locale and
redirects `/` → `/en`. Both locales are always prefixed, so every URL is
unambiguous and independently indexable.

> **Next 16 renamed `middleware.ts` → `proxy.ts`.** The old name still works but
> emits a deprecation warning. next-intl still exports the handler as
> `createMiddleware`; only the filename changed.

**Always** import navigation from `@/i18n/navigation`, never from `next/link` or
`next/navigation`:

```ts
import { Link, useRouter, usePathname } from "@/i18n/navigation";
```

Those wrappers preserve the locale prefix. A raw `next/link` drops it and throws
the user back to English.

---

## 3. Server vs client components

**Server by default.** Only add `"use client"` when you need:

- state/effects (`useState`, `useEffect`)
- event handlers (`onClick`, `onSubmit`)
- browser APIs
- React Query hooks

Currently client: `providers.tsx`, `header.tsx`, `language-switcher.tsx`,
`contact-form.tsx`, `error.tsx`. Everything else renders on the server and ships
zero JS.

Push `"use client"` to the **leaves**. Marking a layout as client makes its
entire subtree client and blows the 200KB budget. If a page needs one
interactive widget, extract that widget — don't convert the page.

---

## 4. Data fetching — two paths, one rule

| Where                | Tool                            | Use for                          |
| -------------------- | ------------------------------- | -------------------------------- |
| Server Component     | `lib/api/public.ts` + `await`   | Initial page content, SEO-visible |
| Client Component     | React Query + the same functions | Interactive: filters, search, mutations |

**Rule: if the content must be in the HTML for SEO or first paint, fetch it on
the server.** React Query is for what happens *after* the page is interactive.

### The API client

`lib/api/client.ts` is the only place that calls `fetch`:

- base URL from `NEXT_PUBLIC_API_BASE_URL` (never hardcode a host)
- attaches `Accept-Language` and the Bearer token
- unwraps the `{success, data, meta}` envelope down to `data`
- throws `ApiError` (backend responded with a failure envelope) or
  `ApiUnreachableError` (network/DNS/CORS — backend is down)

`ApiError` carries both `message_en` and `message_fr`; call
`error.localizedMessage(locale)`.

Add new endpoints to `lib/api/public.ts` (or a sibling), not inline in a
component. Components should never know a URL string.

### Graceful degradation

Public pages are statically generated, so **a thrown error at build time fails
the whole build**. `lib/api/safe.ts` wraps decorative fetches and degrades to a
fallback instead:

```ts
const { data, failed } = await safeFetch(getPrograms(), EMPTY_LIST, "home:programs");
```

Use `safeFetch` for supporting sections (homepage program teasers, news strip).
**Don't** use it where the data *is* the page — a program detail page with no
program should 404, not render an empty shell. That's why
`programs/[slug]/page.tsx` maps a 404 onto `notFound()` and lets everything else
bubble to `error.tsx`.

### ISR

`export const revalidate` per route:

| Route            | Window | Constant             |
| ---------------- | ------ | -------------------- |
| Homepage         | 1h     | `REVALIDATE.dynamic` |
| News, events     | 1h     | `REVALIDATE.dynamic` |
| Programs, about  | 24h    | `REVALIDATE.static`  |

> `revalidate` **must be a literal** (`export const revalidate = 3600`). Next
> statically analyses segment config at build time, so
> `export const revalidate = REVALIDATE.dynamic` silently fails to apply and the
> build errors with "Invalid segment configuration export". The `REVALIDATE`
> constants stay the documented source of truth for the *fetch-level* windows;
> keep the two in sync by hand.

---

## 5. State management

| Kind                                   | Home           |
| -------------------------------------- | -------------- |
| Server data (programs, news, results)  | **React Query** |
| Session/user identity, UI prefs        | **Zustand**     |
| URL-derived state (filters, page, tab) | **The URL**     |
| Local widget state                     | `useState`      |

**The boundary that matters:** never copy server data into Zustand. The moment
you do, you own cache invalidation by hand and the two drift. React Query already
handles staleness, refetching and dedup.

Filters belong in the query string, not a store — it makes the page shareable,
back-button-correct and server-renderable.

`stores/auth-store.ts` persists **identity only**; the access token is never
written to localStorage (XSS would exfiltrate it) and the refresh token lives in
an httpOnly cookie set by the backend.

Query keys are centralised in `lib/query-keys.ts` — build keys from there so
invalidation stays reliable.

---

## 6. i18n

See [I18N.md](I18N.md). Two mechanisms, don't confuse them:

- **UI strings** → next-intl (`src/messages/*.json`), via `useTranslations` /
  `getTranslations`.
- **API content** → bilingual column pairs (`name_en` / `name_fr`) resolved with
  `localizedField(record, "name", locale)` from `lib/i18n-field.ts`.

---

## 7. Error handling

```
ApiError            backend returned a failure envelope  → show localized message
ApiUnreachableError network failure                       → show generic fallback
error.tsx           uncaught render/data error in [locale] → retry UI
not-found.tsx       notFound() or unknown locale           → 404 in the shell
```

---

## 8. Deviations from the spec

Recorded deliberately:

| Spec says       | Built with     | Why                                                    |
| --------------- | -------------- | ------------------------------------------------------ |
| Next.js 15+     | **Next 16.2**  | Current stable; satisfies "15+". Brings the `proxy` rename. |
| TailwindCSS 3.4+| **Tailwind 4** | Current stable, CSS-first `@theme`. No `tailwind.config.ts`. |
| Shadcn/ui       | Shadcn-**style** primitives, hand-written | Same cva/`cn` conventions, no generator dependency. Add real Shadcn components with the CLI as needed. |

Also: `project.md` recommends NestJS + Cloudflare Workers. The v2.0 specs (SRS,
UAS, FRS, SAD) all specify FastAPI + Next.js + Nginx/Docker, and those win —
`project.md` is the older vision document.
