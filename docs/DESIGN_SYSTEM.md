# Trustech Design Language (TDL v1.0)

The visual contract for every surface — public website, portals, dashboards.

Tokens are declared once in [`src/app/globals.css`](../src/app/globals.css) inside
Tailwind v4's `@theme` block, which turns each into a real utility
(`--color-primary` → `bg-primary`, `text-primary`, `border-primary`).

> **Never hardcode a hex value in a component.** If you're typing `#0523AC`, use
> `bg-primary`. If a colour you need doesn't exist as a token, add it to `@theme`
> — don't inline it.

---

## 1. Colour

### Primary — Trustech blue

| Token             | Hex       | Use                                  |
| ----------------- | --------- | ------------------------------------ |
| `primary`         | `#0523AC` | Primary buttons, links, active nav   |
| `primary-hover`   | `#041B8A` | Hover/pressed state of the above     |
| `primary-light`   | `#7888D4` | Decorative, disabled, hover borders  |
| `primary-subtle`  | `#E8EBFA` | Tinted backgrounds, focus halo       |

### Accent — gold

| Token            | Hex       | Use                                |
| ---------------- | --------- | ---------------------------------- |
| `accent`         | `#E9BA18` | Highlights, key CTA on dark        |
| `accent-hover`   | `#C89D0C` | Hover state                        |
| `accent-light`   | `#F6DD84` | Decorative                         |
| `accent-subtle`  | `#FDF8E8` | Tinted backgrounds                 |

> **Gold always takes dark text.** White on `#E9BA18` is **2.8:1** and fails
> WCAG AA (4.5:1 minimum). Use `text-gray-900`. The `accent` button variant
> already does this — don't override it.

### Neutrals

Tailwind's default gray ramp: `gray-50` `#F9FAFB` → `gray-900` `#111827`, plus
`white`. Body text is `gray-900`; secondary text `gray-600`; borders `gray-200`.

### Semantic

| Token     | Hex       | Light bg         |
| --------- | --------- | ---------------- |
| `success` | `#059669` | `success-light`  |
| `warning` | `#D97706` | `warning-light`  |
| `error`   | `#DC2626` | `error-light`    |
| `info`    | `#2563EB` | `info-light`     |

### The 60/25/10/5 rule

| Share | Role                       |
| ----- | -------------------------- |
| 60%   | Neutrals (surfaces, text)  |
| 25%   | Primary blue               |
| 10%   | Gold accent                |
| 5%    | Semantic states            |

Gold is a **seasoning**. A page where everything is gold has no emphasis left to
give — the accent only reads as important while it stays rare.

---

## 2. Typography

| Token       | Family          | Weights       | Use                          |
| ----------- | --------------- | ------------- | ---------------------------- |
| `font-display` | Poppins      | 500/600/700   | Hero, H1–H3                  |
| `font-sans` | Inter           | 400/500/600   | Body, UI, dashboards         |
| `font-mono` | JetBrains Mono  | 400/500       | Student IDs, refs, codes      |

Loaded via `next/font/google` in [`src/lib/fonts.ts`](../src/lib/fonts.ts) —
self-hosted, no layout shift, no external request. `h1`–`h3` get `font-display`
automatically from the base layer; you don't need the class on headings.

### Scale

`text-xs` 12 · `text-sm` 14 · `text-base` 16 · `text-lg` 18 · `text-xl` 20 ·
`text-2xl` 24 · `text-3xl` 30 · `text-4xl` 36 · `text-5xl` 48 · `text-6xl` 60

Hero uses the `.text-hero` utility: `clamp(2rem, 5vw, 3.75rem)` — 32px on a
phone, 60px on a desktop, no breakpoint juggling.

---

## 3. Spacing & radii

