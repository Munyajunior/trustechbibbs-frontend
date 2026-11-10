"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Receipt, Search, ShieldCheck } from "lucide-react";

import { getApplicationsForReview, type ReviewApplicationListItem } from "@/lib/api/admissions";
import { ApiError } from "@/lib/api/client";
import {
  FEE_TYPES,
  PAYMENT_METHODS,
  balanceAfterPayment,
  exceedsBalanceDetail,
  financeErrorCode,
  formatFeeDate,
  formatXaf,
  getFeeSummary,
  isFeeEligibleStatus,
  isOverpayment,
  listPayments,
  parseXafInput,
  recordPayment,
  todayIso,
  voidPayment,
  type FeeSummary,
  type FeeType,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/api/finance";
import type { Locale, Paginated } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900";
const labelClass = "block text-xs font-semibold text-slate-700";
const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
const primaryButton = "inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

type Form = { fee_type: FeeType; amount: string; paid_at: string; receipt_number: string; payment_method: PaymentMethod; notes: string };
const initialForm = (): Form => ({ fee_type: "REGISTRATION", amount: "", paid_at: todayIso(), receipt_number: "", payment_method: "CASH", notes: "" });

export function StaffPayments({ locale }: { locale: Locale }) {
  const t = useTranslations("finance");
  const token = useAuthStore((state) => state.accessToken);
  const principal = useAuthStore((state) => state.user);
  const authorized = !!token && !!principal?.roles.some((role) => ["registrar", "admin", "super_admin"].includes(role));

  const [searchDraft, setSearchDraft] = useState("");
  const [matches, setMatches] = useState<ReviewApplicationListItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [subject, setSubject] = useState<ReviewApplicationListItem | null>(null);
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [form, setForm] = useState<Form>(initialForm);
  const [feeTypeFilter, setFeeTypeFilter] = useState<FeeType | "">("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");
  const [paidFrom, setPaidFrom] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [listSearchDraft, setListSearchDraft] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const [result, setResult] = useState<Paginated<Payment> | null>(null);
  const [voiding, setVoiding] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const subjectId = subject?.id ?? "";
  const queryKey = `${token ?? ""}:${locale}:${subjectId}:${feeTypeFilter}:${statusFilter}:${paidFrom}:${paidTo}:${listSearch}:${page}:${refresh}`;
  const loading = loadedKey !== queryKey;

  const describe = useCallback((caught: unknown, fallback: string): string => {
    const code = financeErrorCode(caught);
    if (code === "PAYMENT_EXCEEDS_BALANCE") {
      const detail = exceedsBalanceDetail(caught);
      return detail?.balance !== undefined ? t("errors.PAYMENT_EXCEEDS_BALANCE_WITH_BALANCE", { balance: formatXaf(detail.balance, locale) }) : t("errors.PAYMENT_EXCEEDS_BALANCE");
    }
    if (code) return t(`errors.${code}`);
    return caught instanceof ApiError ? caught.localizedMessage(locale) : fallback;
  }, [locale, t]);

  useEffect(() => {
    if (!authorized || !token) return;
    let current = true;
    listPayments({
      application_id: subjectId || undefined, fee_type: feeTypeFilter, status: statusFilter,
      paid_from: paidFrom || undefined, paid_to: paidTo || undefined, search: listSearch, page,
    }, token, locale)
      .then((data) => { if (!current) return; setResult(data); setListError(null); setLoadedKey(queryKey); })
      .catch((caught) => { if (!current) return; setListError(describe(caught, t("loadError"))); setLoadedKey(queryKey); });
    return () => { current = false; };
  }, [authorized, token, locale, subjectId, feeTypeFilter, statusFilter, paidFrom, paidTo, listSearch, page, refresh, queryKey, describe, t]);

  const loadSummary = useCallback(async (applicationId: string) => {
    if (!token) return;
    setSummaryLoading(true);
    try {
      setSummary(await getFeeSummary({ application_id: applicationId }, token, locale));
    } catch (caught) {
      setSummary(null);
      setError(describe(caught, t("loadError")));
    } finally {
      setSummaryLoading(false);
    }
  }, [token, locale, describe, t]);

  async function findApplications(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !searchDraft.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const data = await getApplicationsForReview(token, locale, { search: searchDraft.trim() });
      setMatches(data.items);
    } catch (caught) {
      setError(describe(caught, t("loadError")));
    } finally {
      setSearching(false);
    }
  }

  function chooseApplication(application: ReviewApplicationListItem) {
    setSubject(application);
    setMatches(null);
    setForm(initialForm());
    setMessage(null);
    setError(null);
    setPage(1);
    void loadSummary(application.id);
  }

  function clearSubject() {
    setSubject(null);
    setSummary(null);
    setPage(1);
  }

  const eligible = !!subject && isFeeEligibleStatus(subject.status);
  const parsedAmount = parseXafInput(form.amount);
  const selectedBalance = summary?.totals.find((entry) => entry.fee_type === form.fee_type);
  const after = balanceAfterPayment(selectedBalance, parsedAmount);
  const exceeds = isOverpayment(selectedBalance, parsedAmount);

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !subject || busy) return;
    if (parsedAmount === null) { setError(t("payments.invalidAmount")); setMessage(null); return; }
    if (exceeds) { setError(t("errors.PAYMENT_EXCEEDS_BALANCE_WITH_BALANCE", { balance: formatXaf(selectedBalance?.balance ?? 0, locale) })); setMessage(null); return; }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await recordPayment({
        application_id: subject.id, fee_type: form.fee_type, amount: parsedAmount,
        paid_at: form.paid_at || undefined, receipt_number: form.receipt_number.trim(),
        payment_method: form.payment_method, notes: form.notes.trim() || undefined,
      }, token, locale);
      setForm({ ...initialForm(), fee_type: form.fee_type });
      setMessage(t("payments.recorded"));
      setRefresh((value) => value + 1);
      await loadSummary(subject.id);
    } catch (caught) {
      setError(describe(caught, t("saveError")));
    } finally {
      setBusy(false);
    }
  }

  async function submitVoid(event: FormEvent<HTMLFormElement>, payment: Payment) {
    event.preventDefault();
    if (!token || busy) return;
    if (!voidReason.trim()) { setError(t("errors.VOID_REASON_REQUIRED")); setMessage(null); return; }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await voidPayment(payment.id, voidReason.trim(), token, locale);
      setVoiding(null);
      setVoidReason("");
      setMessage(t("payments.voided"));
      setRefresh((value) => value + 1);
      if (subject) await loadSummary(subject.id);
    } catch (caught) {
      setError(describe(caught, t("saveError")));
    } finally {
      setBusy(false);
    }
  }

  if (!authorized) return <section className="mx-auto max-w-lg px-4 py-16 text-center"><ShieldCheck className="mx-auto size-10 text-primary" aria-hidden="true" /><h1 className="mt-4 font-display text-2xl font-semibold">{t("accessTitle")}</h1><p className="mt-2 text-sm text-slate-600">{t("accessBody")}</p></section>;

  return <div className="px-4 py-8 sm:px-7 lg:px-9"><div className="mx-auto max-w-7xl space-y-7">
    <header>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#aa7c10]">{t("payments.eyebrow")}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-slate-950">{t("payments.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("payments.intro")}</p>
    </header>
    <div aria-live="polite">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
    </div>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
      <div className="min-w-0 space-y-6">
        <section aria-labelledby="payments-find-heading" className={cardClass}>
          <h2 id="payments-find-heading" className="font-display text-xl font-semibold text-slate-900">{t("payments.findTitle")}</h2>
          <form onSubmit={findApplications} className="mt-4 flex gap-2" role="search">
            <label className="relative min-w-0 flex-1"><span className="sr-only">{t("payments.findLabel")}</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder={t("payments.findPlaceholder")} className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm" /></label>
            <button type="submit" disabled={searching || !searchDraft.trim()} className={primaryButton}>{searching ? t("loading") : t("payments.find")}</button>
          </form>
          <div aria-live="polite">{matches && (matches.length === 0 ? <p className="mt-4 text-sm text-slate-600">{t("payments.noMatches")}</p> : <ul className="mt-4 divide-y divide-slate-100">{matches.map((application) => <li key={application.id} className="flex flex-wrap items-center gap-3 py-3"><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{application.reference_number}</span><span className="block truncate text-xs text-slate-500">{application.applicant_name ?? application.applicant_email ?? "—"} · {(locale === "fr" && application.program_name_fr) || application.program_name_en || "—"} · {application.status}</span></span><button type="button" onClick={() => chooseApplication(application)} className="text-sm font-semibold text-primary hover:underline">{t("payments.select")}<span className="sr-only"> {application.reference_number}</span></button></li>)}</ul>)}</div>
        </section>

        {subject && <section aria-labelledby="payments-summary-heading" className={cardClass}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="payments-summary-heading" className="font-display text-xl font-semibold text-slate-900">{t("payments.summaryTitle")}</h2><p className="mt-1 text-sm text-slate-600">{subject.reference_number} · {subject.applicant_name ?? subject.applicant_email ?? "—"} · {subject.status}</p></div><button type="button" onClick={clearSubject} className="text-sm font-semibold text-primary hover:underline">{t("payments.clear")}</button></div>
          {!eligible && <p role="note" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("errors.PAYMENT_APPLICATION_NOT_ADMITTED")}</p>}
          {summaryLoading ? <p role="status" className="mt-4 text-sm text-slate-600">{t("loading")}</p> : summary && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><caption className="sr-only">{t("payments.summaryTitle")}</caption><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="py-2 pr-3">{t("payments.feeType")}</th><th scope="col" className="py-2 pr-3 text-right">{t("mine.due")}</th><th scope="col" className="py-2 pr-3 text-right">{t("mine.paid")}</th><th scope="col" className="py-2 pr-3 text-right">{t("mine.balance")}</th><th scope="col" className="py-2">{t("payments.status")}</th></tr></thead><tbody className="divide-y divide-slate-100">{summary.totals.map((entry) => <tr key={entry.fee_type}><th scope="row" className="py-3 pr-3 font-semibold text-slate-900">{t(`feeTypes.${entry.fee_type}`)}</th><td className="py-3 pr-3 text-right tabular-nums">{entry.amount_due === null ? "—" : formatXaf(entry.amount_due, locale)}</td><td className="py-3 pr-3 text-right tabular-nums">{formatXaf(entry.amount_paid, locale)}</td><td className="py-3 pr-3 text-right tabular-nums">{entry.balance === null ? "—" : formatXaf(entry.balance, locale)}</td><td className="py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{t(`statuses.${entry.status}`)}</span></td></tr>)}</tbody></table>{summary.totals.some((entry) => !entry.fee_configured) && <p className="mt-3 text-xs text-amber-800">{t("payments.notConfiguredHint")}</p>}</div>}
        </section>}

        <section aria-labelledby="payments-list-heading" className={cardClass}>
          <div className="flex items-center gap-3"><Receipt className="size-5 text-primary" aria-hidden="true" /><h2 id="payments-list-heading" className="font-display text-xl font-semibold text-slate-900">{t("payments.listTitle")}</h2><span className="ml-auto text-sm text-slate-500">{loading ? "…" : result?.pagination.total ?? "—"}</span></div>
          {subject && <p className="mt-2 text-xs text-slate-600">{t("payments.scopedTo", { reference: subject.reference_number })}</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className={labelClass}>{t("payments.feeType")}<select value={feeTypeFilter} onChange={(event) => { setFeeTypeFilter(event.target.value as FeeType | ""); setPage(1); }} className={inputClass}><option value="">{t("payments.all")}</option>{FEE_TYPES.map((type) => <option key={type} value={type}>{t(`feeTypes.${type}`)}</option>)}</select></label>
            <label className={labelClass}>{t("payments.status")}<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as PaymentStatus | ""); setPage(1); }} className={inputClass}><option value="">{t("payments.all")}</option><option value="RECORDED">{t("paymentStatus.RECORDED")}</option><option value="VOIDED">{t("paymentStatus.VOIDED")}</option></select></label>
            <form onSubmit={(event) => { event.preventDefault(); setListSearch(listSearchDraft.trim()); setPage(1); }} className="sm:col-span-2 lg:col-span-1"><label className={labelClass}>{t("payments.receiptSearch")}<input value={listSearchDraft} onChange={(event) => setListSearchDraft(event.target.value)} className={inputClass} /></label></form>
            <label className={labelClass}>{t("payments.paidFrom")}<input type="date" value={paidFrom} onChange={(event) => { setPaidFrom(event.target.value); setPage(1); }} className={inputClass} /></label>
            <label className={labelClass}>{t("payments.paidTo")}<input type="date" value={paidTo} onChange={(event) => { setPaidTo(event.target.value); setPage(1); }} className={inputClass} /></label>
          </div>
          {listError && <p role="alert" className="mt-4 text-sm text-red-700">{listError}</p>}
          {loading ? <p role="status" className="mt-5 text-sm text-slate-600">{t("loading")}</p> : !result?.items.length ? <p className="mt-5 text-sm text-slate-600">{t("payments.empty")}</p> : <ul className="mt-5 divide-y divide-slate-100">{result.items.map((payment) => <li key={payment.id} className="py-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{formatXaf(payment.amount, locale)} · {t(`feeTypes.${payment.fee_type}`)}</p><p className="mt-1 text-xs text-slate-600">{t("payments.receipt")} {payment.receipt_number} · {formatFeeDate(payment.paid_at, locale)} · {t(`methods.${payment.payment_method}`)}</p><p className="mt-1 text-xs text-slate-500">{payment.application_reference ?? payment.student_id ?? "—"}{payment.student_name ? ` · ${payment.student_name}` : ""}</p>{payment.notes && <p className="mt-1 text-xs text-slate-600">{payment.notes}</p>}{payment.status === "VOIDED" && <p className="mt-1 text-xs text-red-700">{t("payments.voidReasonLabel")}: {payment.void_reason}</p>}</div>
              <span className={payment.status === "VOIDED" ? "rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800" : "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"}>{t(`paymentStatus.${payment.status}`)}</span>
              {payment.status === "RECORDED" && <button type="button" disabled={busy} onClick={() => { setVoiding(voiding === payment.id ? null : payment.id); setVoidReason(""); setError(null); }} aria-expanded={voiding === payment.id} className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">{t("payments.void")}<span className="sr-only"> {payment.receipt_number}</span></button>}
            </div>
            {voiding === payment.id && <form onSubmit={(event) => void submitVoid(event, payment)} className="mt-3 rounded-xl border border-red-100 bg-red-50/50 p-3"><label className={labelClass}>{t("payments.voidReason")}<textarea required autoFocus rows={2} maxLength={1000} value={voidReason} onChange={(event) => setVoidReason(event.target.value)} className={inputClass} /></label><div className="mt-2 flex gap-2"><button type="submit" disabled={busy || !voidReason.trim()} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{t("payments.confirmVoid")}</button><button type="button" onClick={() => setVoiding(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t("cancel")}</button></div></form>}
          </li>)}</ul>}
          {!loading && result && result.pagination.total_pages > 1 && <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 text-sm font-semibold text-primary disabled:opacity-40"><ChevronLeft className="size-4" aria-hidden="true" />{t("previous")}</button><span className="text-xs text-slate-600">{t("page", { page, total: result.pagination.total_pages })}</span><button type="button" onClick={() => setPage((value) => value + 1)} disabled={!result.pagination.has_next} className="inline-flex items-center gap-1 text-sm font-semibold text-primary disabled:opacity-40">{t("next")}<ChevronRight className="size-4" aria-hidden="true" /></button></div>}
        </section>
      </div>

      <section aria-labelledby="payments-record-heading" className={`${cardClass} h-fit`}>
        <h2 id="payments-record-heading" className="font-display text-xl font-semibold text-slate-900">{t("payments.recordTitle")}</h2>
        {!subject ? <p className="mt-3 text-sm text-slate-600">{t("payments.recordNeedsSubject")}</p> : <form onSubmit={submitPayment} className="mt-4 space-y-3">
          <p className="text-xs text-slate-600">{t("payments.recordFor", { reference: subject.reference_number })}</p>
          <fieldset disabled={!eligible || busy} className="space-y-3 disabled:opacity-60">
            <label className={labelClass}>{t("payments.feeType")}<select value={form.fee_type} onChange={(event) => setForm({ ...form, fee_type: event.target.value as FeeType })} className={inputClass}>{FEE_TYPES.map((type) => <option key={type} value={type}>{t(`feeTypes.${type}`)}</option>)}</select></label>
            <label className={labelClass}>{t("payments.amountXaf")}<input required inputMode="numeric" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} aria-describedby="payment-balance-preview" className={inputClass} /></label>
            <p id="payment-balance-preview" aria-live="polite" className={`text-xs ${exceeds ? "font-semibold text-red-700" : "text-slate-600"}`}>
              {selectedBalance === undefined ? "" : selectedBalance.balance === null ? t("payments.previewNotConfigured") : t("payments.previewBalance", { balance: formatXaf(selectedBalance.balance, locale) })}
              {after !== null && (exceeds ? ` · ${t("payments.previewExceeds")}` : ` · ${t("payments.previewAfter", { after: formatXaf(after, locale) })}`)}
            </p>
            <label className={labelClass}>{t("payments.paidOn")}<input type="date" required max={todayIso()} value={form.paid_at} onChange={(event) => setForm({ ...form, paid_at: event.target.value })} className={inputClass} /></label>
            <label className={labelClass}>{t("payments.receiptNumber")}<input required maxLength={64} value={form.receipt_number} onChange={(event) => setForm({ ...form, receipt_number: event.target.value })} className={inputClass} /></label>
            <label className={labelClass}>{t("payments.method")}<select value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value as PaymentMethod })} className={inputClass}>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{t(`methods.${method}`)}</option>)}</select></label>
            <label className={labelClass}>{t("payments.notes")}<textarea rows={2} maxLength={1000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={inputClass} /></label>
            <button type="submit" disabled={exceeds || !eligible} className={`${primaryButton} w-full`}>{busy ? t("loading") : t("payments.record")}</button>
          </fieldset>
        </form>}
      </section>
    </div>
  </div></div>;
}
