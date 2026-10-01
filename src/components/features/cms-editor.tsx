"use client";

import { Archive, ArrowUpRight, CalendarDays, FileText, Plus, Send, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import { uploadCmsCover } from "@/lib/api/media";
import {
  archiveEvent, archiveNews, createEventDraft, createNewsDraft,
  listEditorEvents, listEditorNews, publishEvent, publishNews,
  updateEventDraft, updateNewsDraft,
  type EditorCampusEvent, type EditorNewsArticle, type EventDraftInput, type NewsDraftInput,
} from "@/lib/api/cms";
import type { Locale, Pagination } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

type Kind = "news" | "events";
type EditorRecord = EditorNewsArticle | EditorCampusEvent;
type CmsEditorProps = { locale: Locale };

function field(data: FormData, name: string): string {
  return String(data.get(name) ?? "").trim();
}

function optionalField(data: FormData, name: string): string | null {
  return field(data, name) || null;
}

function localDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function statusOf(record: EditorRecord, now: number): "draft" | "scheduled" | "published" | "archived" {
  if (record.archived_at) return "archived";
  if (!record.published_at) return "draft";
  return new Date(record.published_at).getTime() > now ? "scheduled" : "published";
}

export function CmsEditor({ locale }: CmsEditorProps) {
  const t = useTranslations("cmsEditor");
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const canEdit = !!token && !!user?.roles.some((role) => ["editor", "admin", "super_admin"].includes(role));
  const [kind, setKind] = useState<Kind>("news");
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<EditorRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [selected, setSelected] = useState<EditorRecord | null>(null);
  const [draftKey, setDraftKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!canEdit || !token) return;
    let active = true;
    const request = kind === "news" ? listEditorNews(token, locale, page) : listEditorEvents(token, locale, page);
    request.then((result) => {
      if (!active) return;
      setRecords(result.items);
      setPagination(result.pagination);
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("serviceUnavailable"));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canEdit, token, kind, page, locale, t]);

  function showError(caught: unknown) {
    if (caught instanceof ApiError) setError(caught.localizedMessage(locale));
    else if (caught instanceof ApiUnreachableError) setError(t("serviceUnavailable"));
    else setError(t("error"));
  }

  function switchKind(next: Kind) {
    if (next === kind) return;
    setKind(next);
    setPage(1);
    setSelected(null);
    setRecords([]);
    setPagination(null);
    setLoading(true);
    setError(null);
    setNotice(null);
    setDraftKey((value) => value + 1);
  }

  function newDraft() {
    setSelected(null);
    setError(null);
    setNotice(null);
    setDraftKey((value) => value + 1);
  }

  async function saveRecord(data: FormData): Promise<EditorRecord> {
    if (!token) throw new Error("Missing editor session");
    const coverFile = data.get("cover_file");
    if (coverFile instanceof File && coverFile.size > 0) {
      data.set("cover_image_url", await uploadCmsCover(coverFile, token, locale));
    }
    const title = field(data, "title_en");
    if (!title) throw new Error(t("requiredTitle"));
    let saved: EditorRecord;
    if (kind === "news") {
      const payload: NewsDraftInput = {
        title_en: title,
        title_fr: optionalField(data, "title_fr"),
        excerpt_en: optionalField(data, "excerpt_en"),
        excerpt_fr: optionalField(data, "excerpt_fr"),
        content_en: optionalField(data, "content_en"),
        content_fr: optionalField(data, "content_fr"),
        category: optionalField(data, "category"),
        tags: field(data, "tags").split(",").map((tag) => tag.trim()).filter(Boolean),
        cover_image_url: optionalField(data, "cover_image_url"),
      };
      saved = selected
        ? await updateNewsDraft(selected.id, payload, token, locale)
        : await createNewsDraft(payload, token, locale);
    } else {
      const startsAt = field(data, "starts_at");
      if (!startsAt) throw new Error(t("requiredStart"));
      const endsAt = field(data, "ends_at");
      const payload: EventDraftInput = {
        title_en: title,
        title_fr: optionalField(data, "title_fr"),
        description_en: optionalField(data, "description_en"),
        description_fr: optionalField(data, "description_fr"),
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        venue: optionalField(data, "venue"),
        category: optionalField(data, "category"),
        cover_image_url: optionalField(data, "cover_image_url"),
      };
      saved = selected
        ? await updateEventDraft(selected.id, payload, token, locale)
        : await createEventDraft(payload, token, locale);
    }
    setSelected(saved);
    setRecords((current) => selected
      ? current.map((record) => record.id === saved.id ? saved : record)
      : [saved, ...current].slice(0, 20));
    if (!selected) setPage(1);
    return saved;
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await saveRecord(new FormData(event.currentTarget));
      setNotice(t("savingNotice"));
    } catch (caught) {
      setError(caught instanceof Error && caught.message === t("requiredTitle") ? caught.message : t("error"));
      if (!(caught instanceof Error && caught.message === t("requiredTitle"))) showError(caught);
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    if (!formRef.current || !token) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = new FormData(formRef.current);
      const saved = await saveRecord(data);
      const at = field(data, "publish_at");
      const publishAt = at ? new Date(at).toISOString() : undefined;
      const published = kind === "news"
        ? await publishNews(saved.id, token, locale, publishAt)
        : await publishEvent(saved.id, token, locale, publishAt);
      setSelected(published);
      setRecords((current) => current.map((record) => record.id === published.id ? published : record));
      setNotice(t("publishedNotice"));
    } catch (caught) {
      if (caught instanceof Error && [t("requiredTitle"), t("requiredStart")].includes(caught.message)) setError(caught.message);
      else showError(caught);
    } finally {
      setBusy(false);
    }
  }

  async function onArchive() {
    if (!selected || !token) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const archived = kind === "news"
        ? await archiveNews(selected.id, token, locale)
        : await archiveEvent(selected.id, token, locale);
      setSelected(archived);
      setRecords((current) => current.map((record) => record.id === archived.id ? archived : record));
      setNotice(t("archivedNotice"));
    } catch (caught) {
      showError(caught);
    } finally {
      setBusy(false);
    }
  }

  if (!canEdit) {
    return <section className="cms-access"><Container><div className="cms-access-card"><p className="cms-eyebrow">{t("eyebrow")}</p><h1>{t("accessTitle")}</h1><p>{t("accessBody")}</p><Link href="/login" className="cms-sign-in">{t("signIn")}</Link></div></Container></section>;
  }

  const article = kind === "news" ? selected as EditorNewsArticle | null : null;
  const campusEvent = kind === "events" ? selected as EditorCampusEvent | null : null;
  const status = selected ? statusOf(selected, now) : "draft";
  const scheduledAt = selected?.published_at && status === "scheduled"
    ? localDateTime(selected.published_at) : "";

  return <div className="cms-workspace"><Container>
    <div className="cms-heading"><div><p className="cms-eyebrow">{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("subtitle")}</p><div className="flex flex-wrap gap-5"><Link className="cms-review-link" href="/staff/programs">{t("programsLink")}</Link><Link className="cms-review-link" href="/staff/media">{locale === "fr" ? "Médiathèque" : "Media library"}</Link>{user?.roles.some((role) => ["admin", "super_admin"].includes(role)) && <Link className="cms-review-link" href="/staff/admissions">{t("reviewLink")}</Link>}</div></div><Button variant="accent" onClick={newDraft}><Plus aria-hidden="true" />{kind === "news" ? t("newNews") : t("newEvent")}</Button></div>
    <div className="cms-kind-switch" aria-label={t("title")}><button type="button" aria-pressed={kind === "news"} onClick={() => switchKind("news")}><FileText aria-hidden="true" size={19} />{t("news")}</button><button type="button" aria-pressed={kind === "events"} onClick={() => switchKind("events")}><CalendarDays aria-hidden="true" size={19} />{t("events")}</button></div>
    {error && <p className="cms-feedback cms-feedback-error" role="alert">{error}</p>}
    {notice && <p className="cms-feedback cms-feedback-success" role="status">{notice}</p>}
    <div className="cms-columns"><aside className="cms-list-panel"><div className="cms-panel-heading"><h2>{kind === "news" ? t("news") : t("events")}</h2><span>{pagination?.total ?? 0}</span></div>{loading ? <p className="cms-list-empty">{t("loading")}</p> : records.length === 0 ? <p className="cms-list-empty">{t("empty")}</p> : <ul className="cms-list">{records.map((record) => <li key={record.id}><button type="button" className={selected?.id === record.id ? "cms-record cms-record-active" : "cms-record"} onClick={() => { setSelected(record); setError(null); setNotice(null); }}><span className="cms-record-title">{record.title_en}</span><span className={`cms-status cms-status-${statusOf(record, now)}`}>{t(`status.${statusOf(record, now)}`)}</span></button></li>)}</ul>}{pagination && (pagination.has_previous || pagination.has_next) && <div className="cms-pagination"><Button variant="outline" size="sm" disabled={!pagination.has_previous} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>{t("previous")}</Button><span>{t("pageNumber", { page })}</span><Button variant="outline" size="sm" disabled={!pagination.has_next} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>{t("next")}</Button></div>}</aside>
      <section className="cms-editor-panel" aria-labelledby="cms-form-heading"><div className="cms-panel-heading"><div><span className="cms-status cms-status-heading">{t(`status.${status}`)}</span><h2 id="cms-form-heading">{selected ? t("editing", { title: selected.title_en }) : t("newDraft")}</h2></div>{selected && status === "published" && <Link className="cms-view-link" href={`/${kind}/${selected.slug}`}>{t("viewPublic")}<ArrowUpRight aria-hidden="true" size={17} /></Link>}</div>
        <form key={`${kind}-${selected?.id ?? `new-${draftKey}`}`} ref={formRef} onSubmit={onSave} className="cms-form"><div className="cms-form-grid"><div><Label htmlFor="cms-title-en" required>{t("fields.titleEn")}</Label><Input id="cms-title-en" name="title_en" defaultValue={selected?.title_en ?? ""} required maxLength={255} /></div><div><Label htmlFor="cms-title-fr">{t("fields.titleFr")}</Label><Input id="cms-title-fr" name="title_fr" defaultValue={selected?.title_fr ?? ""} maxLength={255} /></div>
          {kind === "news" ? <><div><Label htmlFor="cms-excerpt-en">{t("fields.excerptEn")}</Label><Textarea id="cms-excerpt-en" name="excerpt_en" defaultValue={article?.excerpt_en ?? ""} rows={3} /></div><div><Label htmlFor="cms-excerpt-fr">{t("fields.excerptFr")}</Label><Textarea id="cms-excerpt-fr" name="excerpt_fr" defaultValue={article?.excerpt_fr ?? ""} rows={3} /></div><div className="cms-field-wide"><Label htmlFor="cms-content-en">{t("fields.contentEn")}</Label><Textarea id="cms-content-en" name="content_en" defaultValue={article?.content_en ?? ""} rows={8} /></div><div className="cms-field-wide"><Label htmlFor="cms-content-fr">{t("fields.contentFr")}</Label><Textarea id="cms-content-fr" name="content_fr" defaultValue={article?.content_fr ?? ""} rows={7} /></div><div><Label htmlFor="cms-tags">{t("fields.tags")}</Label><Input id="cms-tags" name="tags" defaultValue={article?.tags.join(", ") ?? ""} /></div></> : <><div><Label htmlFor="cms-starts" required>{t("fields.startsAt")}</Label><Input id="cms-starts" name="starts_at" type="datetime-local" defaultValue={localDateTime(campusEvent?.starts_at)} required /></div><div><Label htmlFor="cms-ends">{t("fields.endsAt")}</Label><Input id="cms-ends" name="ends_at" type="datetime-local" defaultValue={localDateTime(campusEvent?.ends_at)} /></div><div className="cms-field-wide"><Label htmlFor="cms-venue">{t("fields.venue")}</Label><Input id="cms-venue" name="venue" defaultValue={campusEvent?.venue ?? ""} maxLength={255} /></div><div className="cms-field-wide"><Label htmlFor="cms-description-en">{t("fields.descriptionEn")}</Label><Textarea id="cms-description-en" name="description_en" defaultValue={campusEvent?.description_en ?? ""} rows={6} /></div><div className="cms-field-wide"><Label htmlFor="cms-description-fr">{t("fields.descriptionFr")}</Label><Textarea id="cms-description-fr" name="description_fr" defaultValue={campusEvent?.description_fr ?? ""} rows={6} /></div></>}
          <div><Label htmlFor="cms-category">{t("fields.category")}</Label><Input id="cms-category" name="category" defaultValue={selected?.category ?? ""} maxLength={80} /></div><div><Label htmlFor="cms-cover">{t("fields.coverImage")}</Label><Input id="cms-cover" name="cover_image_url" defaultValue={selected?.cover_image_url ?? ""} maxLength={2000} /><input aria-label={locale === "fr" ? "Téléverser une couverture" : "Upload cover image"} type="file" name="cover_file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-sm" /></div><div className="cms-field-wide cms-schedule"><Label htmlFor="cms-publish-at">{t("fields.publishAt")}</Label><Input id="cms-publish-at" name="publish_at" type="datetime-local" defaultValue={scheduledAt} /></div></div>
          <div className="cms-actions"><Button type="submit" variant="outline" disabled={busy}><Save aria-hidden="true" />{busy ? t("saving") : t("save")}</Button><Button type="button" variant="accent" disabled={busy} onClick={onPublish}><Send aria-hidden="true" />{t("publish")}</Button>{selected && <Button type="button" variant="ghost" disabled={busy || status === "archived"} onClick={onArchive}><Archive aria-hidden="true" />{t("archive")}</Button>}</div>
        </form></section></div>
  </Container></div>;
}
