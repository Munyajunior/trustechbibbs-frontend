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
              preferred_locale: locale,
            },
            tokens.access_token,
          );
        }
      } catch {
        if (!useAuthStore.getState().accessToken) useAuthStore.getState().clearSession();
      }
    })();
  }, [locale]);

  return null;
}
