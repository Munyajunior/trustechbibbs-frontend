"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Mail, MessageSquareText, MonitorSmartphone, Settings2 } from "lucide-react";

import { ApiError } from "@/lib/api/client";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreference,
  type NotificationType,
} from "@/lib/api/notifications";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const types: NotificationType[] = [
  "application_status", "enrollment", "course_registration", "results", "transcript",
];
const channels = [
  { key: "email_enabled", icon: Mail },
  { key: "sms_enabled", icon: MessageSquareText },
  { key: "in_app_enabled", icon: MonitorSmartphone },
] as const;

export function NotificationPreferences({ locale }: { locale: Locale }) {
  const t = useTranslations("notifications.preferences");
  const token = useAuthStore((state) => state.accessToken);
  const [items, setItems] = useState<NotificationPreference[] | null>(null);
  const [loadedToken, setLoadedToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const loading = loadedToken !== token;

  useEffect(() => {
    if (!token) return;
    let active = true;
    getNotificationPreferences(token, locale)
      .then((response) => {
        if (!active) return;
        setItems(response.preferences);
        setLoadedToken(token);
      })
      .catch((caught) => {
        if (!active) return;
        setMessage(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError"));
        setLoadedToken(token);
      });
    return () => { active = false; };
  }, [token, locale, t]);

  function toggle(kind: NotificationType, channel: typeof channels[number]["key"]) {
    setItems((current) => current?.map((item) => item.notification_type === kind
      ? { ...item, [channel]: !item[channel] }
      : item) ?? null);
    setMessage(null);
  }

  async function save() {
    if (!token || !items || saving) return;
    setSaving(true);
    try {
      const response = await updateNotificationPreferences(items, token, locale);
      setItems(response.preferences);
      setMessage(t("saved"));
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return <section aria-labelledby="notification-preferences-title" className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary"><Settings2 className="size-5" aria-hidden="true" /></span><div><h2 id="notification-preferences-title" className="font-display text-xl font-semibold text-slate-900">{t("title")}</h2><p className="mt-1 text-sm text-slate-600">{t("intro")}</p></div></div>{loading ? <p role="status" className="mt-6 text-sm text-slate-600">{t("loading")}</p> : items && <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[540px] border-collapse text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><th scope="col" className="pb-3 pr-3">{t("type")}</th>{channels.map(({ key, icon: Icon }) => <th key={key} scope="col" className="px-2 pb-3 text-center"><span className="inline-flex items-center gap-1"><Icon className="size-4" aria-hidden="true" />{t(`channels.${key}`)}</span></th>)}</tr></thead><tbody>{types.map((kind) => { const item = items.find((entry) => entry.notification_type === kind); if (!item) return null; return <tr key={kind} className="border-b border-slate-100 last:border-0"><th scope="row" className="py-3 pr-3 text-left font-medium text-slate-800">{t(`types.${kind}`)}</th>{channels.map(({ key }) => <td key={key} className="px-2 py-3 text-center"><input type="checkbox" checked={item[key]} onChange={() => toggle(kind, key)} aria-label={`${t(`types.${kind}`)}: ${t(`channels.${key}`)}`} className="size-4 accent-[#0b2b80]" /></td>)}</tr>; })}</tbody></table><p className="mt-3 text-xs leading-5 text-slate-500">{t("note")}</p><button type="button" onClick={() => void save()} disabled={saving} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? t("saving") : t("save")}</button></div>}{message && <p role="status" className="mt-4 text-sm text-slate-700">{message}</p>}</section>;
}
