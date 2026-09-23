import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Locale } from "@/lib/api/types";

/**
 * Client-side session state (Phase 2 groundwork).
 *
 * Boundary rule: Zustand holds CLIENT state only — who is logged in, UI prefs.
 * Anything fetched from the API belongs in React Query. Do not cache server
 * resources (programs, results, invoices) here. See docs/ARCHITECTURE.md.
 *
 * SECURITY: the refresh token must live in an httpOnly cookie set by the
 * backend, never in localStorage. Only the short-lived access token and
 * non-sensitive profile fields are kept here.
 */

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  preferred_locale?: Locale;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setSession: (user: AuthUser, accessToken: string) => void;
  clearSession: () => void;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,

      setSession: (user, accessToken) => set({ user, accessToken }),
      clearSession: () => set({ user: null, accessToken: null }),

      hasRole: (role) => get().user?.roles.includes(role) ?? false,
    }),
    {
      name: "thibbs-auth",
      // Persist identity only — never the token (XSS would exfiltrate it).
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
