import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFoundPage() {
  const t = useTranslations("notFound");

  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <p className="font-display text-6xl font-bold text-primary-light">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-gray-900">
        {t("title")}
      </h1>
      <p className="mt-2 max-w-md text-gray-600">{t("subtitle")}</p>
      <Link href="/" className={buttonVariants({ size: "lg", className: "mt-8" })}>
        {t("action")}
      </Link>
    </Container>
  );
}
