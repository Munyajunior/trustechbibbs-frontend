import Image from "next/image";
import { ArrowRight, BookOpenText, ClipboardList, MapPin, MessageCircleMore, Phone, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ContactForm } from "@/components/features/contact-form";
import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";

type PageProps = { params: Promise<{ locale: string }> };
const topics = [
  { key: "admissions", icon: ClipboardList },
  { key: "registrar", icon: BookOpenText },
  { key: "finance", icon: Wallet },
  { key: "general", icon: MessageCircleMore },
] as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact.meta" });
  return { title: t("title"), description: t("description"), alternates: {
    canonical: `/${locale}/contact`, languages: { en: "/en/contact", fr: "/fr/contact" },
  } };
}

export default async function ContactPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");

  return (
    <div className="home-editorial contact-editorial">
      <section className="contact-hero" aria-labelledby="contact-title">
        <Container className="contact-hero-inner">
          <div className="contact-hero-copy">
            <p className="home-kicker">{t("eyebrow")}</p>
            <h1 id="contact-title">{t("title")}</h1>
            <p>{t("subtitle")}</p>
            <a className="home-button home-button-gold" href="#contact-form">{t("writeCta")}<ArrowRight aria-hidden="true" size={18} /></a>
          </div>
          <div className="contact-hero-image">
            <Image src="/images/school-education.png" alt="" fill priority sizes="(max-width: 700px) 100vw, 48vw" className="object-cover" />
            <span><MapPin aria-hidden="true" size={19} />{t("location")}</span>
          </div>
        </Container>
      </section>

      <section className="contact-main" aria-labelledby="contact-main-title">
        <Container className="contact-main-inner">
          <div className="contact-information">
            <p className="home-kicker">{t("topicsEyebrow")}</p>
            <h2 id="contact-main-title">{t("topicsTitle")}</h2>
            <p>{t("topicsIntro")}</p>
            <div className="contact-topic-list">
              {topics.map(({ key, icon: Icon }) => <div className="contact-topic" key={key}>
                <span><Icon aria-hidden="true" size={22} strokeWidth={1.6} /></span>
                <div><h3>{t(`topics.${key}.title`)}</h3><p>{t(`topics.${key}.body`)}</p></div>
              </div>)}
            </div>
            <div className="contact-location"><MapPin aria-hidden="true" size={25} strokeWidth={1.6} /><div><strong>{t("location")}</strong><p>{t("visitNote")}</p></div></div>
            <div className="contact-phone" aria-label={t("callUs")}>
              <Phone aria-hidden="true" size={24} strokeWidth={1.6} />
              <div>
                <strong>{t("callUs")}</strong>
                <a href="tel:+237640481078">+237 640 481 078</a>
                <a href="tel:+237675502969">+237 675 502 969</a>
              </div>
            </div>
          </div>
          <div className="contact-form-panel" id="contact-form">
            <p className="home-kicker">{t("formEyebrow")}</p>
            <h2>{t("formTitle")}</h2>
            <p className="contact-form-intro">{t("formIntro")}</p>
            <ContactForm />
            <p className="contact-privacy-note">{t("privacyNote")} <Link href="/privacy">{t("privacyLink")}</Link></p>
          </div>
        </Container>
      </section>

      <section className="contact-next" aria-labelledby="contact-next-title">
        <Container className="contact-next-inner">
          <div><p className="home-kicker">{t("nextEyebrow")}</p><h2 id="contact-next-title">{t("nextTitle")}</h2><p>{t("nextBody")}</p></div>
          <div><Link className="home-button home-button-gold" href="/programs">{t("programsCta")}<ArrowRight aria-hidden="true" size={18} /></Link><Link className="contact-next-link" href="/admissions">{t("admissionsCta")}<ArrowRight aria-hidden="true" size={17} /></Link></div>
        </Container>
      </section>
    </div>
  );
}
