import Image from "next/image";
import { ArrowRight, BriefcaseBusiness, CalendarDays, Cpu, GraduationCap, HeartPulse, Landmark, Leaf, Newspaper, Plane } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { HomeHero } from "@/components/features/home-hero";
import { Link } from "@/i18n/navigation";
import { getEvents, getHomeBanners, getNews, getPrograms } from "@/lib/api/public";
import { safeFetch } from "@/lib/api/safe";
import type { CampusEvent, Locale, NewsArticle, Paginated, Program } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { formatDate, formatEventDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ locale: string }> };
const steps = ["account", "application", "review", "decision"] as const;
function emptyList<T>(perPage: number): Paginated<T> {
  return { items: [], pagination: { page: 1, per_page: perPage, total: 0, total_pages: 0, has_next: false, has_previous: false } };
}
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
  const tn = await getTranslations("news");
  const te = await getTranslations("events");
  const loc = locale as Locale;
  const [banners, programs, news, events] = await Promise.all([
    safeFetch(getHomeBanners({ locale: loc }), [], "home:banners"),
    safeFetch(getPrograms({ featured: "true", per_page: 6 }, { locale: loc }), emptyList<Program>(6), "home:programs"),
    safeFetch(getNews({ per_page: 3 }, { locale: loc }), emptyList<NewsArticle>(3), "home:news"),
    safeFetch(getEvents({ per_page: 3 }, { locale: loc }), emptyList<CampusEvent>(3), "home:events"),
  ]);

  return (
    <div className="home-editorial">
      <HomeHero locale={loc} banners={banners.data} fallback={{ title: t("hero.title"), subtitle: t("hero.subtitle"), imageAlt: t("hero.imageAlt"), primaryLabel: t("hero.ctaPrimary") }} labels={{ eyebrow: t("hero.eyebrow"), secondary: t("hero.ctaSecondary"), signoff: t("hero.signoff"), caption: t("hero.visualCaption"), previous: t("hero.previous"), next: t("hero.next"), controls: t("hero.controls") }} />

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
          {programs.data.items.length ? <div className="home-program-grid">
            {programs.data.items.map((program) => (
              <article className="home-program-card" key={program.id}>
                <div className="home-program-image-wrap"><Image src={`/site-media/school-${program.school_key || "engineering"}`} unoptimized alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw" className="object-cover" /></div>
                <div className="home-program-content">
                  <span className="home-program-level">{program.level}</span>
                  <h3>{localizedField(program, "name", loc)}</h3>
                  <p>{localizedField(program, "description", loc)}</p>
                  <Link href={`/programs/${program.slug}`} className="home-text-link">{tc("learnMore")}<ArrowRight aria-hidden="true" size={17} /></Link>
                </div>
              </article>
            ))}
          </div> : <div className="home-program-empty"><p>{t("featured.empty")}</p><Link href="/contact" className="home-text-link">{t("featured.contact")}<ArrowRight aria-hidden="true" size={17} /></Link></div>}
        </Container>
      </section>

      {(news.data.items.length > 0 || events.data.items.length > 0) && <section className="home-campus" aria-label={`${t("news.title")} / ${t("events.title")}`}><Container className="home-campus-grid">
        {news.data.items.length > 0 && <div className="home-campus-column"><div className="home-campus-heading"><div><p className="home-kicker">{t("news.subtitle")}</p><h2>{t("news.title")}</h2></div><Link href="/news" className="home-text-link">{tc("viewAll")}<ArrowRight aria-hidden="true" size={16} /></Link></div><ul>{news.data.items.map((article) => <li key={article.id}><article className="home-campus-item"><span className="home-campus-icon"><Newspaper aria-hidden="true" size={21} /></span><div><time dateTime={article.published_at}>{formatDate(article.published_at, loc)}</time><h3><Link href={`/news/${article.slug}`}>{localizedField(article, "title", loc)}</Link></h3><Link href={`/news/${article.slug}`} className="home-text-link">{tn("readStory")}<ArrowRight aria-hidden="true" size={15} /></Link></div></article></li>)}</ul></div>}
        {events.data.items.length > 0 && <div className="home-campus-column"><div className="home-campus-heading"><div><p className="home-kicker">{t("events.subtitle")}</p><h2>{t("events.title")}</h2></div><Link href="/events" className="home-text-link">{tc("viewAll")}<ArrowRight aria-hidden="true" size={16} /></Link></div><ul>{events.data.items.map((event) => <li key={event.id}><article className="home-campus-item"><span className="home-campus-icon home-campus-icon-gold"><CalendarDays aria-hidden="true" size={21} /></span><div><time dateTime={event.starts_at}>{formatEventDateTime(event.starts_at, loc)}</time><h3><Link href={`/events/${event.slug}`}>{localizedField(event, "title", loc)}</Link></h3><Link href={`/events/${event.slug}`} className="home-text-link">{te("viewDetails")}<ArrowRight aria-hidden="true" size={15} /></Link></div></article></li>)}</ul></div>}
      </Container></section>}

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
