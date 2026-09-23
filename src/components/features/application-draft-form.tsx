"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import {
  createApplicationDraft,
  getApplicationPrograms,
  submitApplication,
  updateApplicationDraft,
  type ApplicationDraft,
} from "@/lib/api/admissions";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import type { Locale, Program } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { useAuthStore } from "@/stores/auth-store";

type ApplicationDraftFormProps = { locale: Locale };

export function ApplicationDraftForm({ locale }: ApplicationDraftFormProps) {
  const t = useTranslations("application");
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getApplicationPrograms(locale)
      .then((result) => active && setPrograms(result.items))
      .catch(() => active && setLoadError(t("programsUnavailable")));
    return () => {
      active = false;
    };
  }, [locale, t]);

  async function onSubmit(formData: FormData) {
    if (!accessToken) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await createApplicationDraft(
        {
          program_first_choice: String(formData.get("program") ?? ""),
          intake: String(formData.get("intake") ?? ""),
          personal_info: {
            first_name: String(formData.get("firstName") ?? ""),
            last_name: String(formData.get("lastName") ?? ""),
            email: user?.email ?? "",
            phone_primary: String(formData.get("phone") ?? ""),
          },
          academic_history: [],
        },
        accessToken,
        locale,
      );
      setDraft(result);
    } catch (caught) {
      if (caught instanceof ApiError) setSubmitError(caught.localizedMessage(locale));
      else if (caught instanceof ApiUnreachableError) setSubmitError(t("serviceUnavailable"));
      else setSubmitError(t("unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onComplete(formData: FormData) {
    if (!accessToken || !draft) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await updateApplicationDraft(
        draft.id,
        {
          academic_history: [
            {
              qualification: String(formData.get("qualification") ?? ""),
              institution: String(formData.get("institution") ?? ""),
              completion_year: String(formData.get("completionYear") ?? ""),
            },
          ],
        },
        accessToken,
        locale,
      );
      await submitApplication(draft.id, accessToken, locale);
      setIsSubmitted(true);
    } catch (caught) {
      if (caught instanceof ApiError) setSubmitError(caught.localizedMessage(locale));
      else if (caught instanceof ApiUnreachableError) setSubmitError(t("serviceUnavailable"));
      else setSubmitError(t("unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user || !accessToken) {
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-gray-900">{t("accountTitle")}</h1>
        <p className="mt-3 leading-7 text-gray-600">{t("accountBody")}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/admissions/login" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">{t("signIn")}</Link>
          <Link href="/admissions/register" className="inline-flex h-11 items-center justify-center rounded-md border border-primary px-4 text-sm font-medium text-primary hover:bg-primary-subtle">{t("createAccount")}</Link>
        </div>
      </section>
    );
  }

  if (isSubmitted && draft) {
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-success/30 bg-success-light p-6 sm:p-8" aria-live="polite">
        <h1 className="font-display text-2xl font-semibold text-gray-900">{t("submittedTitle")}</h1>
        <p className="mt-3 leading-7 text-gray-700">{t("submittedBody", { reference: draft.reference_number })}</p>
        <Link href="/admissions/status" className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">{t("viewStatus")}</Link>
      </section>
    );
  }

  if (draft) {
    return (
      <form action={onComplete} className="mx-auto max-w-2xl space-y-7 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-semibold text-primary">{t("draftReference", { reference: draft.reference_number })}</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-gray-900">{t("academicTitle")}</h1>
          <p className="mt-2 leading-7 text-gray-600">{t("academicBody")}</p>
        </div>
        {submitError && <p className="rounded-md bg-error-light px-4 py-3 text-sm text-error" aria-live="polite">{submitError}</p>}
        <fieldset className="space-y-4">
          <legend className="font-display text-lg font-semibold text-gray-900">{t("academicHistoryTitle")}</legend>
          <div><Label htmlFor="qualification" required>{t("qualification")}</Label><Input id="qualification" name="qualification" required /></div>
          <div><Label htmlFor="institution" required>{t("institution")}</Label><Input id="institution" name="institution" required /></div>
          <div><Label htmlFor="completionYear" required>{t("completionYear")}</Label><Input id="completionYear" name="completionYear" inputMode="numeric" pattern="[0-9]{4}" required /></div>
        </fieldset>
        <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>{isSubmitting ? t("submitting") : t("submitApplication")}</Button>
      </form>
    );
  }

  return (
    <form action={onSubmit} className="mx-auto max-w-2xl space-y-7 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-900">{t("title")}</h1>
        <p className="mt-2 leading-7 text-gray-600">{t("subtitle")}</p>
      </div>
      <div aria-live="polite">
        {loadError && <p className="rounded-md bg-error-light px-4 py-3 text-sm text-error">{loadError}</p>}
        {submitError && <p className="rounded-md bg-error-light px-4 py-3 text-sm text-error">{submitError}</p>}
      </div>
      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-semibold text-gray-900">{t("personalTitle")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="firstName" required>{t("firstName")}</Label><Input id="firstName" name="firstName" autoComplete="given-name" required /></div>
          <div><Label htmlFor="lastName" required>{t("lastName")}</Label><Input id="lastName" name="lastName" autoComplete="family-name" required /></div>
        </div>
        <div><Label htmlFor="phone" required>{t("phone")}</Label><Input id="phone" name="phone" type="tel" autoComplete="tel" required /></div>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-semibold text-gray-900">{t("programmeTitle")}</legend>
        <div>
          <Label htmlFor="program" required>{t("programme")}</Label>
          <select id="program" name="program" required disabled={programs.length === 0} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-50">
            <option value="">{t("programmePlaceholder")}</option>
            {programs.map((program) => <option key={program.id} value={program.id}>{localizedField(program, "name", locale)}</option>)}
          </select>
        </div>
        <div><Label htmlFor="intake" required>{t("intake")}</Label><Input id="intake" name="intake" defaultValue="September 2026" required /></div>
      </fieldset>
      <Button type="submit" size="lg" fullWidth disabled={isSubmitting || programs.length === 0}>{isSubmitting ? t("saving") : t("saveDraft")}</Button>
    </form>
  );
}
