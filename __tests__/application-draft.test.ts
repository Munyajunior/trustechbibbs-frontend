import {
  AUTOSAVE_INTERVAL_MS,
  STEPS,
  buildUpdatePayload,
  emptyValues,
  firstIncompleteStep,
  hasUnsavedChanges,
  isValidCompletionYear,
  missingRequiredDocuments,
  snapshot,
  stepComplete,
  stepErrors,
  valuesFromApplication,
  type DraftValues,
} from "@/lib/application-draft";

const now = new Date("2026-11-11T10:00:00Z");
const filled: DraftValues = {
  program: "p1",
  secondProgram: "",
  intake: "September 2027",
  firstName: " Ada ",
  lastName: "Lovelace",
  phone: "+237 600 000 000",
  qualification: "GCE A Level",
  institution: "Government Bilingual High School",
  completionYear: "2024",
};

describe("autosave cadence", () => {
  test("saves every 60 seconds (BR-ADM-002)", () => {
    expect(AUTOSAVE_INTERVAL_MS).toBe(60_000);
  });
});

describe("stepErrors", () => {
  test("programme step needs a programme and intake", () => {
    expect(stepErrors("programme", emptyValues, now)).toEqual(["program", "intake"]);
    expect(stepErrors("programme", filled, now)).toEqual([]);
  });

  test("a second choice may not equal the first", () => {
    expect(stepErrors("programme", { ...filled, secondProgram: "p1" }, now)).toEqual(["secondProgram"]);
    expect(stepErrors("programme", { ...filled, secondProgram: "p2" }, now)).toEqual([]);
  });

  test("personal step treats whitespace as empty", () => {
    expect(stepErrors("personal", { ...filled, firstName: "   ", phone: "" }, now)).toEqual(["firstName", "phone"]);
  });

  test("academic step validates the completion year", () => {
    expect(stepErrors("academic", { ...filled, completionYear: "" }, now)).toEqual(["completionYear"]);
    expect(stepErrors("academic", { ...filled, completionYear: "24" }, now)).toEqual(["completionYear"]);
    expect(stepErrors("academic", { ...filled, completionYear: "2024" }, now)).toEqual([]);
  });

  test("the review step has no field requirements of its own", () => {
    expect(stepComplete("review", emptyValues, now)).toBe(true);
  });
});

describe("isValidCompletionYear", () => {
  test.each([["2024", true], ["1949", false], ["2027", true], ["2028", false], ["abcd", false], ["20245", false]])(
    "%s -> %s",
    (value, expected) => expect(isValidCompletionYear(value, now)).toBe(expected),
  );
});

describe("firstIncompleteStep", () => {
  test("resumes where the applicant stopped", () => {
    expect(firstIncompleteStep(emptyValues, now)).toBe("programme");
    expect(firstIncompleteStep({ ...filled, firstName: "" }, now)).toBe("personal");
    expect(firstIncompleteStep({ ...filled, qualification: "" }, now)).toBe("academic");
    expect(firstIncompleteStep(filled, now)).toBe("review");
  });

  test("steps are ordered programme, personal, academic, review", () => {
    expect([...STEPS]).toEqual(["programme", "personal", "academic", "review"]);
  });
});

describe("buildUpdatePayload", () => {
  test("trims values and always sends the whole personal_info object", () => {
    const payload = buildUpdatePayload(filled, "ada@example.test", "en");
    expect(payload.personal_info).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.test",
      phone_primary: "+237 600 000 000",
      preferred_language: "en",
    });
    expect(payload.academic_history).toEqual([
      { qualification: "GCE A Level", institution: "Government Bilingual High School", completion_year: "2024" },
    ]);
  });

  test("omits an unset second choice and empty academic history", () => {
    const payload = buildUpdatePayload({ ...emptyValues, firstName: "Ada" }, "a@b.c", "fr");
    expect("program_second_choice" in payload).toBe(false);
    expect(payload.academic_history).toEqual([]);
    expect(buildUpdatePayload({ ...filled, secondProgram: "p2" }, "a@b.c", "en").program_second_choice).toBe("p2");
  });

  test("never sends an application fee or first-choice programme", () => {
    const keys = Object.keys(buildUpdatePayload(filled, "a@b.c", "en"));
    expect(keys.some((key) => /fee|first/.test(key))).toBe(false);
  });
});

describe("unsaved change detection", () => {
  test("is clean right after a save and dirty after an edit", () => {
    const saved = snapshot(filled, "a@b.c", "en");
    expect(hasUnsavedChanges(filled, saved, "a@b.c", "en")).toBe(false);
    expect(hasUnsavedChanges({ ...filled, phone: "+237 611 111 111" }, saved, "a@b.c", "en")).toBe(true);
  });

  test("whitespace-only edits do not count as changes", () => {
    const saved = snapshot(filled, "a@b.c", "en");
    expect(hasUnsavedChanges({ ...filled, lastName: "Lovelace  " }, saved, "a@b.c", "en")).toBe(false);
  });

  test("is never dirty before a draft exists", () => {
    expect(hasUnsavedChanges(filled, null, "a@b.c", "en")).toBe(false);
  });
});

describe("valuesFromApplication", () => {
  test("restores saved personal and academic details", () => {
    const values = valuesFromApplication({
      intake: "September 2027",
      program_first_choice: "p1",
      program_second_choice: null,
      personal_info: { first_name: "Ada", last_name: "Lovelace", phone_primary: "+237 600 000 000" },
      academic_history: [{ qualification: "GCE", institution: "GBHS", completion_year: 2023 }],
    });
    expect(values).toMatchObject({
      program: "p1", secondProgram: "", intake: "September 2027", firstName: "Ada", phone: "+237 600 000 000",
      qualification: "GCE", completionYear: "2023",
    });
  });

  test("tolerates a brand-new draft with nothing saved", () => {
    const values = valuesFromApplication({
      intake: "X", program_first_choice: "p1", program_second_choice: "p2", personal_info: {}, academic_history: [],
    });
    expect(values.firstName).toBe("");
    expect(values.secondProgram).toBe("p2");
    expect(firstIncompleteStep(values, now)).toBe("personal");
  });
});

describe("missingRequiredDocuments", () => {
  test("lists the required documents still to upload", () => {
    expect(missingRequiredDocuments(["birth_certificate", "passport_photo", "motivation_letter"])).toEqual([
      "national_id",
      "academic_certificates",
      "academic_transcripts",
    ]);
    expect(
      missingRequiredDocuments([
        "birth_certificate", "national_id", "academic_certificates", "academic_transcripts", "passport_photo",
      ]),
    ).toEqual([]);
  });
});
