import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ApplicantAuthForm } from "@/components/features/applicant-auth-form";
import type { Locale } from "@/lib/api/types";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.login.meta" });
  return { title: t("title"), description: t("description"), alternates: { canonical: `/${locale}/admissions/login`, languages: { en: "/en/admissions/login", fr: "/fr/admissions/login" } } };
}

export default async function AdmissionsLoginPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <main className="bg-gray-50 py-12 sm:py-16"><ApplicantAuthForm locale={locale as Locale} mode="login" /></main>;
}
