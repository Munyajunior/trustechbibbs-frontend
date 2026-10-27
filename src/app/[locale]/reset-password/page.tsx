import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PasswordRecoveryForm } from "@/components/features/password-recovery-form";
import type { Locale } from "@/lib/api/types";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.recovery.reset" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function ResetPasswordPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <main className="min-h-[60vh] bg-slate-50 px-4 py-12 sm:py-16"><PasswordRecoveryForm locale={locale as Locale} mode="reset" /></main>;
}
