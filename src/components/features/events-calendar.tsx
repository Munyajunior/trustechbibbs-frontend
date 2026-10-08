import { Link } from "@/i18n/navigation";
import type { CampusEvent, Locale } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";

function localDay(instant: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Douala", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(instant));
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function currentCameroonMonth(): string {
  return localDay(new Date().toISOString()).slice(0, 7);
}

export function monthOffset(month: string, offset: number): string {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function EventsCalendar({ events, month, locale, moreLabel }: {
  events: CampusEvent[];
  month: string;
  locale: Locale;
  moreLabel: (count: number) => string;
}) {
  const [year, number] = month.split("-").map(Number);
  const firstWeekday = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const formatterLocale = locale === "fr" ? "fr-CM" : "en-CM";
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(formatterLocale, {
    weekday: "short", timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, 0, 1 + index))));
  const byDay = new Map<string, CampusEvent[]>();
  for (const event of events) {
    const first = localDay(event.starts_at);
    const last = event.ends_at ? localDay(event.ends_at) : first;
    for (let day = 1; day <= days; day++) {
      const key = `${month}-${String(day).padStart(2, "0")}`;
      if (key >= first && key <= last) byDay.set(key, [...(byDay.get(key) ?? []), event]);
    }
  }
  const cells = Array.from({ length: firstWeekday + days }, (_, index) => index - firstWeekday + 1);

  return <div className="events-calendar" role="region" aria-label={new Intl.DateTimeFormat(formatterLocale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, number - 1, 1)))}>
    <div className="events-calendar-weekdays">{weekdays.map((weekday, index) => <span key={index}>{weekday}</span>)}</div>
    <ol className="events-calendar-grid">{cells.map((day, index) => {
      if (day < 1) return <li key={`blank-${index}`} className="events-calendar-blank" aria-hidden="true" />;
      const key = `${month}-${String(day).padStart(2, "0")}`;
      const dayEvents = byDay.get(key) ?? [];
      return <li key={key} className={dayEvents.length ? "events-calendar-day events-calendar-day-active" : "events-calendar-day"}>
        <time dateTime={key}>{day}</time>
        {dayEvents.slice(0, 2).map((event) => <Link key={event.id} href={`/events/${event.slug}`} title={localizedField(event, "title", locale)}>{localizedField(event, "title", locale)}</Link>)}
        {dayEvents.length > 2 && <span className="events-calendar-more">{moreLabel(dayEvents.length - 2)}</span>}
      </li>;
    })}</ol>
  </div>;
}
