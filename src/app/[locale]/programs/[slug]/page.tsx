import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
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

      <PageHeader title={name} subtitle={program.code} />

      <Container className="grid gap-10 py-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="text-gray-700">{description}</p>
          {/*
            TODO(Phase 1): admission requirements, career prospects, curriculum
            outline and the downloadable brochure (program.brochure_url).
          */}
        </div>

        <aside className="h-fit rounded-lg border border-gray-200 bg-gray-50 p-6">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-gray-500">{t("level")}</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{program.level}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{t("duration", { years: program.duration_years })}</dt>
            </div>
          </dl>
          <p className="mt-6 text-sm leading-6 text-gray-700">{t("feeContactNote")}</p>
          <Link
            href="/contact"
            className={buttonVariants({
              variant: "primary",
              size: "md",
              fullWidth: true,
              className: "mt-6",
            })}
          >
            {t("askAdmissions")}
          </Link>
        </aside>
      </Container>
    </>
  );
}
