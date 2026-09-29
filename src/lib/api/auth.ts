import { apiRequest } from "./client";
import type { Locale } from "./types";

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name_en: string;
  full_name_fr: string | null;
  roles: string[];
  is_active: boolean;
}

export interface AuthResult {
  user: AuthenticatedUser;
  tokens: {
    access_token: string;
    refresh_token: string;
    token_type: "bearer";
    expires_in: number;
  };
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name_en: string;
  full_name_fr?: string;
}

export function registerApplicant(payload: RegisterPayload, locale: Locale): Promise<AuthResult> {
  return apiRequest<AuthResult>("/auth/register", {
    method: "POST",
    body: payload,
    locale,
    cache: "no-store",
    credentials: "include",
  });
}

export function loginApplicant(
  payload: Pick<RegisterPayload, "email" | "password">,
  locale: Locale,
): Promise<AuthResult> {
  return apiRequest<AuthResult>("/auth/login", {
    method: "POST",
    body: payload,
    locale,
    cache: "no-store",
    credentials: "include",
  });
}

export function refreshSession(locale: Locale): Promise<AuthResult["tokens"]> {
  return apiRequest<AuthResult["tokens"]>("/auth/refresh", {
    method: "POST",
    locale,
    cache: "no-store",
    credentials: "include",
  });
}

export function getCurrentUser(token: string, locale: Locale): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>("/auth/me", {
    token,
    locale,
    cache: "no-store",
  });
}

export function logoutSession(token: string, locale: Locale): Promise<{ logged_out: boolean }> {
  return apiRequest<{ logged_out: boolean }>("/auth/logout", {
    method: "POST",
    token,
    locale,
    cache: "no-store",
    credentials: "include",
  });
}
