import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { schoolByKey, schools } from "@/lib/schools";

type PageProps = { params: Promise<{ locale: string; school: string }> };

export const revalidate = 86400;

export function generateStaticParams() {
  return schools.map(({ key }) => ({ school: key }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, school: key } = await params;
  if (!schoolByKey(key)) notFound();
  const names = await getTranslations({ locale, namespace: "home.schools" });
  const details = await getTranslations({ locale, namespace: "schoolDetail" });
  const title = names(`${key}.title`);
  return {
    title,
    description: details(`profiles.${key}.intro`),
    alternates: {
      canonical: `/${locale}/schools/${key}`,
      languages: { en: `/en/schools/${key}`, fr: `/fr/schools/${key}` },
    },
  };
}

export default async function SchoolPage({ params }: PageProps) {
  const { locale, school: key } = await params;
  const school = schoolByKey(key);
  if (!school) notFound();
  setRequestLocale(locale);
  const names = await getTranslations("home.schools");
  const t = await getTranslations("schoolDetail");
  const title = names(`${key}.title`);
  const otherSchools = schools.filter(({ key: candidate }) => candidate !== key);

  return (
    <div className="home-editorial school-page">
      <nav className="school-breadcrumb" aria-label={t("breadcrumbLabel")}>
        <Container>
          <Link href="/">{t("home")}</Link><span aria-hidden="true">/</span>
          <Link href="/schools">{t("schools")}</Link><span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </Container>
      </nav>

      <section className="school-hero" aria-labelledby="school-title">
        <Container className="school-hero-inner">
          <div className="school-hero-copy">
            <p className="home-kicker">{t("eyebrow")}</p>
            <h1 id="school-title">{title}</h1>
            <p className="school-hero-intro">{t(`profiles.${key}.intro`)}</p>
            <div className="home-actions">
              <Link href="/contact" className="home-button home-button-gold">
                {t("askAboutPrograms")}<ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link href="/admissions" className="home-button home-button-outline">
                {t("admissionsGuide")}
              </Link>
            </div>
          </div>
          <div className="school-hero-image">
            <Image
              src={school.image}
              alt={t(`profiles.${key}.imageAlt`)}
              fill
              priority
              sizes="(max-width: 780px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="school-hero-image-label">{t("imageLabel")}</div>
          </div>
        </Container>
      </section>

      <section className="school-focus" aria-labelledby="school-focus-heading">
        <Container className="school-focus-inner">
          <div>
            <p className="home-kicker">{t("focusEyebrow")}</p>
            <h2 id="school-focus-heading">{t("focusTitle")}</h2>
            <p>{t(`profiles.${key}.body`)}</p>
          </div>
          <ul className="school-focus-list">
            {(["one", "two", "three"] as const).map((item, index) => (
              <li key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{t(`profiles.${key}.focus.${item}`)}</h3>
              </li>
            ))}
          </ul>
          <p className="school-focus-note">{t("focusNote")}</p>
        </Container>
      </section>

      <section className="school-next" aria-labelledby="school-next-heading">
        <Container className="school-next-inner">
          <div>
            <p className="home-kicker">{t("nextEyebrow")}</p>
            <h2 id="school-next-heading">{t("nextTitle")}</h2>
            <p>{t("nextBody")}</p>
          </div>
          <Link href="/contact" className="home-button home-button-gold">
            {t("contactAdmissions")}<ArrowRight aria-hidden="true" size={18} />
          </Link>
        </Container>
      </section>

      <section className="school-discover" aria-labelledby="school-discover-heading">
        <Container>
          <div className="school-discover-heading">
            <h2 id="school-discover-heading">{t("discoverOther")}</h2>
            <Link href="/schools" className="home-text-link">
              <ArrowLeft aria-hidden="true" size={17} />{t("allSchools")}
            </Link>
          </div>
          <ul className="school-discover-list">
            {otherSchools.map((other) => (
              <li key={other.key}>
                <Link href={`/schools/${other.key}`}>
                  {names(`${other.key}.title`)}<ArrowRight aria-hidden="true" size={17} />
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </div>
  );
}
