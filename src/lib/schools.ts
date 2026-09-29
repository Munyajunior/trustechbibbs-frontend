/** The seven schools confirmed by the institute, with distinct visual assets. */

export const schools = [
  { key: "engineering", image: "/images/school-engineering.png" },
  { key: "business", image: "/images/school-business-management.png" },
  { key: "health", image: "/images/school-health.png" },
  { key: "education", image: "/images/school-education.png" },
  { key: "communication", image: "/images/school-communication.png" },
  { key: "tourism", image: "/images/school-tourism.png" },
  { key: "agriculture", image: "/images/school-agriculture.png" },
] as const;

export type SchoolKey = (typeof schools)[number]["key"];

export function schoolByKey(value: string) {
  return schools.find((school) => school.key === value);
}
