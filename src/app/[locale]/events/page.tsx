import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getEvents } from "@/lib/api/public";
import { safeFetch } from "@/lib/api/safe";
import type { CampusEvent, Locale, Paginated } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { formatDate } from "@/lib/utils";

/** Mirrors `REVALIDATE.dynamic`; must be a literal for Next to apply it. */
export const revalidate = 3600;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events.meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}/events`,
      languages: { en: "/en/events", fr: "/fr/events" },
    },
  };
}

export default async function EventsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("events");
  const loc = locale as Locale;

  const { data } = await safeFetch<Paginated<CampusEvent>>(
    getEvents({ per_page: 10 }, { locale: loc }),
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
    "events:list",
  );

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Container className="py-12">
        {/*
          TODO(Phase 1): month/week/list calendar views, category + date
          filters, registration with capacity indicator, iCal/Google export.
        */}
        {data.items.length > 0 ? (
          <ul className="space-y-4">
            {data.items.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.slug}`} className="block">
                  <Card interactive>
                    <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="shrink-0 rounded-md bg-primary-subtle px-4 py-3 text-center">
                      <span className="block font-display text-lg font-bold text-primary">
                        {new Date(event.starts_at).getDate() || "—"}
                      </span>
                      <span className="block text-xs uppercase text-primary">
                        {new Intl.DateTimeFormat(loc === "fr" ? "fr-CM" : "en-CM", {
                          month: "short",
                          timeZone: "Africa/Douala",
                        }).format(new Date(event.starts_at))}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-base font-semibold text-gray-900">
                        {localizedField(event, "title", loc)}
                      </h2>
                      <p className="mt-1 text-sm text-gray-600">
                        <time dateTime={event.starts_at}>
                          {formatDate(event.starts_at, loc)}
                        </time>
                      </p>
                      {event.venue && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                          <MapPin aria-hidden="true" className="size-4 shrink-0" />
                          {event.venue}
                        </p>
                      )}
                    </div>
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
