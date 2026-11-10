import { ApiError, apiList, apiRequest } from "./client";
import type { Locale, Paginated } from "./types";

/* ------------------------------------------------------------------ types */

export type FeeType = "REGISTRATION" | "TUITION";
export const FEE_TYPES: readonly FeeType[] = ["REGISTRATION", "TUITION"];

export type DegreeLevel = "VOCATIONAL" | "HND" | "BACHELOR" | "MASTER";
export const DEGREE_LEVELS: readonly DegreeLevel[] = ["VOCATIONAL", "HND", "BACHELOR", "MASTER"];

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY";
export const PAYMENT_METHODS: readonly PaymentMethod[] = ["CASH", "BANK_TRANSFER", "MOBILE_MONEY"];

export type PaymentStatus = "RECORDED" | "VOIDED";
export type FeeStatus = "UNPAID" | "PARTIAL" | "PAID" | "NOT_CONFIGURED";

export interface Payment {
  id: string;
  application_id: string | null;
  application_reference: string | null;
  student_record_id: string | null;
  student_id: string | null;
  student_name: string | null;
  fee_type: FeeType;
  amount: number;
  currency: string;
  paid_at: string;
  receipt_number: string;
  payment_method: PaymentMethod;
  recorded_by: string;
  notes: string | null;
  status: PaymentStatus;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  created_at: string;
}

export interface RecordPaymentInput {
  application_id?: string;
  student_record_id?: string;
  fee_type: FeeType;
  amount: number;
  paid_at?: string;
  receipt_number: string;
  payment_method?: PaymentMethod;
  notes?: string;
}

export interface PaymentFilters {
  application_id?: string;
  student_record_id?: string;
  fee_type?: FeeType | "";
  status?: PaymentStatus | "";
  paid_from?: string;
  paid_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface FeeBalance {
  fee_type: FeeType;
  fee_configured: boolean;
  amount_due: number | null;
  amount_paid: number;
  balance: number | null;
  overpaid: number;
  status: FeeStatus;
  payment_count: number;
  last_paid_at: string | null;
}

export interface FeeSummary {
  application_id: string | null;
  student_record_id: string | null;
  program_id: string | null;
  degree_level: string | null;
  currency: string;
  totals: FeeBalance[];
  grand_total_due: number | null;
  grand_total_paid: number;
  grand_balance: number | null;
  pay_on_campus: boolean;
}

export interface RegistrationFee {
  id: string;
  degree_level: DegreeLevel;
  amount: number;
  currency: string;
  effective_from: string;
  notes: string | null;
  set_by: string;
  is_active: boolean;
  deactivated_at: string | null;
  deactivated_by: string | null;
  created_at: string;
}

export interface TuitionFee {
  id: string;
  program_id: string | null;
  department_id: string | null;
  scope: "PROGRAM" | "DEPARTMENT";
  amount: number;
  currency: string;
  effective_from: string;
  notes: string | null;
  set_by: string;
  is_active: boolean;
  deactivated_at: string | null;
  deactivated_by: string | null;
  created_at: string;
}

export interface FeeSetInput {
  amount: number;
  effective_from?: string;
  notes?: string;
}

export interface TuitionFeeSetInput extends FeeSetInput {
  program_id?: string;
  department_id?: string;
}

export interface ResolvedFees {
  program_id: string;
  degree_level: string | null;
  registration_level: DegreeLevel | null;
  registration_fee: number | null;
  tuition_fee: number | null;
  tuition_source: "PROGRAM" | "DEPARTMENT" | null;
  currency: string;
}

/* ----------------------------------------------------------- error codes */

/** Backend finance error codes that the UI maps to bilingual messages (finance.errors.*). */
export const FINANCE_ERROR_CODES = [
  "PAYMENT_EXCEEDS_BALANCE",
  "RECEIPT_NUMBER_EXISTS",
  "PAYMENT_APPLICATION_NOT_ADMITTED",
  "FEE_NOT_CONFIGURED",
  "VOID_REASON_REQUIRED",
  "PAYMENT_ALREADY_VOIDED",
  "INVALID_DEGREE_LEVEL",
  "TUITION_SCOPE_REQUIRED",
  "FEE_ALREADY_INACTIVE",
] as const;
export type FinanceErrorCode = (typeof FINANCE_ERROR_CODES)[number];

export function isFinanceErrorCode(code: string): code is FinanceErrorCode {
  return (FINANCE_ERROR_CODES as readonly string[]).includes(code);
}

/** Returns the finance error code carried by an error, or null for any other failure. */
export function financeErrorCode(error: unknown): FinanceErrorCode | null {
  return error instanceof ApiError && isFinanceErrorCode(error.code) ? error.code : null;
}

export interface BalanceDetail {
  fee_type?: string;
  amount_due?: number;
  amount_paid?: number;
  balance?: number;
}

/** Extracts PAYMENT_EXCEEDS_BALANCE details (details[0]) when present. */
export function exceedsBalanceDetail(error: unknown): BalanceDetail | null {
  if (!(error instanceof ApiError) || error.code !== "PAYMENT_EXCEEDS_BALANCE") return null;
  const raw = error.body.details?.[0] as unknown as BalanceDetail | undefined;
  return raw && typeof raw === "object" ? raw : null;
}

/** Fee types missing for FEE_NOT_CONFIGURED (details[0].fee_types), if the backend sent them. */
export function missingFeeTypes(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.code !== "FEE_NOT_CONFIGURED") return [];
  const raw = error.body.details?.[0] as unknown as { fee_types?: unknown } | undefined;
  return Array.isArray(raw?.fee_types) ? raw.fee_types.filter((v): v is string => typeof v === "string") : [];
}

