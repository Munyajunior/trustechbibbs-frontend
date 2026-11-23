import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { listPublicPages } from "@/lib/api/pages";
import type { Locale } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sitePages" });
  return { title: t("title"), description: t("intro"),
    alternates: { canonical: `/${locale}/pages`, languages: { en: "/en/pages", "x-default": "/en/pages", fr: "/fr/pages" } } };
}

export default async function SitePagesIndex({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sitePages");
  let pages = [] as Awaited<ReturnType<typeof listPublicPages>>;
  try { pages = await listPublicPages(locale as Locale); } catch { /* Show the service message below. */ }
  return <div className="bg-[#f8faff] py-16 sm:py-24"><Container>
    <p className="text-xs font-bold uppercase tracking-[.22em] text-[#a78200]">GLOTECH / {t("eyebrow")}</p>
    <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-[#092775] sm:text-6xl">{t("title")}</h1>
    <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">{t("intro")}</p>
    {pages.length === 0 ? <p className="mt-12 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">{t("empty")}</p>
      : <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{pages.map((page) =>
        <Link key={page.id} href={`/pages/${page.slug}`} className="group flex min-h-56 flex-col rounded-[26px] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
          <span className="text-xs font-bold uppercase tracking-[.18em] text-[#ad8900]">{t("eyebrow")}</span>
          <h2 className="mt-5 font-display text-2xl font-bold text-[#092775]">{localizedField(page, "title", locale as Locale)}</h2>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{localizedField(page, "summary", locale as Locale)}</p>
          <span className="mt-auto flex items-center gap-2 pt-8 text-sm font-bold text-[#12369a]">{t("readMore")}<ArrowRight aria-hidden="true" size={17} className="transition group-hover:translate-x-1" /></span>
        </Link>)}</div>}
  </Container></div>;
}
