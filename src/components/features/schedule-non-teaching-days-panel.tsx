"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  addNonTeachingDay, listNonTeachingDays, removeNonTeachingDay,
  type Campus, type NonTeachingDay, type NonTeachingKind,
} from "@/lib/api/academic-schedule";
import { ApiError } from "@/lib/api/client";
import type { Locale } from "@/lib/api/types";

interface Props {
  term: { id: string; academic_year: string; semester: number; starts_on: string; ends_on: string };
  campuses: Campus[];
  token: string;
  locale: Locale;
}

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

/** Mount with `key={term.id}` so a term switch never shows the previous term days. */
export function ScheduleNonTeachingDaysPanel({ term, campuses, token, locale }: Props) {
  const t = useTranslations("scheduleEditor");
  const [days, setDays] = useState<NonTeachingDay[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listNonTeachingDays(term.starts_on, term.ends_on, token, locale)
      .then((rows) => { if (active) { setDays(rows); setLoadFailed(false); } })
      .catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [term.starts_on, term.ends_on, token, locale, attempt]);

  const campusName = (id: string | null) => {
    if (!id) return t("allCampuses");
    const campus = campuses.find((row) => row.id === id);
    return campus ? (locale === "fr" ? campus.name_fr || campus.name_en : campus.name_en) : id;
  };
  const fail = (caught: unknown) => setError(caught instanceof ApiError
    ? (caught.code === "NON_TEACHING_DAY_EXISTS" ? t("dayExists") : caught.localizedMessage(locale))
    : t("saveError"));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = await addNonTeachingDay({
        campus_id: field(data, "campus_id") || null, day: field(data, "day"),
        label_en: field(data, "label_en"), label_fr: field(data, "label_fr"),
        kind: field(data, "kind") as NonTeachingKind,
      }, token, locale);
      setDays((current) => [...(current ?? []), saved].sort((a, b) => a.day.localeCompare(b.day)));
      form.reset(); setNotice(t("dayAdded"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true); setError(null); setNotice(null);
    try {
      await removeNonTeachingDay(id, token, locale);
      setDays((current) => (current ?? []).filter((row) => row.id !== id)); setNotice(t("dayRemoved"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  const select = "h-11 w-full rounded-md border border-gray-300 bg-white px-3";
  return <section className="rounded-2xl border border-gray-200 bg-white p-5">
    <h2 className="font-display text-xl font-semibold">{t("daysTitle", { year: term.academic_year, semester: term.semester })}</h2>
    <p className="mt-1 text-sm text-gray-600">{t("daysIntro")}</p>
    {error && <p role="alert" className="mt-3 rounded-md bg-error-light p-3 text-error">{error}</p>}
    {notice && <p role="status" className="mt-3 rounded-md bg-primary-subtle p-3 text-primary">{notice}</p>}
    <form onSubmit={(event) => void save(event)} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
      <div><Label htmlFor="day-date">{t("date")}</Label><Input id="day-date" name="day" type="date" required min={term.starts_on} max={term.ends_on} /></div>
      <div><Label htmlFor="day-campus">{t("campus")}</Label><select id="day-campus" name="campus_id" className={select}><option value="">{t("allCampuses")}</option>{campuses.filter((campus) => campus.is_active).map((campus) => <option key={campus.id} value={campus.id}>{campusName(campus.id)}</option>)}</select></div>
      <div><Label htmlFor="day-kind">{t("kind")}</Label><select id="day-kind" name="kind" className={select}><option value="HOLIDAY">{t("kinds.HOLIDAY")}</option><option value="EXAM_PERIOD">{t("kinds.EXAM_PERIOD")}</option><option value="OTHER">{t("kinds.OTHER")}</option></select></div>
      <div><Label htmlFor="day-label-en">{t("labelEn")}</Label><Input id="day-label-en" name="label_en" required maxLength={200} /></div>
      <div><Label htmlFor="day-label-fr">{t("labelFr")}</Label><Input id="day-label-fr" name="label_fr" required maxLength={200} /></div>
      <Button type="submit" disabled={busy}>{t("addDay")}</Button>
    </form>
    {loadFailed && <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-md bg-error-light p-3 text-error"><span>{t("daysLoadError")}</span><Button type="button" variant="outline" onClick={() => setAttempt((value) => value + 1)}>{t("retry")}</Button></div>}
    {!days && !loadFailed && <p className="mt-4 text-gray-600">{t("loading")}</p>}
    {days && (days.length === 0 ? <p className="mt-4 text-gray-600">{t("noDays")}</p> : <ul className="mt-4 divide-y divide-gray-100">{days.map((day) => <li key={day.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span>{day.day} · {locale === "fr" ? day.label_fr : day.label_en} · {t(`kinds.${day.kind}`)} · {campusName(day.campus_id)}</span><Button type="button" variant="outline" disabled={busy} onClick={() => void remove(day.id)}>{t("remove")}</Button></li>)}</ul>)}
  </section>;
}
