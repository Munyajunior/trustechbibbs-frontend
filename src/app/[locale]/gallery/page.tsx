import Image from "next/image";
import { ArrowRight, Images } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { getGalleryAlbums } from "@/lib/api/public";
import { safeFetch } from "@/lib/api/safe";
import type { GalleryAlbum, Locale } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { publicMediaSrc } from "@/lib/public-media";

export const revalidate = 3600;
type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gallery.meta" });
  return { title: t("title"), description: t("description"), alternates: {
    canonical: `/${locale}/gallery`, languages: { en: "/en/gallery", fr: "/fr/gallery" },
  } };
}

export default async function GalleryPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("gallery");
  const { data: albums, failed } = await safeFetch<GalleryAlbum[]>(
    getGalleryAlbums({ locale: locale as Locale }), [], "gallery:albums",
  );
  return <div className="home-editorial gallery-page">
    <section className="gallery-hero"><Container><p className="home-kicker">{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("intro")}</p></Container></section>
    <section className="gallery-content"><Container>
      <div className="home-section-heading home-section-heading-split"><div><p className="home-kicker">{t("albumsEyebrow")}</p><h2>{t("albumsTitle")}</h2></div><p>{t("albumsIntro")}</p></div>
      {albums.length ? <div className="gallery-albums">{albums.map((album) => {
        const cover = publicMediaSrc(album.cover_image_url);
        return <Link key={album.id} href={`/gallery/${album.slug}`} className="gallery-album-card">
          <span className="gallery-album-visual">{cover ? <Image src={cover} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" className="object-cover" /> : <Images aria-hidden="true" size={44} />}</span>
          <span className="gallery-album-copy"><strong>{localizedField(album, "title", locale as Locale)}</strong>{localizedField(album, "description", locale as Locale) && <span>{localizedField(album, "description", locale as Locale)}</span>}<span className="home-text-link">{t("openAlbum")}<ArrowRight aria-hidden="true" size={17} /></span></span>
        </Link>;
      })}</div> : <div className="journal-empty"><div className="journal-empty-icon"><Images aria-hidden="true" size={35} /></div><div><h3>{failed ? t("unavailableTitle") : t("emptyTitle")}</h3><p>{failed ? t("unavailableBody") : t("emptyBody")}</p></div><Link className="home-button home-button-gold" href="/about">{t("aboutCta")}<ArrowRight aria-hidden="true" size={18} /></Link></div>}
    </Container></section>
  </div>;
}
