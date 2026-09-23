"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Catches render/data errors inside [locale].
 * Errors that escape this (e.g. in the layout itself) hit app/global-error.tsx.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    // Replace with the real error reporter (Sentry/Grafana) when wired.
    console.error(error);
  }, [error]);

  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <h1 className="font-display text-2xl font-semibold text-gray-900">
        {t("title")}
      </h1>
      <p className="mt-2 max-w-md text-gray-600">{t("subtitle")}</p>
      <Button size="lg" className="mt-8" onClick={reset}>
        {t("retry")}
      </Button>
    </Container>
  );
}