8px-based scale (Tailwind's default 4px step ×2). Prefer even steps: `p-2` (8),
`p-4` (16), `p-6` (24), `p-8` (32).

| Radius       | Value | Use                    |
| ------------ | ----- | ---------------------- |
| `rounded-sm` | 4px   | Chips, small controls  |
| `rounded-md` | 8px   | Buttons, inputs        |
| `rounded-lg` | 12px  | Cards                  |
| `rounded-xl` | 16px  | Modals, hero panels    |
| `rounded-full` | —   | Pills, avatars         |

---

## 4. Components

### Button ([`ui/button.tsx`](../src/components/ui/button.tsx))

Variants: `primary` · `secondary` · `accent` · `outline` · `ghost` · `destructive`

| Size | Height | Use                       |
| ---- | ------ | ------------------------- |
| `sm` | 36px   | Dense tables, toolbars    |
| `md` | 44px   | **Default** — min tap target |
| `lg` | 52px   | Page-level CTA            |
| `xl` | 60px   | Hero CTA                  |

44px is the default because it's the minimum comfortable touch target. Don't use
`sm` on mobile-primary surfaces.

For a link that looks like a button, apply `buttonVariants({...})` to `<Link>`
rather than nesting a `<button>` inside an anchor (invalid HTML, breaks
keyboard semantics).

### Input ([`ui/input.tsx`](../src/components/ui/input.tsx))

44px default. `Input`, `Textarea`, `Label` exported together.
Pass `invalid` to render the error state, and always wire
`aria-describedby` to the message element.

Every input needs a real `<Label htmlFor>`. A placeholder is **not** a label —
it disappears on focus and screen readers may skip it.

### Card ([`ui/card.tsx`](../src/components/ui/card.tsx))

`Card` (+ `interactive`), `CardHeader`, `CardTitle`, `CardContent`,
`CardFooter`, `Badge`.

`interactive` adds `relative` so a full-card link overlay
(`after:absolute after:inset-0` on the inner `<Link>`) works — that pattern keeps
the whole card clickable while the accessible name stays on the actual link.

---

## 5. Layout & breakpoints

| Name | Min width |
| ---- | --------- |
| `xs` | 375px     |
| `sm` | 640px     |
| `md` | 768px     |
| `lg` | 1024px    |
| `xl` | 1280px    |
| `2xl`| 1536px    |

Content sits in `<Container>` — `max-w-7xl` with responsive gutters.

### Mobile-first is a mandate, not a preference (DP-03)

**Everything must work at 320px.** `body` carries `min-width: 320px`. Write the
mobile style first and layer breakpoints upward:

```tsx
<ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
```

Patterns: nav collapses to a hamburger below `lg`; grids go 1→2→3 columns;
tables become cards on mobile; the student portal gets a bottom tab bar.

---

## 6. Accessibility — WCAG 2.2 AA (target: Lighthouse > 95)

Non-negotiable, checked at review:

- [ ] Contrast ≥ 4.5:1 for text (≥ 3:1 for large text and UI borders).
      Gold gets dark text — always.
- [ ] Colour is never the **only** signal. Pair it with an icon or text.
- [ ] Every interactive element is keyboard reachable, in a sensible tab order.
- [ ] Focus is always visible. The global `:focus-visible` rule handles this —
      never `outline: none` without an equally visible replacement.
- [ ] "Skip to main content" is the first focusable element (`<SkipLink>`).
- [ ] `<html lang>` matches the active locale (handled by the locale layout).
- [ ] Images have `alt`; decorative ones use `alt=""` + `aria-hidden="true"`.
      Every decorative icon in this codebase carries `aria-hidden="true"`.
- [ ] Inputs have real labels; errors are linked via `aria-describedby`.
- [ ] Async status updates live in an `aria-live` region (see `ContactForm`).
- [ ] `prefers-reduced-motion` is honoured — the base layer already neutralises
      animation; don't reintroduce it with inline styles.
- [ ] Tap targets ≥ 44px.

Screen readers, keyboard-only navigation and high contrast are all part of AA.
Test with the keyboard before you ship: tab through the page and make sure you
can see where you are and reach everything.
