import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

/**
 * Locale negotiation + redirects.
 *
 * Rewrites `/` to `/en` (or `/fr` per the `Accept-Language` header / cookie)
 * and guarantees every rendered route carries a locale prefix.
 *
 * NOTE: this is Next 16's `proxy` file convention — the rename of the old
 * `middleware.ts`, which now emits a deprecation warning. next-intl still
 * exports its handler as `createMiddleware`; only the file name changed, the
 * handler signature is identical.
 */
export default createMiddleware(routing);

export const config = {
  /**
   * Run on everything except Next internals, API routes and files with an
   * extension (images, fonts, robots.txt...). Keeping static assets out of the
   * proxy is part of the performance budget.
   */
  matcher: ["/((?!api|site-media|_next|_vercel|.*\\..*).*)"],
};
