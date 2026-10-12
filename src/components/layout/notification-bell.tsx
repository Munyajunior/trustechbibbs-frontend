"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { getUnreadNotificationCount, listNotifications, type InAppNotification } from "@/lib/api/notifications";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

export function NotificationBell() {
  const t = useTranslations("notifications");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const token = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const [counter, setCounter] = useState<{ userId: string; count: number } | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [recent, setRecent] = useState<{ userId: string; locale: Locale; items: InAppNotification[] } | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const count = counter && counter.userId === userId ? counter.count : null;
  const items = recent && recent.userId === userId && recent.locale === locale ? recent.items : null;

  useEffect(() => {
    if (!token || !userId) return;
    let active = true;
    const refresh = () => {
      getUnreadNotificationCount(token, locale)
        .then((response) => { if (active) setCounter({ userId, count: response.count }); })
        .catch(() => { if (active) setCounter(null); });
      if (open) listNotifications(token, locale, 1, false, 5)
        .then((response) => { if (active) { setRecent({ userId, locale, items: response.items }); setPreviewError(false); } })
        .catch(() => { if (active) setPreviewError(true); });
    };
    refresh();
    window.addEventListener("trustech:notifications-updated", refresh);
    return () => { active = false; window.removeEventListener("trustech:notifications-updated", refresh); };
  }, [token, userId, locale, pathname, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!token) return null;
  return <div ref={rootRef} className="relative"><button type="button" onClick={() => setOpen((value) => !value)} aria-label={t("bellLabel", { count: count ?? 0 })} aria-expanded={open} aria-controls="recent-notifications" className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-primary transition-colors hover:bg-blue-50"><Bell className="size-[19px]" aria-hidden="true" />{count !== null && count > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-bold leading-5 text-slate-950" aria-hidden="true">{count > 99 ? "99+" : count}</span>}</button>{open && <div id="recent-notifications" className="absolute right-0 top-12 z-50 w-[min(90vw,360px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-semibold text-slate-900">{t("recent")}</h2><span className="text-xs font-semibold text-primary">{count ?? "—"}</span></div>{previewError ? <p role="status" className="px-4 py-5 text-sm text-slate-600">{t("loadError")}</p> : !items ? <p role="status" className="px-4 py-5 text-sm text-slate-600">{t("loading")}</p> : items.length === 0 ? <p className="px-4 py-5 text-sm text-slate-600">{t("empty")}</p> : <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">{items.map((item) => { const href = item.action_url && /^\/(student|admissions)(\/|$)/.test(item.action_url) ? item.action_url : "/notifications"; return <li key={item.id}><Link href={href} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-blue-50"><span className="flex items-start gap-2"><span className={item.read_at ? "mt-1.5 size-2 shrink-0 rounded-full bg-slate-200" : "mt-1.5 size-2 shrink-0 rounded-full bg-amber-400"} aria-hidden="true" /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{locale === "fr" ? item.title_fr : item.title_en}</span><span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-slate-600">{locale === "fr" ? item.body_fr : item.body_en}</span></span></span></Link></li>; })}</ul>}<Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-slate-50">{t("viewAll")}</Link></div>}</div>;
}
