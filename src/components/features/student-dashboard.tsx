"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import { getMyStudentProfile, type StudentProfile } from "@/lib/api/students";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const sections = ["profile", "courses", "results", "fees"] as const;

export function StudentDashboard({ locale }: { locale: Locale }) {
  const t = useTranslations("student");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isStudent = user?.roles.includes("student") ?? false;
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !isStudent) return;
    let active = true;
    getMyStudentProfile(token, locale)
      .then((result) => { if (active) setProfile(result); })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("dashboard.loadError")); });
    return () => { active = false; };
  }, [isStudent, locale, t, token]);

  if (!token || !isStudent) return (
    <Container className="py-12 sm:py-16">
      <section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-semibold text-gray-900">{t("dashboard.accessTitle")}</h1>
        <p className="mt-3 text-gray-600">{t("dashboard.accessBody")}</p>
        <Link href="/login" className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-white">{t("profile.signIn")}</Link>
      </section>
    </Container>
  );

  return (
    <Container className="py-10 sm:py-14">
      <div className="max-w-5xl">
        <h1 className="font-display text-3xl font-semibold text-gray-900">{t("dashboard.title")}</h1>
        {profile ? (
          <div className="mt-5 rounded-xl bg-primary p-6 text-white sm:p-8">
            <p className="text-sm text-white/80">{t("dashboard.welcome")}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{profile.first_name} {profile.last_name}</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/90">
              <span>{t("profile.studentId")}: {profile.student_id}</span>
              <span>{t("profile.level")}: {profile.current_level}</span>
              <span>{t("profile.semester")}: {profile.current_semester}</span>
            </div>
          </div>
        ) : <p className="mt-5 rounded-xl border border-gray-200 bg-white p-5 text-gray-600" role="status">{error ?? t("dashboard.loading")}</p>}
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section}>
              <Link href={`/student/${section}`} className="block h-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary-light hover:shadow-md">
                <h2 className="font-display text-xl font-semibold text-gray-900">{t(`dashboard.sections.${section}.title`)}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">{t(`dashboard.sections.${section}.body`)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
