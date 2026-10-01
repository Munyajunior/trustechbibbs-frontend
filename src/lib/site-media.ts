/** Editable image slots and their bundled fallback assets. */
export const siteMediaFallbacks = {
  logo: "/images/trustech-shield.jpg",
  hero: "/images/hero-student.png",
  "about-main": "/images/school-business-management.png",
  "about-small": "/images/school-health.png",
  "about-schools": "/images/school-education.png",
  admissions: "/images/hero-student.png",
  contact: "/images/school-education.png",
  "news-hero": "/images/school-communication.png",
  "events-hero": "/images/school-tourism.png",
  "programs-hero": "/images/school-engineering.png",
  "school-engineering": "/images/school-engineering.png",
  "school-business": "/images/school-business-management.png",
  "school-health": "/images/school-health.png",
  "school-education": "/images/school-education.png",
  "school-communication": "/images/school-communication.png",
  "school-tourism": "/images/school-tourism.png",
  "school-agriculture": "/images/school-agriculture.png",
  "program-business": "/images/program-business.png",
  "program-finance": "/images/program-finance.png",
  "program-biomedical": "/images/program-biomedical.png",
  "program-health": "/images/school-health.png",
  "program-engineering": "/images/school-engineering.png",
  "program-education": "/images/school-education.png",
  "program-communication": "/images/school-communication.png",
  "program-tourism": "/images/school-tourism.png",
  "program-agriculture": "/images/school-agriculture.png",
} as const;

export type SiteMediaSlot = keyof typeof siteMediaFallbacks;
export const siteMediaSrc = (slot: SiteMediaSlot) => `/site-media/${slot}`;
