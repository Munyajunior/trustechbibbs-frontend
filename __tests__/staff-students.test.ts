import { STUDENT_STATUSES } from "@/lib/api/students";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

type Tree = { [key: string]: string | Tree };

function leafPaths(node: Tree, prefix = ""): string[] {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : leafPaths(value, `${prefix}${key}.`),
  );
}

describe("staff student lookup messages", () => {
  const enBlock = (en as unknown as { staffStudents: Tree }).staffStudents;
  const frBlock = (fr as unknown as { staffStudents: Tree }).staffStudents;

  test("English and French define exactly the same keys", () => {
    expect(leafPaths(frBlock).sort()).toEqual(leafPaths(enBlock).sort());
  });

  test("every enrolment status has a label in both languages", () => {
    for (const block of [enBlock, frBlock]) {
      const statuses = block.statuses as Tree;
      for (const status of STUDENT_STATUSES) expect(typeof statuses[status]).toBe("string");
    }
  });

  test("the staff navigation has a students entry in both languages", () => {
    const nav = (lang: unknown) => (lang as { staffDashboard: { nav: Record<string, string> } }).staffDashboard.nav;
    expect(nav(en).students).toBeTruthy();
    expect(nav(fr).students).toBeTruthy();
  });

  test("French copy does not use an ampersand in names", () => {
    expect(JSON.stringify(frBlock)).not.toContain("&");
  });
});
