import Image from "next/image";
import { ArrowRight, BriefcaseBusiness, Cpu, GraduationCap, HeartPulse, Landmark, Leaf, Plane } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { getPrograms } from "@/lib/api/public";
import { safeFetch } from "@/lib/api/safe";
import type { Locale, Paginated, Program } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";

// Do not freeze the empty fallback into a day-long static build if the API is
// temporarily unavailable during deployment. Successful API reads still use
// their own 24-hour data cache in `getPrograms`.
export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ locale: string }> };

const schools = [
  { key: "business", icon: BriefcaseBusiness, image: "/site-media/school-business" },
  { key: "health", icon: HeartPulse, image: "/site-media/school-health" },
  { key: "engineering", icon: Cpu, image: "/site-media/school-engineering" },
  { key: "education", icon: GraduationCap, image: "/site-media/school-education" },
  { key: "communication", icon: Landmark, image: "/site-media/school-communication" },
  { key: "tourism", icon: Plane, image: "/site-media/school-tourism" },
  { key: "agriculture", icon: Leaf, image: "/site-media/school-agriculture" },
] as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "programs.meta" });
  return { title: t("title"), description: t("description"), alternates: {
    canonical: `/${locale}/programs`, languages: { en: "/en/programs", fr: "/fr/programs" },
  } };
}

export default async function ProgramsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("programs");
  const th = await getTranslations("home.schools");
  const loc = locale as Locale;
  const { data } = await safeFetch<Paginated<Program>>(
    getPrograms({ per_page: 100 }, { locale: loc }),
    { items: [], pagination: { page: 1, per_page: 0, total: 0, total_pages: 0, has_next: false, has_previous: false } },
    "programs:list",
  );

  return (
    <div className="home-editorial catalogue-page">
      <section className="catalogue-hero" aria-labelledby="catalogue-title">
        <Container className="catalogue-hero-inner">
          <div className="catalogue-hero-copy">
            <p className="home-kicker">{t("eyebrow")}</p>
            <h1 id="catalogue-title">{t("title")}</h1>
            <p>{t("subtitle")}</p>
            <div className="home-actions">
              <a className="home-button home-button-gold" href="#schools">{t("exploreSchools")}<ArrowRight aria-hidden="true" size={18} /></a>
              <Link className="home-button home-button-outline" href="/admissions">{t("admissionsCta")}</Link>
            </div>
          </div>
          <div className="catalogue-hero-visual">
            <Image src="/site-media/programs-hero" unoptimized alt="" fill priority sizes="(max-width: 700px) 100vw, 48vw" className="object-cover" />
            <span className="catalogue-hero-stamp">{t("sevenSchools")}</span>
          </div>
        </Container>
      </section>

      <section className="catalogue-schools" id="schools" aria-labelledby="catalogue-schools-heading">
        <Container>
          <div className="home-section-heading home-section-heading-split">
            <div><p className="home-kicker">{t("schoolsEyebrow")}</p><h2 id="catalogue-schools-heading">{t("schoolsTitle")}</h2></div>
            <p>{t("schoolsIntro")}</p>
          </div>
          <div className="home-school-grid">
            {schools.map(({ key, icon: Icon, image }, index) => (
              <article className={`home-school-card ${index < 2 ? "home-school-card-image" : "home-school-card-compact"}`} key={key}>
                <div className="home-school-image-wrap"><Image src={image} unoptimized alt="" fill sizes={index < 2 ? "(max-width: 700px) 100vw, 50vw" : "(max-width: 700px) 100vw, 33vw"} className="object-cover" /></div>
                  <div className="home-school-copy">
                  <span className={`home-school-icon${index % 2 ? " home-school-icon-gold" : ""}`}><Icon aria-hidden="true" size={25} strokeWidth={1.7} /></span>
                  <h3>{th(`${key}.title`)}</h3><p>{th(`${key}.body`)}</p>
                  <Link className="home-text-link" href={`/schools/${key}`}>{t("exploreSchool")}<ArrowRight aria-hidden="true" size={17} /></Link>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="catalogue-listing" id="catalogue" aria-labelledby="catalogue-listing-heading">
        <Container>
          <div className="home-section-heading home-section-heading-split">
            <div><p className="home-kicker">{t("listingEyebrow")}</p><h2 id="catalogue-listing-heading">{t("listingTitle")}</h2></div>
            <p>{t("listingIntro")}</p>
          </div>
          {data.items.length > 0 ? (
            <>
              <ul className="catalogue-program-grid">
                {data.items.map((program) => (
                  <li key={program.id}><article className="catalogue-program-card">
                    <span className="catalogue-level">{program.level}</span>
                    <h3><Link href={`/programs/${program.slug}`}>{localizedField(program, "name", loc)}</Link></h3>
                    {program.school_name_en ? <p className="catalogue-program-school">{localizedField(program, "school_name", loc)}</p> : null}
                    <p className="catalogue-program-description">{localizedField(program, "description", loc)}</p>
                    <div className="catalogue-program-meta"><span>{t("duration", { years: program.duration_years })}</span></div>
                    <Link className="home-text-link" href={`/programs/${program.slug}`}>{t("viewProgram")}<ArrowRight aria-hidden="true" size={17} /></Link>
                  </article></li>
                ))}
              </ul>
              {data.pagination.has_next ? <p className="catalogue-more-note">{t("moreProgramsNote")}</p> : null}
            </>
          ) : (
            <div className="catalogue-empty">
              <div><span className="catalogue-empty-rule" /><h3>{t("emptyTitle")}</h3><p>{t("emptyBody")}</p></div>
              <Link className="home-button home-button-gold" href="/contact">{t("enquire")}<ArrowRight aria-hidden="true" size={18} /></Link>
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}
