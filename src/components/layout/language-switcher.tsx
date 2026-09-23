"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * EN/FR toggle.
 *
 * Swaps the locale segment while keeping the current pathname and route params,
 * so the user stays on the page they were reading.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: string) {
    if (next === locale) return;
    startTransition(() => {
      // `usePathname()` here is locale-stripped but otherwise concrete
      // (e.g. "/programs/nursing"), so swapping the locale keeps the user on
      // the same page. If translated `pathnames` are ever added to routing.ts,
      // this must pass `{ pathname, params }` instead so dynamic segments
      // survive the switch — see docs/I18N.md.
      router.replace(pathname, {
        locale: next as (typeof routing.locales)[number],
      });
    });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-gray-200 p-0.5",
        isPending && "opacity-60",
        className,
      )}
      role="group"
      aria-label={t("language")}
    >
      {routing.locales.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => switchTo(code)}
            aria-current={active ? "true" : undefined}
            aria-label={code === "fr" ? t("switchToFrench") : t("switchToEnglish")}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition-colors",
              active
                ? "bg-primary text-white"
                : "text-gray-600 hover:text-primary",
            )}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
