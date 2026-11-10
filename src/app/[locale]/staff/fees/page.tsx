import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { StaffFeeSchedule } from "@/components/features/staff-fee-schedule";
import type { Locale } from "@/lib/api/types";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "finance.fees.meta" });
  return { title: t("title"), description: t("description"), robots: { index: false, follow: false } };
}

export default async function StaffFeesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <StaffFeeSchedule locale={locale as Locale} />;
}
