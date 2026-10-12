"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import {
  cancelTranscriptRequest, createTranscriptRequest, listMyTranscriptRequests,
  type TranscriptRequest,
} from "@/lib/api/transcripts";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

export function TranscriptRequestPanel({ locale, hasResults }: { locale: Locale; hasResults: boolean }) {
  const t = useTranslations("student.transcripts");
  const token = useAuthStore((state) => state.accessToken);
  const [rows, setRows] = useState<TranscriptRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pending = rows.some((row) => row.status === "REQUESTED" || row.status === "IN_REVIEW");

  useEffect(() => {
    if (!token) return;
    let active = true;
    listMyTranscriptRequests(token, locale)
      .then((data) => { if (active) setRows(data); })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, locale, t]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true); setError(null); setNotice(null);
    try {
      const row = await createTranscriptRequest({
        transcript_type: String(values.get("transcript_type")) as TranscriptRequest["transcript_type"],
        quantity: Number(values.get("quantity")),
        delivery_method: String(values.get("delivery_method")) as TranscriptRequest["delivery_method"],
        notes: String(values.get("notes") ?? "").trim() || null,
      }, token, locale);
      setRows((current) => [row, ...current]);
      form.reset();
      setNotice(t("requested", { reference: row.reference_number }));
    } catch (caught) { setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError")); }
    finally { setBusy(false); }
  }

  async function cancel(id: string) {
    if (!token || busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const row = await cancelTranscriptRequest(id, token, locale);
      setRows((current) => current.map((item) => item.id === id ? row : item));
      setNotice(t("cancelled"));
    } catch (caught) { setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError")); }
    finally { setBusy(false); }
  }

  return <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 print:hidden">
    <p className="text-xs font-bold uppercase tracking-[.17em] text-[#aa7c00]">{t("eyebrow")}</p>
    <h2 className="mt-2 font-display text-2xl font-semibold text-slate-900">{t("title")}</h2>
    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{t("intro")}</p>
    {error && <p role="alert" className="mt-4 rounded-lg bg-error-light p-3 text-sm text-error">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-lg bg-primary-subtle p-3 text-sm text-primary">{notice}</p>}
    {loading ? <p className="mt-5 text-sm text-slate-500">{t("loading")}</p> : <>
      {rows.length > 0 && <div className="mt-6"><h3 className="font-semibold">{t("history")}</h3><ul className="mt-3 divide-y divide-slate-100">{rows.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">{row.reference_number} · {t(`types.${row.transcript_type}`)}</p><p className="text-slate-600">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(row.created_at))} · {t(`statuses.${row.status}`)}</p>{row.decision_note && <p className="mt-1 text-slate-600">{row.decision_note}</p>}</div>{["REQUESTED", "IN_REVIEW"].includes(row.status) && <Button type="button" variant="outline" disabled={busy} onClick={() => void cancel(row.id)}>{t("cancel")}</Button>}</li>)}</ul></div>}
      {hasResults && !pending ? <form onSubmit={(event) => void submit(event)} className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2"><div><Label htmlFor="transcript-type">{t("type")}</Label><select id="transcript-type" name="transcript_type" className="h-11 w-full rounded-md border border-slate-300 bg-white px-3"><option value="OFFICIAL">{t("types.OFFICIAL")}</option><option value="STUDENT_COPY">{t("types.STUDENT_COPY")}</option></select></div><div><Label htmlFor="transcript-quantity">{t("quantity")}</Label><Input id="transcript-quantity" name="quantity" type="number" min={1} max={5} defaultValue={1} required /></div><div><Label htmlFor="transcript-delivery">{t("delivery")}</Label><select id="transcript-delivery" name="delivery_method" className="h-11 w-full rounded-md border border-slate-300 bg-white px-3"><option value="PICKUP">{t("methods.PICKUP")}</option><option value="EMAIL">{t("methods.EMAIL")}</option></select></div><div><Label htmlFor="transcript-notes">{t("notes")}</Label><Input id="transcript-notes" name="notes" maxLength={1000} placeholder={t("notesPlaceholder")} /></div><div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? t("submitting") : t("request")}</Button><p className="mt-3 text-xs text-slate-600">{t("reviewNote")}</p></div></form> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{!hasResults ? t("noResults") : t("pending")}</p>}
    </>}
  </section>;
}
