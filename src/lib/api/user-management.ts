import { apiList, apiRequest } from "./client";
import type { Locale, Paginated } from "./types";

export type ManagedStaffRole = "editor" | "registrar" | "department_head" | "admin";

export interface ManagedUser {
  id: string;
  email: string;
  full_name_en: string;
  full_name_fr: string | null;
  roles: string[];
  is_active: boolean;
  created_at: string;
}

export interface StaffCreatePayload {
  email: string;
  password: string;
  full_name_en: string;
  full_name_fr?: string | null;
  role: ManagedStaffRole;
}

export interface StaffUpdatePayload {
  full_name_en?: string;
  full_name_fr?: string | null;
  role?: ManagedStaffRole;
}

export function listManagedUsers(
  token: string,
  locale: Locale,
  query: { page?: number; search?: string; role?: string; is_active?: boolean } = {},
): Promise<Paginated<ManagedUser>> {
  return apiList<ManagedUser>("/users", {
    token,
    locale,
    query: {
      page: query.page ?? 1,
      per_page: 20,
      search: query.search,
      role: query.role,
      is_active: query.is_active === undefined ? undefined : String(query.is_active),
    },
    cache: "no-store",
  });
}

export function createManagedStaff(
  payload: StaffCreatePayload,
  token: string,
  locale: Locale,
): Promise<ManagedUser> {
  return apiRequest<ManagedUser>("/users", { method: "POST", body: payload, token, locale });
}

export function updateManagedStaff(
  id: string,
  payload: StaffUpdatePayload,
  token: string,
  locale: Locale,
): Promise<ManagedUser> {
  return apiRequest<ManagedUser>(`/users/${id}`, { method: "PATCH", body: payload, token, locale });
}

export function setManagedUserActive(
  id: string,
  active: boolean,
  token: string,
  locale: Locale,
): Promise<ManagedUser> {
  return apiRequest<ManagedUser>(`/users/${id}/${active ? "reactivate" : "deactivate"}`, {
    method: "POST",
    token,
    locale,
  });
}
