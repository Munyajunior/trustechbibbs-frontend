"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import {
  financeErrorCode,
  formatFeeDate,
  formatXaf,
  getMyFees,
  type FeeStatus,
  type FeeSummary,
} from "@/lib/api/finance";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

type State =
  | { kind: "loading" }
  | { kind: "ready"; summary: FeeSummary }
  | { kind: "not-configured" }
  | { kind: "not-admitted" }
  | { kind: "error"; message: string };

const statusTone: Record<FeeStatus, string> = {
  PAID: "bg-emerald-50 text-emerald-800",
  PARTIAL: "bg-amber-50 text-amber-800",
  UNPAID: "bg-slate-100 text-slate-700",
  NOT_CONFIGURED: "bg-slate-100 text-slate-700",
};

function useMyFees(locale: Locale, enabled: boolean): State {
  const t = useTranslations("finance");
  const token = useAuthStore((state) => state.accessToken);
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token || !enabled) return;
    let active = true;
    getMyFees(token, locale)
      .then((summary) => { if (active) setState({ kind: "ready", summary }); })
      .catch((caught) => {
        if (!active) return;
        const code = financeErrorCode(caught);
        if (code === "FEE_NOT_CONFIGURED") setState({ kind: "not-configured" });
        else if (code === "PAYMENT_APPLICATION_NOT_ADMITTED") setState({ kind: "not-admitted" });
        else setState({ kind: "error", message: caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError") });
      });
    return () => { active = false; };
  }, [token, enabled, locale, t]);

  return state;
}

function FeeRows({ summary, locale }: { summary: FeeSummary; locale: Locale }) {
  const t = useTranslations("finance");
  return <>
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[460px] text-left text-sm">
      <caption className="sr-only">{t("mine.tableCaption")}</caption>
      <thead className="text-xs uppercase tracking-wide text-gray-500"><tr><th scope="col" className="py-2 pr-3">{t("payments.feeType")}</th><th scope="col" className="py-2 pr-3 text-right">{t("mine.due")}</th><th scope="col" className="py-2 pr-3 text-right">{t("mine.paid")}</th><th scope="col" className="py-2 pr-3 text-right">{t("mine.balance")}</th><th scope="col" className="py-2">{t("payments.status")}</th></tr></thead>
      <tbody className="divide-y divide-gray-100">{summary.totals.map((entry) => <tr key={entry.fee_type}><th scope="row" className="py-3 pr-3 font-semibold text-gray-900">{t(`feeTypes.${entry.fee_type}`)}{entry.last_paid_at && <span className="block text-xs font-normal text-gray-500">{t("mine.lastPayment", { date: formatFeeDate(entry.last_paid_at, locale) })}</span>}</th><td className="py-3 pr-3 text-right tabular-nums">{entry.amount_due === null ? "—" : formatXaf(entry.amount_due, locale)}</td><td className="py-3 pr-3 text-right tabular-nums">{formatXaf(entry.amount_paid, locale)}</td><td className="py-3 pr-3 text-right tabular-nums font-semibold">{entry.balance === null ? "—" : formatXaf(entry.balance, locale)}</td><td className="py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[entry.status]}`}>{t(`statuses.${entry.status}`)}</span></td></tr>)}</tbody>
    </table></div>
    {summary.grand_total_due !== null && <p className="mt-4 text-sm font-semibold text-gray-900">{t("mine.totalBalance")}: <span className="tabular-nums">{formatXaf(summary.grand_balance ?? 0, locale)}</span></p>}
  </>;
}

function StateMessage({ state }: { state: State }) {
  const t = useTranslations("finance");
  if (state.kind === "loading") return <p role="status" className="mt-4 text-gray-600">{t("loading")}</p>;
  if (state.kind === "not-configured") return <p role="status" className="mt-4 rounded-md bg-primary-subtle p-4 text-sm text-primary">{t("errors.FEE_NOT_CONFIGURED")}</p>;
  if (state.kind === "not-admitted") return <p role="status" className="mt-4 rounded-md bg-primary-subtle p-4 text-sm text-primary">{t("errors.PAYMENT_APPLICATION_NOT_ADMITTED_APPLICANT")}</p>;
  if (state.kind === "error") return <p role="alert" className="mt-4 rounded-md bg-error-light p-4 text-sm text-error">{state.message}</p>;
  return null;
}

/** Full /student/fees page body (students and admitted applicants). */
export function MyFeesPanel({ locale }: { locale: Locale }) {
  const t = useTranslations("finance");
  const token = useAuthStore((state) => state.accessToken);
  const roles = useAuthStore((state) => state.user?.roles ?? []);
  const allowed = !!token && (roles.includes("student") || roles.includes("applicant"));
  const state = useMyFees(locale, allowed);

  if (!allowed) return <Container className="py-12"><section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm"><h1 className="font-display text-2xl font-semibold text-gray-900">{t("mine.accessTitle")}</h1><p className="mt-3 text-gray-600">{t("mine.accessBody")}</p><Link href="/login" className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-white">{t("mine.signIn")}</Link></section></Container>;

  return <Container className="py-10 sm:py-14"><div className="mx-auto max-w-3xl">
    <Link href={roles.includes("student") ? "/student" : "/admissions/status"} className="text-sm font-semibold text-primary underline underline-offset-2">{t("mine.back")}</Link>
    <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="my-fees-heading">
      <h1 id="my-fees-heading" className="font-display text-3xl font-semibold text-gray-900">{t("mine.title")}</h1>
      <p className="mt-3 leading-7 text-gray-600">{t("mine.intro")}</p>
      <div aria-live="polite"><StateMessage state={state} />{state.kind === "ready" && <FeeRows summary={state.summary} locale={locale} />}</div>
      <p className="mt-6 rounded-md bg-primary-subtle p-4 text-sm font-medium text-primary">{t("mine.payOnCampus")}</p>
    </section>
  </div></Container>;
}

/** Compact card for the application tracker; render only for ADMITTED/ENROLLED applications. */
export function MyFeesCard({ locale }: { locale: Locale }) {
  const t = useTranslations("finance");
  const state = useMyFees(locale, true);
  return <section aria-labelledby="tracker-fees-heading" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <h2 id="tracker-fees-heading" className="font-display text-lg font-semibold text-gray-900">{t("mine.cardTitle")}</h2>
    <div aria-live="polite"><StateMessage state={state} />
      {state.kind === "ready" && <ul className="mt-3 space-y-2 text-sm">{state.summary.totals.map((entry) => <li key={entry.fee_type} className="flex flex-wrap items-center justify-between gap-2"><span className="text-gray-700">{t(`feeTypes.${entry.fee_type}`)}</span><span className="tabular-nums text-gray-900">{entry.balance === null ? "—" : formatXaf(entry.balance, locale)} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone[entry.status]}`}>{t(`statuses.${entry.status}`)}</span></span></li>)}</ul>}
    </div>
    <p className="mt-3 text-xs text-gray-600">{t("mine.payOnCampus")}</p>
    <Link href="/student/fees" className="mt-3 inline-flex text-sm font-semibold text-primary underline underline-offset-2">{t("mine.viewDetails")}</Link>
  </section>;
}
