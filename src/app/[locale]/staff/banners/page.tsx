import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BannerEditor } from "@/components/features/banner-editor";
import type { Locale } from "@/lib/api/types";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bannerEditor" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function BannerEditorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BannerEditor locale={locale as Locale} />;
}
