"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { getAuditEvents, type AuditEvent } from "@/lib/api/audit";
import { ApiError } from "@/lib/api/client";
import type { Locale, Pagination } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const ACTIONS = [
  "application.draft_created",
  "application.draft_updated",
  "application.submitted",
  "application.status_changed",
  "student.enrolled",
  "student.profile_updated",
] as const;

export function StaffAuditView({ locale }: { locale: Locale }) {
  const t = useTranslations("staffAudit");
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const authorized = user?.roles.some((role) => role === "admin" || role === "super_admin");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [resourceType, setResourceType] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !authorized) return;
    let active = true;
    getAuditEvents(token, locale, {
      page,
      action: action || undefined,
      resource_type: resourceType || undefined,
    })
      .then((result) => {
        if (active) { setEvents(result.items); setPagination(result.pagination); setError(null); }
      })
      .catch((caught) => {
        if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("unavailable"));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, authorized, locale, page, resourceType, action, t]);

  function applyFilter(kind: "resource" | "action", value: string) {
    if (kind === "resource") setResourceType(value);
    else setAction(value);
    setPage(1);
    setLoading(true);
  }

  if (!user || !token || !authorized) return <section className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center"><h1 className="font-display text-2xl font-semibold">{t("accessTitle")}</h1><p className="mt-3 text-gray-600">{t("accessBody")}</p></section>;

  return <section className="space-y-6">
    <div><p className="text-sm font-semibold uppercase tracking-widest text-accent-dark">{t("eyebrow")}</p><h1 className="mt-2 font-display text-3xl font-semibold text-gray-900">{t("title")}</h1><p className="mt-2 max-w-2xl text-gray-600">{t("subtitle")}</p><Link href="/staff/admissions" className="mt-3 inline-block text-sm font-semibold text-primary underline">{t("admissionsLink")}</Link></div>
    <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
      <div><Label htmlFor="audit-resource">{t("resourceFilter")}</Label><select id="audit-resource" className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={resourceType} onChange={(event) => applyFilter("resource", event.target.value)}><option value="">{t("allResources")}</option><option value="application">{t("resources.application")}</option><option value="student_record">{t("resources.student_record")}</option></select></div>
      <div><Label htmlFor="audit-action">{t("actionFilter")}</Label><select id="audit-action" className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={action} onChange={(event) => applyFilter("action", event.target.value)}><option value="">{t("allActions")}</option>{ACTIONS.map((item) => <option key={item} value={item}>{t(`actions.${item}`)}</option>)}</select></div>
    </div>
    {error && <p role="alert" className="rounded-md bg-error-light px-4 py-3 text-sm text-error">{error}</p>}
    {loading ? <p className="text-gray-600">{t("loading")}</p> : events.length === 0 ? <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">{t("empty")}</p> : <ol className="space-y-3">{events.map((event) => <li key={event.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-gray-900">{ACTIONS.includes(event.action as typeof ACTIONS[number]) ? t(`actions.${event.action}`) : event.action}</p><p className="mt-1 text-sm text-gray-600">{event.resource_type === "application" || event.resource_type === "student_record" ? t(`resources.${event.resource_type}`) : event.resource_type} · <span className="font-mono break-all">{event.resource_id}</span></p></div><time className="text-sm text-gray-600" dateTime={event.occurred_at}>{new Intl.DateTimeFormat(locale === "fr" ? "fr-CM" : "en-CM", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.occurred_at))}</time></div><p className="mt-3 text-xs text-gray-500">{t("actor")}: <span className="font-mono">{event.actor_id ?? t("system")}</span></p>{Object.keys(event.details).length > 0 && <dl className="mt-4 flex flex-wrap gap-2 text-xs">{Object.entries(event.details).map(([key, value]) => <div key={key} className="rounded-md bg-gray-50 px-3 py-2"><dt className="font-semibold text-gray-600">{key.replaceAll("_", " ")}</dt><dd className="mt-1 max-w-xs break-all text-gray-900">{Array.isArray(value) ? value.join(", ") : String(value)}</dd></div>)}</dl>}</li>)}</ol>}
    {pagination && pagination.total_pages > 1 && <nav aria-label={t("pages")} className="flex items-center justify-between gap-4"><Button variant="outline" disabled={!pagination.has_previous || loading} onClick={() => { setPage(page - 1); setLoading(true); }}>{t("previous")}</Button><span className="text-sm text-gray-600">{t("page", { page: pagination.page, total: pagination.total_pages })}</span><Button variant="outline" disabled={!pagination.has_next || loading} onClick={() => { setPage(page + 1); setLoading(true); }}>{t("next")}</Button></nav>}
  </section>;
}
