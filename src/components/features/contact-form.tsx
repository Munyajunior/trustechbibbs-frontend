"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import { submitContact } from "@/lib/api/public";
import type { Locale } from "@/lib/api/types";

/**
 * Contact form — the reference implementation for every form in the platform.
 *
 * Pattern: zod schema (messages resolved from next-intl) -> react-hook-form via
 * zodResolver -> react-query mutation -> typed ApiError surfaced in the active
 * locale. The admissions wizard should follow the same shape.
 */

/** Build the schema with translated messages so errors respect the locale. */
function buildSchema(t: (key: string) => string) {
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

type ContactFormValues = z.infer<ReturnType<typeof buildSchema>>;

export function ContactForm() {
  const t = useTranslations("contact.form");
  const tv = useTranslations("contact.validation");
  const locale = useLocale() as Locale;

  const schema = buildSchema(tv);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", phone: "", department: "", subject: "", message: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ContactFormValues) => submitContact(values, { locale }),
    onSuccess: () => reset(),
  });

  function errorMessage(): string {
    const error = mutation.error;
    if (error instanceof ApiError) return error.localizedMessage(locale);
    if (error instanceof ApiUnreachableError) return t("error");
    return t("error");
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="contact-form space-y-5"
    >
      {/* Status region — announced to screen readers. */}
      <div aria-live="polite">
        {mutation.isSuccess && (
          <p className="rounded-md bg-success-light px-4 py-3 text-sm text-success">
            {t("success", { reference: mutation.data?.reference ?? "—" })}
          </p>
        )}
        {mutation.isError && (
          <p className="rounded-md bg-error-light px-4 py-3 text-sm text-error">
            {errorMessage()}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="full_name" required>
          {t("fullName")}
        </Label>
        <Input
          id="full_name"
          autoComplete="name"
          invalid={!!errors.full_name}
          aria-describedby={errors.full_name ? "full_name-error" : undefined}
          {...register("full_name")}
        />
        {errors.full_name && (
          <p id="full_name-error" className="mt-1.5 text-sm text-error">
            {errors.full_name.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="email" required>
          {t("email")}
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="mt-1.5 text-sm text-error">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="phone">{t("phoneOptional")}</Label>
        <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
      </div>

      <div>
        <Label htmlFor="department" required>{t("department")}</Label>
        <select
          id="department"
          aria-invalid={!!errors.department || undefined}
          aria-describedby={errors.department ? "department-error" : undefined}
          className={`h-11 w-full rounded-md border bg-white px-3 text-sm text-gray-900 ${errors.department ? "border-error" : "border-gray-300"}`}
          {...register("department")}
        >
          <option value="">{t("chooseDepartment")}</option>
          <option value="admissions">{t("departments.admissions")}</option>
          <option value="registrar">{t("departments.registrar")}</option>
          <option value="finance">{t("departments.finance")}</option>
          <option value="general">{t("departments.general")}</option>
        </select>
        {errors.department && <p id="department-error" className="mt-1.5 text-sm text-error">{errors.department.message}</p>}
      </div>

      <div>
        <Label htmlFor="subject" required>
          {t("subject")}
        </Label>
        <Input
          id="subject"
          invalid={!!errors.subject}
          aria-describedby={errors.subject ? "subject-error" : undefined}
          {...register("subject")}
        />
        {errors.subject && (
          <p id="subject-error" className="mt-1.5 text-sm text-error">
            {errors.subject.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="message" required>
          {t("message")}
        </Label>
        <Textarea
          id="message"
          invalid={!!errors.message}
          aria-describedby={errors.message ? "message-error" : undefined}
          {...register("message")}
        />
        {errors.message && (
          <p id="message-error" className="mt-1.5 text-sm text-error">
            {errors.message.message}
          </p>
        )}
      </div>

      {/* TODO(Phase 1): add spam protection and attachment support before public launch. */}

      <Button type="submit" size="lg" variant="accent" className="w-full sm:w-auto" disabled={mutation.isPending}>
        {mutation.isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
