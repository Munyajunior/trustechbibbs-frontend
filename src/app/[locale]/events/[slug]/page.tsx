import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { Badge } from "@/components/ui/card";
import { getEvent } from "@/lib/api/public";
import type { Locale } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { formatDate } from "@/lib/utils";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const event = await getEvent(slug, { locale: locale as Locale });
    return {
      title: localizedField(event, "title", locale as Locale),
      description: localizedField(event, "description", locale as Locale) ?? undefined,
    };
  } catch {
    return {};
  }
}

export default async function EventPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  let event;
  try {
    event = await getEvent(slug, { locale: locale as Locale });
  } catch {
    notFound();
  }

  const t = await getTranslations("events");
  const loc = locale as Locale;

  return (
    <Container className="py-12 sm:py-16">
      <article className="mx-auto max-w-3xl">
        {event.category && <Badge tone="neutral">{event.category}</Badge>}
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          {localizedField(event, "title", loc)}
        </h1>
        <dl className="mt-8 grid gap-5 rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm sm:grid-cols-2">
          <div><dt className="font-medium text-gray-900">{t("date")}</dt><dd className="mt-1 text-gray-600">{formatDate(event.starts_at, loc)}</dd></div>
          {event.venue && <div><dt className="font-medium text-gray-900">{t("venue")}</dt><dd className="mt-1 text-gray-600">{event.venue}</dd></div>}
        </dl>
        {localizedField(event, "description", loc) && <div className="mt-8 whitespace-pre-line text-base leading-8 text-gray-700">{localizedField(event, "description", loc)}</div>}
      </article>
    </Container>
  );
}
