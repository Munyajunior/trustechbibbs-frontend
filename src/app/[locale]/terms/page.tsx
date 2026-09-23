import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InformationPage } from "@/components/features/information-page";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms.meta" });
  return { title: t("title"), description: t("description"), alternates: { canonical: `/${locale}/terms`, languages: { en: "/en/terms", fr: "/fr/terms" } } };
}

export default async function TermsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <InformationPage namespace="terms" />;
}
