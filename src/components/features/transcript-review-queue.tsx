"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { listStaffTranscriptRequests, reviewTranscriptRequest, type TranscriptRequest, type TranscriptRequestStatus } from "@/lib/api/transcripts";
import type { Locale, Pagination } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const filters = ["REQUESTED", "IN_REVIEW", "APPROVED", "REJECTED", "CANCELLED"] as const;

export function TranscriptReviewQueue({ locale }: { locale: Locale }) {
  const t = useTranslations("transcriptReview");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const authorized = !!user?.roles.some((role) => ["registrar", "admin", "super_admin"].includes(role));
  const [filter, setFilter] = useState<TranscriptRequestStatus>("REQUESTED");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TranscriptRequest[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!token || !authorized) return;
    let active = true;
    listStaffTranscriptRequests(token, locale, page, filter)
      .then((result) => { if (active) { setRows(result.items); setPagination(result.pagination); } })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, authorized, locale, page, filter, revision, t]);

  async function review(event: FormEvent<HTMLFormElement>, row: TranscriptRequest) {
    event.preventDefault();
    if (!token) return;
    const values = new FormData(event.currentTarget);
    const status = String(values.get("status")) as "IN_REVIEW" | "APPROVED" | "REJECTED";
    const note = String(values.get("decision_note") ?? "").trim() || null;
    setBusyId(row.id); setError(null); setNotice(null);
    try {
      await reviewTranscriptRequest(row.id, status, note, token, locale);
      setNotice(t("saved"));
      setLoading(true);
      setRevision((current) => current + 1);
    } catch (caught) { setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError")); }
    finally { setBusyId(null); }
  }

  if (!token || !authorized) return <div className="mx-auto max-w-xl p-10 text-center"><h1 className="font-display text-2xl font-semibold">{t("accessTitle")}</h1><p className="mt-3 text-slate-600">{t("accessBody")}</p></div>;

  return <div className="px-4 py-9 sm:px-7 lg:px-9"><div className="mx-auto max-w-6xl space-y-6"><header><p className="text-xs font-bold uppercase tracking-[.18em] text-[#aa7c00]">{t("eyebrow")}</p><h1 className="mt-2 font-display text-3xl font-semibold text-slate-900">{t("title")}</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">{t("intro")}</p></header>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{t("approvalNote")}</div>
    {error && <p role="alert" className="rounded-lg bg-error-light p-4 text-sm text-error">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-primary-subtle p-4 text-sm text-primary">{notice}</p>}
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("filterLabel")}>{filters.map((status) => <button key={status} type="button" onClick={() => { setLoading(true); setFilter(status); setPage(1); setError(null); }} className={filter === status ? "rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white" : "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-primary"}>{t(`statuses.${status}`)}</button>)}</div>
    {loading ? <p className="text-sm text-slate-600">{t("loading")}</p> : rows.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">{t("empty")}</p> : <div className="space-y-4">{rows.map((row) => <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-primary">{row.reference_number}</p><h2 className="mt-1 font-display text-lg font-semibold">{row.student_name}</h2><p className="text-sm text-slate-600">{row.student_id} · {t(`types.${row.transcript_type}`)} · {t("copies", { count: row.quantity })}</p><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.created_at))} · {t(`methods.${row.delivery_method}`)}</p></div><span className="h-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">{t(`statuses.${row.status}`)}</span></div>{row.notes && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{row.notes}</p>}{row.decision_note && <p className="mt-3 text-sm text-slate-600">{t("decision")}: {row.decision_note}</p>}{["REQUESTED", "IN_REVIEW"].includes(row.status) && <form onSubmit={(event) => void review(event, row)} className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-[12rem_1fr_auto] sm:items-end"><div><Label htmlFor={`status-${row.id}`}>{t("action")}</Label><select id={`status-${row.id}`} name="status" defaultValue={row.status === "REQUESTED" ? "IN_REVIEW" : "APPROVED"} className="h-11 w-full rounded-md border border-slate-300 bg-white px-3"><option value={row.status === "REQUESTED" ? "IN_REVIEW" : "APPROVED"}>{t(`statuses.${row.status === "REQUESTED" ? "IN_REVIEW" : "APPROVED"}`)}</option><option value="REJECTED">{t("statuses.REJECTED")}</option></select></div><div><Label htmlFor={`note-${row.id}`}>{t("decisionNote")}</Label><Input id={`note-${row.id}`} name="decision_note" maxLength={2000} placeholder={t("reasonHint")} /></div><Button type="submit" disabled={busyId === row.id}>{busyId === row.id ? t("saving") : t("save")}</Button></form>}</article>)}</div>}
    {pagination && pagination.total_pages > 1 && <div className="flex items-center justify-between"><Button type="button" variant="outline" disabled={!pagination.has_previous || loading} onClick={() => { setLoading(true); setPage((current) => current - 1); }}>{t("previous")}</Button><p className="text-sm text-slate-600">{t("page", { page: pagination.page, pages: pagination.total_pages })}</p><Button type="button" variant="outline" disabled={!pagination.has_next || loading} onClick={() => { setLoading(true); setPage((current) => current + 1); }}>{t("next")}</Button></div>}
  </div></div>;
}
