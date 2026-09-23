import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getPrograms } from "@/lib/api/public";
import { safeFetch } from "@/lib/api/safe";
import type { Locale, Paginated, Program } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { formatCurrency } from "@/lib/utils";

/**
 * Program catalogue is evergreen — revalidate daily.
 * Literal required (see note in src/app/[locale]/page.tsx); mirrors
 * `REVALIDATE.static`.
 */
export const revalidate = 86400;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "programs.meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}/programs`,
      languages: { en: "/en/programs", fr: "/fr/programs" },
    },
  };
}

export default async function ProgramsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("programs");
  const loc = locale as Locale;

  const { data } = await safeFetch<Paginated<Program>>(
    getPrograms({ per_page: 12 }, { locale: loc }),
    {
      items: [],
      pagination: {
        page: 1,
        per_page: 0,
        total: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false,
      },
    },
    "programs:list",
  );

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Container className="py-12">
        {/*
          TODO(Phase 1): filter bar (school / level / campus) + autocomplete
          search + pagination. Wire to the `search`, `sort` and `page` query
          params already supported by getPrograms().
        */}
        {data.items.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((program) => (
              <li key={program.id}>
                <Card interactive className="h-full">
                  <CardContent className="flex h-full flex-col">
                    <Badge tone="accent">{program.level}</Badge>
                    <h2 className="mt-3 font-display text-lg font-semibold text-gray-900">
                      <Link
                        href={`/programs/${program.slug}`}
                        className="after:absolute after:inset-0"
                      >
                        {localizedField(program, "name", loc)}
                      </Link>
                    </h2>
                    <p className="mt-2 line-clamp-3 flex-1 text-sm text-gray-600">
                      {localizedField(program, "description", loc)}
                    </p>
                    <dl className="mt-4 space-y-1 text-sm text-gray-500">
                      <div className="flex justify-between gap-2">
                        <dt>{t("tuition")}</dt>
                        <dd className="font-medium text-gray-900">
                          {formatCurrency(program.tuition_fee, program.currency, loc)}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
            {t("empty")}
          </p>
        )}
      </Container>
    </>
  );
}
