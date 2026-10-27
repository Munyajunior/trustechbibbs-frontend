import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";

export type InstitutionalPage = "research" | "careers" | "alumni" | "partnerships";

const imageSlots: Record<InstitutionalPage, string> = {
  research: "research-hero",
  careers: "careers-hero",
  alumni: "alumni-hero",
  partnerships: "partnerships-hero",
};

export async function institutionalMetadata(
  locale: string,
  page: InstitutionalPage,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "institutionalPages" });
  return {
    title: t(`${page}.meta.title`),
    description: t(`${page}.meta.description`),
    alternates: {
      canonical: `/${locale}/${page}`,
      languages: { en: `/en/${page}`, fr: `/fr/${page}` },
    },
  };
}

export async function InstitutionalLanding({
  locale,
  page,
}: {
  locale: string;
  page: InstitutionalPage;
}) {
  setRequestLocale(locale);
  const t = await getTranslations("institutionalPages");
  const items = ["first", "second", "third"] as const;

  return <div className={`institutional-page institutional-page-${page}`}>
    <section className="institutional-hero">
      <Container className="institutional-hero-grid">
        <div className="institutional-hero-copy">
          <p className="institutional-kicker"><span aria-hidden="true" />{t(`${page}.eyebrow`)}</p>
          <h1>{t(`${page}.title`)}</h1>
          <p className="institutional-lead">{t(`${page}.intro`)}</p>
          <div className="institutional-actions">
            <Link href="/contact" className="institutional-button institutional-button-primary">{t(`${page}.contactCta`)}<ArrowUpRight aria-hidden="true" size={18} /></Link>
            <Link href="/schools" className="institutional-button institutional-button-secondary">{t("exploreSchools")}</Link>
          </div>
          <p className="institutional-hero-footnote">{t(`${page}.note`)}</p>
        </div>
        <div className="institutional-hero-image">
          <Image src={`/site-media/${imageSlots[page]}`} unoptimized alt="" fill priority sizes="(max-width: 760px) 100vw, 48vw" className="object-cover" />
          <div className="institutional-image-label"><span>TRUSTECH / {t(`${page}.eyebrow`)}</span><strong>{t(`${page}.imageCaption`)}</strong></div>
        </div>
      </Container>
    </section>

    <section className="institutional-focus" aria-labelledby="institutional-focus-title">
      <Container>
        <div className="institutional-heading">
          <p className="institutional-kicker"><span aria-hidden="true" />{t(`${page}.focusEyebrow`)}</p>
          <h2 id="institutional-focus-title">{t(`${page}.focusTitle`)}</h2>
          <p>{t(`${page}.focusIntro`)}</p>
        </div>
        <div className="institutional-focus-grid">
          {items.map((item, index) => <article key={item}>
            <span className="institutional-card-index">0{index + 1}</span>
            <h3>{t(`${page}.items.${item}.title`)}</h3>
            <p>{t(`${page}.items.${item}.body`)}</p>
          </article>)}
        </div>
      </Container>
    </section>

    <section className="institutional-contact">
      <Container className="institutional-contact-inner">
        <div><p className="institutional-kicker"><span aria-hidden="true" />{t(`${page}.bottomEyebrow`)}</p><h2>{t(`${page}.bottomTitle`)}</h2><p>{t(`${page}.bottomBody`)}</p></div>
        <Link href="/contact" className="institutional-button institutional-button-light">{t(`${page}.contactCta`)}<ArrowRight aria-hidden="true" size={18} /></Link>
      </Container>
    </section>
  </div>;
}
