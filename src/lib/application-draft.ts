/**
 * Pure helpers for the multi-step application form: step definitions, per-step
 * validation, payload building and unsaved-change detection. Kept free of React
 * so the rules (BR-ADM-002 autosave, required fields) can be unit tested.
 */

export const STEPS = ["programme", "personal", "academic", "review"] as const;
export type Step = (typeof STEPS)[number];

/** Autosave cadence from BR-ADM-002. */
export const AUTOSAVE_INTERVAL_MS = 60_000;

export const REQUIRED_DOCUMENT_KINDS = [
  "birth_certificate",
  "national_id",
  "academic_certificates",
  "academic_transcripts",
  "passport_photo",
] as const;

export interface DraftValues {
  /** First choice is locked once the draft exists (the API cannot change it). */
  program: string;
  secondProgram: string;
  intake: string;
  firstName: string;
  lastName: string;
  phone: string;
  qualification: string;
  institution: string;
  completionYear: string;
}

export const emptyValues: DraftValues = {
  program: "",
  secondProgram: "",
  intake: "",
  firstName: "",
  lastName: "",
  phone: "",
  qualification: "",
  institution: "",
  completionYear: "",
};

export type FieldName = keyof DraftValues;

export function isValidCompletionYear(value: string, now = new Date()): boolean {
  if (!/^\d{4}$/.test(value)) return false;
  const year = Number(value);
  return year >= 1950 && year <= now.getFullYear() + 1;
}

/** Fields that must be filled (and valid) before leaving each step. */
export function stepErrors(step: Step, values: DraftValues, now = new Date()): FieldName[] {
  const missing: FieldName[] = [];
  const need = (field: FieldName) => {
    if (!values[field].trim()) missing.push(field);
  };
  if (step === "programme") {
    need("program");
    need("intake");
    if (values.secondProgram && values.secondProgram === values.program) missing.push("secondProgram");
  } else if (step === "personal") {
    need("firstName");
    need("lastName");
    need("phone");
  } else if (step === "academic") {
    need("qualification");
    need("institution");
    if (!isValidCompletionYear(values.completionYear.trim(), now) && !missing.includes("completionYear")) {
      missing.push("completionYear");
    }
  }
  return missing;
}

export function stepComplete(step: Step, values: DraftValues, now = new Date()): boolean {
  return stepErrors(step, values, now).length === 0;
}

/** The first step the applicant still has to finish, so a resumed draft opens there. */
export function firstIncompleteStep(values: DraftValues, now = new Date()): Step {
  for (const step of ["programme", "personal", "academic"] as const) {
    if (!stepComplete(step, values, now)) return step;
  }
  return "review";
}

export function missingRequiredDocuments(uploadedKinds: Iterable<string>): string[] {
  const uploaded = new Set(uploadedKinds);
  return REQUIRED_DOCUMENT_KINDS.filter((kind) => !uploaded.has(kind));
}

export interface DraftUpdatePayload {
  personal_info: Record<string, string>;
  academic_history: Array<Record<string, string>>;
  program_second_choice?: string;
}

/**
 * Body for `PATCH /admissions/applications/{id}`. The API replaces `personal_info`
 * wholesale, so the full object is always sent. An unset second choice is omitted
 * because the API treats null as "leave unchanged".
 */
export function buildUpdatePayload(values: DraftValues, email: string, locale: string): DraftUpdatePayload {
  const hasAcademic = [values.qualification, values.institution, values.completionYear].some((v) => v.trim());
  const payload: DraftUpdatePayload = {
    personal_info: {
      first_name: values.firstName.trim(),
      last_name: values.lastName.trim(),
      email,
      phone_primary: values.phone.trim(),
      preferred_language: locale,
    },
    academic_history: hasAcademic
      ? [
          {
            qualification: values.qualification.trim(),
            institution: values.institution.trim(),
            completion_year: values.completionYear.trim(),
          },
        ]
      : [],
  };
  if (values.secondProgram) payload.program_second_choice = values.secondProgram;
  return payload;
}

/** Stable snapshot used to decide whether anything changed since the last save. */
export function snapshot(values: DraftValues, email: string, locale: string): string {
  return JSON.stringify(buildUpdatePayload(values, email, locale));
}

export function hasUnsavedChanges(values: DraftValues, savedSnapshot: string | null, email: string, locale: string) {
  return savedSnapshot !== null && snapshot(values, email, locale) !== savedSnapshot;
}

interface ApplicationLike {
  intake: string;
  program_first_choice: string;
  program_second_choice: string | null;
  personal_info: Record<string, string>;
  academic_history: Array<Record<string, unknown>>;
}

/** Rebuild form values from a saved draft returned by the API. */
export function valuesFromApplication(application: ApplicationLike): DraftValues {
  const personal = application.personal_info ?? {};
  const academic = (application.academic_history?.[0] ?? {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value : value == null ? "" : String(value));
  return {
    program: application.program_first_choice,
    secondProgram: application.program_second_choice ?? "",
    intake: application.intake,
    firstName: text(personal.first_name),
    lastName: text(personal.last_name),
    phone: text(personal.phone_primary),
    qualification: text(academic.qualification),
    institution: text(academic.institution),
    completionYear: text(academic.completion_year),
  };
}

/** Local `hh:mm` for the "Saved at" status line. */
export function formatSavedTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
}
