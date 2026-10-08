import Image from "next/image";
import { ArrowLeft, Images } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { GalleryViewer } from "@/components/features/gallery-viewer";
import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { getGalleryAlbum } from "@/lib/api/public";
import type { Locale } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { publicMediaSrc } from "@/lib/public-media";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const { album } = await getGalleryAlbum(slug, { locale: locale as Locale });
    return { title: localizedField(album, "title", locale as Locale), description: localizedField(album, "description", locale as Locale) ?? undefined,
      alternates: { canonical: `/${locale}/gallery/${slug}`, languages: { en: `/en/gallery/${slug}`, fr: `/fr/gallery/${slug}` } } };
  } catch { return {}; }
}

export default async function GalleryAlbumPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  let detail;
  try { detail = await getGalleryAlbum(slug, { locale: locale as Locale }); }
  catch { notFound(); }
  const t = await getTranslations("gallery");
  const loc = locale as Locale;
  const cover = publicMediaSrc(detail.album.cover_image_url);
  return <div className="home-editorial gallery-detail">
    <header className="gallery-detail-hero"><Container><Link href="/gallery" className="editorial-back"><ArrowLeft aria-hidden="true" size={17} />{t("backToAlbums")}</Link><p className="home-kicker">{t("albumEyebrow")}</p><h1>{localizedField(detail.album, "title", loc)}</h1>{localizedField(detail.album, "description", loc) && <p>{localizedField(detail.album, "description", loc)}</p>}</Container></header>
    {cover && <Container><div className="gallery-detail-cover"><Image src={cover} alt="" fill priority sizes="(max-width: 1100px) 100vw, 1100px" className="object-cover" /></div></Container>}
    <section className="gallery-detail-content"><Container><div className="home-section-heading"><p className="home-kicker">{t("momentsEyebrow")}</p><h2>{t("momentsTitle")}</h2></div>{detail.items.length ? <GalleryViewer items={detail.items} locale={loc} /> : <div className="journal-empty"><div className="journal-empty-icon"><Images aria-hidden="true" size={35} /></div><div><h3>{t("albumEmptyTitle")}</h3><p>{t("albumEmptyBody")}</p></div><Link href="/gallery" className="home-button home-button-gold">{t("backToAlbums")}</Link></div>}</Container></section>
  </div>;
}
