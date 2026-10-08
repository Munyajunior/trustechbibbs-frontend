import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { getEvents, getGalleryAlbums, getNews, getPrograms } from "@/lib/api/public";
import type { CampusEvent, NewsArticle, Paginated, Program } from "@/lib/api/types";
import { schools } from "@/lib/schools";

// A temporarily unavailable API must not freeze an empty sitemap at build time.
export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const STATIC_PATHS = [
  "", "/about", "/about/leadership", "/schools", "/programs",
  ...schools.map(({ key }) => `/schools/${key}`),
  "/admissions", "/news", "/events", "/gallery", "/contact",
  "/privacy", "/terms", "/accessibility",
];

type Slugged = { slug: string };

async function allPublished<T extends Slugged>(
  getPage: (page: number) => Promise<Paginated<T>>,
): Promise<T[]> {
  const first = await getPage(1);
  const items = [...first.items];
  const totalPages = first.pagination.total_pages;
  for (let page = 2; page <= totalPages; page++) {
    const result = await getPage(page);
    items.push(...result.items);
  }
  return items;
}

function localizedEntries(path: string, priority = 0.7): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`]),
  );
  return routing.locales.map((locale) => ({
    url: `${SITE_URL}/${locale}${path}`,
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = STATIC_PATHS.flatMap((path) => localizedEntries(path, path === "" ? 1 : 0.7));
  const results = await Promise.allSettled([
    allPublished<Program>((page) => getPrograms({ page, per_page: 100 })),
    allPublished<NewsArticle>((page) => getNews({ page, per_page: 100 })),
    allPublished<CampusEvent>((page) => getEvents({ page, per_page: 100 })),
    getGalleryAlbums(),
  ]);
  const sections = ["programs", "news", "events", "gallery"] as const;

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`[sitemap] Could not load published ${sections[index]}`, result.reason);
      return;
    }
    for (const item of result.value) {
      if (item.slug) entries.push(...localizedEntries(`/${sections[index]}/${encodeURIComponent(item.slug)}`, 0.6));
    }
  });

  return entries;
}
