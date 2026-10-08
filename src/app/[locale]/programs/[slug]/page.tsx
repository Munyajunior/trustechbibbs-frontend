import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import { getProgram } from "@/lib/api/public";
import type { Locale, Program } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { jsonLdScript } from "@/lib/json-ld";

/** Mirrors `REVALIDATE.static`; must be a literal for Next to apply it. */
export const revalidate = 86400;

/**
 * Slugs are discovered on demand: the catalogue is small but editable from the
 * CMS, so we let Next generate pages lazily and cache them per `revalidate`.
 */
export const dynamicParams = true;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

/** Fetch the program, mapping a 404 from the API onto Next's notFound(). */
async function loadProgram(slug: string, locale: Locale): Promise<Program> {
  try {
    return await getProgram(slug, { locale });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc = locale as Locale;

  let program: Program;
  try {
    program = await getProgram(slug, { locale: loc });
  } catch {
    // Don't fail metadata generation if the API is unavailable.
    return { title: slug };
  }

  const name = localizedField(program, "name", loc);
  const description = localizedField(program, "description", loc);

  return {
    title: name,
    description: description.slice(0, 160),
    alternates: {
      canonical: `/${locale}/programs/${slug}`,
      languages: {
        en: `/en/programs/${slug}`,
        fr: `/fr/programs/${slug}`,
      },
    },
    openGraph: { title: name, description: description.slice(0, 160) },
  };
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("programs");
  const loc = locale as Locale;

  const program = await loadProgram(slug, loc);
  const name = localizedField(program, "name", loc);
  const description = localizedField(program, "description", loc);
  const schoolName = localizedField(program, "school_name", loc);
  const schoolKey = program.school_key && ["engineering", "business", "health", "education", "communication", "tourism", "agriculture"].includes(program.school_key)
    ? program.school_key : null;
  const requirements = localizedField(program, "admission_requirements", loc);
  const careers = localizedField(program, "career_prospects", loc);
  const semesters = localizedField(program, "curriculum_outline", loc)
    .split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  /**
   * Schema.org structured data — required for rich snippets (SEO score > 95).
   * https://schema.org/EducationalOccupationalProgram
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    name,
    description,
    programType: program.level,
    timeToComplete: `P${program.duration_years}Y`,
    provider: {
      "@type": "CollegeOrUniversity",
      name: "TRUSTECH UNIVERSITY INSTITUTE OF BUSINESS MANAGEMENT AND BIOMEDICAL SCIENCES",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Douala",
        addressCountry: "CM",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD is data, not markup — this is the documented Next.js pattern.
        // `jsonLdScript` escapes `<` so CMS-authored text containing a literal
        // "</script>" cannot break out of the tag and inject markup.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      <div className="home-editorial program-detail-page">
        <nav className="school-breadcrumb" aria-label={t("breadcrumbLabel")}>
          <Container>
            <Link href="/">{t("home")}</Link><span aria-hidden="true">/</span>
            <Link href="/programs">{t("title")}</Link><span aria-hidden="true">/</span>
            {schoolKey && <><Link href={`/schools/${schoolKey}`}>{schoolName}</Link><span aria-hidden="true">/</span></>}
            <span aria-current="page">{name}</span>
          </Container>
        </nav>
        <section className="program-detail-hero" aria-labelledby="program-detail-title">
          {schoolKey && <div className="program-detail-hero-image" aria-hidden="true"><Image src={`/site-media/school-${schoolKey}`} unoptimized alt="" fill priority sizes="100vw" className="object-cover" /></div>}
          <Container className="program-detail-hero-inner">
            <div className="program-detail-heading">
              <p className="home-kicker">{t("detailEyebrow")}</p>
              <h1 id="program-detail-title">{name}</h1>
              {schoolName && <p className="program-detail-school">{schoolName}</p>}
              <div className="home-actions">
                <Link className="home-button home-button-gold" href="/contact">{t("askAdmissions")}<ArrowRight aria-hidden="true" size={18} /></Link>
                <Link className="home-button home-button-outline" href="/admissions">{t("admissionsCta")}</Link>
              </div>
            </div>
            <div className="program-detail-facts" aria-label={t("atAGlance")}>
              <p className="program-detail-facts-title">{t("atAGlance")}</p>
              <dl>
                <div><dt>{t("level")}</dt><dd>{program.level}</dd></div>
                <div><dt>{t("durationLabel")}</dt><dd>{t("duration", { years: program.duration_years })}</dd></div>
                <div><dt>{t("programCode")}</dt><dd>{program.code}</dd></div>
              </dl>
            </div>
          </Container>
        </section>
        <section className="program-detail-overview" aria-labelledby="program-overview-title">
          <Container className="program-detail-overview-inner">
            <div>
              <p className="home-kicker">{t("overviewEyebrow")}</p>
              <h2 id="program-overview-title">{t("overviewTitle")}</h2>
              <p>{description || t("descriptionContactNote")}</p>
            </div>
            <aside className="program-detail-enquiry">
              <span className="program-detail-enquiry-rule" aria-hidden="true" />
              <h2>{t("questionsTitle")}</h2>
              <p>{t("feeContactNote")}</p>
              <Link className="home-text-link" href="/contact">{t("askAdmissions")}<ArrowRight aria-hidden="true" size={17} /></Link>
            </aside>
          </Container>
        </section>
        <section className="program-detail-pathways">
          <Container className="program-detail-pathways-inner">
            <div className="program-detail-pathway-card">
              <span className="program-detail-section-number">01</span>
              <h2>{t("requirementsTitle")}</h2>
              <p>{requirements || t("requirementsContact")}</p>
            </div>
            {careers && <div className="program-detail-pathway-card">
              <span className="program-detail-section-number">02</span>
              <h2>{t("careersTitle")}</h2>
              <p>{careers}</p>
            </div>}
          </Container>
        </section>
        {semesters.length > 0 && <section className="program-detail-curriculum" aria-labelledby="program-curriculum-title">
          <Container>
            <p className="home-kicker">{t("detailEyebrow")}</p>
            <h2 id="program-curriculum-title">{t("curriculumTitle")}</h2>
            <ol>{semesters.map((semester, index) => <li key={`${index}-${semester}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{semester}</p></li>)}</ol>
          </Container>
        </section>}
        <section className="program-detail-back">
          <Container><Link className="home-text-link" href="/programs"><ArrowLeft aria-hidden="true" size={17} />{t("backToPrograms")}</Link></Container>
        </section>
      </div>
    </>
  );
}
