import { getTranslations } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { Link } from "@/i18n/navigation";

type InformationPageProps = {
  namespace: "privacy" | "terms" | "accessibility";
};

export async function InformationPage({ namespace }: InformationPageProps) {
  const t = await getTranslations(namespace);
  const sections = ["purpose", "commitment", "yourRole", "contact"] as const;

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Container className="py-12">
        <div className="mx-auto max-w-3xl space-y-9">
          {sections.map((section) => (
            <section key={section} aria-labelledby={`${namespace}-${section}`}>
              <h2 id={`${namespace}-${section}`} className="font-display text-xl font-semibold text-gray-900">
                {t(`sections.${section}.title`)}
              </h2>
              <p className="mt-3 leading-7 text-gray-600">{t(`sections.${section}.body`)}</p>
            </section>
          ))}
          <p className="rounded-lg border border-primary/20 bg-primary-subtle p-5 text-sm leading-6 text-gray-700">
            {t("reviewNote")} <Link href="/contact" className="font-semibold text-primary underline underline-offset-2">{t("contactLink")}</Link>.
          </p>
        </div>
      </Container>
    </>
  );
}
