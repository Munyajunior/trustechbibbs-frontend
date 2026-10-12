import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CourseCatalogueEditor } from "@/components/features/course-catalogue-editor";
import { Container } from "@/components/shared/container";
import type { Locale } from "@/lib/api/types";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "courseEditor.meta" });
  return { title: t("title"), description: t("description"), robots: { index: false, follow: false } };
}

export default async function StaffCoursesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Container className="py-12 sm:py-16"><CourseCatalogueEditor locale={locale as Locale} /></Container>;
}
