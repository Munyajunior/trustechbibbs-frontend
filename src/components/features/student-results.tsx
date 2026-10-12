"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";
import { TranscriptRequestPanel } from "@/components/features/transcript-request-panel";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import { getMyResults, type ResultSummary } from "@/lib/api/grades";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

export function StudentResults({ locale }: { locale: Locale }) {
  const t = useTranslations("student.results");
  const token = useAuthStore((state) => state.accessToken);
  const isStudent = useAuthStore((state) => !!state.user?.roles.includes("student"));
  const [summary, setSummary] = useState<ResultSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState("");

  useEffect(() => {
    if (!token || !isStudent) return;
    let active = true;
    getMyResults(token, locale)
      .then((data) => {
        if (!active) return;
        setSummary(data);
        const latest = data.semesters.at(-1);
        if (latest) setSelectedTerm(`${latest.academic_year}:${latest.semester}`);
      })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, isStudent, locale, t]);

  const selectedSummary = useMemo(() => summary?.semesters.find((item) =>
    `${item.academic_year}:${item.semester}` === selectedTerm), [summary, selectedTerm]);
  const results = useMemo(() => summary?.results.filter((item) =>
    `${item.academic_year}:${item.semester}` === selectedTerm) ?? [], [summary, selectedTerm]);

  if (!token || !isStudent) return <Container className="py-12"><section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center"><h1 className="font-display text-2xl font-semibold">{t("accessTitle")}</h1><p className="mt-3 text-gray-600">{t("accessBody")}</p><Link href="/login" className="mt-5 inline-block text-primary underline">{t("signIn")}</Link></section></Container>;

  return <Container className="py-10 sm:py-14"><div className="mx-auto max-w-5xl">
    <Link href="/student" className="text-sm font-semibold text-primary underline underline-offset-2 print:hidden">{t("back")}</Link>
    <div className="hidden print:block"><BrandMark compact /></div>
    <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-accent-dark">{t("eyebrow")}</p><h1 className="mt-2 font-display text-3xl font-semibold">{t("title")}</h1><p className="mt-2 text-gray-600 print:hidden">{t("intro")}</p>{summary && <p className="mt-3 text-sm font-medium">{summary.student_name} · {t("studentId")}: {summary.student_id}</p>}</div>
      {summary && summary.results.length > 0 && <Button type="button" variant="outline" className="print:hidden" onClick={() => window.print()}>{t("print")}</Button>}
    </header>
    {loading && <p className="mt-8 text-gray-600">{t("loading")}</p>}
    {error && <p role="alert" className="mt-8 rounded-xl bg-error-light p-4 text-error">{error}</p>}
    {summary && <>
      {summary.semesters.length > 0 && <div className="mt-7 max-w-xs print:hidden"><label htmlFor="results-term" className="mb-2 block text-sm font-semibold">{t("chooseSemester")}</label><select id="results-term" value={selectedTerm} onChange={(event) => setSelectedTerm(event.target.value)} className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3">{summary.semesters.map((item) => <option key={`${item.academic_year}:${item.semester}`} value={`${item.academic_year}:${item.semester}`}>{item.academic_year} · {t("semester")} {item.semester}</option>)}</select></div>}
      <div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-600">{t("semesterGpa")}</p><p className="mt-1 text-3xl font-semibold text-primary">{selectedSummary?.gpa ?? "—"}</p></div><div className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-600">{t("cgpa")}</p><p className="mt-1 text-3xl font-semibold text-primary">{summary.cumulative_gpa ?? "—"}</p></div><div className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-600">{t("creditsEarned")}</p><p className="mt-1 text-3xl font-semibold text-primary">{summary.credits_earned}</p></div></div>
      {summary.academic_standing && <p className="mt-4 rounded-xl bg-primary-subtle p-4 text-sm font-semibold text-primary">{t("standing")}: {t(`standings.${summary.academic_standing}`)}</p>}
      {results.length === 0 ? <p className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">{t("empty")}</p> : <section className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <h2 className="bg-primary-subtle px-5 py-4 font-display text-xl font-semibold text-primary">{selectedSummary?.academic_year} · {t("semester")} {selectedSummary?.semester}</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs print:min-w-0 print:text-[10px] sm:text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="px-4 py-3">{t("course")}</th><th className="px-2 py-3">{t("credits")}</th><th className="px-2 py-3">{t("ca")}</th><th className="px-2 py-3">{t("exam")}</th><th className="px-2 py-3">{t("total")}</th><th className="px-2 py-3">{t("grade")}</th><th className="px-2 py-3">{t("gradePoint")}</th><th className="px-2 py-3">{t("creditPoints")}</th><th className="px-4 py-3">{t("remarks")}</th></tr></thead><tbody className="divide-y divide-gray-100">{results.map((result) => <tr key={result.grade_id}><td className="px-4 py-3"><span className="font-semibold">{result.course_code}</span><span className="block text-gray-600">{locale === "fr" ? result.course_name_fr || result.course_name_en : result.course_name_en}</span></td><td className="px-2 py-3">{result.credits}</td><td className="px-2 py-3">{result.ca_score}</td><td className="px-2 py-3">{result.exam_score}</td><td className="px-2 py-3">{result.total_score}</td><td className="px-2 py-3 font-semibold">{result.grade}</td><td className="px-2 py-3">{result.grade_point}</td><td className="px-2 py-3">{result.credit_points}</td><td className="px-4 py-3">{t(`resultStatuses.${result.result_status}`)}</td></tr>)}</tbody><tfoot className="bg-gray-50 font-semibold"><tr><td className="px-4 py-3">{t("total")}</td><td className="px-2 py-3">{selectedSummary?.attempted_credits}</td><td colSpan={5} /><td className="px-2 py-3">{selectedSummary?.credit_points}</td><td /></tr></tfoot></table></div>
        <p className="border-t border-gray-100 px-5 py-4 text-sm text-gray-700">{t("semesterSummary", { earned: selectedSummary?.earned_credits ?? 0, attempted: selectedSummary?.attempted_credits ?? 0 })}</p>
      </section>}
      <p className="mt-6 text-sm text-gray-600">{t("publishedOnly")}</p>
      <TranscriptRequestPanel locale={locale} hasResults={summary.results.length > 0} />
    </>}
  </div></Container>;
}
