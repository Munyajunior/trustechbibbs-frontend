# Contributing — THIBBS Frontend

## Branches

```
main                       protected; always deployable
develop                    integration branch
feature/<ticket>-<slug>    feature/THB-118-program-filters
fix/<ticket>-<slug>        fix/THB-203-mobile-nav-focus-trap
chore/<slug>               chore/bump-next
hotfix/<slug>              branched from main
```

Branch from `develop`; PR back into `develop`. Only hotfixes touch `main`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat(programs): add school and level filters
fix(i18n): keep locale prefix when switching on detail pages
style(header): align nav to the 8px grid
docs(design-system): document gold contrast rule
test(contact): cover validation errors
chore(deps): bump next to 16.2
```

Types: `feat` `fix` `docs` `style` `refactor` `test` `chore` `perf`.
Scope = the feature area. Imperative mood, no trailing period.

## Code style

```bash
npm run lint      # ESLint (separate gate — build no longer lints in Next 16)
npm test          # Jest + RTL
npm run build     # type-checks and prerenders
```

### Components

- **Server by default.** Add `"use client"` only for state, effects, event
  handlers or browser APIs — and put it on the **leaf**, not a page or layout.
  A client layout makes its whole subtree client and blows the 200KB budget.
- One component per file; named exports (default exports only for pages/layouts,
  where Next requires them).
- `src/components/ui/` = generic primitives, no domain knowledge.
  `src/components/features/` = domain components.
- Accept `className` and merge it with `cn()`.
- Variants via `cva`, not prop-driven ternaries in JSX.

### Styling

- **Design tokens only** — `bg-primary`, `text-accent`. Never a raw hex.
- Mobile-first: base styles, then `sm:`/`lg:` upward. Must work at 320px.
- Gold (`accent`) always takes dark text — white on gold fails AA.

### i18n

- Every user-visible string goes in **`en.json` and `fr.json` together**.
- Namespace by feature. Use ICU for plurals/interpolation — never concatenate
  fragments (it breaks in French).
- API content: `localizedField(record, "name", locale)`, don't reach for
  `record.name_en` directly.
- Import `Link`/`useRouter`/`usePathname` from `@/i18n/navigation`, **never**
  `next/link` or `next/navigation` — raw imports drop the locale prefix.

### Data

- All network access goes through `src/lib/api/`. Never `fetch` in a component.
- Server component → `await` the api function (wrap in `safeFetch` if the section
  is decorative). Client component → React Query with a key from `query-keys.ts`.
- **Never** copy server data into Zustand. React Query owns server state;
  Zustand owns session/UI state. Filters belong in the URL.
- `export const revalidate` must be a **literal number**.

### Accessibility

Reviewed on every PR — see [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) §6:
real `<label htmlFor>` (a placeholder is not a label), `aria-describedby` on
error messages, `aria-hidden` on decorative icons, visible focus, keyboard
reachable, ≥44px tap targets.

## Pull requests

Before requesting review:

- [ ] `npm run lint` clean
- [ ] `npm test` passes
- [ ] `npm run build` succeeds; route table has no unexpected `ƒ` (dynamic) routes
- [ ] Renders at **320px**
- [ ] Checked in **both EN and FR** (French runs ~15–20% longer — watch overflow)
- [ ] Keyboard-navigable with visible focus
- [ ] No new `"use client"` on a page or layout
- [ ] No hardcoded hex colours or raw strings
- [ ] New public page: metadata + canonical/alternates + sitemap entry
- [ ] Screenshots (mobile + desktop) for visual changes

PR description: what changed, why, how it was verified, ticket link.
