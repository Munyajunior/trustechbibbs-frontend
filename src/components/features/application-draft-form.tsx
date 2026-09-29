"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import {
  createApplicationDraft,
  getApplication,
  getApplicationDocumentPreview,
  getApplicationPrograms,
  getMyApplications,
  listApplicationDocuments,
  submitApplication,
  updateApplicationDraft,
  uploadApplicationDocument,
  type ApplicationDocument,
  type ApplicationDraft,
} from "@/lib/api/admissions";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import type { Locale, Program } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { useAuthStore } from "@/stores/auth-store";

type ApplicationDraftFormProps = { locale: Locale; draftId?: string };
const DOCUMENT_KINDS = ["birth_certificate", "national_id", "academic_certificates", "academic_transcripts", "passport_photo", "recommendation_letter", "motivation_letter", "medical_certificate"] as const;
const REQUIRED_DOCUMENT_KINDS = DOCUMENT_KINDS.slice(0, 5);
const DOCUMENT_ACCEPT: Record<string, string> = {
  birth_certificate: ".pdf,application/pdf",
  national_id: ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png",
  academic_certificates: ".pdf,application/pdf",
  academic_transcripts: ".pdf,application/pdf",
  passport_photo: ".jpg,.jpeg,.png,image/jpeg,image/png",
  recommendation_letter: ".pdf,application/pdf",
  motivation_letter: ".pdf,application/pdf",
  medical_certificate: ".pdf,application/pdf",
};

