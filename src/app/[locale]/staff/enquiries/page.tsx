import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ContactEnquiryInbox } from "@/components/features/contact-enquiry-inbox";
import { Container } from "@/components/shared/container";
import type { Locale } from "@/lib/api/types";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "enquiryInbox.meta" });
  return { title: t("title"), description: t("description"), robots: { index: false, follow: false } };
}

export default async function StaffEnquiriesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Container className="py-12 sm:py-16"><ContactEnquiryInbox locale={locale as Locale} /></Container>;
}
