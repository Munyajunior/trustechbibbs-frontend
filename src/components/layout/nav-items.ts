export const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/schools", key: "schools" },
  { href: "/programs", key: "programs" },
  { href: "/admissions", key: "admissions" },
  { href: "/news", key: "news" },
  { href: "/events", key: "events" },
  { href: "/gallery", key: "gallery" },
  { href: "/contact", key: "contact" },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];
