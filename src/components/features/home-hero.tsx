"use client";

import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import type { HomeBanner, Locale } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";

type Fallback = {
  title: string;
  subtitle: string;
  imageAlt: string;
  primaryLabel: string;
};

type Props = {
  locale: Locale;
  banners: HomeBanner[];
  fallback: Fallback;
  labels: { eyebrow: string; secondary: string; signoff: string; caption: string; previous: string; next: string; controls: string };
};

export function HomeHero({ locale, banners, fallback, labels }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (banners.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % banners.length), 7000);
    return () => window.clearInterval(timer);
  }, [banners.length, paused]);

  const banner = banners[index];
  const title = banner ? localizedField(banner, "title", locale) : fallback.title;
  const subtitle = banner ? localizedField(banner, "subtitle", locale) : fallback.subtitle;
  const imageAlt = banner ? localizedField(banner, "image_alt", locale) : fallback.imageAlt;
  const primaryLabel = banner ? localizedField(banner, "cta_label", locale) : fallback.primaryLabel;

  return <section className="home-hero" aria-labelledby="home-title" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
    <Container className="home-hero-inner">
      <div className="home-hero-copy">
        <p className="home-eyebrow">{labels.eyebrow}</p>
        <h1 id="home-title">{title}</h1>
        <p className="home-hero-intro">{subtitle}</p>
        <div className="home-actions">
          <Link className="home-button home-button-gold" href={banner?.cta_href ?? "/admissions/register"}>{primaryLabel}<ArrowRight aria-hidden="true" size={18} /></Link>
          <Link className="home-button home-button-outline" href="/programs">{labels.secondary}</Link>
        </div>
        <p className="home-hero-signoff">{labels.signoff}</p>
      </div>
      <div className="home-hero-visual">
        <Image key={banner?.id ?? "fallback"} src={banner?.image_url ?? "/site-media/hero"} unoptimized alt={imageAlt} fill priority sizes="(max-width: 900px) 100vw, 55vw" className="object-cover object-center" />
        <p className="home-visual-caption">{labels.caption}</p>
        {banners.length > 1 && <div className="home-hero-controls" role="group" aria-label={labels.controls}>
          <button type="button" aria-label={labels.previous} onClick={() => setIndex((current) => (current - 1 + banners.length) % banners.length)}><ChevronLeft aria-hidden="true" size={20} /></button>
          <span aria-live="polite">{index + 1} / {banners.length}</span>
          <button type="button" aria-label={labels.next} onClick={() => setIndex((current) => (current + 1) % banners.length)}><ChevronRight aria-hidden="true" size={20} /></button>
        </div>}
      </div>
    </Container>
  </section>;
}
