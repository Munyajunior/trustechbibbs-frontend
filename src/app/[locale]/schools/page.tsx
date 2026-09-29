import { ArrowRight } from "lucide-react";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { schools } from "@/lib/schools";

type PageProps = { params: Promise<{ locale: string }> };

export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "schoolsIndex.meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}/schools`,
      languages: { en: "/en/schools", fr: "/fr/schools" },
    },
  };
}

export default async function SchoolsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("schoolsIndex");
  const names = await getTranslations("home.schools");

  return (
    <div className="home-editorial schools-index">
      <section className="schools-index-hero" aria-labelledby="schools-index-title">
        <Container className="schools-index-hero-inner">
          <div>
            <p className="home-kicker">{t("eyebrow")}</p>
            <h1 id="schools-index-title">{t("title")}</h1>
            <p>{t("intro")}</p>
          </div>
          <span className="schools-index-numeral" aria-hidden="true">07</span>
        </Container>
      </section>

      <section className="schools-index-list" aria-labelledby="schools-index-list-title">
        <Container>
          <h2 id="schools-index-list-title" className="sr-only">{t("listTitle")}</h2>
          <ol>
            {schools.map((school, index) => (
              <li className="schools-index-row" key={school.key}>
                <Link className="schools-index-image" href={`/schools/${school.key}`} aria-label={names(`${school.key}.title`)}>
                  <Image
                    src={school.image}
                    alt=""
                    fill
                    sizes="(max-width: 700px) 100vw, 44vw"
                    className="object-cover"
                  />
                </Link>
                <div className="schools-index-copy">
                  <span className="schools-index-number">{String(index + 1).padStart(2, "0")} / 07</span>
                  <h3><Link href={`/schools/${school.key}`}>{names(`${school.key}.title`)}</Link></h3>
                  <p>{names(`${school.key}.body`)}</p>
                  <Link className="home-text-link" href={`/schools/${school.key}`}>
                    {t("explore")}<ArrowRight aria-hidden="true" size={18} />
                  </Link>
                </div>
              </li>
            ))}
          </ol>
          <p className="schools-index-image-note">{t("imageNote")}</p>
        </Container>
      </section>

      <section className="schools-index-contact" aria-labelledby="schools-index-contact-title">
        <Container className="schools-index-contact-inner">
          <div>
            <p className="home-kicker">{t("nextEyebrow")}</p>
            <h2 id="schools-index-contact-title">{t("nextTitle")}</h2>
            <p>{t("nextBody")}</p>
          </div>
          <Link className="home-button home-button-gold" href="/contact">
            {t("contactAdmissions")}<ArrowRight aria-hidden="true" size={18} />
          </Link>
        </Container>
      </section>
    </div>
  );
}
