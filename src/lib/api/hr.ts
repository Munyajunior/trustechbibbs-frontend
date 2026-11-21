import { apiList, apiRequest } from "./client";
import type { Locale, Paginated } from "./types";

export type EmploymentStatus = "ACTIVE" | "SUSPENDED" | "LEFT";
export type PayBasis = "PER_HOUR" | "PER_COURSE";
export type PerCoursePayment = "ON_COMPLETION" | "MONTHLY_INSTALMENTS";
export type ContractStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "VOIDED";

export interface Lecturer {
  id: string;
  user_id: string;
  staff_number: string;
  primary_department_id: string;
  phone: string | null;
  employment_status: EmploymentStatus;
  /** Always null for department heads. */
  payout_details: string | null;
  full_name_en: string;
  full_name_fr: string | null;
  email: string;
}

export interface LecturerInput {
  user_id: string;
  staff_number: string;
  primary_department_id: string;
  phone?: string | null;
  payout_details?: string | null;
}

export type LecturerPatch = Partial<Omit<LecturerInput, "user_id">> & { employment_status?: EmploymentStatus };

export interface LecturerQuery {
  page?: number;
  per_page?: number;
  search?: string;
  department_id?: string;
  employment_status?: EmploymentStatus | "";
}

/** An active lecturer-role user who has no lecturer record yet. */
export interface LecturerCandidate {
  user_id: string;
  email: string;
  full_name_en: string;
  full_name_fr: string | null;
}

/** A department-head assignment; `ends_on` null means it is still open. */
export interface DepartmentHead {
  id: string;
  user_id: string;
  department_id: string;
  starts_on: string;
  ends_on: string | null;
  created_at: string;
}

export interface DepartmentHeadInput {
  user_id: string;
  department_id: string;
  starts_on: string;
}

export interface Contract {
  id: string;
  lecturer_id: string;
  term_id: string;
  contract_number: string;
  pay_basis: PayBasis;
  rate_cm: number | null;
  rate_td: number | null;
  rate_tp: number | null;
  per_course_payment: PerCoursePayment | null;
  status: ContractStatus;
  void_reason: string | null;
  signed_on: string | null;
  notes: string | null;
  created_at: string;
}

export interface ContractLine {
  id: string;
  section_id: string;
  section_code: string;
  course_id: string;
  course_code: string;
  course_name_en: string;
  course_name_fr: string | null;
  /** Decimal, serialised by the API as a string. */
  planned_hours: string | number;
  course_amount: number | null;
  completed_at: string | null;
}

/** Raw line as returned by POST /lines (no course names; re-fetch the contract for those). */
export interface ContractLineRecord {
  id: string;
  contract_id: string;
  section_id: string;
  planned_hours: string | number;
  course_amount: number | null;
  completed_at: string | null;
}

export interface ContractDetail extends Contract {
  lines: ContractLine[];
}

/** PUT semantics: the whole contract is sent on every update. */
export interface ContractInput {
  lecturer_id: string;
  term_id: string;
  contract_number: string;
  pay_basis: PayBasis;
  rate_cm: number | null;
  rate_td: number | null;
  rate_tp: number | null;
  per_course_payment: PerCoursePayment | null;
  signed_on: string | null;
  notes: string | null;
}

export interface ContractLineInput {
  section_id: string;
  planned_hours: number;
  /** Required for PER_COURSE contracts, forbidden for PER_HOUR. */
  course_amount?: number | null;
}

const options = (token: string, locale: Locale) => ({ token, locale, cache: "no-store" as const });
const send = (method: string, token: string, locale: Locale, body?: unknown) =>
  ({ ...options(token, locale), method, body });

export function listLecturers(params: LecturerQuery, token: string, locale: Locale): Promise<Paginated<Lecturer>> {
  return apiList<Lecturer>("/hr/lecturers", {
    ...options(token, locale),
    query: {
      page: params.page ?? 1, per_page: params.per_page ?? 20, search: params.search,
      department_id: params.department_id, employment_status: params.employment_status,
    },
  });
}

export function listLecturerCandidates(
  params: { search?: string; page?: number; per_page?: number }, token: string, locale: Locale,
): Promise<Paginated<LecturerCandidate>> {
  return apiList<LecturerCandidate>("/hr/lecturer-candidates", {
    ...options(token, locale),
    query: { page: params.page ?? 1, per_page: params.per_page ?? 20, search: params.search },
  });
}

export function getLecturer(id: string, token: string, locale: Locale) {
  return apiRequest<Lecturer>(`/hr/lecturers/${id}`, options(token, locale));
}

export function createLecturer(input: LecturerInput, token: string, locale: Locale) {
  return apiRequest<Lecturer>("/hr/lecturers", send("POST", token, locale, input));
}

export function updateLecturer(id: string, patch: LecturerPatch, token: string, locale: Locale) {
  return apiRequest<Lecturer>(`/hr/lecturers/${id}`, send("PATCH", token, locale, patch));
}

export function listDepartmentHeads(token: string, locale: Locale) {
  return apiRequest<DepartmentHead[]>("/hr/department-heads", options(token, locale));
}

export function assignDepartmentHead(input: DepartmentHeadInput, token: string, locale: Locale) {
  return apiRequest<DepartmentHead>("/hr/department-heads", send("POST", token, locale, input));
}

export function endDepartmentHead(id: string, endsOn: string, token: string, locale: Locale) {
  return apiRequest<DepartmentHead>(`/hr/department-heads/${id}/end`, send("POST", token, locale, { ends_on: endsOn }));
}

export function listContracts(lecturerId: string, token: string, locale: Locale) {
  return apiRequest<Contract[]>(`/hr/lecturers/${lecturerId}/contracts`, options(token, locale));
}

export function getContract(id: string, token: string, locale: Locale) {
  return apiRequest<ContractDetail>(`/hr/contracts/${id}`, options(token, locale));
}

export function createContract(input: ContractInput, token: string, locale: Locale) {
  return apiRequest<ContractDetail>(`/hr/lecturers/${input.lecturer_id}/contracts`, send("POST", token, locale, input));
}

export function updateContract(id: string, input: ContractInput, token: string, locale: Locale) {
  return apiRequest<ContractDetail>(`/hr/contracts/${id}`, send("PATCH", token, locale, input));
}

export function addContractLine(id: string, line: ContractLineInput, token: string, locale: Locale) {
  return apiRequest<ContractLineRecord>(`/hr/contracts/${id}/lines`, send("POST", token, locale, line));
}

export function removeContractLine(id: string, lineId: string, token: string, locale: Locale) {
  return apiRequest<{ removed: boolean }>(`/hr/contracts/${id}/lines/${lineId}`, send("DELETE", token, locale));
}

export function activateContract(id: string, token: string, locale: Locale) {
  return apiRequest<ContractDetail>(`/hr/contracts/${id}/activate`, send("POST", token, locale));
}

export function closeContract(id: string, token: string, locale: Locale) {
  return apiRequest<ContractDetail>(`/hr/contracts/${id}/close`, send("POST", token, locale));
}

export function voidContract(id: string, reason: string, token: string, locale: Locale) {
  return apiRequest<ContractDetail>(`/hr/contracts/${id}/void`, send("POST", token, locale, { reason }));
}
