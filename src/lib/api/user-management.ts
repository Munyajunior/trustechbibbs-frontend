import { apiList, apiRequest } from "./client";
import type { Locale, Paginated } from "./types";

export type ManagedStaffRole = "editor" | "registrar" | "department_head" | "lecturer" | "discipline_master" | "accountant" | "finance_director" | "admin";

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
  /** Also grant `lecturer` next to the primary role (e.g. an HOD who also lectures). */
  also_lecturer?: boolean;
}

export interface StaffUpdatePayload {
  full_name_en?: string;
  full_name_fr?: string | null;
  role?: ManagedStaffRole;
  /** Omit to keep the account's current lecturer flag. */
  also_lecturer?: boolean;
}

/** Separation of duties: payroll roles manage contracts, so they may not also lecture. */
export const NO_LECTURER_ROLES: readonly string[] = ["accountant", "finance_director"];

/** Whether `role` may be combined with `lecturer` (the "Also lectures" option). */
export const canAlsoLecture = (role: string) => role !== "lecturer" && !NO_LECTURER_ROLES.includes(role);

/**
 * A manageable staff account holds one primary staff role, optionally plus `lecturer`.
 * Returns null for any other combination (students, applicants, super admins...).
 */
export function staffRoleParts(
  roles: string[],
  manageable: readonly string[],
): { primary: ManagedStaffRole; alsoLecturer: boolean } | null {
  if (roles.length === 1 && manageable.includes(roles[0])) {
    return { primary: roles[0] as ManagedStaffRole, alsoLecturer: false };
  }
  const others = roles.filter((role) => role !== "lecturer");
  if (roles.length === 2 && others.length === 1 && manageable.includes(others[0]) && canAlsoLecture(others[0])) {
    return { primary: others[0] as ManagedStaffRole, alsoLecturer: true };
  }
  return null;
}

export function listManagedUsers(
  token: string,
  locale: Locale,
  query: { page?: number; per_page?: number; search?: string; role?: string; is_active?: boolean } = {},
): Promise<Paginated<ManagedUser>> {
  return apiList<ManagedUser>("/users", {
    token,
    locale,
    query: {
      page: query.page ?? 1,
      per_page: query.per_page ?? 20,
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
