"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { StudentRegistrationPanel } from "@/components/features/student-registration-panel";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import {
  getMyCurrentCourses, getMyRegistrationWindow,
  type StudentCourseOverview, type StudentRegistrationWindow,
} from "@/lib/api/students";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

export function StudentCurrentCourses({ locale }: { locale: Locale }) {
  const t = useTranslations("student.courses");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isStudent = !!user?.roles.includes("student");
  const [overview, setOverview] = useState<StudentCourseOverview | null>(null);
  const [window, setWindow] = useState<StudentRegistrationWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !isStudent) return;
    let active = true;
    Promise.all([getMyCurrentCourses(token, locale), getMyRegistrationWindow(token, locale)])
      .then(([result, registration]) => { if (active) { setOverview(result); setWindow(registration); } })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, isStudent, locale, t]);

  if (!token || !isStudent) return (
    <Container className="py-12"><div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <h1 className="font-display text-2xl font-semibold">{t("accessTitle")}</h1>
      <p className="mt-3 text-gray-600">{t("accessBody")}</p>
      <Link href="/login" className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-white">{t("signIn")}</Link>
    </div></Container>
  );

  return (
    <Container className="py-10 sm:py-14"><div className="mx-auto max-w-5xl">
      <Link href="/student" className="text-sm font-semibold text-primary underline underline-offset-2">{t("back")}</Link>
      <header className="mt-5"><p className="text-sm font-semibold uppercase tracking-widest text-accent-dark">{t("eyebrow")}</p><h1 className="mt-2 font-display text-3xl font-semibold text-gray-900">{t("title")}</h1><p className="mt-2 text-gray-600">{t("intro")}</p></header>
      {loading && <p className="mt-8 text-gray-600">{t("loading")}</p>}
      {error && <p role="alert" className="mt-8 rounded-xl bg-error-light p-4 text-error">{error}</p>}
      {overview && <>
        {window && <section className="mt-8 rounded-2xl border border-primary/20 bg-primary-subtle p-5"><h2 className="font-display text-xl font-semibold">{t("windowTitle")}</h2><p className="mt-2 text-sm text-gray-700">{t(`phases.${window.phase}`)}</p>{window.term && <p className="mt-2 text-sm font-medium">{window.term.academic_year} · {t("semester")} {window.term.semester} · {t("windowDates", { start: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Douala" }).format(new Date(window.term.registration_opens_at)), end: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Douala" }).format(new Date(window.term.registration_closes_at)) })}</p>}</section>}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-600">{t("studentId")}</p><p className="mt-1 font-semibold">{overview.student_id}</p></div>
          <div className="rounded-xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-600">{t("level")}</p><p className="mt-1 font-semibold">{overview.level}</p></div>
          <div className="rounded-xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-600">{t("semester")}</p><p className="mt-1 font-semibold">{overview.semester}</p></div>
        </div>
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6"><h2 className="font-display text-2xl font-semibold">{t("plannedCourses")}</h2>
          {overview.courses.length === 0 ? <p className="mt-4 text-gray-600">{t("empty")}</p> : <ul className="mt-4 divide-y divide-gray-100">{overview.courses.map((item) => <li key={item.course.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">{item.course.course_code} · {locale === "fr" ? item.course.name_fr || item.course.name_en : item.course.name_en}</p><p className="text-sm text-gray-600">{item.placement.is_required ? t("required") : t("elective")}</p></div><span className="rounded-full bg-primary-subtle px-3 py-1 text-sm font-semibold text-primary">{t("credits", { count: item.course.credits })}</span></li>)}</ul>}
        </section>
        <p className="mt-5 rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm text-gray-700">{t("notRegistered")}</p>
        <StudentRegistrationPanel locale={locale} />
      </>}
    </div></Container>
  );
}
