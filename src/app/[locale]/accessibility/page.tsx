import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InformationPage } from "@/components/features/information-page";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "accessibility.meta" });
  return { title: t("title"), description: t("description"), alternates: { canonical: `/${locale}/accessibility`, languages: { en: "/en/accessibility", fr: "/fr/accessibility" } } };
}

export default async function AccessibilityPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <InformationPage namespace="accessibility" />;
}
