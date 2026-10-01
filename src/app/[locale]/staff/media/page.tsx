import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { MediaLibrary } from "@/components/features/media-library";
import type { Locale } from "@/lib/api/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mediaLibrary" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function StaffMediaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MediaLibrary locale={locale as Locale} />;
}
