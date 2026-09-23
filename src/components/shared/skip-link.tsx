import { useTranslations } from "next-intl";

/**
 * WCAG 2.2 AA — bypass blocks.
 *
 * Visually hidden until focused, then pinned top-left. The target `#main-content`
 * lives on the <main> element in the locale layout.
 */
export function SkipLink() {
  const t = useTranslations("common");

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
    >
      {t("skipToContent")}
    </a>
  );
}
