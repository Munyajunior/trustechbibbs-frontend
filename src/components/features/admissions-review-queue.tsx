"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import {
  getApplicationsForReview,
  updateApplicationStatus,
  type ReviewApplicationListItem,
} from "@/lib/api/admissions";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

type AdmissionsReviewQueueProps = { locale: Locale };
const REVIEW_STATUSES = ["UNDER_REVIEW", "SHORTLISTED", "INTERVIEW", "ADMITTED", "REJECTED"];

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

export function AdmissionsReviewQueue({ locale }: AdmissionsReviewQueueProps) {
  const t = useTranslations("reviewQueue");
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [applications, setApplications] = useState<ReviewApplicationListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const isReviewer = user?.roles.some((role) => ["registrar", "admin", "super_admin"].includes(role));

  useEffect(() => {
    if (!accessToken || !isReviewer) return;
    let active = true;
    getApplicationsForReview(accessToken, locale)
      .then((result) => active && setApplications(result.items))
      .catch((caught) => {
        if (!active) return;
        if (caught instanceof ApiError) setError(caught.localizedMessage(locale));
        else if (caught instanceof ApiUnreachableError) setError(t("serviceUnavailable"));
        else setError(t("unexpectedError"));
      })
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [accessToken, isReviewer, locale, t]);

  async function updateStatus(application: ReviewApplicationListItem, formData: FormData) {
    if (!accessToken) return;
    setError(null);
    setIsSaving(application.id);
    try {
      const updated = await updateApplicationStatus(application.id, String(formData.get("status")), String(formData.get("comment") ?? ""), accessToken, locale);
      setApplications((current) => current.map((item) => item.id === application.id ? { ...item, status: updated.status } : item));
    } catch (caught) {
      if (caught instanceof ApiError) setError(caught.localizedMessage(locale));
      else setError(t("unexpectedError"));
    } finally {
      setIsSaving(null);
    }
  }

  if (!user || !accessToken || !isReviewer) {
    return <section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8"><h1 className="font-display text-2xl font-semibold text-gray-900">{t("accessTitle")}</h1><p className="mt-3 leading-7 text-gray-600">{t("accessBody")}</p></section>;
  }

  return <section className="space-y-6"><div><h1 className="font-display text-3xl font-semibold text-gray-900">{t("title")}</h1><p className="mt-2 leading-7 text-gray-600">{t("subtitle")}</p>{user.roles.some((role) => ["admin", "super_admin"].includes(role)) && <Link href="/staff/content" className="mt-3 inline-block text-sm font-semibold text-primary underline underline-offset-2">{t("contentLink")}</Link>}</div>{error && <p className="rounded-md bg-error-light px-4 py-3 text-sm text-error" aria-live="polite">{error}</p>}{isLoading ? <p className="text-gray-600">{t("loading")}</p> : applications.length === 0 ? <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">{t("empty")}</p> : <div className="grid gap-5 lg:grid-cols-2">{applications.map((application) => <article key={application.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-sm font-semibold text-primary">{application.reference_number}</p><p className="mt-1 text-sm text-gray-600">{application.intake}</p></div><span className="rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold text-primary">{statusLabel(application.status)}</span></div><form action={(formData) => updateStatus(application, formData)} className="mt-5 space-y-4"><div><Label htmlFor={`status-${application.id}`}>{t("newStatus")}</Label><select id={`status-${application.id}`} name="status" defaultValue={application.status === "DRAFT" || application.status === "SUBMITTED" ? "UNDER_REVIEW" : application.status} className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900">{REVIEW_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div><div><Label htmlFor={`comment-${application.id}`}>{t("comment")}</Label><Textarea id={`comment-${application.id}`} name="comment" maxLength={2000} /></div><Button type="submit" fullWidth disabled={isSaving === application.id}>{isSaving === application.id ? t("saving") : t("save")}</Button></form></article>)}</div>}</section>;
}
