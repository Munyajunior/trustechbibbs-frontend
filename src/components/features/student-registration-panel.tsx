"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  changeRegisteredCourses, getLatestRegistration, getRegistrationOptions, registerCourses,
  type RegistrationConfirmation, type RegistrationOptions,
} from "@/lib/api/course-registration";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

export function StudentRegistrationPanel({ locale }: { locale: Locale }) {
  const t = useTranslations("student.registration");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [options, setOptions] = useState<RegistrationOptions | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<RegistrationConfirmation | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user?.roles.includes("student")) return;
    let active = true;
    Promise.allSettled([getRegistrationOptions(token, locale), getLatestRegistration(token, locale)])
      .then(([optionsResult, latestResult]) => {
        if (!active) return;
        const result = optionsResult.status === "fulfilled" ? optionsResult.value : null;
        const latest = latestResult.status === "fulfilled" ? latestResult.value : null;
        if (result) {
          setOptions(result);
          setSelected(Object.fromEntries(result.courses
            .filter((item) => item.curriculum.placement.is_required && item.sections.length === 1 && item.sections[0].seats_available > 0)
            .map((item) => [item.curriculum.course.id, item.sections[0].section.id])));
        }
        if (latest && (!result?.term || (latest.academic_year === result.term.academic_year && latest.semester === result.term.semester))) {
          setConfirmation(latest);
          setSelected(Object.fromEntries(latest.enrollments.map((item) => [item.course_id, item.section_id])));
        }
        if (optionsResult.status === "rejected") setError(optionsResult.reason instanceof ApiError ? optionsResult.reason.localizedMessage(locale) : t("loadError"));
        else if (latestResult.status === "rejected") setError(latestResult.reason instanceof ApiError ? latestResult.reason.localizedMessage(locale) : t("loadError"));
      }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, user, locale, t]);

  if (!token || !user?.roles.includes("student")) return null;
  if (loading) return <p className="mt-6 text-sm text-gray-600">{t("loading")}</p>;
  if (error && !options && !confirmation) return <p role="alert" className="mt-6 rounded-xl bg-error-light p-4 text-error">{error}</p>;
  if (!options?.term && !confirmation) return null;

  const chosen = options?.courses.filter((item) => selected[item.curriculum.course.id]) ?? [];
  const credits = chosen.reduce((total, item) => total + item.curriculum.course.credits, 0);
  const requiredReady = options?.courses.every((item) =>
    !item.curriculum.placement.is_required || !!selected[item.curriculum.course.id]);
  const withinLimits = !!options?.term && credits >= options.term.min_credits && credits <= options.term.max_credits;

  async function submit() {
    if (!token || !options?.term) return;
    setBusy(true); setError(null);
    try {
      const result = await (editing ? changeRegisteredCourses : registerCourses)(
        options.term.academic_year, options.term.semester,
        Object.values(selected).filter(Boolean), token, locale,
      );
      setConfirmation(result);
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
    } finally { setBusy(false); }
  }

  return <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
    <h2 className="font-display text-2xl font-semibold">{t("title")}</h2>
    <p className="mt-2 text-sm text-gray-600">{t("period", { year: confirmation?.academic_year ?? options?.term?.academic_year ?? "", semester: confirmation?.semester ?? options?.term?.semester ?? 1 })}</p>
    {error && <p role="alert" className="mt-4 rounded-md bg-error-light p-3 text-sm text-error">{error}</p>}
    {confirmation && !editing ? <div className="mt-5"><p role="status" className="rounded-xl bg-primary-subtle p-4 font-semibold text-primary">{t("confirmed", { count: confirmation.enrollments.length, credits: confirmation.total_credits })}</p><ul className="mt-4 divide-y divide-gray-100">{confirmation.enrollments.map((enrollment) => <li key={enrollment.id} className="py-3"><strong>{enrollment.course_code}</strong> · {locale === "fr" ? enrollment.course_name_fr || enrollment.course_name_en : enrollment.course_name_en}<span className="ml-2 text-sm text-gray-600">{t("section", { code: enrollment.section_code })}</span>{enrollment.meetings.map((meeting) => <p key={meeting.id} className="mt-1 text-sm text-gray-600">{t(`days.${meeting.day_of_week}`)} {meeting.starts_at.slice(0, 5)}–{meeting.ends_at.slice(0, 5)}{meeting.venue_name ? ` · ${meeting.venue_name}` : ""}</p>)}</li>)}</ul><div className="mt-4 flex flex-wrap gap-3 print:hidden"><Button type="button" variant="outline" onClick={() => window.print()}>{t("print")}</Button>{options?.term && ["OPEN", "ADD_DROP"].includes(options.phase) && <Button type="button" onClick={() => setEditing(true)}>{t("editRegistration")}</Button>}</div></div> : options?.term && (options.phase === "OPEN" || (editing && options.phase === "ADD_DROP")) ? <>
      <p className="mt-3 text-sm text-gray-600">{editing ? t("editInstructions") : t("instructions")}</p>
      {options.courses.length === 0 ? <p className="mt-4 text-gray-600">{t("empty")}</p> : <div className="mt-5 divide-y divide-gray-100">{options.courses.map((item) => <div key={item.curriculum.course.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_17rem] sm:items-center"><div><p className="font-semibold">{item.curriculum.course.course_code} · {locale === "fr" ? item.curriculum.course.name_fr || item.curriculum.course.name_en : item.curriculum.course.name_en}</p><p className="text-sm text-gray-600">{item.curriculum.course.credits} {t("credits")} · {item.curriculum.placement.is_required ? t("required") : t("elective")}</p></div><div><label htmlFor={`select-${item.curriculum.course.id}`} className="mb-1 block text-sm font-medium">{t("chooseSection")}</label><select id={`select-${item.curriculum.course.id}`} value={selected[item.curriculum.course.id] ?? ""} onChange={(event) => setSelected((current) => ({ ...current, [item.curriculum.course.id]: event.target.value }))} disabled={item.sections.length === 0} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{item.sections.length ? t("selectSection") : t("noSections")}</option>{item.sections.map((section) => <option key={section.section.id} value={section.section.id} disabled={section.seats_available === 0}>{section.section.code} · {t("seats", { count: section.seats_available })}{section.meetings.length ? ` · ${section.meetings.map((meeting) => `${t(`days.${meeting.day_of_week}`)} ${meeting.starts_at.slice(0, 5)}–${meeting.ends_at.slice(0, 5)}`).join(", ")}` : ""}</option>)}</select></div></div>)}</div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4"><p className="font-semibold">{t("creditSummary", { selected: credits, min: options.term.min_credits, max: options.term.max_credits })}</p><div className="flex gap-2">{editing && <Button type="button" variant="outline" disabled={busy} onClick={() => { setEditing(false); setSelected(Object.fromEntries((confirmation?.enrollments ?? []).map((item) => [item.course_id, item.section_id]))); }}>{t("cancelEdit")}</Button>}<Button type="button" disabled={busy || !requiredReady || !withinLimits || chosen.length === 0} onClick={() => void submit()}>{busy ? t("submitting") : editing ? t("saveChanges") : t("submit")}</Button></div></div>
      <p className="mt-3 text-xs text-gray-600">{t("validationNote")}</p>
    </> : <p className="mt-4 text-gray-600">{t(`phases.${options?.phase ?? "NOT_SCHEDULED"}`)}</p>}
  </section>;
}
