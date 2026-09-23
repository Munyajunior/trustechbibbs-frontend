import { ArrowRight, CalendarDays, GraduationCap } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { buttonVariants } from "@/components/ui/button";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getNews, getPrograms } from "@/lib/api/public";
import { safeFetch } from "@/lib/api/safe";
import type { Locale, NewsArticle, Paginated, Program } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { formatCurrency, formatDate } from "@/lib/utils";

/**
 * Homepage refreshes hourly (performance spec).
 *
 * Must be a literal: Next statically analyses segment config exports at build
 * time, so `REVALIDATE.dynamic` would silently fail to apply. Keep this value
 * in sync with `REVALIDATE.dynamic` in src/lib/api/public.ts.
 */
export const revalidate = 3600;

type PageProps = { params: Promise<{ locale: string }> };

const EMPTY_LIST = {
  items: [],
  pagination: {
    page: 1,
    per_page: 0,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  },
};

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const tp = await getTranslations("programs");
  const loc = locale as Locale;

  // Decorative sections: never let a cold backend break the build.
  const [programsResult, newsResult] = await Promise.all([
    safeFetch<Paginated<Program>>(
      getPrograms({ per_page: 3 }, { locale: loc }),
      EMPTY_LIST,
      "home:programs",
    ),
    safeFetch<Paginated<NewsArticle>>(
      getNews({ per_page: 3 }, { locale: loc }),
      EMPTY_LIST,
      "home:news",
    ),
  ]);

  const programs = programsResult.data.items;
  const news = newsResult.data.items;

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden bg-primary text-white">
        {/* Decorative gold wash */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-accent/20 blur-3xl"
        />
        <Container className="relative py-16 sm:py-24 lg:py-28">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-gray-900">
              {t("hero.eyebrow")}
            </p>
            <h1 className="text-hero mt-5 font-display font-bold">
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base text-white/80 sm:text-lg">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admissions"
                className={buttonVariants({ variant: "accent", size: "lg" })}
              >
                {t("hero.ctaPrimary")}
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="/programs"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "border-white/40 text-white hover:bg-white/10",
                })}
              >
                {t("hero.ctaSecondary")}
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* --------------------------------------------------------------- Stats */}
      <section aria-labelledby="stats-heading" className="border-b border-gray-200">
        <Container className="py-10">
          <h2 id="stats-heading" className="sr-only">
            {t("stats.title")}
          </h2>
          <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {[
              { value: "2026", label: t("stats.intake") },
              { value: "2", label: t("stats.schools") },
              { value: "9", label: t("stats.programs") },
              { value: "300", label: t("stats.targetCohort") },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-display text-3xl font-bold text-primary sm:text-4xl">
                    {stat.value}
                  </span>
                  <span className="mt-1 block text-sm text-gray-600">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* ------------------------------------------------------------ Programs */}
      <section aria-labelledby="programs-heading">
        <Container className="py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="programs-heading"
                className="font-display text-2xl font-semibold text-gray-900 sm:text-3xl"
              >
                {t("programs.title")}
              </h2>
              <p className="mt-2 text-gray-600">{t("programs.subtitle")}</p>
            </div>
            <Link
              href="/programs"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
            >
              {tc("viewAll")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          {programs.length > 0 ? (
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((program) => (
                <li key={program.id}>
                  <Card interactive className="h-full">
                    <CardContent className="flex h-full flex-col">
                      <Badge tone="accent">{program.level}</Badge>
                      <h3 className="mt-3 font-display text-lg font-semibold text-gray-900">
                        <Link
                          href={`/programs/${program.slug}`}
                          className="after:absolute after:inset-0"
                        >
                          {localizedField(program, "name", loc)}
                        </Link>
                      </h3>
                      <p className="mt-2 line-clamp-3 flex-1 text-sm text-gray-600">
                        {localizedField(program, "description", loc)}
                      </p>
                      <p className="mt-4 flex items-center gap-1.5 text-sm text-gray-500">
                        <GraduationCap aria-hidden="true" className="size-4" />
                        {tp("duration", { years: program.duration_years })} ·{" "}
                        {formatCurrency(program.tuition_fee, program.currency, loc)}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
              {programsResult.failed
                ? t("programs.unavailable")
                : t("programs.empty")}
            </p>
          )}
        </Container>
      </section>

      {/* ---------------------------------------------------------------- News */}
      <section aria-labelledby="news-heading" className="bg-gray-50">
        <Container className="py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="news-heading"
                className="font-display text-2xl font-semibold text-gray-900 sm:text-3xl"
              >
                {t("news.title")}
              </h2>
              <p className="mt-2 text-gray-600">{t("news.subtitle")}</p>
            </div>
            <Link
              href="/news"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
            >
              {tc("viewAll")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          {news.length > 0 ? (
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((article) => (
                <li key={article.id}>
                  <Card interactive className="h-full">
                    <CardContent>
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <CalendarDays aria-hidden="true" className="size-3.5" />
                        <time dateTime={article.published_at}>
                          {formatDate(article.published_at, loc)}
                        </time>
                      </p>
                      <h3 className="mt-2 font-display text-base font-semibold text-gray-900">
                        {localizedField(article, "title", loc)}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                        {localizedField(article, "excerpt", loc)}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
              {t("news.empty")}
            </p>
          )}
        </Container>
      </section>

      {/* ----------------------------------------------------------------- CTA */}
      <section>
        <Container className="py-16">
          <div className="rounded-xl bg-primary px-6 py-12 text-center sm:px-12">
            <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">{t("cta.subtitle")}</p>
            <Link
              href="/admissions"
              className={buttonVariants({
                variant: "accent",
                size: "lg",
                className: "mt-7",
              })}
            >
              {t("cta.button")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
