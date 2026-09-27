import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { getNewsArticle } from "@/lib/api/public";
import type { Locale } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { publicMediaSrc } from "@/lib/public-media";
import { formatDate } from "@/lib/utils";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const article = await getNewsArticle(slug, { locale: locale as Locale });
    return { title: localizedField(article, "title", locale as Locale), description: localizedField(article, "excerpt", locale as Locale) ?? undefined,
      alternates: { canonical: `/${locale}/news/${slug}`, languages: { en: `/en/news/${slug}`, fr: `/fr/news/${slug}` } } };
  } catch { return {}; }
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  let article;
  try { article = await getNewsArticle(slug, { locale: locale as Locale }); }
  catch { notFound(); }
  const t = await getTranslations("news");
  const loc = locale as Locale;
  const content = localizedField(article, "content", loc) ?? localizedField(article, "excerpt", loc);
  const imageSrc = publicMediaSrc(article.cover_image_url);

  return <div className="home-editorial editorial-detail">
    <header className="editorial-detail-hero"><Container><Link className="editorial-back" href="/news"><ArrowLeft aria-hidden="true" size={17} />{t("backToNews")}</Link><div className="editorial-detail-meta">{article.category && <span>{article.category}</span>}<time dateTime={article.published_at}>{t("publishedOn", { date: formatDate(article.published_at, loc) })}</time></div><h1>{localizedField(article, "title", loc)}</h1>{localizedField(article, "excerpt", loc) && <p>{localizedField(article, "excerpt", loc)}</p>}</Container></header>
    {imageSrc && <Container><div className="editorial-detail-image"><Image src={imageSrc} alt="" fill priority sizes="(max-width: 900px) 100vw, 1100px" className="object-cover" /></div></Container>}
    <Container className="editorial-detail-body"><article>{content && <div className="editorial-detail-content">{content}</div>}{article.tags.length > 0 && <ul className="editorial-tags">{article.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>}</article><aside><span className="home-kicker">{t("nextEyebrow")}</span><h2>{t("nextTitle")}</h2><Link className="home-text-link" href="/events">{t("eventsCta")}<ArrowRight aria-hidden="true" size={17} /></Link></aside></Container>
  </div>;
}