export function ApplicationDraftForm({ locale, draftId }: ApplicationDraftFormProps) {
  const t = useTranslations("application");
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Pick<ApplicationDraft, "id" | "reference_number" | "status"> | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [draftLookupError, setDraftLookupError] = useState(false);
  const [savedAcademicHistory, setSavedAcademicHistory] = useState<Record<string, unknown> | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    let active = true;
    getApplicationPrograms(locale)
      .then((result) => active && setPrograms(result.items))
      .catch(() => active && setLoadError(t("programsUnavailable")))
      .finally(() => { if (active) setIsLoadingPrograms(false); });
    return () => {
      active = false;
    };
  }, [locale, t]);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    const draftToLoad = draftId
      ? Promise.resolve(draftId)
      : getMyApplications(accessToken, locale).then((result) => result.items.find((item) => item.status === "DRAFT")?.id);
    draftToLoad.then((id) => id ? Promise.all([getApplication(id, accessToken, locale), listApplicationDocuments(id, accessToken, locale)]) : null)
      .then((result) => {
        if (!active) return;
        if (!result) return;
        const [application, existingDocuments] = result;
        if (application.status !== "DRAFT") {
          setSubmitError(t("draftUnavailable"));
          return;
        }
        setDraft(application);
        setDocuments(existingDocuments);
        setSavedAcademicHistory(application.academic_history[0] ?? null);
      })
      .catch((caught) => {
        if (!active) return;
        setDraftLookupError(true);
        setSubmitError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("serviceUnavailable"));
      })
      .finally(() => { if (active) setIsLoadingDraft(false); });
    return () => { active = false; };
  }, [accessToken, draftId, locale, t]);

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
            preferred_language: locale,
          },
          academic_history: [],
        },
        accessToken,
        locale,
      );
      setDraft(result);
      setDocuments([]);
    } catch (caught) {
      if (caught instanceof ApiError) setSubmitError(caught.localizedMessage(locale));
      else if (caught instanceof ApiUnreachableError) setSubmitError(t("serviceUnavailable"));
      else setSubmitError(t("unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onUpload(kind: string, file: File | undefined) {
    if (!file || !draft || !accessToken) return;
    setSubmitError(null);
    setUploadingKind(kind);
    try {
      const uploaded = await uploadApplicationDocument(draft.id, kind, file, accessToken, locale);
      setDocuments((current) => [...current.filter((item) => item.kind !== kind), uploaded]);
    } catch (caught) {
      if (caught instanceof ApiError) setSubmitError(caught.localizedMessage(locale));
      else if (caught instanceof ApiUnreachableError) setSubmitError(t("serviceUnavailable"));
      else setSubmitError(t("uploadError"));
    } finally {
      setUploadingKind(null);
    }
  }

  async function onPreview(kind: string) {
    if (!draft || !accessToken) return;
    setSubmitError(null);
    try {
      const blob = await getApplicationDocumentPreview(draft.id, kind, accessToken, locale);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (caught) {
      setSubmitError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("previewError"));
    }
  }

  async function onComplete(formData: FormData) {
    if (!accessToken || !draft) return;
    setSubmitError(null);
    setSavedNotice(false);
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
      if (!REQUIRED_DOCUMENT_KINDS.every((kind) => documents.some((document) => document.kind === kind))) {
        setSubmitError(t("documentsMissing"));
        return;
      }
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

  async function onSaveAcademic(formData: FormData) {
    if (!accessToken || !draft) return;
    setSubmitError(null);
    setSavedNotice(false);
    setIsSubmitting(true);
    try {
      const history = {
        qualification: String(formData.get("qualification") ?? ""),
        institution: String(formData.get("institution") ?? ""),
        completion_year: String(formData.get("completionYear") ?? ""),
      };
      await updateApplicationDraft(draft.id, { academic_history: [history] }, accessToken, locale);
      setSavedAcademicHistory(history);
      setSavedNotice(true);
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

  if (isLoadingDraft) {
    return <section className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8 text-gray-600" aria-live="polite">{t("loadingDraft")}</section>;
  }

  if ((draftId || draftLookupError) && !draft) {
    return <section className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8"><p className="text-error" role="alert">{submitError ?? t("draftUnavailable")}</p><Link href="/admissions/status" className="mt-4 inline-block font-semibold text-primary underline">{t("viewStatus")}</Link></section>;
  }

  if (draft) {
    const uploadedKinds = new Set(documents.map((document) => document.kind));
    return (
      <form action={onComplete} className="mx-auto max-w-2xl space-y-7 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-semibold text-primary">{t("draftReference", { reference: draft.reference_number })}</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-gray-900">{t("academicTitle")}</h1>
          <p className="mt-2 leading-7 text-gray-600">{t("academicBody")}</p>
        </div>
        {submitError && <p className="rounded-md bg-error-light px-4 py-3 text-sm text-error" aria-live="polite">{submitError}</p>}
        {savedNotice && <p className="rounded-md bg-success-light px-4 py-3 text-sm text-gray-800" aria-live="polite">{t("draftSaved")}</p>}
        <fieldset className="space-y-4">
          <legend className="font-display text-lg font-semibold text-gray-900">{t("academicHistoryTitle")}</legend>
          <div><Label htmlFor="qualification" required>{t("qualification")}</Label><Input id="qualification" name="qualification" defaultValue={String(savedAcademicHistory?.qualification ?? "")} required /></div>
          <div><Label htmlFor="institution" required>{t("institution")}</Label><Input id="institution" name="institution" defaultValue={String(savedAcademicHistory?.institution ?? "")} required /></div>
          <div><Label htmlFor="completionYear" required>{t("completionYear")}</Label><Input id="completionYear" name="completionYear" inputMode="numeric" pattern="[0-9]{4}" defaultValue={String(savedAcademicHistory?.completion_year ?? "")} required /></div>
        </fieldset>
        <section aria-labelledby="application-documents-title" className="space-y-4 border-t border-gray-200 pt-6">
          <div>
            <h2 id="application-documents-title" className="font-display text-lg font-semibold text-gray-900">{t("documentsTitle")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("documentsBody")}</p>
          </div>
          <div className="grid gap-3">
            {DOCUMENT_KINDS.map((kind) => {
              const uploaded = documents.find((document) => document.kind === kind);
              const required = REQUIRED_DOCUMENT_KINDS.includes(kind);
              return <div key={kind} className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{t(`documentKinds.${kind}`)} <span className="text-xs font-normal text-gray-500">{required ? t("required") : t("optional")}</span></p>
                  <p className="mt-1 truncate text-xs text-gray-600">{uploaded ? uploaded.filename : t("notUploaded")}</p>
                </div>
                <div className="mt-3 flex items-center gap-3 sm:mt-0">
                  {uploaded && <button type="button" onClick={() => onPreview(kind)} className="text-sm font-semibold text-primary underline underline-offset-2">{t("previewDocument")}</button>}
                  <label className="cursor-pointer rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-subtle">
                    {uploadingKind === kind ? t("uploading") : uploaded ? t("replaceDocument") : t("chooseDocument")}
                    <input className="sr-only" type="file" accept={DOCUMENT_ACCEPT[kind]} disabled={uploadingKind !== null || isSubmitting} onChange={(event) => { void onUpload(kind, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                  </label>
                </div>
              </div>;
            })}
          </div>
          <p className="text-sm text-gray-600">{t("documentsProgress", { count: REQUIRED_DOCUMENT_KINDS.filter((kind) => uploadedKinds.has(kind)).length, total: REQUIRED_DOCUMENT_KINDS.length })}</p>
        </section>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="submit" formAction={onSaveAcademic} variant="outline" size="lg" fullWidth disabled={isSubmitting || uploadingKind !== null}>{t("saveAcademic")}</Button>
          <Button type="submit" size="lg" fullWidth disabled={isSubmitting || uploadingKind !== null || !REQUIRED_DOCUMENT_KINDS.every((kind) => uploadedKinds.has(kind))}>{isSubmitting ? t("submitting") : t("submitApplication")}</Button>
        </div>
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
        {!isLoadingPrograms && !loadError && programs.length === 0 && <p className="rounded-md bg-primary-subtle px-4 py-3 text-sm text-primary">{t("noPublishedPrograms")} <Link href="/contact" className="font-semibold underline underline-offset-2">{t("contactAdmissions")}</Link></p>}
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
        <div><Label htmlFor="intake" required>{t("intake")}</Label><Input id="intake" name="intake" required /></div>
      </fieldset>
      <Button type="submit" size="lg" fullWidth disabled={isSubmitting || programs.length === 0}>{isSubmitting ? t("saving") : t("saveDraft")}</Button>
    </form>
  );
}
