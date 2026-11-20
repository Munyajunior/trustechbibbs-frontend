"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { getMyTimetable, type TimetableEntry } from "@/lib/api/course-registration";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const DAYS = [1, 2, 3, 4, 5, 6, 7];

export function StudentTimetable({ locale }: { locale: Locale }) {
  const t = useTranslations("student.timetable");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isStudent = !!user?.roles.includes("student");
  const [entries, setEntries] = useState<TimetableEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !isStudent) return;
    let active = true;
    getMyTimetable(token, locale)
      .then((result) => { if (active) { setEntries(result); setError(null); } })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError")); });
    return () => { active = false; };
  }, [token, isStudent, locale, t]);

  const room = (entry: TimetableEntry) => {
    if (entry.classroom_name && entry.classroom_code) return t("room", { code: entry.classroom_code, name: entry.classroom_name });
    if (entry.classroom_name) return t("roomName", { name: entry.classroom_name });
    return t("noRoom");
  };
  const summary = (entry: TimetableEntry) => [
    `${entry.starts_at.slice(0, 5)}–${entry.ends_at.slice(0, 5)}`,
    t(`types.${entry.session_type}`),
    entry.course_code,
    room(entry),
    entry.lecturer_name,
  ].filter(Boolean).join(" · ");

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 print:border-0 print:p-0" aria-labelledby="student-timetable-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="student-timetable-title" className="font-display text-2xl font-semibold">{t("title")}</h2>
        {entries && entries.length > 0 && <Button type="button" variant="outline" className="print:hidden" onClick={() => window.print()}>{t("print")}</Button>}
      </div>
      <p className="mt-2 text-sm text-gray-600 print:hidden">{t("intro")}</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-error-light p-4 text-error">{error}</p>}
      {!entries && !error && <p className="mt-4 text-gray-600">{t("loading")}</p>}
      {entries && entries.length === 0 && <p className="mt-4 text-gray-600">{t("empty")}</p>}
      {entries && entries.length > 0 && (
        <div className="mt-5 grid gap-4 md:grid-cols-7 md:gap-2 print:grid-cols-7">
          {DAYS.map((day) => {
            const slots = entries.filter((entry) => entry.day_of_week === day);
            return (
              <div key={day} className={`${slots.length === 0 ? "hidden md:block " : ""}rounded-xl border border-gray-100 p-3`}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">{t(`days.${day}`)}</h3>
                <ul className="mt-2 space-y-3">
                  {slots.map((entry, index) => (
                    <li key={`${entry.course_code}-${entry.starts_at}-${index}`} className="text-sm">
                      <p className="font-medium text-gray-900">{summary(entry)}</p>
                      <p className="text-gray-600">{locale === "fr" ? entry.course_name_fr || entry.course_name_en : entry.course_name_en}</p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
