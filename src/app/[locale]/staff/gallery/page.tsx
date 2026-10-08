import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { GalleryEditor } from "@/components/features/gallery-editor";
import type { Locale } from "@/lib/api/types";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "galleryEditor.meta" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function StaffGalleryPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GalleryEditor locale={locale as Locale} />;
}
