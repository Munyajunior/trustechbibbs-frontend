"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import {
  enrollAdmittedApplicant, getApplicationDocumentPreview, getApplicationForReview, getApplicationsForReview, getEnrollmentSummary,
  listApplicationDocuments, updateApplicationStatus,
  type ApplicationDetail, type ApplicationDocument, type EnrollmentSummary, type ReviewApplicationListItem, type StudentEnrollment,
} from "@/lib/api/admissions";
import { ApiError } from "@/lib/api/client";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

type Dossier = { detail: ApplicationDetail; documents: ApplicationDocument[] };
const REVIEW_STATUSES = ["UNDER_REVIEW", "SHORTLISTED", "INTERVIEW", "ADMITTED", "REJECTED"] as const;
const FINAL_STATUSES = new Set(["ADMITTED", "REJECTED", "WITHDRAWN", "EXPIRED"]);

export function AdmissionsReviewQueue({ locale }: { locale: Locale }) {
  const t = useTranslations("reviewQueue");
  const documentName = useTranslations("application.documentKinds");
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const reviewer = user?.roles.some((role) => ["registrar", "admin", "super_admin"].includes(role));
  const [applications, setApplications] = useState<ReviewApplicationListItem[]>([]);
  const [dossiers, setDossiers] = useState<Record<string, Dossier>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<Record<string, StudentEnrollment>>({});
  const [summary, setSummary] = useState<EnrollmentSummary | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !reviewer) return;
    let active = true;
    getApplicationsForReview(token, locale)
      .then((result) => { if (active) setApplications(result.items); })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("serviceUnavailable")); })
      .finally(() => { if (active) setIsLoading(false); });
    getEnrollmentSummary(token, locale)
      .then((result) => { if (active) setSummary(result); })
      .catch(() => { /* Review queue remains usable if reporting is unavailable. */ });
    return () => { active = false; };
  }, [token, reviewer, locale, t]);

  async function toggleDossier(application: ReviewApplicationListItem) {
    if (!token) return;
    if (expandedId === application.id) { setExpandedId(null); return; }
    setExpandedId(application.id);
    if (dossiers[application.id]) return;
    setLoadingId(application.id);
    setError(null);
    try {
      const [detail, documents] = await Promise.all([
        getApplicationForReview(application.id, token, locale),
        listApplicationDocuments(application.id, token, locale),
      ]);
      setDossiers((current) => ({ ...current, [application.id]: { detail, documents } }));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("unexpectedError"));
    } finally { setLoadingId(null); }
  }

  async function preview(applicationId: string, kind: string) {
    if (!token) return;
    setPreviewing(`${applicationId}:${kind}`);
    setError(null);
    try {
      const blob = await getApplicationDocumentPreview(applicationId, kind, token, locale);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("previewError"));
    } finally { setPreviewing(null); }
  }

  async function saveDecision(application: ReviewApplicationListItem, formData: FormData) {
    if (!token || !dossiers[application.id]) return;
    setSavingId(application.id);
    setError(null);
    try {
      const updated = await updateApplicationStatus(application.id, String(formData.get("status")), String(formData.get("comment") ?? ""), token, locale);
      setApplications((current) => current.map((item) => item.id === application.id ? { ...item, status: updated.status } : item));
      setDossiers((current) => ({ ...current, [application.id]: { ...current[application.id], detail: updated } }));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("unexpectedError"));
    } finally { setSavingId(null); }
  }

  async function enroll(application: ReviewApplicationListItem) {
    if (!token || !window.confirm(t("enrollConfirm"))) return;
    setEnrollingId(application.id);
    setError(null);
    try {
      const record = await enrollAdmittedApplicant(application.id, token, locale);
      setEnrollments((current) => ({ ...current, [application.id]: record }));
      getEnrollmentSummary(token, locale).then(setSummary).catch(() => undefined);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("enrollError"));
    } finally { setEnrollingId(null); }
  }

  if (!user || !token || !reviewer) return <section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center"><h1 className="font-display text-2xl font-semibold">{t("accessTitle")}</h1><p className="mt-3 text-gray-600">{t("accessBody")}</p></section>;

  return <section className="space-y-6">
    <div><h1 className="font-display text-3xl font-semibold text-gray-900">{t("title")}</h1><p className="mt-2 text-gray-600">{t("subtitle")}</p><div className="flex flex-wrap gap-5"><Link href="/staff/enquiries" className="mt-3 inline-block text-sm font-semibold text-primary underline">{t("enquiriesLink")}</Link><Link href="/staff/programs" className="mt-3 inline-block text-sm font-semibold text-primary underline">{t("programsLink")}</Link>{user.roles.some((role) => ["admin", "super_admin"].includes(role)) && <Link href="/staff/content" className="mt-3 inline-block text-sm font-semibold text-primary underline">{t("contentLink")}</Link>}</div></div>
    {summary && <section className="rounded-2xl border border-primary-light bg-primary-subtle p-5"><h2 className="font-display text-lg font-semibold text-primary">{t("enrollmentSummaryTitle")}</h2><p className="mt-1 text-sm text-gray-700">{t("enrollmentTotal", { count: summary.total_active })}</p>{summary.by_program.length > 0 && <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">{summary.by_program.map((item) => <li key={item.program_id ?? "unassigned"} className="rounded-lg bg-white px-3 py-2"><span>{(locale === "fr" ? item.program_name_fr : item.program_name_en) || item.program_name_en || item.program_code || t("unassignedProgram")}</span><strong className="ml-2 text-primary">{item.active_students}</strong></li>)}</ul>}</section>}
    {error && <p role="alert" className="rounded-md bg-error-light px-4 py-3 text-sm text-error">{error}</p>}
    {isLoading ? <p className="text-gray-600">{t("loading")}</p> : applications.length === 0 ? <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">{t("empty")}</p> :
      <div className="grid gap-5">{applications.map((application) => {
        const dossier = dossiers[application.id];
        const expanded = expandedId === application.id;
        return <article key={application.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div><p className="font-mono text-sm font-semibold text-primary">{application.reference_number}</p><p className="mt-1 text-sm text-gray-600">{application.intake}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold text-primary">{t(`statuses.${application.status}`)}</span><Button type="button" variant="outline" aria-expanded={expanded} aria-controls={`dossier-${application.id}`} onClick={() => void toggleDossier(application)}>{expanded ? t("hideDossier") : t("viewDossier")}</Button></div></div>
          {expanded && <div id={`dossier-${application.id}`} className="space-y-5 border-t border-gray-200 bg-gray-50 p-5 sm:p-6">
            {loadingId === application.id ? <p className="text-sm text-gray-600">{t("loadingDossier")}</p> : dossier && <>
              <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-xl bg-white p-4"><h2 className="font-display text-lg font-semibold">{t("personalDetails")}</h2><dl className="mt-3 space-y-2 text-sm text-gray-700"><div><dt className="font-medium">{t("applicantName")}</dt><dd>{String(dossier.detail.personal_info.first_name ?? "")} {String(dossier.detail.personal_info.last_name ?? "")}</dd></div><div><dt className="font-medium">{t("email")}</dt><dd className="break-all">{String(dossier.detail.personal_info.email ?? "—")}</dd></div><div><dt className="font-medium">{t("phone")}</dt><dd>{String(dossier.detail.personal_info.phone_primary ?? "—")}</dd></div></dl></section>
                <section className="rounded-xl bg-white p-4"><h2 className="font-display text-lg font-semibold">{t("academicHistory")}</h2>{dossier.detail.academic_history.length === 0 ? <p className="mt-3 text-sm text-gray-600">{t("noAcademicHistory")}</p> : <ul className="mt-3 space-y-3 text-sm">{dossier.detail.academic_history.map((record, index) => <li key={index} className="border-l-2 border-primary pl-3"><p className="font-medium">{String(record.qualification ?? "—")}</p><p>{String(record.institution ?? "—")} · {String(record.completion_year ?? "—")}</p></li>)}</ul>}</section>
              </div>
              <section className="rounded-xl bg-white p-4"><h2 className="font-display text-lg font-semibold">{t("documentsTitle")}</h2>{dossier.documents.length === 0 ? <p className="mt-3 text-sm text-gray-600">{t("noDocuments")}</p> : <ul className="mt-3 divide-y divide-gray-100">{dossier.documents.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{documentName(item.kind)}</p><p className="text-gray-600">{item.filename} · {Math.ceil(item.size_bytes / 1024)} KB</p></div><button type="button" className="font-semibold text-primary underline disabled:opacity-50" disabled={previewing === `${application.id}:${item.kind}`} onClick={() => void preview(application.id, item.kind)}>{t("previewDocument")}</button></li>)}</ul>}</section>
              {!FINAL_STATUSES.has(application.status) && <form action={(data) => saveDecision(application, data)} className="grid gap-4 rounded-xl border border-primary-light bg-white p-4 md:grid-cols-[1fr_2fr_auto] md:items-end"><div><Label htmlFor={`status-${application.id}`}>{t("newStatus")}</Label><select id={`status-${application.id}`} name="status" defaultValue={application.status === "SUBMITTED" ? "UNDER_REVIEW" : application.status} className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm">{REVIEW_STATUSES.map((status) => <option key={status} value={status}>{t(`statuses.${status}`)}</option>)}</select></div><div><Label htmlFor={`comment-${application.id}`}>{t("comment")}</Label><Textarea id={`comment-${application.id}`} name="comment" maxLength={2000} /></div><Button type="submit" disabled={savingId === application.id}>{savingId === application.id ? t("saving") : t("save")}</Button></form>}
              {application.status === "ADMITTED" && <section className="rounded-xl border border-primary-light bg-white p-4"><h2 className="font-display text-lg font-semibold">{t("enrollTitle")}</h2><p className="mt-2 text-sm text-gray-600">{t("enrollDescription")}</p>{enrollments[application.id] ? <p className="mt-3 rounded-md bg-primary-subtle p-3 text-sm text-primary" role="status">{t("enrolled", { studentId: enrollments[application.id].student_id })}</p> : <Button type="button" className="mt-4" disabled={enrollingId === application.id} onClick={() => void enroll(application)}>{enrollingId === application.id ? t("enrolling") : t("enrollAction")}</Button>}</section>}
            </>}
          </div>}
        </article>;
      })}</div>}
  </section>;
}
