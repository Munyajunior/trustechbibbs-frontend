import Image from "next/image";
import { ArrowRight, BriefcaseBusiness, Cpu, GraduationCap, HeartPulse, Landmark, Leaf, Plane } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { getProgramFilters, getPrograms } from "@/lib/api/public";
import { safeFetch } from "@/lib/api/safe";
import type { Locale, Paginated, Program } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";

// Do not freeze the empty fallback into a day-long static build if the API is
// temporarily unavailable during deployment. Successful API reads still use
// their own 24-hour data cache in `getPrograms`.
export const dynamic = "force-dynamic";
type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}

function catalogueHref(locale: string, filters: { search: string; school: string; level: string }, page: number): string {
  const query = new URLSearchParams();
  if (filters.search) query.set("search", filters.search);
  if (filters.school) query.set("school", filters.school);
  if (filters.level) query.set("level", filters.level);
  if (page > 1) query.set("page", String(page));
  return `/${locale}/programs${query.size ? `?${query.toString()}` : ""}#catalogue`;
}

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

export default async function ProgramsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("programs");
  const th = await getTranslations("home.schools");
  const loc = locale as Locale;
  const query = await searchParams;
  const schoolCandidate = first(query.school);
  const school = schools.some((item) => item.key === schoolCandidate) ? schoolCandidate : "";
  const filters = {
    search: first(query.search).trim().slice(0, 120),
    school,
    level: first(query.level).trim().slice(0, 64),
  };
  const pageCandidate = Number(first(query.page));
  const page = Number.isSafeInteger(pageCandidate) && pageCandidate > 0 ? Math.min(pageCandidate, 10000) : 1;
  const [{ data }, { data: facets }] = await Promise.all([safeFetch<Paginated<Program>>(
    getPrograms({ page, per_page: 12, ...filters }, { locale: loc }),
    { items: [], pagination: { page: 1, per_page: 0, total: 0, total_pages: 0, has_next: false, has_previous: false } },
    "programs:list",
  ), safeFetch(getProgramFilters({ locale: loc }), { levels: [] as string[] }, "programs:filters")]);
  const levels = filters.level && !facets.levels.includes(filters.level)
    ? [...facets.levels, filters.level] : facets.levels;
  const hasFilters = Boolean(filters.search || filters.school || filters.level);

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
          <form action={`/${locale}/programs`} method="get" role="search" className="catalogue-filters" aria-label={t("filters.title")}>
            <div className="catalogue-filter-field catalogue-filter-search">
              <label htmlFor="catalogue-search">{t("filters.search")}</label>
              <input id="catalogue-search" name="search" type="search" defaultValue={filters.search} placeholder={t("filters.searchPlaceholder")} maxLength={120} />
            </div>
            <div className="catalogue-filter-field">
              <label htmlFor="catalogue-school">{t("filters.school")}</label>
              <select id="catalogue-school" name="school" defaultValue={filters.school}>
                <option value="">{t("filters.allSchools")}</option>
                {schools.map(({ key }) => <option key={key} value={key}>{th(`${key}.title`)}</option>)}
              </select>
            </div>
            <div className="catalogue-filter-field">
              <label htmlFor="catalogue-level">{t("filters.level")}</label>
              <select id="catalogue-level" name="level" defaultValue={filters.level}>
                <option value="">{t("filters.allLevels")}</option>
                {levels.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </div>
            <button type="submit" className="home-button home-button-gold catalogue-filter-submit">{t("filters.apply")}</button>
            {hasFilters && <a href={`/${locale}/programs#catalogue`} className="catalogue-filter-clear">{t("filters.clear")}</a>}
          </form>
          <p className="catalogue-result-count" aria-live="polite">{t("filters.results", { count: data.pagination.total })}</p>
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
              {data.pagination.total_pages > 1 && <nav className="catalogue-pagination" aria-label={t("filters.pages")}>
                {data.pagination.has_previous
                  ? <a href={catalogueHref(locale, filters, page - 1)}>{t("filters.previous")}</a>
                  : <span aria-disabled="true">{t("filters.previous")}</span>}
                <span>{t("filters.page", { page, total: data.pagination.total_pages })}</span>
                {data.pagination.has_next
                  ? <a href={catalogueHref(locale, filters, page + 1)}>{t("filters.next")}</a>
                  : <span aria-disabled="true">{t("filters.next")}</span>}
              </nav>}
            </>
          ) : (
            <div className="catalogue-empty">
              <div><span className="catalogue-empty-rule" /><h3>{hasFilters ? t("filters.noMatches") : t("emptyTitle")}</h3><p>{hasFilters ? t("filters.tryAgain") : t("emptyBody")}</p></div>
              <Link className="home-button home-button-gold" href="/contact">{t("enquire")}<ArrowRight aria-hidden="true" size={18} /></Link>
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}
