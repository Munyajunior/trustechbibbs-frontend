import Image from "next/image";
import { ArrowRight, BriefcaseBusiness, Cpu, GraduationCap, HeartPulse, Landmark, Leaf, Plane } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";

export const revalidate = 3600;
type PageProps = { params: Promise<{ locale: string }> };
const featured = ["business", "finance", "biomedical"] as const;
const steps = ["account", "application", "review", "decision"] as const;
const schools = [
  { key: "business", icon: BriefcaseBusiness, image: "/site-media/school-business", featured: true },
  { key: "health", icon: HeartPulse, image: "/site-media/school-health", featured: true },
  { key: "engineering", icon: Cpu, image: "/site-media/school-engineering", featured: false },
  { key: "education", icon: GraduationCap, image: "/site-media/school-education", featured: false },
  { key: "communication", icon: Landmark, image: "/site-media/school-communication", featured: false },
  { key: "tourism", icon: Plane, image: "/site-media/school-tourism", featured: false },
  { key: "agriculture", icon: Leaf, image: "/site-media/school-agriculture", featured: false },
] as const;

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tc = await getTranslations("common");

  return (
    <div className="home-editorial">
      <section className="home-hero" aria-labelledby="home-title">
        <Container className="home-hero-inner">
          <div className="home-hero-copy">
            <p className="home-eyebrow">{t("hero.eyebrow")}</p>
            <h1 id="home-title">{t("hero.title")}</h1>
            <p className="home-hero-intro">{t("hero.subtitle")}</p>
            <div className="home-actions">
              <Link className="home-button home-button-gold" href="/admissions/register">{t("hero.ctaPrimary")}<ArrowRight aria-hidden="true" size={18} /></Link>
              <Link className="home-button home-button-outline" href="/programs">{t("hero.ctaSecondary")}</Link>
            </div>
            <p className="home-hero-signoff">{t("hero.signoff")}</p>
          </div>
          <div className="home-hero-visual">
            <Image src="/site-media/hero" unoptimized alt={t("hero.imageAlt")} fill priority sizes="(max-width: 900px) 100vw, 55vw" className="object-cover object-center" />
            <p className="home-visual-caption">{t("hero.visualCaption")}</p>
          </div>
        </Container>
      </section>

      <section className="home-schools" aria-labelledby="schools-heading">
        <Container>
          <div className="home-section-heading home-section-heading-split">
            <div><p className="home-kicker">{t("schools.eyebrow")}</p><h2 id="schools-heading">{t("schools.title")}</h2></div>
            <p>{t("schools.intro")}</p>
          </div>
          <div className="home-school-grid">
            {schools.map(({ key, icon: Icon, image, featured: isFeatured }, index) => (
              <article className={`home-school-card ${isFeatured ? "home-school-card-image" : "home-school-card-compact"}`} key={key}>
                <div className="home-school-image-wrap"><Image src={image} unoptimized alt="" fill sizes={isFeatured ? "(max-width: 700px) 100vw, 50vw" : "(max-width: 700px) 100vw, 33vw"} className="object-cover" /></div>
                <div className="home-school-copy">
                  <span className={`home-school-icon${index % 2 ? " home-school-icon-gold" : ""}`}><Icon aria-hidden="true" size={25} strokeWidth={1.7} /></span>
                  <h3>{t(`schools.${key}.title`)}</h3><p>{t(`schools.${key}.body`)}</p>
                  <Link href={`/schools/${key}`} className="home-text-link">{t("schools.explore")}<ArrowRight aria-hidden="true" size={17} /></Link>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="home-programs" aria-labelledby="featured-heading">
        <Container>
          <div className="home-section-heading home-section-heading-inline">
            <div><p className="home-kicker">{t("featured.eyebrow")}</p><h2 id="featured-heading">{t("featured.title")}</h2></div>
            <Link href="/programs" className="home-text-link">{t("featured.viewAll")}<ArrowRight aria-hidden="true" size={17} /></Link>
          </div>
          <div className="home-program-grid">
            {featured.map((key) => (
              <article className="home-program-card" key={key}>
                <div className="home-program-image-wrap"><Image src={`/site-media/program-${key}`} unoptimized alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw" className="object-cover" /></div>
                <div className="home-program-content">
                  <h3>{t(`featured.${key}.title`)}</h3>
                  <p>{t(`featured.${key}.body`)}</p>
                  <Link href="/programs" className="home-text-link">{tc("learnMore")}<ArrowRight aria-hidden="true" size={17} /></Link>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="home-journey" aria-labelledby="journey-heading">
        <Container className="home-journey-inner">
          <div className="home-journey-lead">
            <p className="home-kicker">{t("journey.eyebrow")}</p><h2 id="journey-heading">{t("journey.title")}</h2><p>{t("journey.intro")}</p>
            <div className="home-journey-actions">
              <Link className="home-button home-button-gold" href="/admissions/register">{t("hero.ctaPrimary")}<ArrowRight aria-hidden="true" size={18} /></Link>
              <Link className="home-text-link" href="/admissions">{t("journey.guide")}<ArrowRight aria-hidden="true" size={17} /></Link>
            </div>
          </div>
          <ol className="home-steps">
            {steps.map((key, index) => (
              <li key={key}><span className="home-step-number">{index + 1}</span><h3>{t(`journey.${key}.title`)}</h3><p>{t(`journey.${key}.body`)}</p></li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="home-final" aria-labelledby="final-heading">
        <Container className="home-final-inner">
          <div>
            <p className="home-kicker">{t("cta.eyebrow")}</p><h2 id="final-heading">{t("cta.title")}</h2><p>{t("cta.subtitle")}</p>
            <div className="home-actions">
              <Link className="home-button home-button-gold" href="/admissions/register">{t("hero.ctaPrimary")}<ArrowRight aria-hidden="true" size={18} /></Link>
              <Link className="home-button home-button-outline" href="/programs">{t("hero.ctaSecondary")}</Link>
            </div>
          </div>
          <p className="home-final-script">{t("cta.signoff")}</p>
        </Container>
      </section>
    </div>
  );
}
