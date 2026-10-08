import Image from "next/image";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { getEvent } from "@/lib/api/public";
import { API_BASE_URL } from "@/lib/api/client";
import type { Locale } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { publicMediaSrc } from "@/lib/public-media";
import { formatEventDateTime } from "@/lib/utils";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const event = await getEvent(slug, { locale: locale as Locale });
    return { title: localizedField(event, "title", locale as Locale), description: localizedField(event, "description", locale as Locale) ?? undefined,
      alternates: { canonical: `/${locale}/events/${slug}`, languages: { en: `/en/events/${slug}`, fr: `/fr/events/${slug}` } } };
  } catch { return {}; }
}

export default async function EventPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  let event;
  try { event = await getEvent(slug, { locale: locale as Locale }); }
  catch { notFound(); }
  const t = await getTranslations("events");
  const loc = locale as Locale;
  const description = localizedField(event, "description", loc);
  const imageSrc = publicMediaSrc(event.cover_image_url);

  return <div className="home-editorial editorial-detail">
    <header className="editorial-detail-hero"><Container><Link className="editorial-back" href="/events"><ArrowLeft aria-hidden="true" size={17} />{t("backToEvents")}</Link><div className="editorial-detail-meta">{event.category && <span>{event.category}</span>}<time dateTime={event.starts_at}>{formatEventDateTime(event.starts_at, loc)}</time></div><h1>{localizedField(event, "title", loc)}</h1>{description && <p>{description}</p>}</Container></header>
    {imageSrc && <Container><div className="editorial-detail-image"><Image src={imageSrc} alt="" fill priority sizes="(max-width: 900px) 100vw, 1100px" className="object-cover" /></div></Container>}
    <Container className="editorial-detail-body"><article><dl className="event-detail-facts"><div><dt><CalendarDays aria-hidden="true" size={19} />{t("date")}</dt><dd><time dateTime={event.starts_at}>{formatEventDateTime(event.starts_at, loc)}</time></dd></div>{event.ends_at && <div><dt>{t("endsAt")}</dt><dd><time dateTime={event.ends_at}>{formatEventDateTime(event.ends_at, loc)}</time></dd></div>}{event.venue && <div><dt><MapPin aria-hidden="true" size={19} />{t("venue")}</dt><dd>{event.venue}</dd></div>}</dl><a className="home-button home-button-gold event-calendar-link" href={`${API_BASE_URL}/public/events/${encodeURIComponent(event.slug)}/calendar?language=${loc}`}>{t("addToCalendar")}<CalendarDays aria-hidden="true" size={17} /></a>{description && <div className="editorial-detail-content">{description}</div>}</article><aside><span className="home-kicker">{t("questionsEyebrow")}</span><h2>{t("questionsTitle")}</h2><p>{t("questionsBody")}</p><Link className="home-text-link" href="/contact">{t("contactCta")}<ArrowRight aria-hidden="true" size={17} /></Link></aside></Container>
  </div>;
}
