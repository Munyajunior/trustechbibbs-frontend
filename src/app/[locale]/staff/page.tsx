import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { StaffDashboard } from "@/components/features/staff-dashboard";
import type { Locale } from "@/lib/api/types";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staffDashboard.meta" });
  return { title: t("title"), description: t("description"), robots: { index: false, follow: false } };
}

export default async function StaffHomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <StaffDashboard locale={locale as Locale} />;
}
