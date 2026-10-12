import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { StudentResults } from "@/components/features/student-results";
import type { Locale } from "@/lib/api/types";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "student.results.meta" });
  return { title: t("title"), description: t("description"), robots: { index: false, follow: false } };
}

export default async function StudentResultsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <StudentResults locale={locale as Locale} />;
}
