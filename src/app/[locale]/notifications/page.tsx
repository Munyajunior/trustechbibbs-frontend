import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { NotificationCentre } from "@/components/features/notification-centre";
import type { Locale } from "@/lib/api/types";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "notifications.meta" });
  return { title: t("title"), description: t("description"), robots: { index: false, follow: false } };
}

export default async function NotificationsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <NotificationCentre locale={locale as Locale} />;
}
