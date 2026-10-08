import Image from "next/image";
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { currentCameroonMonth, EventsCalendar, monthOffset } from "@/components/features/events-calendar";
import { Link } from "@/i18n/navigation";
import { getEventFilters, getEvents } from "@/lib/api/public";
import { safeFetch } from "@/lib/api/safe";
import type { CampusEvent, Locale, Paginated } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { publicMediaSrc } from "@/lib/public-media";
import { formatEventDateTime } from "@/lib/utils";

export const revalidate = 3600;
type PageProps = { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string; search?: string; category?: string; start_date?: string; end_date?: string; view?: string; month?: string }> };

async function getMonthEvents(month: string, search: string, category: string, locale: Locale) {
  const [year, number] = month.split("-").map(Number);
  const endDate = new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10);
  const items: CampusEvent[] = [];
  for (let page = 1; page <= 10; page++) {
    const result = await getEvents({ page, per_page: 100, search, category, start_date: `${month}-01`, end_date: endDate }, { locale });
    items.push(...result.items);
    if (!result.pagination.has_next) return { items, truncated: false };
  }
  return { items, truncated: true };
}

function listingHref(page: number, search: string, category: string, startDate: string, endDate: string) {
  const query = new URLSearchParams();
  if (page > 1) query.set("page", String(page));
  if (search) query.set("search", search);
  if (category) query.set("category", category);
  if (startDate) query.set("start_date", startDate);
  if (endDate) query.set("end_date", endDate);
  const suffix = query.toString();
  return `/events${suffix ? `?${suffix}` : ""}`;
}

