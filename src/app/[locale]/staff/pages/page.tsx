import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SitePageEditor } from "@/components/features/site-page-editor";
import type { Locale } from "@/lib/api/types";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pageEditor" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function StaffPages({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SitePageEditor locale={locale as Locale} />;
}
