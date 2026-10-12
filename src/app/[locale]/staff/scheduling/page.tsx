import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AcademicScheduleEditor } from "@/components/features/academic-schedule-editor";
import type { Locale } from "@/lib/api/types";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "scheduleEditor.meta" });
  return { title: t("title"), description: t("description"), robots: { index: false, follow: false } };
}

export default async function StaffSchedulingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AcademicScheduleEditor locale={locale as Locale} />;
}
