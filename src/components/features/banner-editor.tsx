"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import { createBanner, listStaffBanners, setBannerPublication, updateBanner, type BannerInput } from "@/lib/api/banners";
import { uploadCmsCover } from "@/lib/api/media";
import type { HomeBanner, Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const optional = (data: FormData, key: string) => text(data, key) || null;

function dateTimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function dateTimeValue(data: FormData, key: string) {
  const value = text(data, key);
  return value ? new Date(value).toISOString() : null;
}

export function BannerEditor({ locale }: { locale: Locale }) {
  const t = useTranslations("bannerEditor");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const allowed = !!token && !!user?.roles.some((role) => ["editor", "admin", "super_admin"].includes(role));
  const [records, setRecords] = useState<HomeBanner[]>([]);
  const [selected, setSelected] = useState<HomeBanner | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed || !token) return;
    let active = true;
    listStaffBanners(token, locale).then((items) => { if (active) setRecords(items); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, token, locale, t]);

  function select(record: HomeBanner | null) {
    setSelected(record); setFormKey((value) => value + 1); setDirty(false); setError(null); setNotice(null);
  }

  function reflect(record: HomeBanner) {
    setSelected(record);
    setRecords((current) => current.some((item) => item.id === record.id)
      ? current.map((item) => item.id === record.id ? record : item)
      : [...current, record]);
    setFormKey((value) => value + 1);
    setDirty(false);
  }

  function showError(caught: unknown) {
    setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(null); setNotice(null);
    try {
      const file = data.get("image_file");
      const image_url = file instanceof File && file.size > 0
        ? await uploadCmsCover(file, token, locale)
        : text(data, "image_url");
      const payload: BannerInput = {
        title_en: text(data, "title_en"), title_fr: optional(data, "title_fr"),
        subtitle_en: text(data, "subtitle_en"), subtitle_fr: optional(data, "subtitle_fr"),
        image_url, image_alt_en: text(data, "image_alt_en"), image_alt_fr: optional(data, "image_alt_fr"),
        cta_label_en: text(data, "cta_label_en"), cta_label_fr: optional(data, "cta_label_fr"),
        cta_href: text(data, "cta_href"), sort_order: Number(text(data, "sort_order")),
        starts_at: dateTimeValue(data, "starts_at"), ends_at: dateTimeValue(data, "ends_at"),
      };
      const saved = selected
        ? await updateBanner(selected.id, payload, token, locale)
        : await createBanner(payload, token, locale);
      reflect(saved); setNotice(t("saved"));
    } catch (caught) { showError(caught); }
    finally { setBusy(false); }
  }

  async function publication(publish: boolean) {
    if (!token || !selected || dirty) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      reflect(await setBannerPublication(selected.id, publish, token, locale));
      setNotice(t(publish ? "published" : "unpublished"));
    } catch (caught) { showError(caught); }
    finally { setBusy(false); }
  }

  if (!allowed) return <Container className="py-20"><h1 className="text-3xl font-semibold">{t("title")}</h1><p className="mt-3">{t("access")}</p><Link href="/login" className="text-primary underline">{t("signIn")}</Link></Container>;

  return <div className="cms-workspace"><Container>
    <div className="cms-heading"><div><p className="cms-eyebrow">{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("intro")}</p><Link href="/staff/content" className="cms-review-link">{t("back")}</Link></div><Button variant="accent" onClick={() => select(null)}>{t("new")}</Button></div>
    {error && <p role="alert" className="cms-feedback cms-feedback-error">{error}</p>}
    {notice && <p role="status" className="cms-feedback cms-feedback-success">{notice}</p>}
    <div className="cms-columns">
      <section className="cms-list-panel" aria-label={t("records")}><div className="cms-panel-heading"><h2>{t("records")}</h2><span>{records.length}</span></div>{loading ? <p className="cms-list-empty">{t("loading")}</p> : records.length === 0 ? <p className="cms-list-empty">{t("empty")}</p> : <ul className="cms-list">{records.map((record) => <li key={record.id}><button type="button" className={`cms-record ${selected?.id === record.id ? "cms-record-active" : ""}`} onClick={() => select(record)}><span><span className="cms-record-title">{locale === "fr" ? record.title_fr || record.title_en : record.title_en}</span><span className="program-editor-code">{t("order", { order: record.sort_order })}</span></span><span className={`cms-status ${record.published_at ? "cms-status-published" : ""}`}>{t(record.published_at ? "live" : "draft")}</span></button></li>)}</ul>}</section>
      <section className="cms-editor-panel" aria-label={t("editor")}><div className="cms-panel-heading"><h2>{selected ? t("editing") : t("new")}</h2></div>
        <form key={`${selected?.id ?? "new"}-${formKey}`} onSubmit={save} onChange={() => setDirty(true)} className="cms-form"><div className="cms-form-grid">
          <div><Label htmlFor="banner-title-en" required>{t("titleEn")}</Label><Input id="banner-title-en" name="title_en" defaultValue={selected?.title_en ?? ""} maxLength={255} required /></div>
          <div><Label htmlFor="banner-title-fr">{t("titleFr")}</Label><Input id="banner-title-fr" name="title_fr" defaultValue={selected?.title_fr ?? ""} maxLength={255} /></div>
          <div className="cms-field-wide"><Label htmlFor="banner-subtitle-en" required>{t("subtitleEn")}</Label><Textarea id="banner-subtitle-en" name="subtitle_en" defaultValue={selected?.subtitle_en ?? ""} maxLength={1000} rows={3} required /></div>
          <div className="cms-field-wide"><Label htmlFor="banner-subtitle-fr">{t("subtitleFr")}</Label><Textarea id="banner-subtitle-fr" name="subtitle_fr" defaultValue={selected?.subtitle_fr ?? ""} maxLength={1000} rows={3} /></div>
          <div><Label htmlFor="banner-image">{t("image")}</Label><Input id="banner-image" name="image_url" defaultValue={selected?.image_url ?? "/site-media/hero"} maxLength={255} required /><input aria-label={t("upload")} type="file" name="image_file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-sm" /></div>
          <div><Label htmlFor="banner-order">{t("sortOrder")}</Label><Input id="banner-order" type="number" name="sort_order" min="0" max="1000" defaultValue={selected?.sort_order ?? 0} required /></div>
          <div><Label htmlFor="banner-alt-en" required>{t("altEn")}</Label><Input id="banner-alt-en" name="image_alt_en" defaultValue={selected?.image_alt_en ?? ""} maxLength={255} required /></div>
          <div><Label htmlFor="banner-alt-fr">{t("altFr")}</Label><Input id="banner-alt-fr" name="image_alt_fr" defaultValue={selected?.image_alt_fr ?? ""} maxLength={255} /></div>
          <div><Label htmlFor="banner-cta-en" required>{t("ctaEn")}</Label><Input id="banner-cta-en" name="cta_label_en" defaultValue={selected?.cta_label_en ?? ""} maxLength={80} required /></div>
          <div><Label htmlFor="banner-cta-fr">{t("ctaFr")}</Label><Input id="banner-cta-fr" name="cta_label_fr" defaultValue={selected?.cta_label_fr ?? ""} maxLength={80} /></div>
          <div><Label htmlFor="banner-link" required>{t("ctaHref")}</Label><Input id="banner-link" name="cta_href" defaultValue={selected?.cta_href ?? "/admissions/register"} maxLength={255} required /></div>
          <div><Label htmlFor="banner-start">{t("startsAt")}</Label><Input id="banner-start" name="starts_at" type="datetime-local" defaultValue={dateTimeLocal(selected?.starts_at)} /></div>
          <div><Label htmlFor="banner-end">{t("endsAt")}</Label><Input id="banner-end" name="ends_at" type="datetime-local" defaultValue={dateTimeLocal(selected?.ends_at)} /></div>
        </div><p className="program-editor-note">{t("publicationNote")}</p><div className="cms-actions"><Button type="submit" disabled={busy}>{busy ? t("working") : t("save")}</Button>{selected && <Button type="button" variant="accent" disabled={busy || dirty} onClick={() => void publication(!selected.published_at)}>{t(selected.published_at ? "unpublish" : "publish")}</Button>}</div></form>
      </section>
    </div>
  </Container></div>;
}
