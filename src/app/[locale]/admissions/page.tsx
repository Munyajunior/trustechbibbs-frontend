import { CheckCircle2, FileText, GraduationCap, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

type PageProps = { params: Promise<{ locale: string }> };

export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admissions.meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}/admissions`,
      languages: { en: "/en/admissions", fr: "/fr/admissions" },
    },
  };
}

export default async function AdmissionsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admissions");

  const steps = [
    { icon: GraduationCap, title: t("steps.choose.title"), body: t("steps.choose.body") },
    { icon: FileText, title: t("steps.prepare.title"), body: t("steps.prepare.body") },
    { icon: CheckCircle2, title: t("steps.submit.title"), body: t("steps.submit.body") },
  ];

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Container className="py-12">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div>
            <h2 className="font-display text-2xl font-semibold text-gray-900">{t("howTitle")}</h2>
            <ol className="mt-6 grid gap-4">
              {steps.map(({ icon: Icon, title, body }, index) => (
                <li key={title} className="flex gap-4 rounded-lg border border-gray-200 p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-subtle font-display font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon aria-hidden="true" className="size-4 text-primary" />
                      <h3 className="font-display font-semibold text-gray-900">{title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <Card className="border-primary/20 bg-primary-subtle">
            <CardContent>
              <h2 className="font-display text-lg font-semibold text-gray-900">{t("helpTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-700">{t("helpBody")}</p>
              <Link href="/contact" className={buttonVariants({ variant: "primary", size: "md", className: "mt-5 w-full" })}>
                <MessageCircle aria-hidden="true" />
                {t("helpCta")}
              </Link>
            </CardContent>
          </Card>
        </section>

        <section className="mt-12 rounded-xl bg-primary px-6 py-10 text-white sm:px-10" aria-labelledby="admissions-ready">
          <h2 id="admissions-ready" className="font-display text-2xl font-semibold">{t("readyTitle")}</h2>
          <p className="mt-3 max-w-2xl text-white/80">{t("readyBody")}</p>
          <Link href="/admissions/register" className={buttonVariants({ variant: "accent", size: "lg", className: "mt-6" })}>
            {t("readyCta")}
          </Link>
        </section>
      </Container>
    </>
  );
}
