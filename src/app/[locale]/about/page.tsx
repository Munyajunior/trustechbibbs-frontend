import Image from "next/image";
import { ArrowRight, BookOpenCheck, Globe2, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";

export const revalidate = 86400;
type PageProps = { params: Promise<{ locale: string }> };
const schools = ["business", "health", "engineering", "education", "communication", "tourism", "agriculture"] as const;
const values = ["integrity", "practice", "people", "possibility"] as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about.meta" });
  return { title: t("title"), description: t("description"), alternates: {
    canonical: `/${locale}/about`, languages: { en: "/en/about", fr: "/fr/about" },
  } };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const th = await getTranslations("home.schools");

  return (
    <div className="home-editorial about-editorial">
      <section className="about-hero" aria-labelledby="about-title">
        <Container className="about-hero-inner">
          <div className="about-hero-copy">
            <p className="home-kicker">{t("eyebrow")}</p>
            <h1 id="about-title">{t("heroTitle")}</h1>
            <p>{t("heroIntro")}</p>
            <div className="home-actions">
              <Link className="home-button home-button-gold" href="/programs">{t("schoolsCta")}<ArrowRight aria-hidden="true" size={18} /></Link>
              <Link className="home-button home-button-outline" href="/contact">{t("contactCta")}</Link>
            </div>
          </div>
          <div className="about-hero-art" aria-hidden="true">
            <div className="about-art-main"><Image src="/images/school-business-management.png" alt="" fill priority sizes="(max-width: 700px) 100vw, 35vw" className="object-cover" /></div>
            <div className="about-art-small"><Image src="/images/school-health.png" alt="" fill sizes="(max-width: 700px) 44vw, 17vw" className="object-cover" /></div>
            <span className="about-art-word">{t("heroWord")}</span>
          </div>
        </Container>
      </section>

      <section className="about-identity" aria-labelledby="about-identity-title">
        <Container className="about-identity-inner">
          <div><p className="home-kicker">{t("identityEyebrow")}</p><h2 id="about-identity-title">{t("identityTitle")}</h2></div>
          <div className="about-identity-text"><p>{t("historyBody")}</p><p>{t("identityBody")}</p></div>
        </Container>
      </section>

      <section className="about-facts" aria-label={t("factsLabel")}>
        <Container className="about-facts-grid">
          <div><BookOpenCheck aria-hidden="true" size={29} strokeWidth={1.5} /><strong>07</strong><span>{t("factSchools")}</span></div>
          <div><Globe2 aria-hidden="true" size={29} strokeWidth={1.5} /><strong>EN / FR</strong><span>{t("factLanguages")}</span></div>
          <div><MapPin aria-hidden="true" size={29} strokeWidth={1.5} /><strong>Douala</strong><span>{t("factLocation")}</span></div>
        </Container>
      </section>

      <section className="about-purpose" aria-labelledby="about-purpose-title">
        <Container>
          <div className="home-section-heading home-section-heading-split">
            <div><p className="home-kicker">{t("purposeEyebrow")}</p><h2 id="about-purpose-title">{t("purposeTitle")}</h2></div>
            <p>{t("purposeIntro")}</p>
          </div>
          <div className="about-purpose-grid">
            <article><span>01</span><h3>{t("mission")}</h3><p>{t("missionBody")}</p></article>
            <article><span>02</span><h3>{t("vision")}</h3><p>{t("visionBody")}</p></article>
          </div>
        </Container>
      </section>

      <section className="about-values" aria-labelledby="about-values-title">
        <Container>
          <div className="home-section-heading home-section-heading-split">
            <div><p className="home-kicker">{t("valuesEyebrow")}</p><h2 id="about-values-title">{t("values")}</h2></div>
            <p>{t("valuesBody")}</p>
          </div>
          <div className="about-values-grid">
            {values.map((key, index) => <article key={key}><span>{String(index + 1).padStart(2, "0")}</span><h3>{t(`valueItems.${key}.title`)}</h3><p>{t(`valueItems.${key}.body`)}</p></article>)}
          </div>
        </Container>
      </section>

      <section className="about-schools" aria-labelledby="about-schools-title">
        <Container className="about-schools-inner">
          <div className="about-schools-visual"><Image src="/images/school-education.png" alt="" fill sizes="(max-width: 700px) 100vw, 42vw" className="object-cover" /></div>
          <div className="about-schools-copy"><p className="home-kicker">{t("schoolsEyebrow")}</p><h2 id="about-schools-title">{t("schoolsTitle")}</h2><p>{t("schoolsIntro")}</p>
            <ol>{schools.map((key, index) => <li key={key}><span>{String(index + 1).padStart(2, "0")}</span>{th(`${key}.title`)}</li>)}</ol>
            <Link className="home-text-link" href="/programs">{t("schoolsCta")}<ArrowRight aria-hidden="true" size={17} /></Link>
          </div>
        </Container>
      </section>

      <section className="about-final" aria-labelledby="about-final-title">
        <Container className="about-final-inner"><div><p className="home-kicker">{t("finalEyebrow")}</p><h2 id="about-final-title">{t("finalTitle")}</h2><p>{t("finalBody")}</p></div>
          <Link className="home-button home-button-gold" href="/contact">{t("contactCta")}<ArrowRight aria-hidden="true" size={18} /></Link>
        </Container>
      </section>
    </div>
  );
}
