"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { getTimetableReadiness, type TimetableReadiness } from "@/lib/api/academic-schedule";
import type { Locale } from "@/lib/api/types";

interface Props {
  termId: string;
  token: string;
  locale: Locale;
  /** Bump to refetch after a meeting or section changes. */
  refreshKey?: number;
}

/** Mount with `key={termId}` so a term switch never shows the previous term data. */
export function ScheduleReadinessCard({ termId, token, locale, refreshKey = 0 }: Props) {
  const t = useTranslations("scheduleEditor");
  const [data, setData] = useState<TimetableReadiness | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showMissing, setShowMissing] = useState(false);

  useEffect(() => {
    let active = true;
    getTimetableReadiness(termId, token, locale)
      .then((row) => { if (active) { setData(row); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [termId, token, locale, refreshKey, attempt]);

  return <section aria-label={t("readinessTitle")} className="rounded-2xl border border-gray-200 bg-white p-5">
    <h2 className="font-display text-xl font-semibold">{t("readinessTitle")}</h2>
    {failed && <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-error-light p-3 text-error"><span>{t("readinessLoadError")}</span><Button type="button" variant="outline" onClick={() => setAttempt((value) => value + 1)}>{t("retry")}</Button></div>}
    {!data && !failed && <p className="mt-2 text-gray-600">{t("loading")}</p>}
    {data && <>
      <p className="mt-2">{t("readinessSections", { withMeetings: data.sections_with_meetings, total: data.sections_total })}</p>
      <p>{t("readinessNoRoom", { count: data.meetings_without_classroom })}</p>
      {data.sections_without_meetings.length > 0 && <div className="mt-3">
        <Button type="button" variant="outline" aria-expanded={showMissing} onClick={() => setShowMissing((value) => !value)}>{t(showMissing ? "hideMissing" : "showMissing", { count: data.sections_without_meetings.length })}</Button>
        {showMissing && <ul className="mt-3 divide-y divide-gray-100">{data.sections_without_meetings.map((row) => <li key={row.id} className="py-2">{row.course_code} · {locale === "fr" ? row.course_title_fr || row.course_title_en : row.course_title_en} · {row.code}</li>)}</ul>}
      </div>}
    </>}
  </section>;
}
