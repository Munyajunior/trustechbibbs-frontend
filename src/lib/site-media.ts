/** Editable image slots and their bundled fallback assets. */
export const siteMediaFallbacks = {
  logo: "/images/glotech-shield.webp",
  hero: "/images/hero-student.webp",
  "about-main": "/images/school-business-management.webp",
  "about-small": "/images/school-health.webp",
  "about-schools": "/images/school-education.webp",
  admissions: "/images/hero-student.webp",
  contact: "/images/school-education.webp",
  "news-hero": "/images/school-communication.webp",
  "events-hero": "/images/school-tourism.webp",
  "programs-hero": "/images/school-engineering.webp",
  "research-hero": "/images/program-biomedical.webp",
  "careers-hero": "/images/school-business-management.webp",
  "alumni-hero": "/images/hero-student.webp",
  "partnerships-hero": "/images/school-communication.webp",
  "school-engineering": "/images/school-engineering.webp",
  "school-business": "/images/school-business-management.webp",
  "school-health": "/images/school-health.webp",
  "school-education": "/images/school-education.webp",
  "school-communication": "/images/school-communication.webp",
  "school-tourism": "/images/school-tourism.webp",
  "school-agriculture": "/images/school-agriculture.webp",
  "program-business": "/images/program-business.webp",
  "program-finance": "/images/program-finance.webp",
  "program-biomedical": "/images/program-biomedical.webp",
  "program-health": "/images/school-health.webp",
  "program-engineering": "/images/school-engineering.webp",
  "program-education": "/images/school-education.webp",
  "program-communication": "/images/school-communication.webp",
  "program-tourism": "/images/school-tourism.webp",
  "program-agriculture": "/images/school-agriculture.webp",
} as const;

export type SiteMediaSlot = keyof typeof siteMediaFallbacks;
export const siteMediaSrc = (slot: SiteMediaSlot) => `/site-media/${slot}`;

/** Width of the smaller bundled variant (`<name>-768.webp`) served to narrow screens. */
export const SITE_MEDIA_SMALL_WIDTH = 768;

/** Bundled fallback for a slot, swapped for its 768px sibling when a small width is requested. */
export function siteMediaFallbackFor(fallback: string, width: number): string {
  return width > 0 && width <= SITE_MEDIA_SMALL_WIDTH && fallback.endsWith(".webp") && !fallback.includes("glotech-shield")
    ? fallback.replace(/\.webp$/, `-${SITE_MEDIA_SMALL_WIDTH}.webp`)
    : fallback;
}
