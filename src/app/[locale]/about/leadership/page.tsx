import { ArrowLeft, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LeadershipDirectory } from "@/components/features/leadership-directory";
import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { getLeadershipProfiles } from "@/lib/api/public";
import { safeFetch } from "@/lib/api/safe";
import type { LeadershipProfile, Locale } from "@/lib/api/types";

export const revalidate = 86400;
type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "leadership.meta" });
  return { title: t("title"), description: t("description"), alternates: {
    canonical: `/${locale}/about/leadership`,
    languages: { en: "/en/about/leadership", fr: "/fr/about/leadership" },
  } };
}

export default async function LeadershipPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("leadership");
  const { data: profiles, failed } = await safeFetch<LeadershipProfile[]>(
    getLeadershipProfiles({ locale: locale as Locale }), [], "leadership:profiles",
  );
  return <main className="leadership-page home-editorial">
    <section className="leadership-hero"><Container><Link href="/about" className="leadership-back"><ArrowLeft aria-hidden="true" size={17} />{t("back")}</Link><p className="home-kicker">{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("intro")}</p></Container></section>
    <section className="leadership-content"><Container>{profiles.length ? <LeadershipDirectory profiles={profiles} locale={locale as Locale} /> : <div className="journal-empty"><div className="journal-empty-icon"><UsersRound aria-hidden="true" size={35} /></div><div><h2>{failed ? t("unavailableTitle") : t("emptyTitle")}</h2><p>{failed ? t("unavailableBody") : t("emptyBody")}</p></div><Link className="home-button home-button-gold" href="/contact">{t("contactCta")}</Link></div>}</Container></section>
  </main>;
}
