import Image from "next/image";
import { ArrowRight, ArrowUpRight, Newspaper } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { getNews } from "@/lib/api/public";
import { safeFetch } from "@/lib/api/safe";
import type { Locale, NewsArticle, Paginated } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { publicMediaSrc } from "@/lib/public-media";
import { formatDate } from "@/lib/utils";

export const revalidate = 3600;
type PageProps = { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "news.meta" });
  return { title: t("title"), description: t("description"), alternates: {
    canonical: `/${locale}/news`, languages: { en: "/en/news", fr: "/fr/news" },
  } };
}

export default async function NewsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { page: rawPage } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("news");
  const loc = locale as Locale;
  const page = Math.max(1, Math.min(1000, Number.parseInt(rawPage ?? "1", 10) || 1));
  const { data } = await safeFetch<Paginated<NewsArticle>>(
    getNews({ page, per_page: 9 }, { locale: loc }),
    { items: [], pagination: { page, per_page: 9, total: 0, total_pages: 0, has_next: false, has_previous: false } },
    "news:list",
  );
  const featured = page === 1 ? data.items[0] : undefined;
  const articles = featured ? data.items.slice(1) : data.items;

  return (
    <div className="home-editorial journal-page">
      <section className="journal-hero" aria-labelledby="journal-title">
        <Container className="journal-hero-inner">
          <div className="journal-hero-copy">
            <p className="home-kicker">{t("eyebrow")}</p>
            <h1 id="journal-title">{t("title")}</h1>
            <p>{t("subtitle")}</p>
            <a className="home-button home-button-gold" href="#journal-content">{t("exploreCta")}<ArrowRight aria-hidden="true" size={18} /></a>
          </div>
          <div className="journal-hero-visual"><Image src="/site-media/news-hero" unoptimized alt="" fill priority sizes="(max-width: 700px) 100vw, 47vw" className="object-cover" /><span>{t("heroCaption")}</span></div>
        </Container>
      </section>

      <section className="journal-content" id="journal-content" aria-labelledby="journal-content-title">
        <Container>
          <div className="home-section-heading home-section-heading-split"><div><p className="home-kicker">{t("listingEyebrow")}</p><h2 id="journal-content-title">{t("listingTitle")}</h2></div><p>{t("listingIntro")}</p></div>
          {data.items.length > 0 ? (
            <>
              {featured ? <Link href={`/news/${featured.slug}`} className="journal-feature">
                <span className="journal-feature-visual">{publicMediaSrc(featured.cover_image_url) ? <Image src={publicMediaSrc(featured.cover_image_url)!} alt="" fill sizes="(max-width: 700px) 100vw, 50vw" className="object-cover" /> : <Newspaper aria-hidden="true" size={55} strokeWidth={1.1} />}</span>
                <span className="journal-feature-copy"><span className="journal-feature-label">{t("featured")}</span><span className="journal-feature-date"><time dateTime={featured.published_at}>{formatDate(featured.published_at, loc)}</time></span><strong>{localizedField(featured, "title", loc)}</strong>{localizedField(featured, "excerpt", loc) && <span className="journal-feature-excerpt">{localizedField(featured, "excerpt", loc)}</span>}<span className="home-text-link">{t("readStory")}<ArrowUpRight aria-hidden="true" size={17} /></span></span>
              </Link> : null}
              {articles.length > 0 ? <div className="journal-grid">{articles.map((article) => <article className="journal-card" key={article.id}>
                <div className="journal-card-visual">{publicMediaSrc(article.cover_image_url) ? <Image src={publicMediaSrc(article.cover_image_url)!} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" className="object-cover" /> : <Newspaper aria-hidden="true" size={40} strokeWidth={1.1} />}</div>
                <div className="journal-card-copy"><time dateTime={article.published_at}>{formatDate(article.published_at, loc)}</time><h3><Link href={`/news/${article.slug}`}>{localizedField(article, "title", loc)}</Link></h3>{localizedField(article, "excerpt", loc) && <p>{localizedField(article, "excerpt", loc)}</p>}<Link className="home-text-link" href={`/news/${article.slug}`}>{t("readStory")}<ArrowUpRight aria-hidden="true" size={16} /></Link></div>
              </article>)}</div> : null}
              {(data.pagination.has_previous || data.pagination.has_next) && <nav className="journal-pagination" aria-label={t("paginationLabel")}>
                {data.pagination.has_previous && <Link href={`/news?page=${page - 1}`}>{t("previous")}</Link>}
                <span>{t("pageNumber", { page })}</span>
                {data.pagination.has_next && <Link href={`/news?page=${page + 1}`}>{t("next")}</Link>}
              </nav>}
            </>
          ) : <div className="journal-empty"><div className="journal-empty-icon"><Newspaper aria-hidden="true" size={35} strokeWidth={1.2} /></div><div><h3>{t("emptyTitle")}</h3><p>{t("emptyBody")}</p></div><Link className="home-button home-button-gold" href="/programs">{t("programsCta")}<ArrowRight aria-hidden="true" size={18} /></Link></div>}
        </Container>
      </section>

      <section className="journal-next" aria-labelledby="journal-next-title"><Container className="journal-next-inner"><div><p className="home-kicker">{t("nextEyebrow")}</p><h2 id="journal-next-title">{t("nextTitle")}</h2><p>{t("nextBody")}</p></div><Link className="home-button home-button-outline" href="/events">{t("eventsCta")}<ArrowRight aria-hidden="true" size={18} /></Link></Container></section>
    </div>
  );
}
