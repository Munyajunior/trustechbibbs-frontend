/** The seven schools confirmed by the institute, with distinct visual assets. */

export const schools = [
  { key: "engineering", image: "/site-media/school-engineering" },
  { key: "business", image: "/site-media/school-business" },
  { key: "health", image: "/site-media/school-health" },
  { key: "education", image: "/site-media/school-education" },
  { key: "communication", image: "/site-media/school-communication" },
  { key: "tourism", image: "/site-media/school-tourism" },
  { key: "agriculture", image: "/site-media/school-agriculture" },
] as const;

export type SchoolKey = (typeof schools)[number]["key"];

export function schoolByKey(value: string) {
  return schools.find((school) => school.key === value);
}