function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? "" : value;
}

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
  const { page: rawPage, search: rawSearch, category: rawCategory, start_date: rawStart, end_date: rawEnd, view: rawView, month: rawMonth } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("events");
  const loc = locale as Locale;
  const page = Math.max(1, Math.min(1000, Number.parseInt(rawPage ?? "1", 10) || 1));
  const search = typeof rawSearch === "string" ? rawSearch.trim().slice(0, 100) : "";
  const category = typeof rawCategory === "string" ? rawCategory.trim().slice(0, 80) : "";
  const startDate = validDate(rawStart);
  const endDate = validDate(rawEnd);
  const safeEndDate = startDate && endDate && endDate < startDate ? "" : endDate;
  const view = rawView === "calendar" ? "calendar" : "list";
  const month = typeof rawMonth === "string" && /^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : currentCameroonMonth();
  const emptyList: Paginated<CampusEvent> = { items: [], pagination: { page, per_page: 10, total: 0, total_pages: 0, has_next: false, has_previous: false } };
  const [listResult, monthResult, filterResult] = await Promise.all([
    view === "list" ? safeFetch(getEvents({ page, per_page: 10, search, category, start_date: startDate, end_date: safeEndDate }, { locale: loc }), emptyList, "events:list") : null,
    view === "calendar" ? safeFetch(getMonthEvents(month, search, category, loc), { items: [], truncated: false }, "events:calendar") : null,
    safeFetch(getEventFilters({ locale: loc }), { categories: [] }, "events:filters"),
  ]);
  const data = listResult?.data ?? emptyList;
  const calendar = monthResult?.data ?? { items: [], truncated: false };
  const failed = listResult?.failed ?? monthResult?.failed ?? false;
  const filters = filterResult.data;
  const filtered = !!search || !!category || (view === "list" && (!!startDate || !!safeEndDate));
  const filterReset = view === "calendar" ? `/events?view=calendar&month=${month}` : "/events";
  const calendarQuery = new URLSearchParams({ view: "calendar", month });
  if (search) calendarQuery.set("search", search);
  if (category) calendarQuery.set("category", category);
  const monthHref = (newMonth: string) => {
    const query = new URLSearchParams(calendarQuery);
    query.set("month", newMonth);
    return `/events?${query.toString()}`;
  };

  return (
    <div className="home-editorial events-editorial">
      <section className="events-hero" aria-labelledby="events-title">
        <Container className="events-hero-inner">
          <div className="events-hero-copy"><p className="home-kicker">{t("eyebrow")}</p><h1 id="events-title">{t("title")}</h1><p>{t("subtitle")}</p><a className="home-button home-button-gold" href="#events-content">{t("exploreCta")}<ArrowRight aria-hidden="true" size={18} /></a></div>
          <div className="events-hero-visual"><Image src="/site-media/events-hero" unoptimized alt="" fill priority sizes="(max-width: 700px) 100vw, 47vw" className="object-cover" /><span>{t("heroCaption")}</span></div>
        </Container>
      </section>

      <section className="events-content" id="events-content" aria-labelledby="events-content-title">
        <Container>
          <div className="home-section-heading home-section-heading-split"><div><p className="home-kicker">{t("listingEyebrow")}</p><h2 id="events-content-title">{t("listingTitle")}</h2></div><p>{t("listingIntro")}</p></div>
          <nav className="events-view-toggle" aria-label={t("viewLabel")}><Link href={listingHref(1, search, category, startDate, safeEndDate)} aria-current={view === "list" ? "page" : undefined}>{t("listView")}</Link><Link href={`/events?${calendarQuery.toString()}`} aria-current={view === "calendar" ? "page" : undefined}>{t("calendarView")}</Link></nav>
          <form className="journal-filters" action={`/${locale}/events`} method="get" role="search">
            {view === "calendar" && <><input type="hidden" name="view" value="calendar" /><input type="hidden" name="month" value={month} /></>}
            <div><label htmlFor="events-search">{t("searchLabel")}</label><input id="events-search" type="search" name="search" defaultValue={search} maxLength={100} placeholder={t("searchPlaceholder")} /></div>
            <div><label htmlFor="events-category">{t("categoryLabel")}</label><select id="events-category" name="category" defaultValue={category}><option value="">{t("allCategories")}</option>{filters.categories.map((item) => <option key={item} value={item}>{item}</option>)}{category && !filters.categories.includes(category) && <option value={category}>{category}</option>}</select></div>
            {view === "list" && <><div><label htmlFor="events-start">{t("fromDate")}</label><input id="events-start" type="date" name="start_date" defaultValue={startDate} /></div><div><label htmlFor="events-end">{t("toDate")}</label><input id="events-end" type="date" name="end_date" defaultValue={safeEndDate} min={startDate || undefined} /></div></>}
            <button type="submit">{t("filterAction")}</button>{filtered && <Link href={filterReset}>{t("clearFilters")}</Link>}
          </form>
          {view === "calendar" && <div className="events-month-navigation"><Link href={monthHref(monthOffset(month, -1))} aria-label={t("previousMonth")}>{t("previous")}</Link><h3>{new Intl.DateTimeFormat(loc === "fr" ? "fr-CM" : "en-CM", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`))}</h3><Link href={monthHref(monthOffset(month, 1))} aria-label={t("nextMonth")}>{t("next")}</Link></div>}
          {view === "calendar" && !failed ? <><EventsCalendar events={calendar.items} month={month} locale={loc} moreLabel={(count) => t("moreEvents", { count })} />{calendar.truncated && <p className="events-calendar-notice">{t("calendarLimit")}</p>}{calendar.items.length === 0 && <p className="events-calendar-notice">{filtered ? t("noResultsBody") : t("emptyBody")}</p>}</> : null}
          {view === "list" && data.items.length > 0 ? <>
            <ul className="events-list">{data.items.map((event) => {
              const { day, month } = eventDateParts(event.starts_at, loc);
              const imageSrc = publicMediaSrc(event.cover_image_url);
              return <li key={event.id}><article className="events-row"><div className="events-date"><strong>{day}</strong><span>{month}</span></div><div className="events-row-copy">{event.category && <span className="events-category">{event.category}</span>}<time dateTime={event.starts_at}>{formatEventDateTime(event.starts_at, loc)}</time><h3><Link href={`/events/${event.slug}`}>{localizedField(event, "title", loc)}</Link></h3>{event.venue && <p className="events-venue"><MapPin aria-hidden="true" size={16} />{event.venue}</p>}{localizedField(event, "description", loc) && <p className="events-description">{localizedField(event, "description", loc)}</p>}<Link className="home-text-link" href={`/events/${event.slug}`}>{t("viewDetails")}<ArrowUpRight aria-hidden="true" size={17} /></Link></div><div className="events-row-visual">{imageSrc ? <Image src={imageSrc} alt="" fill sizes="(max-width: 700px) 100vw, 250px" className="object-cover" /> : <CalendarDays aria-hidden="true" size={44} strokeWidth={1.1} />}</div></article></li>;
            })}</ul>
            {(data.pagination.has_previous || data.pagination.has_next) && <nav className="journal-pagination" aria-label={t("paginationLabel")}>
              {data.pagination.has_previous && <Link href={listingHref(page - 1, search, category, startDate, safeEndDate)}>{t("previous")}</Link>}<span>{t("pageNumber", { page })}</span>{data.pagination.has_next && <Link href={listingHref(page + 1, search, category, startDate, safeEndDate)}>{t("next")}</Link>}
            </nav>}
          </> : (view === "list" || failed) && <div className="journal-empty"><div className="journal-empty-icon"><CalendarDays aria-hidden="true" size={35} strokeWidth={1.2} /></div><div><h3>{failed ? t("unavailableTitle") : filtered ? t("noResultsTitle") : t("emptyTitle")}</h3><p>{failed ? t("unavailableBody") : filtered ? t("noResultsBody") : t("emptyBody")}</p></div><Link className="home-button home-button-gold" href={filtered && !failed ? filterReset : "/contact"}>{filtered && !failed ? t("clearFilters") : t("contactCta")}<ArrowRight aria-hidden="true" size={18} /></Link></div>}
        </Container>
      </section>

      <section className="journal-next" aria-labelledby="events-next-title"><Container className="journal-next-inner"><div><p className="home-kicker">{t("nextEyebrow")}</p><h2 id="events-next-title">{t("nextTitle")}</h2><p>{t("nextBody")}</p></div><Link className="home-button home-button-outline" href="/news">{t("newsCta")}<ArrowRight aria-hidden="true" size={18} /></Link></Container></section>
    </div>
  );
}
