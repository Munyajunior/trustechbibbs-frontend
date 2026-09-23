import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { Badge } from "@/components/ui/card";
import { getNewsArticle } from "@/lib/api/public";
import type { Locale } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { formatDate } from "@/lib/utils";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const article = await getNewsArticle(slug, { locale: locale as Locale });
    return {
      title: localizedField(article, "title", locale as Locale),
      description: localizedField(article, "excerpt", locale as Locale) ?? undefined,
    };
  } catch {
    return {};
  }
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  let article;
  try {
    article = await getNewsArticle(slug, { locale: locale as Locale });
  } catch {
    notFound();
  }

  const t = await getTranslations("news");
  const loc = locale as Locale;
  const content = localizedField(article, "content", loc) ?? localizedField(article, "excerpt", loc);

  return (
    <Container className="py-12 sm:py-16">
      <article className="mx-auto max-w-3xl">
        {article.category && <Badge tone="neutral">{article.category}</Badge>}
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          {localizedField(article, "title", loc)}
        </h1>
        <p className="mt-4 text-sm text-gray-500">
          <time dateTime={article.published_at}>{t("publishedOn", { date: formatDate(article.published_at, loc) })}</time>
        </p>
        {content && <div className="mt-8 whitespace-pre-line text-base leading-8 text-gray-700">{content}</div>}
      </article>
    </Container>
  );
}