/* ------------------------------------------------------- pure helpers */

/** Whole XAF with a locale-aware thousands separator: "150,000 FCFA" (en) / "150 000 FCFA" (fr). */
export function formatXaf(amount: number, locale: Locale): string {
  const rounded = Math.round(amount);
  const negative = rounded < 0;
  const digits = String(Math.abs(rounded));
  const separator = locale === "fr" ? " " : ",";
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return `${negative ? "-" : ""}${grouped} FCFA`;
}

/** Parses an amount typed by staff ("150 000", "150,000", "150000") into whole XAF, or null if invalid. */
export function parseXafInput(raw: string): number | null {
  const cleaned = raw.replace(/[\s  ,.]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isSafeInteger(value) && value > 0 && value <= 1_000_000_000 ? value : null;
}

/** Remaining balance for a fee after a prospective payment; null when there is no configured due amount. */
export function balanceAfterPayment(balance: FeeBalance | undefined, amount: number | null): number | null {
  if (!balance || balance.balance === null || amount === null) return null;
  return balance.balance - amount;
}

export function isOverpayment(balance: FeeBalance | undefined, amount: number | null): boolean {
  const after = balanceAfterPayment(balance, amount);
  return after !== null && after < 0;
}

export function buildPaymentQuery(filters: PaymentFilters, perPage = 20): Record<string, string | number> {
  const query: Record<string, string | number> = { page: filters.page && filters.page > 0 ? filters.page : 1, per_page: perPage };
  for (const key of ["application_id", "student_record_id", "fee_type", "status", "paid_from", "paid_to"] as const) {
    const value = filters[key];
    if (value) query[key] = value;
  }
  const search = filters.search?.trim();
  if (search) query.search = search;
  return query;
}

/** Statuses that make fees payable and visible to an applicant. */
export function isFeeEligibleStatus(status: string): boolean {
  return status === "ADMITTED" || status === "ENROLLED";
}

/* -------------------------------------------------------------- requests */

function opts(token: string, locale: Locale) {
  return { token, locale, cache: "no-store" as const };
}

export function getMyFees(token: string, locale: Locale): Promise<FeeSummary> {
  return apiRequest<FeeSummary>("/finance/me/summary", opts(token, locale));
}

export function getFeeSummary(
  subject: { application_id?: string; student_record_id?: string },
  token: string,
  locale: Locale,
): Promise<FeeSummary> {
  return apiRequest<FeeSummary>("/finance/summary", { ...opts(token, locale), query: subject });
}

export function recordPayment(input: RecordPaymentInput, token: string, locale: Locale): Promise<Payment> {
  return apiRequest<Payment>("/finance/payments", { method: "POST", body: input, token, locale });
}

export function listPayments(filters: PaymentFilters, token: string, locale: Locale): Promise<Paginated<Payment>> {
  return apiList<Payment>("/finance/payments", { ...opts(token, locale), query: buildPaymentQuery(filters, filters.per_page ?? 20) });
}

export function voidPayment(id: string, reason: string, token: string, locale: Locale): Promise<Payment> {
  return apiRequest<Payment>(`/finance/payments/${id}/void`, { method: "POST", body: { reason }, token, locale });
}

export function listRegistrationFees(includeInactive: boolean, token: string, locale: Locale): Promise<RegistrationFee[]> {
  return apiRequest<RegistrationFee[]>("/finance/fee-schedule/registration-fees", {
    ...opts(token, locale), query: { include_inactive: includeInactive ? "true" : "false" },
  });
}

export function setRegistrationFee(level: DegreeLevel, input: FeeSetInput, token: string, locale: Locale): Promise<RegistrationFee> {
  return apiRequest<RegistrationFee>(`/finance/fee-schedule/registration-fees/${level}`, { method: "PUT", body: input, token, locale });
}

export function deactivateRegistrationFee(id: string, token: string, locale: Locale): Promise<RegistrationFee> {
  return apiRequest<RegistrationFee>(`/finance/fee-schedule/registration-fees/${id}/deactivate`, { method: "POST", token, locale });
}

export function listTuitionFees(includeInactive: boolean, token: string, locale: Locale): Promise<TuitionFee[]> {
  return apiRequest<TuitionFee[]>("/finance/fee-schedule/tuition-fees", {
    ...opts(token, locale), query: { include_inactive: includeInactive ? "true" : "false" },
  });
}

export function setTuitionFee(input: TuitionFeeSetInput, token: string, locale: Locale): Promise<TuitionFee> {
  return apiRequest<TuitionFee>("/finance/fee-schedule/tuition-fees", { method: "PUT", body: input, token, locale });
}

export function deactivateTuitionFee(id: string, token: string, locale: Locale): Promise<TuitionFee> {
  return apiRequest<TuitionFee>(`/finance/fee-schedule/tuition-fees/${id}/deactivate`, { method: "POST", token, locale });
}

export function resolveProgramFees(programId: string, token: string, locale: Locale): Promise<ResolvedFees> {
  return apiRequest<ResolvedFees>("/finance/fee-schedule/resolve", { ...opts(token, locale), query: { program_id: programId } });
}

/** Formats a date-only ("YYYY-MM-DD") or ISO timestamp value without timezone drift. */
export function formatFeeDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return "—";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CM" : "en-CM", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

/** Today as YYYY-MM-DD in UTC (the backend rejects future payment dates and defaults to UTC today). */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
