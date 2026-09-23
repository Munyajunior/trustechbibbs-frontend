import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { deepMerge, type MessageTree } from "./deep-merge";
import { routing } from "./routing";

/**
 * Per-request i18n config consumed by the next-intl plugin.
 *
 * Messages are deep-merged over English so that any key missing from `fr.json`
 * falls back to the English string instead of rendering a raw key — the
 * platform-wide bilingual fallback rule. See docs/I18N.md.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const defaultMessages = (await import("../messages/en.json")).default as MessageTree;
  const messages =
    locale === routing.defaultLocale
      ? defaultMessages
      : deepMerge(
          defaultMessages,
          (await import(`../messages/${locale}.json`)).default as MessageTree,
        );

  return {
    locale,
    messages,
    // The institution operates in Cameroon (WAT / UTC+1).
    timeZone: "Africa/Douala",
  };
});
