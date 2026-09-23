"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  getApplication,
  getMyApplications,
  type ApplicantApplicationListItem,
  type ApplicationDetail,
} from "@/lib/api/admissions";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

type ApplicationStatusTrackerProps = { locale: Locale };

function labelForStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

export function ApplicationStatusTracker({ locale }: ApplicationStatusTrackerProps) {
  const t = useTranslations("tracker");
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [applications, setApplications] = useState<ApplicantApplicationListItem[]>([]);
  const [selected, setSelected] = useState<ApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    getMyApplications(accessToken, locale)
      .then((result) => active && setApplications(result.items))
      .catch((caught) => {
        if (!active) return;
        if (caught instanceof ApiError) setError(caught.localizedMessage(locale));
        else if (caught instanceof ApiUnreachableError) setError(t("serviceUnavailable"));
        else setError(t("unexpectedError"));
      })
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [accessToken, locale, t]);

  async function showDetails(application: ApplicantApplicationListItem) {
    if (!accessToken) return;
    setError(null);
    try {
      setSelected(await getApplication(application.id, accessToken, locale));
    } catch (caught) {
      if (caught instanceof ApiError) setError(caught.localizedMessage(locale));
      else setError(t("unexpectedError"));
    }
  }

  if (!user || !accessToken) {
    return <section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8"><h1 className="font-display text-2xl font-semibold text-gray-900">{t("accountTitle")}</h1><p className="mt-3 leading-7 text-gray-600">{t("accountBody")}</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/admissions/login" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">{t("signIn")}</Link><Link href="/admissions/register" className="inline-flex h-11 items-center justify-center rounded-md border border-primary px-4 text-sm font-medium text-primary hover:bg-primary-subtle">{t("createAccount")}</Link></div></section>;
  }

  return <section className="mx-auto max-w-3xl space-y-6"><div><h1 className="font-display text-3xl font-semibold text-gray-900">{t("title")}</h1><p className="mt-2 leading-7 text-gray-600">{t("subtitle")}</p></div>{error && <p className="rounded-md bg-error-light px-4 py-3 text-sm text-error" aria-live="polite">{error}</p>}{isLoading ? <p className="text-gray-600">{t("loading")}</p> : applications.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center"><p className="text-gray-600">{t("empty")}</p><Link href="/admissions/application" className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">{t("startApplication")}</Link></div> : <div className="space-y-3">{applications.map((application) => <article key={application.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-sm font-semibold text-primary">{application.reference_number}</p><p className="mt-1 text-sm text-gray-600">{application.intake}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold text-primary">{labelForStatus(application.status)}</span><Button type="button" variant="secondary" onClick={() => showDetails(application)}>{t("viewTimeline")}</Button></div></div></article>)}</div>}{selected && <section className="rounded-xl border border-primary-light bg-primary-subtle p-6"><div className="flex items-center justify-between gap-4"><div><p className="font-mono text-sm font-semibold text-primary">{selected.reference_number}</p><h2 className="mt-1 font-display text-xl font-semibold text-gray-900">{t("timelineTitle")}</h2></div><Button type="button" variant="secondary" onClick={() => setSelected(null)}>{t("close")}</Button></div><ol className="mt-6 space-y-4 border-l-2 border-primary-light pl-5">{selected.status_history.map((entry) => <li key={`${entry.status}-${entry.changed_at}`}><p className="font-medium text-gray-900">{labelForStatus(entry.status)}</p><p className="mt-1 text-sm text-gray-600">{new Intl.DateTimeFormat(locale === "fr" ? "fr-CM" : "en-CM", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.changed_at))}</p>{entry.comment && <p className="mt-1 text-sm text-gray-700">{entry.comment}</p>}</li>)}</ol></section>}</section>;
}
