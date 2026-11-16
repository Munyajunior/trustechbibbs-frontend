"use client";

import { useEffect } from "react";

import { getCurrentUser, refreshSession } from "@/lib/api/auth";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

let bootstrapPromise: Promise<void> | null = null;

/** Restore a short-lived access token from the server's httpOnly refresh cookie. */
export function AuthSessionBootstrap({ locale }: { locale: Locale }) {
  useEffect(() => {
    if (useAuthStore.getState().accessToken) return;
    // Wait until the browser is idle so session restore never competes with hydration.
    const start = () => {
      bootstrapPromise ??= (async () => {
        try {
          const tokens = await refreshSession(locale);
          const user = await getCurrentUser(tokens.access_token, locale);
          if (!useAuthStore.getState().accessToken) {
            useAuthStore.getState().setSession(
              {
                id: user.id,
                email: user.email,
                full_name: user.full_name_en,
                roles: user.roles,
                must_change_password: user.must_change_password,
                preferred_locale: locale,
              },
              tokens.access_token,
            );
          }
        } catch {
          if (!useAuthStore.getState().accessToken) useAuthStore.getState().clearSession();
        }
      })();
    };
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(start, { timeout: 4000 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(start, 200);
    return () => window.clearTimeout(handle);
  }, [locale]);

  return null;
}
