import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { schools } from "@/lib/schools";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Static routes present for every locale. */
const STATIC_PATHS = ["", "/about", "/schools", "/programs", ...schools.map(({ key }) => `/schools/${key}`), "/admissions", "/admissions/application", "/admissions/login", "/admissions/register", "/admissions/status", "/news", "/events", "/gallery", "/contact", "/privacy", "/terms", "/accessibility"];

/**
 * Sitemap with hreflang alternates.
 *
 * TODO(Phase 1): append dynamic entries for each program/news slug by calling
 * getPrograms()/getNews() here once the CMS is populated.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return routing.locales.flatMap((locale) =>
    STATIC_PATHS.map((path) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "" ? ("daily" as const) : ("weekly" as const),
      priority: path === "" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((alt) => [alt, `${SITE_URL}/${alt}${path}`]),
        ),
      },
    })),
  );
}
