import { defineRouting } from "next-intl/routing";

/**
 * Locale routing for the platform.
 *
 * Both locales are prefixed (`/en/programs`, `/fr/programs`) so every URL is
 * unambiguous and independently indexable — an SEO requirement.
 *
 * Adding translated pathnames later (e.g. `/fr/programmes`) is a local change:
 * add a `pathnames` map here and next-intl rewrites them everywhere, because
 * all navigation goes through the wrappers in `src/i18n/navigation.ts`.
 * See docs/I18N.md.
 */
export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
