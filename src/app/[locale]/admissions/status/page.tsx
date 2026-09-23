import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ApplicationStatusTracker } from "@/components/features/application-status-tracker";
import { Container } from "@/components/shared/container";
import type { Locale } from "@/lib/api/types";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tracker.meta" });
  return { title: t("title"), description: t("description") };
}

export default async function ApplicationStatusPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Container className="py-12 sm:py-16"><ApplicationStatusTracker locale={locale as Locale} /></Container>;
}
