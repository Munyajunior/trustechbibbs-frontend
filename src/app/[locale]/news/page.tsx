import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getNews } from "@/lib/api/public";
import { safeFetch } from "@/lib/api/safe";
import type { Locale, NewsArticle, Paginated } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { formatDate } from "@/lib/utils";

/** Mirrors `REVALIDATE.dynamic`; must be a literal for Next to apply it. */
export const revalidate = 3600;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "news.meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}/news`,
      languages: { en: "/en/news", fr: "/fr/news" },
      types: { "application/rss+xml": "/rss.xml" },
    },
  };
}

export default async function NewsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("news");
  const loc = locale as Locale;

  const { data } = await safeFetch<Paginated<NewsArticle>>(
    getNews({ per_page: 9 }, { locale: loc }),
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
    "news:list",
  );

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Container className="py-12">
        {/* TODO(Phase 1): category/tag filters, search, pagination, RSS feed. */}
        {data.items.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((article) => (
              <li key={article.id}>
                <Link href={`/news/${article.slug}`} className="block h-full">
                  <Card interactive className="h-full">
                    <CardContent>
                      {article.category && <Badge tone="neutral">{article.category}</Badge>}
                      <h2 className="mt-3 font-display text-base font-semibold text-gray-900">
                        {localizedField(article, "title", loc)}
                      </h2>
                      <p className="mt-1 text-xs text-gray-500">
                        <time dateTime={article.published_at}>
                          {formatDate(article.published_at, loc)}
                        </time>
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                        {localizedField(article, "excerpt", loc)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
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
