import Image from "next/image";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { getPublicPage } from "@/lib/api/pages";
import type { Locale } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { publicMediaSrc } from "@/lib/public-media";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const page = await getPublicPage(slug, locale as Locale);
    return { title: localizedField(page, "title", locale as Locale),
      description: localizedField(page, "summary", locale as Locale),
      alternates: { canonical: `/${locale}/pages/${slug}`,
        languages: { en: `/en/pages/${slug}`, "x-default": `/en/pages/${slug}`, fr: `/fr/pages/${slug}` } } };
  } catch { return {}; }
}

export default async function SitePageDetail({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  let page;
  try { page = await getPublicPage(slug, locale as Locale); } catch { notFound(); }
  const t = await getTranslations("sitePages");
  const loc = locale as Locale;
  const cover = publicMediaSrc(page.cover_image_url);
  return <div className="bg-[#fbfcff] pb-24">
    <header className="bg-[#0c276e] py-16 text-white sm:py-24"><Container>
      <Link href="/pages" className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white"><ArrowLeft aria-hidden="true" size={17} />{t("back")}</Link>
      <p className="mt-10 text-xs font-bold uppercase tracking-[.22em] text-[#f2c947]">GLOTECH / {t("eyebrow")}</p>
      <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold tracking-tight sm:text-6xl">{localizedField(page, "title", loc)}</h1>
      {localizedField(page, "summary", loc) && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">{localizedField(page, "summary", loc)}</p>}
    </Container></header>
    <Container className="max-w-[960px]">
      {cover && <div className="relative -mt-10 aspect-[16/8] overflow-hidden rounded-[28px] bg-slate-100 shadow-xl"><Image src={cover} unoptimized alt="" fill priority sizes="(max-width: 960px) 100vw, 960px" className="object-cover" /></div>}
      <article className="mx-auto max-w-[760px] space-y-8 pt-14 text-slate-700 sm:pt-20">
        {page.blocks.map((block, index) => {
          const content = localizedField(block, "text", loc);
          if (block.type === "heading") return <h2 key={index} className="font-display text-3xl font-bold text-[#092775]">{content}</h2>;
          if (block.type === "paragraph") return <p key={index} className="whitespace-pre-line text-lg leading-[1.8]">{content}</p>;
          if (block.type === "callout") return <aside key={index} className="rounded-2xl border-l-4 border-[#e7b70d] bg-[#fff8db] p-6 text-lg leading-relaxed text-[#132c66]">{content}</aside>;
          const source = publicMediaSrc(block.image_url);
          return source ? <figure key={index} className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100"><Image src={source} unoptimized alt={localizedField(block, "alt", loc)} fill sizes="(max-width: 760px) 100vw, 760px" className="object-cover" /></figure> : null;
        })}
      </article>
    </Container>
  </div>;
}
