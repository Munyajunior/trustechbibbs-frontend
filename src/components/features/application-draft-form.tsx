"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
} from "@/lib/api/admissions";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import type { Locale, Program } from "@/lib/api/types";
import {
  AUTOSAVE_INTERVAL_MS,
  REQUIRED_DOCUMENT_KINDS,
  STEPS,
  buildUpdatePayload,
  emptyValues,
  firstIncompleteStep,
  formatSavedTime,
  hasUnsavedChanges,
  missingRequiredDocuments,
  snapshot,
  stepErrors,
  valuesFromApplication,
  type DraftValues,
  type FieldName,
  type Step,
} from "@/lib/application-draft";
import { localizedField } from "@/lib/i18n-field";
import { useAuthStore } from "@/stores/auth-store";

type ApplicationDraftFormProps = { locale: Locale; draftId?: string };
type SaveState = "idle" | "saving" | "saved" | "error";

const DOCUMENT_KINDS = ["birth_certificate", "national_id", "academic_certificates", "academic_transcripts", "passport_photo", "recommendation_letter", "motivation_letter", "medical_certificate"] as const;
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
const selectClass = "h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-50";
const cardClass = "mx-auto max-w-2xl space-y-7 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8";

export function ApplicationDraftForm({ locale, draftId }: ApplicationDraftFormProps) {
  const t = useTranslations("application");
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const email = user?.email ?? "";

  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ id: string; reference_number: string } | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [draftLookupError, setDraftLookupError] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);

  const [values, setValues] = useState<DraftValues>(emptyValues);
  const [step, setStep] = useState<Step>("programme");
  const [reached, setReached] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldName[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [savedSnap, setSavedSnap] = useState<string | null>(null);

  const valuesRef = useRef(values);
  const savedSnapRef = useRef<string | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { valuesRef.current = values; }, [values]);

  const stepIndex = STEPS.indexOf(step);
  const dirty = hasUnsavedChanges(values, savedSnap, email, locale);

  useEffect(() => {
    let active = true;
    getApplicationPrograms(locale)
      .then((result) => active && setPrograms(result.items))
      .catch(() => active && setLoadError(t("programsUnavailable")))
      .finally(() => { if (active) setIsLoadingPrograms(false); });
    return () => { active = false; };
  }, [locale, t]);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    const draftToLoad = draftId
      ? Promise.resolve(draftId)
      : getMyApplications(accessToken, locale).then((result) => result.items.find((item) => item.status === "DRAFT")?.id);
    draftToLoad.then((id) => id ? Promise.all([getApplication(id, accessToken, locale), listApplicationDocuments(id, accessToken, locale)]) : null)
      .then((result) => {
        if (!active || !result) return;
        const [application, existingDocuments] = result;
        if (application.status !== "DRAFT") { setSubmitError(t("draftUnavailable")); return; }
        const loaded = valuesFromApplication(application);
        const resumeAt = firstIncompleteStep(loaded);
        setDraft({ id: application.id, reference_number: application.reference_number });
        setDocuments(existingDocuments);
        setValues(loaded);
        const snap = snapshot(loaded, email, locale);
        savedSnapRef.current = snap;
        setSavedSnap(snap);
        setStep(resumeAt);
        setReached(STEPS.indexOf(resumeAt));
      })
      .catch((caught) => {
        if (!active) return;
        setDraftLookupError(true);
        setSubmitError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("serviceUnavailable"));
      })
      .finally(() => { if (active) setIsLoadingDraft(false); });
    return () => { active = false; };
  }, [accessToken, draftId, locale, t, email]);

  const describe = useCallback((caught: unknown, fallback: string) => {
    if (caught instanceof ApiError) return caught.localizedMessage(locale);
    if (caught instanceof ApiUnreachableError) return t("serviceUnavailable");
    return fallback;
  }, [locale, t]);

  /** Persist the current values when they differ from the last saved copy. */
  const save = useCallback(async (): Promise<boolean> => {
    if (!draft || !accessToken) return true;
    // Wait for any save already in flight so two requests never overlap.
    while (inflight.current) await inflight.current;
    const payload = buildUpdatePayload(valuesRef.current, email, locale);
    const snap = JSON.stringify(payload);
    if (snap === savedSnapRef.current) return true;
    setSaveState("saving");
    const request = updateApplicationDraft(draft.id, payload, accessToken, locale)
      .then(() => {
        savedSnapRef.current = snap;
        setSavedSnap(snap);
        setSavedAt(new Date());
        setSaveState("saved");
        return true;
      })
      .catch(() => { setSaveState("error"); return false; })
      .finally(() => { inflight.current = null; });
    inflight.current = request;
    return request;
  }, [draft, accessToken, email, locale]);

  // BR-ADM-002: save every 60 seconds while there are unsaved changes (also retries after a failure).
  useEffect(() => {
    if (!draft) return;
    const handle = window.setInterval(() => { void save(); }, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [draft, save]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Move keyboard/screen-reader focus to the new step heading.
  const focusHeading = useRef(false);
  useEffect(() => {
    if (focusHeading.current) { headingRef.current?.focus(); focusHeading.current = false; }
  }, [step]);

  function setField(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => current.filter((field) => field !== name));
  }

  function showErrors(fields: FieldName[]) {
    setFieldErrors(fields);
    window.setTimeout(() => errorRef.current?.focus(), 0);
  }

  function moveTo(target: Step) {
    focusHeading.current = true;
    setFieldErrors([]);
    setSubmitError(null);
    setStep(target);
    setReached((current) => Math.max(current, STEPS.indexOf(target)));
  }

  async function createDraft() {
    if (!accessToken) return false;
    const result = await createApplicationDraft(
      {
        program_first_choice: values.program,
        ...(values.secondProgram ? { program_second_choice: values.secondProgram } : {}),
        intake: values.intake.trim(),
        personal_info: { email, preferred_language: locale },
        academic_history: [],
      },
      accessToken,
      locale,
    );
    setDraft({ id: result.id, reference_number: result.reference_number });
    setDocuments([]);
    const snap = snapshot(values, email, locale);
    savedSnapRef.current = snap;
    setSavedSnap(snap);
    setSavedAt(new Date());
    setSaveState("saved");
    return true;
  }

  async function onContinue(event?: FormEvent) {
    event?.preventDefault();
    const missing = stepErrors(step, values);
    if (missing.length > 0) { showErrors(missing); return; }
    setIsBusy(true);
    setSubmitError(null);
    try {
      if (!draft) await createDraft();
      else if (!(await save())) { setSubmitError(t("autosaveError")); return; }
      moveTo(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]);
    } catch (caught) {
      setSubmitError(describe(caught, t("unexpectedError")));
    } finally {
      setIsBusy(false);
    }
  }

  async function onBack() {
    setIsBusy(true);
    await save(); // best effort: a failed save keeps the values in memory and is retried
    setIsBusy(false);
    moveTo(STEPS[Math.max(stepIndex - 1, 0)]);
  }

  async function onStepClick(target: Step) {
    if (target === step || STEPS.indexOf(target) > reached || !draft) return;
    setIsBusy(true);
    await save();
    setIsBusy(false);
    moveTo(target);
  }

  async function onUpload(kind: string, file: File | undefined) {
    if (!file || !draft || !accessToken) return;
    setSubmitError(null);
    setUploadingKind(kind);
    try {
      const uploaded = await uploadApplicationDocument(draft.id, kind, file, accessToken, locale);
      setDocuments((current) => [...current.filter((item) => item.kind !== kind), uploaded]);
    } catch (caught) {
      setSubmitError(describe(caught, t("uploadError")));
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

  async function onSubmitApplication() {
    if (!accessToken || !draft) return;
    const problems = (["programme", "personal", "academic"] as const).find((name) => stepErrors(name, values).length > 0);
    if (problems) { setSubmitError(t("reviewIncomplete")); moveTo(problems); showErrors(stepErrors(problems, values)); return; }
    if (missingRequiredDocuments(documents.map((document) => document.kind)).length > 0) {
      setSubmitError(t("documentsMissing"));
      return;
    }
    setIsBusy(true);
    setSubmitError(null);
    try {
      if (!(await save())) { setSubmitError(t("autosaveError")); return; }
      await submitApplication(draft.id, accessToken, locale);
      setIsSubmitted(true);
    } catch (caught) {
      setSubmitError(describe(caught, t("unexpectedError")));
    } finally {
      setIsBusy(false);
    }
  }

  const uploadedKinds = useMemo(() => new Set(documents.map((document) => document.kind)), [documents]);
  const programLabel = useCallback((id: string) => {
    const program = programs.find((item) => item.id === id);
    return program ? localizedField(program, "name", locale) : t("programmeSaved");
  }, [programs, locale, t]);
  const invalid = (name: FieldName) => fieldErrors.includes(name);
  const describedBy = (name: FieldName) => invalid(name) ? `${name}-error` : undefined;

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

  const stepTitles: Record<Step, string> = {
    programme: t("stepProgramme"), personal: t("stepPersonal"), academic: t("stepAcademic"), review: t("stepReview"),
  };
  const saveStatus = saveState === "saving" ? t("autosaveSaving")
    : saveState === "error" ? t("autosaveError")
    : saveState === "saved" && savedAt && !dirty ? t("autosaveSaved", { time: formatSavedTime(savedAt, locale) })
    : dirty ? t("autosaveUnsaved") : t("autosaveIdle");

  return (
    <div className={cardClass}>
      <div>
        {draft && <p className="text-sm font-semibold text-primary">{t("draftReference", { reference: draft.reference_number })}</p>}
        <h1 ref={headingRef} tabIndex={-1} className="mt-1 font-display text-2xl font-semibold text-gray-900 outline-none">
          {draft ? stepTitles[step] : t("title")}
        </h1>
        {!draft && <p className="mt-2 leading-7 text-gray-600">{t("subtitle")}</p>}
      </div>

      <nav aria-label={t("stepperLabel")}>
        <p className="mb-3 text-sm text-gray-600">{t("stepOf", { current: stepIndex + 1, total: STEPS.length })}</p>
        <ol className="grid grid-cols-4 gap-2">
          {STEPS.map((name, index) => {
            const current = name === step;
            const done = index < stepIndex || (index <= reached && !current && draft !== null);
            const clickable = draft !== null && index <= reached && !current;
            return (
              <li key={name}>
                <button type="button" disabled={!clickable || isBusy} onClick={() => void onStepClick(name)} aria-current={current ? "step" : undefined}
                  className={`flex w-full flex-col items-center gap-1 rounded-md border px-1 py-2 text-center text-xs font-medium ${current ? "border-primary bg-primary-subtle text-primary" : done ? "border-success/40 bg-success-light text-gray-800" : "border-gray-200 bg-gray-50 text-gray-500"} ${clickable ? "cursor-pointer hover:border-primary" : "cursor-default"}`}>
                  <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-white text-[11px] font-bold shadow-sm">{done && !current ? "✓" : index + 1}</span>
                  <span className="leading-tight">{stepTitles[name]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div aria-live="polite">
        {loadError && <p className="rounded-md bg-error-light px-4 py-3 text-sm text-error">{loadError}</p>}
        {!isLoadingPrograms && !loadError && programs.length === 0 && step === "programme" && !draft && <p className="rounded-md bg-primary-subtle px-4 py-3 text-sm text-primary">{t("noPublishedPrograms")} <Link href="/contact" className="font-semibold underline underline-offset-2">{t("contactAdmissions")}</Link></p>}
        {submitError && <p role="alert" className="rounded-md bg-error-light px-4 py-3 text-sm text-error">{submitError}</p>}
      </div>

      {fieldErrors.length > 0 && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-md border border-error/40 bg-error-light px-4 py-3 text-sm text-error outline-none">
          <p className="font-semibold">{t("errorSummaryTitle")}</p>
          <ul className="mt-1 list-disc pl-5">
            {fieldErrors.map((name) => <li key={name}><a href={`#${name}`} className="underline">{t(`fieldErrors.${name}`)}</a></li>)}
          </ul>
        </div>
      )}

      <form onSubmit={onContinue} noValidate className="space-y-7">
        {step === "programme" && (
          <fieldset className="space-y-4">
            <legend className="sr-only">{t("programmeTitle")}</legend>
            <div>
              <Label htmlFor="program" required>{t("programme")}</Label>
              <select id="program" value={values.program} onChange={(event) => setField("program", event.target.value)} disabled={programs.length === 0 || draft !== null}
                aria-invalid={invalid("program") || undefined} aria-describedby={describedBy("program")} className={selectClass}>
                <option value="">{t("programmePlaceholder")}</option>
                {draft && !programs.some((program) => program.id === values.program) && <option value={values.program}>{programLabel(values.program)}</option>}
                {programs.map((program) => <option key={program.id} value={program.id}>{localizedField(program, "name", locale)}</option>)}
              </select>
              {invalid("program") && <p id="program-error" className="mt-1 text-sm text-error">{t("fieldErrors.program")}</p>}
            </div>
            <div>
              <Label htmlFor="secondProgram">{t("secondChoice")}</Label>
              <select id="secondProgram" value={values.secondProgram} onChange={(event) => setField("secondProgram", event.target.value)} disabled={programs.length === 0}
                aria-invalid={invalid("secondProgram") || undefined} aria-describedby={describedBy("secondProgram")} className={selectClass}>
                <option value="">{t("secondChoiceNone")}</option>
                {programs.filter((program) => program.id !== values.program).map((program) => <option key={program.id} value={program.id}>{localizedField(program, "name", locale)}</option>)}
              </select>
              {invalid("secondProgram") && <p id="secondProgram-error" className="mt-1 text-sm text-error">{t("fieldErrors.secondProgram")}</p>}
            </div>
            <div>
              <Label htmlFor="intake" required>{t("intake")}</Label>
              <Input id="intake" value={values.intake} onChange={(event) => setField("intake", event.target.value)} disabled={draft !== null}
                invalid={invalid("intake")} aria-describedby={describedBy("intake")} />
              {invalid("intake") && <p id="intake-error" className="mt-1 text-sm text-error">{t("fieldErrors.intake")}</p>}
            </div>
            {draft && <p className="text-sm text-gray-600">{t("programmeLocked")}</p>}
          </fieldset>
        )}

        {step === "personal" && (
          <fieldset className="space-y-4">
            <legend className="sr-only">{t("personalTitle")}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName" required>{t("firstName")}</Label>
                <Input id="firstName" value={values.firstName} onChange={(event) => setField("firstName", event.target.value)} autoComplete="given-name" invalid={invalid("firstName")} aria-describedby={describedBy("firstName")} />
                {invalid("firstName") && <p id="firstName-error" className="mt-1 text-sm text-error">{t("fieldErrors.firstName")}</p>}
              </div>
              <div>
                <Label htmlFor="lastName" required>{t("lastName")}</Label>
                <Input id="lastName" value={values.lastName} onChange={(event) => setField("lastName", event.target.value)} autoComplete="family-name" invalid={invalid("lastName")} aria-describedby={describedBy("lastName")} />
                {invalid("lastName") && <p id="lastName-error" className="mt-1 text-sm text-error">{t("fieldErrors.lastName")}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="phone" required>{t("phone")}</Label>
              <Input id="phone" type="tel" value={values.phone} onChange={(event) => setField("phone", event.target.value)} autoComplete="tel" invalid={invalid("phone")} aria-describedby={describedBy("phone")} />
              {invalid("phone") && <p id="phone-error" className="mt-1 text-sm text-error">{t("fieldErrors.phone")}</p>}
            </div>
          </fieldset>
        )}

        {step === "academic" && (
          <>
            <p className="leading-7 text-gray-600">{t("academicBody")}</p>
            <fieldset className="space-y-4">
              <legend className="font-display text-lg font-semibold text-gray-900">{t("academicHistoryTitle")}</legend>
              <div>
                <Label htmlFor="qualification" required>{t("qualification")}</Label>
                <Input id="qualification" value={values.qualification} onChange={(event) => setField("qualification", event.target.value)} invalid={invalid("qualification")} aria-describedby={describedBy("qualification")} />
                {invalid("qualification") && <p id="qualification-error" className="mt-1 text-sm text-error">{t("fieldErrors.qualification")}</p>}
              </div>
              <div>
                <Label htmlFor="institution" required>{t("institution")}</Label>
                <Input id="institution" value={values.institution} onChange={(event) => setField("institution", event.target.value)} invalid={invalid("institution")} aria-describedby={describedBy("institution")} />
                {invalid("institution") && <p id="institution-error" className="mt-1 text-sm text-error">{t("fieldErrors.institution")}</p>}
              </div>
              <div>
                <Label htmlFor="completionYear" required>{t("completionYear")}</Label>
                <Input id="completionYear" inputMode="numeric" maxLength={4} value={values.completionYear} onChange={(event) => setField("completionYear", event.target.value)} invalid={invalid("completionYear")} aria-describedby={describedBy("completionYear")} />
                {invalid("completionYear") && <p id="completionYear-error" className="mt-1 text-sm text-error">{t("fieldErrors.completionYear")}</p>}
              </div>
            </fieldset>
            <section aria-labelledby="application-documents-title" className="space-y-4 border-t border-gray-200 pt-6">
              <div>
                <h2 id="application-documents-title" className="font-display text-lg font-semibold text-gray-900">{t("documentsTitle")}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("documentsBody")}</p>
              </div>
              <div className="grid gap-3">
                {DOCUMENT_KINDS.map((kind) => {
                  const uploaded = documents.find((document) => document.kind === kind);
                  const required = (REQUIRED_DOCUMENT_KINDS as readonly string[]).includes(kind);
                  return <div key={kind} className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{t(`documentKinds.${kind}`)} <span className="text-xs font-normal text-gray-500">{required ? t("required") : t("optional")}</span></p>
                      <p className="mt-1 truncate text-xs text-gray-600">{uploaded ? uploaded.filename : t("notUploaded")}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-3 sm:mt-0">
                      {uploaded && <button type="button" onClick={() => onPreview(kind)} className="text-sm font-semibold text-primary underline underline-offset-2">{t("previewDocument")}</button>}
                      <label className="cursor-pointer rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary focus-within:outline focus-within:outline-2 hover:bg-primary-subtle">
                        {uploadingKind === kind ? t("uploading") : uploaded ? t("replaceDocument") : t("chooseDocument")}
                        <input className="sr-only" type="file" accept={DOCUMENT_ACCEPT[kind]} disabled={uploadingKind !== null || isBusy} onChange={(event) => { void onUpload(kind, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                      </label>
                    </div>
                  </div>;
                })}
              </div>
              <p className="text-sm text-gray-600">{t("documentsProgress", { count: REQUIRED_DOCUMENT_KINDS.filter((kind) => uploadedKinds.has(kind)).length, total: REQUIRED_DOCUMENT_KINDS.length })}</p>
            </section>
          </>
        )}

        {step === "review" && (
          <div className="space-y-5">
            <p className="leading-7 text-gray-600">{t("reviewBody")}</p>
            <p className="rounded-md bg-primary-subtle px-4 py-3 text-sm text-primary">{t("reviewFree")}</p>
            {([
              ["programme", [[t("programme"), programLabel(values.program)], [t("secondChoice"), values.secondProgram ? programLabel(values.secondProgram) : t("secondChoiceNone")], [t("intake"), values.intake]]],
              ["personal", [[t("firstName"), values.firstName], [t("lastName"), values.lastName], [t("phone"), values.phone], [t("emailLabel"), email]]],
              ["academic", [[t("qualification"), values.qualification], [t("institution"), values.institution], [t("completionYear"), values.completionYear], [t("documentsTitle"), t("documentsProgress", { count: REQUIRED_DOCUMENT_KINDS.filter((kind) => uploadedKinds.has(kind)).length, total: REQUIRED_DOCUMENT_KINDS.length })]]],
            ] as const).map(([name, rows]) => (
              <section key={name} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-gray-900">{stepTitles[name]}</h2>
                  <button type="button" onClick={() => void onStepClick(name)} className="text-sm font-semibold text-primary underline underline-offset-2">{t("reviewEdit")}</button>
                </div>
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {rows.map(([label, value]) => <div key={label}><dt className="text-gray-500">{label}</dt><dd className="font-medium text-gray-900">{value || "—"}</dd></div>)}
                </dl>
              </section>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500" role="status" data-state={saveState}>{draft ? saveStatus : null}</p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {stepIndex > 0 ? <Button type="button" variant="outline" size="lg" onClick={() => void onBack()} disabled={isBusy || uploadingKind !== null}>{t("back")}</Button> : <span />}
          <div className="flex flex-col gap-3 sm:flex-row">
            {draft && step !== "review" && <Button type="button" variant="secondary" size="lg" onClick={() => void save()} disabled={isBusy || saveState === "saving" || !dirty}>{t("saveNow")}</Button>}
            {step === "review"
              ? <Button type="button" size="lg" onClick={() => void onSubmitApplication()} disabled={isBusy || uploadingKind !== null}>{isBusy ? t("submitting") : t("submitApplication")}</Button>
              : <Button type="submit" size="lg" disabled={isBusy || uploadingKind !== null || (!draft && programs.length === 0)}>{isBusy ? t("saving") : t("continue")}</Button>}
          </div>
        </div>
      </form>
    </div>
  );
}
