"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, Check, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { NotificationPreferences } from "@/components/features/notification-preferences";
import { ApiError } from "@/lib/api/client";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  type InAppNotification,
} from "@/lib/api/notifications";
import type { Locale, Paginated } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

function safeActionUrl(url: string | null): string | null {
  return url && /^\/(student|admissions)(\/|$)/.test(url) ? url : null;
}

export function NotificationCentre({ locale }: { locale: Locale }) {
  const t = useTranslations("notifications");
  const token = useAuthStore((state) => state.accessToken);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const [result, setResult] = useState<Paginated<InAppNotification> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const queryKey = `${token ?? ""}:${locale}:${page}:${unreadOnly}:${refresh}`;
  const loading = loadedKey !== queryKey;

  useEffect(() => {
    if (!token) return;
    let active = true;
    listNotifications(token, locale, page, unreadOnly)
      .then((data) => {
        if (!active) return;
        setResult(data);
        setError(null);
        setLoadedKey(queryKey);
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError"));
        setLoadedKey(queryKey);
      });
    return () => { active = false; };
  }, [token, locale, page, unreadOnly, refresh, queryKey, t]);

  async function markOne(id: string) {
    if (!token || busy) return;
    setBusy(id);
    try {
      await markNotificationRead(id, token, locale);
      window.dispatchEvent(new Event("trustech:notifications-updated"));
      setRefresh((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("updateError"));
    } finally {
      setBusy(null);
    }
  }

  async function markUnread(id: string) {
    if (!token || busy) return;
    setBusy(id);
    try {
      await markNotificationUnread(id, token, locale);
      window.dispatchEvent(new Event("trustech:notifications-updated"));
      setRefresh((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("updateError"));
    } finally {
      setBusy(null);
    }
  }

  async function markAll() {
    if (!token || busy) return;
    setBusy("all");
    try {
      await markAllNotificationsRead(token, locale);
      window.dispatchEvent(new Event("trustech:notifications-updated"));
      setRefresh((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("updateError"));
    } finally {
      setBusy(null);
    }
  }

  if (!token) return <div className="mx-auto max-w-3xl px-4 py-16"><div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><Bell className="mx-auto size-9 text-primary" aria-hidden="true" /><h1 className="mt-4 font-display text-2xl font-semibold">{t("signInTitle")}</h1><p className="mt-2 text-sm text-slate-600">{t("signInBody")}</p><Link href="/login" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">{t("signIn")}</Link></div></div>;

  return <main className="min-h-[70vh] bg-[#f5f7fc] px-4 py-10 sm:px-7"><div className="mx-auto max-w-4xl"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#a77a0d]">{t("eyebrow")}</p><h1 className="mt-2 font-display text-3xl font-semibold text-slate-950 sm:text-4xl">{t("title")}</h1><p className="mt-2 text-sm text-slate-600">{t("intro")}</p></div><button type="button" onClick={markAll} disabled={busy !== null || loading || !result || result.pagination.total === 0} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"><CheckCheck className="size-4" aria-hidden="true" />{t("markAllRead")}</button></header><div className="mt-7 flex gap-2 border-b border-slate-200 pb-3"><button type="button" onClick={() => { setUnreadOnly(false); setPage(1); }} aria-pressed={!unreadOnly} className={!unreadOnly ? "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" : "rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white"}>{t("all")}</button><button type="button" onClick={() => { setUnreadOnly(true); setPage(1); }} aria-pressed={unreadOnly} className={unreadOnly ? "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" : "rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white"}>{t("unread")}</button></div>{error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}{loading ? <p role="status" className="mt-8 text-sm text-slate-600">{t("loading")}</p> : !result?.items.length ? <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center"><Bell className="mx-auto size-8 text-slate-400" aria-hidden="true" /><p className="mt-3 text-sm text-slate-600">{t(unreadOnly ? "noUnread" : "empty")}</p></div> : <ul className="mt-6 space-y-3">{result.items.map((item) => { const href = safeActionUrl(item.action_url); return <li key={item.id} className={item.read_at ? "rounded-2xl border border-slate-200 bg-white p-5" : "rounded-2xl border border-blue-200 bg-white p-5 shadow-sm shadow-blue-100"}><div className="flex items-start gap-4"><span className={item.read_at ? "mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500" : "mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-primary"}><Bell className="size-5" aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-semibold text-slate-900">{locale === "fr" ? item.title_fr : item.title_en}</h2><time dateTime={item.created_at} className="text-xs text-slate-500">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</time></div><p className="mt-1 text-sm leading-6 text-slate-600">{locale === "fr" ? item.body_fr : item.body_en}</p><div className="mt-3 flex flex-wrap items-center gap-4">{href && <Link href={href} className="text-sm font-semibold text-primary hover:underline">{t("viewDetails")} →</Link>}{!item.read_at && <button type="button" onClick={() => void markOne(item.id)} disabled={busy !== null} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-primary disabled:opacity-50"><Check className="size-4" aria-hidden="true" />{t("markRead")}</button>}{item.read_at && <button type="button" onClick={() => void markUnread(item.id)} disabled={busy !== null} className="text-sm font-semibold text-slate-500 hover:text-primary disabled:opacity-50">{t("markUnread")}</button>}</div></div></div></li>; })}</ul>}{!loading && result && result.pagination.total_pages > 1 && <div className="mt-7 flex items-center justify-between"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"><ChevronLeft className="size-4" />{t("previous")}</button><span className="text-sm text-slate-600">{t("page", { page, total: result.pagination.total_pages })}</span><button type="button" onClick={() => setPage((value) => value + 1)} disabled={!result.pagination.has_next} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50">{t("next")}<ChevronRight className="size-4" /></button></div>}<NotificationPreferences locale={locale} /></div></main>;
}
