import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ApplicationDraftForm } from "@/components/features/application-draft-form";
import type { Locale } from "@/lib/api/types";

type PageProps = { params: Promise<{ locale: string }>; searchParams: Promise<{ draft?: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "application.meta" });
  return { title: t("title"), description: t("description"), alternates: { canonical: `/${locale}/admissions/application`, languages: { en: "/en/admissions/application", fr: "/fr/admissions/application" } } };
}

export default async function ApplicationPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { draft } = await searchParams;
  setRequestLocale(locale);
  return <main className="bg-gray-50 py-12 sm:py-16"><ApplicationDraftForm locale={locale as Locale} draftId={draft} /></main>;
}
