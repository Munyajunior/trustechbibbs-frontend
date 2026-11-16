import { z } from "zod";

/** Build the schema with translated messages so errors respect the locale. */
export function buildSchema(t: (key: string) => string) {
  return z.object({
    full_name: z.string().trim().min(1, t("fullNameRequired")),
    // Zod v4: `z.email()` is the top-level validator; `.string().email()` is
    // deprecated. Piping keeps "required" and "invalid" as distinct messages.
    email: z
      .string()
      .trim()
      .min(1, t("emailRequired"))
      .pipe(z.email(t("emailInvalid"))),
    phone: z.string().trim().optional(),
    department: z.string().trim().min(1, t("departmentRequired")),
    subject: z.string().trim().min(1, t("subjectRequired")),
    message: z
      .string()
      .trim()
      .min(1, t("messageRequired"))
      .min(20, t("messageTooShort")),
  });
}

export type ContactFormValues = z.infer<ReturnType<typeof buildSchema>>;
