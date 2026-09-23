import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";


/** Mirrors `REVALIDATE.static`; must be a literal for Next to apply it. */
export const revalidate = 86400;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about.meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}/about`,
      languages: { en: "/en/about", fr: "/fr/about" },
    },
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  const sections = ["history", "mission", "vision", "values"] as const;

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Container className="py-12">
        <div className="grid gap-8 sm:grid-cols-2">
          {sections.map((section) => (
            <section key={section} aria-labelledby={`about-${section}`}>
              <h2
                id={`about-${section}`}
                className="font-display text-xl font-semibold text-gray-900"
              >
                {t(section)}
              </h2>
              <p className="mt-2 leading-7 text-gray-600">{t(`${section}Body`)}</p>
            </section>
          ))}
        </div>
        <section className="mt-12 border-t border-gray-200 pt-10" aria-labelledby="about-next">
          <h2 id="about-next" className="font-display text-xl font-semibold text-gray-900">
            {t("nextTitle")}
          </h2>
          <p className="mt-2 max-w-3xl leading-7 text-gray-600">{t("nextBody")}</p>
        </section>
      </Container>
    </>
  );
}
