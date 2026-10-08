import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LeadershipEditor } from "@/components/features/leadership-editor";
import type { Locale } from "@/lib/api/types";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "leadershipEditor.meta" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function StaffLeadershipPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LeadershipEditor locale={locale as Locale} />;
}
