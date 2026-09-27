import Image from "next/image";
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { getEvents } from "@/lib/api/public";
import { safeFetch } from "@/lib/api/safe";
import type { CampusEvent, Locale, Paginated } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { publicMediaSrc } from "@/lib/public-media";
import { formatEventDateTime } from "@/lib/utils";

export const revalidate = 3600;
type PageProps = { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events.meta" });
  return { title: t("title"), description: t("description"), alternates: {
    canonical: `/${locale}/events`, languages: { en: "/en/events", fr: "/fr/events" },
  } };
}

function eventDateParts(iso: string, locale: Locale) {
  const date = new Date(iso);
  const language = locale === "fr" ? "fr-CM" : "en-CM";
  if (Number.isNaN(date.getTime())) return { day: "—", month: "" };
  return {
    day: new Intl.DateTimeFormat(language, { day: "2-digit", timeZone: "Africa/Douala" }).format(date),
    month: new Intl.DateTimeFormat(language, { month: "short", timeZone: "Africa/Douala" }).format(date),
  };
}

export default async function EventsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { page: rawPage } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("events");
  const loc = locale as Locale;
  const page = Math.max(1, Math.min(1000, Number.parseInt(rawPage ?? "1", 10) || 1));
  const { data } = await safeFetch<Paginated<CampusEvent>>(
    getEvents({ page, per_page: 10 }, { locale: loc }),
    { items: [], pagination: { page, per_page: 10, total: 0, total_pages: 0, has_next: false, has_previous: false } },
    "events:list",
  );

  return (
    <div className="home-editorial events-editorial">
      <section className="events-hero" aria-labelledby="events-title">
        <Container className="events-hero-inner">
          <div className="events-hero-copy"><p className="home-kicker">{t("eyebrow")}</p><h1 id="events-title">{t("title")}</h1><p>{t("subtitle")}</p><a className="home-button home-button-gold" href="#events-content">{t("exploreCta")}<ArrowRight aria-hidden="true" size={18} /></a></div>
          <div className="events-hero-visual"><Image src="/images/school-tourism.png" alt="" fill priority sizes="(max-width: 700px) 100vw, 47vw" className="object-cover" /><span>{t("heroCaption")}</span></div>
        </Container>
      </section>

      <section className="events-content" id="events-content" aria-labelledby="events-content-title">
        <Container>
          <div className="home-section-heading home-section-heading-split"><div><p className="home-kicker">{t("listingEyebrow")}</p><h2 id="events-content-title">{t("listingTitle")}</h2></div><p>{t("listingIntro")}</p></div>
          {data.items.length > 0 ? <>
            <ul className="events-list">{data.items.map((event) => {
              const { day, month } = eventDateParts(event.starts_at, loc);
              const imageSrc = publicMediaSrc(event.cover_image_url);
              return <li key={event.id}><article className="events-row"><div className="events-date"><strong>{day}</strong><span>{month}</span></div><div className="events-row-copy"><time dateTime={event.starts_at}>{formatEventDateTime(event.starts_at, loc)}</time><h3><Link href={`/events/${event.slug}`}>{localizedField(event, "title", loc)}</Link></h3>{event.venue && <p className="events-venue"><MapPin aria-hidden="true" size={16} />{event.venue}</p>}{localizedField(event, "description", loc) && <p className="events-description">{localizedField(event, "description", loc)}</p>}<Link className="home-text-link" href={`/events/${event.slug}`}>{t("viewDetails")}<ArrowUpRight aria-hidden="true" size={17} /></Link></div><div className="events-row-visual">{imageSrc ? <Image src={imageSrc} alt="" fill sizes="(max-width: 700px) 100vw, 250px" className="object-cover" /> : <CalendarDays aria-hidden="true" size={44} strokeWidth={1.1} />}</div></article></li>;
            })}</ul>
            {(data.pagination.has_previous || data.pagination.has_next) && <nav className="journal-pagination" aria-label={t("paginationLabel")}>
              {data.pagination.has_previous && <Link href={`/events?page=${page - 1}`}>{t("previous")}</Link>}<span>{t("pageNumber", { page })}</span>{data.pagination.has_next && <Link href={`/events?page=${page + 1}`}>{t("next")}</Link>}
            </nav>}
          </> : <div className="journal-empty"><div className="journal-empty-icon"><CalendarDays aria-hidden="true" size={35} strokeWidth={1.2} /></div><div><h3>{t("emptyTitle")}</h3><p>{t("emptyBody")}</p></div><Link className="home-button home-button-gold" href="/contact">{t("contactCta")}<ArrowRight aria-hidden="true" size={18} /></Link></div>}
        </Container>
      </section>

      <section className="journal-next" aria-labelledby="events-next-title"><Container className="journal-next-inner"><div><p className="home-kicker">{t("nextEyebrow")}</p><h2 id="events-next-title">{t("nextTitle")}</h2><p>{t("nextBody")}</p></div><Link className="home-button home-button-outline" href="/news">{t("newsCta")}<ArrowRight aria-hidden="true" size={18} /></Link></Container></section>
    </div>
  );
}
