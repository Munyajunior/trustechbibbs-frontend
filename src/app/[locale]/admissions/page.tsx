import Image from "next/image";
import { ArrowRight, BookOpen, CircleCheck, ClipboardList, FilePenLine, LifeBuoy, UserRoundPlus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";

type PageProps = { params: Promise<{ locale: string }> };
export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admissions.meta" });
  return { title: t("title"), description: t("description"), alternates: {
    canonical: `/${locale}/admissions`, languages: { en: "/en/admissions", fr: "/fr/admissions" },
  } };
}

const steps = [
  { key: "choose", icon: BookOpen },
  { key: "account", icon: UserRoundPlus },
  { key: "prepare", icon: FilePenLine },
  { key: "track", icon: CircleCheck },
] as const;

const checklist = ["program", "personal", "academic", "intake"] as const;

export default async function AdmissionsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admissions");

  return (
    <div className="home-editorial admissions-editorial">
      <section className="admissions-hero" aria-labelledby="admissions-title">
        <Container className="admissions-hero-inner">
          <div className="admissions-hero-copy">
            <p className="home-kicker">{t("eyebrow")}</p>
            <h1 id="admissions-title">{t("title")}</h1>
            <p>{t("subtitle")}</p>
            <div className="home-actions">
              <Link className="home-button home-button-gold" href="/admissions/register">{t("readyCta")}<ArrowRight aria-hidden="true" size={18} /></Link>
              <Link className="home-button home-button-outline" href="/programs">{t("explorePrograms")}</Link>
            </div>
            <p className="admissions-hero-note">{t("heroNote")}</p>
          </div>
          <div className="admissions-hero-visual">
            <Image src="/images/hero-student.png" alt="" fill priority sizes="(max-width: 700px) 100vw, 48vw" className="object-cover" />
            <div className="admissions-hero-card"><span>01—04</span><strong>{t("heroCard")}</strong></div>
          </div>
        </Container>
      </section>

      <section className="admissions-process" aria-labelledby="admissions-process-title">
        <Container>
          <div className="home-section-heading home-section-heading-split">
            <div><p className="home-kicker">{t("processEyebrow")}</p><h2 id="admissions-process-title">{t("howTitle")}</h2></div>
            <p>{t("processIntro")}</p>
          </div>
          <ol className="admissions-step-grid">
            {steps.map(({ key, icon: Icon }, index) => (
              <li key={key}>
                <span className="admissions-step-top"><span>{String(index + 1).padStart(2, "0")}</span><Icon aria-hidden="true" size={24} strokeWidth={1.6} /></span>
                <h3>{t(`steps.${key}.title`)}</h3>
                <p>{t(`steps.${key}.body`)}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="admissions-prepare" aria-labelledby="admissions-prepare-title">
        <Container className="admissions-prepare-inner">
          <div className="admissions-prepare-lead">
            <p className="home-kicker">{t("prepareEyebrow")}</p>
            <h2 id="admissions-prepare-title">{t("prepareTitle")}</h2>
            <p>{t("prepareIntro")}</p>
            <Link className="home-text-link" href="/admissions/application">{t("startApplication")}<ArrowRight aria-hidden="true" size={17} /></Link>
          </div>
          <div className="admissions-checklist">
            <div className="admissions-checklist-header"><ClipboardList aria-hidden="true" size={28} strokeWidth={1.6} /><span>{t("checklistTitle")}</span></div>
            <ul>{checklist.map((key) => <li key={key}><CircleCheck aria-hidden="true" size={19} /><span>{t(`checklist.${key}`)}</span></li>)}</ul>
            <p>{t("checklistNote")}</p>
          </div>
        </Container>
      </section>

      <section className="admissions-assistance" aria-labelledby="admissions-help-title">
        <Container className="admissions-assistance-inner">
          <div className="admissions-assistance-icon"><LifeBuoy aria-hidden="true" size={32} strokeWidth={1.5} /></div>
          <div><p className="home-kicker">{t("supportEyebrow")}</p><h2 id="admissions-help-title">{t("helpTitle")}</h2><p>{t("helpBody")}</p></div>
          <Link className="home-button home-button-outline" href="/contact">{t("helpCta")}<ArrowRight aria-hidden="true" size={18} /></Link>
        </Container>
      </section>

      <section className="admissions-final" aria-labelledby="admissions-ready-title">
        <Container className="admissions-final-inner">
          <div><p className="home-kicker">{t("finalEyebrow")}</p><h2 id="admissions-ready-title">{t("readyTitle")}</h2><p>{t("readyBody")}</p></div>
          <div className="admissions-final-actions">
            <Link className="home-button home-button-gold" href="/admissions/register">{t("readyCta")}<ArrowRight aria-hidden="true" size={18} /></Link>
            <Link className="admissions-status-link" href="/admissions/status">{t("trackApplication")}<ArrowRight aria-hidden="true" size={17} /></Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
