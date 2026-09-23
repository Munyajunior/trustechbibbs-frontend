import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InformationPage } from "@/components/features/information-page";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy.meta" });
  return { title: t("title"), description: t("description"), alternates: { canonical: `/${locale}/privacy`, languages: { en: "/en/privacy", fr: "/fr/privacy" } } };
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <InformationPage namespace="privacy" />;
}
