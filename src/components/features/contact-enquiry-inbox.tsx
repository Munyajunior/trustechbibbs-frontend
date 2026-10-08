"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import { getEnquiryAttachment, listEnquiries, updateEnquiryStatus, type ContactEnquiry, type EnquiryStatus } from "@/lib/api/enquiries";
import type { Locale, Pagination } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const statuses: EnquiryStatus[] = ["NEW", "IN_PROGRESS", "RESOLVED"];

export function ContactEnquiryInbox({ locale }: { locale: Locale }) {
  const t = useTranslations("enquiryInbox");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const allowed = user?.roles.some((role) => ["registrar", "admin", "super_admin"].includes(role));
  const [items, setItems] = useState<ContactEnquiry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [filter, setFilter] = useState<EnquiryStatus | "ALL">("ALL");
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !allowed) return;
    let active = true;
    listEnquiries(token, locale, page, filter === "ALL" ? undefined : filter)
      .then((result) => {
        if (active) { setItems(result.items); setPagination(result.pagination); }
      })
      .catch((caught) => {
        if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("unavailable"));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, allowed, locale, page, filter, refresh, t]);

  async function changeStatus(item: ContactEnquiry, status: EnquiryStatus) {
    if (!token || item.status === status) return;
    setSaving(item.id);
    setError(null);
    try {
      const updated = await updateEnquiryStatus(item.id, status, token, locale);
      setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry));
      if (filter !== "ALL" && filter !== status) {
        setLoading(true);
        setRefresh((current) => current + 1);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("unavailable"));
    } finally { setSaving(null); }
  }

  async function downloadAttachment(item: ContactEnquiry) {
    if (!token || !item.attachment_filename) return;
    setDownloading(item.id);
    setError(null);
    try {
      const blob = await getEnquiryAttachment(item.id, token, locale);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = item.attachment_filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("attachmentUnavailable"));
    } finally { setDownloading(null); }
  }

  if (!user || !token || !allowed) return <section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center"><h1 className="font-display text-2xl font-semibold">{t("accessTitle")}</h1><p className="mt-3 text-gray-600">{t("accessBody")}</p></section>;

  return <section className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p><h1 className="mt-2 font-display text-3xl font-semibold text-gray-900">{t("title")}</h1><p className="mt-2 text-gray-600">{t("subtitle")}</p></div>
      <Link href="/staff/admissions" className="text-sm font-semibold text-primary underline">{t("admissionsLink")}</Link>
    </header>
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("filterLabel")}>{(["ALL", ...statuses] as const).map((status) => <button key={status} type="button" aria-pressed={filter === status} onClick={() => { setLoading(true); setError(null); setPage(1); setSelected(null); setFilter(status); }} className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${filter === status ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-gray-700 hover:border-primary"}`}>{t(`statuses.${status}`)}</button>)}</div>
    {error && <p role="alert" className="rounded-md bg-error-light px-4 py-3 text-sm text-error">{error}</p>}
    {loading ? <p className="text-gray-600">{t("loading")}</p> : items.length === 0 ? <p className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">{t("empty")}</p> : <div className="grid gap-4">{items.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div className="min-w-0"><p className="text-sm font-semibold text-primary">{item.id} · {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(item.created_at))}</p><h2 className="mt-1 font-display text-xl font-semibold text-gray-900">{item.subject}</h2><p className="mt-1 text-sm text-gray-600">{item.full_name}{item.department ? ` · ${item.department}` : ""}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-primary-subtle px-3 py-1 text-sm font-semibold text-primary">{t(`statuses.${item.status}`)}</span><Button variant="outline" aria-expanded={selected === item.id} aria-controls={`enquiry-${item.id}`} onClick={() => setSelected(selected === item.id ? null : item.id)}>{selected === item.id ? t("hide") : t("view")}</Button></div></div>
      {selected === item.id && <div id={`enquiry-${item.id}`} className="space-y-5 border-t border-gray-200 bg-gray-50 p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-sm font-semibold text-gray-600">{t("email")}</p><a className="break-all font-medium text-primary underline" href={`mailto:${item.email}`}>{item.email}</a></div><div><p className="text-sm font-semibold text-gray-600">{t("phone")}</p>{item.phone ? <a className="font-medium text-primary underline" href={`tel:${item.phone}`}>{item.phone}</a> : <p>—</p>}</div></div><div className="rounded-xl bg-white p-5"><p className="text-sm font-semibold text-gray-600">{t("message")}</p><p className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-gray-800">{item.message}</p></div>{item.attachment_filename && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-5"><div><p className="text-sm font-semibold text-gray-600">{t("attachment")}</p><p className="break-all font-medium text-gray-900">{item.attachment_filename}{item.attachment_size_bytes ? ` · ${Math.ceil(item.attachment_size_bytes / 1024)} KB` : ""}</p></div><Button variant="outline" size="sm" disabled={downloading === item.id} onClick={() => void downloadAttachment(item)}>{downloading === item.id ? t("downloading") : t("download")}</Button></div>}<div><p className="mb-2 text-sm font-semibold text-gray-700">{t("updateStatus")}</p><div className="flex flex-wrap gap-2">{statuses.map((status) => <Button key={status} size="sm" variant={item.status === status ? "secondary" : "outline"} disabled={saving === item.id || item.status === status} onClick={() => void changeStatus(item, status)}>{t(`statuses.${status}`)}</Button>)}</div></div></div>}
    </article>)}</div>}
    {pagination && pagination.total_pages > 1 && <nav aria-label={t("pages")} className="flex items-center justify-between gap-4"><Button variant="outline" disabled={!pagination.has_previous || loading} onClick={() => { setLoading(true); setError(null); setSelected(null); setPage((current) => current - 1); }}>{t("previous")}</Button><span className="text-sm text-gray-600">{t("page", { page, total: pagination.total_pages })}</span><Button variant="outline" disabled={!pagination.has_next || loading} onClick={() => { setLoading(true); setError(null); setSelected(null); setPage((current) => current + 1); }}>{t("next")}</Button></nav>}
  </section>;
}
