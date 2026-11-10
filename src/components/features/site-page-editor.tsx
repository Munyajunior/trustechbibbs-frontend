"use client";

import { Archive, ArrowDown, ArrowUp, ExternalLink, ImagePlus, Plus, Save, Send, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import { uploadCmsCover } from "@/lib/api/media";
import {
  archivePage, createPageDraft, listEditorPages, publishPage, updatePageDraft,
  type EditorSitePage, type PageBlock, type PageDraft,
} from "@/lib/api/pages";
import type { Locale, Pagination } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const blank = (): PageDraft => ({
  slug: "", title_en: "", title_fr: "", summary_en: "", summary_fr: "",
  cover_image_url: "", blocks: [],
});

function pageStatus(page: EditorSitePage): "draft" | "published" | "archived" {
  return page.archived_at ? "archived" : page.published_at ? "published" : "draft";
}

export function SitePageEditor({ locale }: { locale: Locale }) {
  const t = useTranslations("pageEditor");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const canEdit = !!token && !!user?.roles.some((role) => ["editor", "admin", "super_admin"].includes(role));
  const [items, setItems] = useState<EditorSitePage[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [listPage, setListPage] = useState(1);
  const [selected, setSelected] = useState<EditorSitePage | null>(null);
  const [draft, setDraft] = useState<PageDraft>(blank);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !canEdit) return;
    let active = true;
    listEditorPages(token, locale, listPage).then((result) => {
      if (active) { setItems(result.items); setPagination(result.pagination); }
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError"));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, canEdit, locale, listPage, t]);

  function showError(caught: unknown) {
    setError(caught instanceof ApiError ? caught.localizedMessage(locale)
      : caught instanceof Error ? caught.message : t("saveError"));
  }

  function openPage(page: EditorSitePage) {
    setSelected(page);
    setDraft({ slug: page.slug, title_en: page.title_en, title_fr: page.title_fr,
      summary_en: page.summary_en, summary_fr: page.summary_fr,
      cover_image_url: page.cover_image_url, blocks: page.blocks.map((block) => ({ ...block })) });
    setError(null); setNotice(null);
  }

  function newPage() {
    setSelected(null); setDraft(blank()); setError(null); setNotice(null);
  }

  function update<K extends keyof PageDraft>(key: K, value: PageDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateBlock(index: number, key: keyof PageBlock, value: string) {
    setDraft((current) => ({ ...current, blocks: current.blocks.map((block, pos) =>
      pos === index ? { ...block, [key]: value } : block) }));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const blocks = [...current.blocks];
      const other = index + direction;
      if (other < 0 || other >= blocks.length) return current;
      [blocks[index], blocks[other]] = [blocks[other], blocks[index]];
      return { ...current, blocks };
    });
  }

  async function upload(file: File, index?: number) {
    if (!token) return;
    setBusy(true); setError(null);
    try {
      const url = await uploadCmsCover(file, token, locale);
      if (index === undefined) update("cover_image_url", url);
      else updateBlock(index, "image_url", url);
      setNotice(t("uploaded"));
    } catch (caught) { showError(caught); }
    finally { setBusy(false); }
  }

  function remember(page: EditorSitePage) {
    setSelected(page);
    setItems((current) => current.some((item) => item.id === page.id)
      ? current.map((item) => item.id === page.id ? page : item)
      : [page, ...current].slice(0, 20));
  }

  async function save(): Promise<EditorSitePage> {
    if (!token) throw new Error(t("access"));
    if (!draft.slug || !draft.title_en.trim()) throw new Error(t("required"));
    const payload: PageDraft = {
      ...draft, slug: draft.slug.trim().toLowerCase(), title_en: draft.title_en.trim(),
      title_fr: draft.title_fr?.trim() || null,
      summary_en: draft.summary_en?.trim() || null, summary_fr: draft.summary_fr?.trim() || null,
      cover_image_url: draft.cover_image_url?.trim() || null,
      blocks: draft.blocks.map((block) => ({ ...block,
        text_en: block.text_en?.trim() || null, text_fr: block.text_fr?.trim() || null,
        image_url: block.image_url?.trim() || null,
        alt_en: block.alt_en?.trim() || null, alt_fr: block.alt_fr?.trim() || null,
      })),
    };
    const result = selected ? await updatePageDraft(selected.id, payload, token, locale)
      : await createPageDraft(payload, token, locale);
    remember(result);
    return result;
  }

  async function onSave() {
    setBusy(true); setError(null); setNotice(null);
    try { await save(); setNotice(t("saved")); }
    catch (caught) { showError(caught); }
    finally { setBusy(false); }
  }

  async function onPublish() {
    if (!token) return;
    setBusy(true); setError(null); setNotice(null);
    try { const saved = await save(); remember(await publishPage(saved.id, token, locale)); setNotice(t("published")); }
    catch (caught) { showError(caught); }
    finally { setBusy(false); }
  }

  async function onArchive() {
    if (!selected || !token) return;
    setBusy(true); setError(null); setNotice(null);
    try { remember(await archivePage(selected.id, token, locale)); setNotice(t("archived")); }
    catch (caught) { showError(caught); }
    finally { setBusy(false); }
  }

  if (!canEdit) return <div className="bg-[#f4f6fb] px-4 py-20 text-center"><h1 className="text-2xl font-bold">{t("access")}</h1><Link href="/login" className="mt-5 inline-block text-primary underline">{t("signIn")}</Link></div>;

  return <div className="min-h-screen bg-[#f4f6fb] py-10 sm:py-14"><Container>
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#a78200]">{t("eyebrow")}</p><h1 className="mt-3 font-display text-3xl font-bold text-[#092775] sm:text-4xl">{t("title")}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{t("intro")}</p></div><Button variant="accent" onClick={newPage}><Plus size={18} aria-hidden="true" />{t("new")}</Button></div>
    {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between px-2 py-2"><h2 className="font-bold text-[#092775]">{t("pages")}</h2><span className="text-xs text-slate-500">{pagination?.total ?? 0}</span></div>
        {loading ? <p className="p-3 text-sm text-slate-500">{t("loading")}</p> : items.length === 0 ? <p className="p-3 text-sm text-slate-500">{t("empty")}</p> : <ul className="space-y-1">{items.map((item) => <li key={item.id}><button type="button" onClick={() => openPage(item)} className={`w-full rounded-xl p-3 text-left transition ${selected?.id === item.id ? "bg-[#eaf0ff]" : "hover:bg-slate-50"}`}><span className="block text-sm font-semibold text-[#092775]">{item.title_en}</span><span className="mt-1 block text-xs text-slate-500">/{item.slug} · {t(`status.${pageStatus(item)}`)}</span></button></li>)}</ul>}
        {pagination && (pagination.has_previous || pagination.has_next) && <div className="mt-4 flex justify-between border-t border-slate-100 pt-4"><Button size="sm" variant="outline" disabled={!pagination.has_previous} onClick={() => { setLoading(true); setListPage((page) => page - 1); }}>{t("previous")}</Button><Button size="sm" variant="outline" disabled={!pagination.has_next} onClick={() => { setLoading(true); setListPage((page) => page + 1); }}>{t("next")}</Button></div>}
      </aside>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-label={t("editor")}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-[.16em] text-[#ac8700]">{selected ? t(`status.${pageStatus(selected)}`) : t("status.draft")}</span><h2 className="mt-2 font-display text-2xl font-bold text-[#092775]">{selected ? selected.title_en : t("new")}</h2></div>{selected?.published_at && !selected.archived_at && <Link href={`/pages/${selected.slug}`} target="_blank" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{t("view")}<ExternalLink size={15} aria-hidden="true" /></Link>}</div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2"><div><Label htmlFor="page-slug" required>{t("slug")}</Label><Input id="page-slug" value={draft.slug} onChange={(event) => update("slug", event.target.value)} placeholder="campus-facilities" maxLength={120} disabled={!!selected?.published_at && !selected.archived_at} /></div><div><Label htmlFor="page-title-en" required>{t("titleEn")}</Label><Input id="page-title-en" value={draft.title_en} onChange={(event) => update("title_en", event.target.value)} maxLength={255} /></div><div><Label htmlFor="page-title-fr">{t("titleFr")}</Label><Input id="page-title-fr" value={draft.title_fr ?? ""} onChange={(event) => update("title_fr", event.target.value)} maxLength={255} /></div><div><Label htmlFor="page-cover">{t("cover")}</Label><Input id="page-cover" value={draft.cover_image_url ?? ""} onChange={(event) => update("cover_image_url", event.target.value)} maxLength={2000} /><input type="file" accept="image/png,image/jpeg,image/webp" aria-label={t("uploadCover")} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} className="mt-2 block w-full text-xs text-slate-600" /></div><div><Label htmlFor="page-summary-en">{t("summaryEn")}</Label><Textarea id="page-summary-en" value={draft.summary_en ?? ""} onChange={(event) => update("summary_en", event.target.value)} rows={3} maxLength={1000} /></div><div><Label htmlFor="page-summary-fr">{t("summaryFr")}</Label><Textarea id="page-summary-fr" value={draft.summary_fr ?? ""} onChange={(event) => update("summary_fr", event.target.value)} rows={3} maxLength={1000} /></div></div>
        <div className="mt-10 border-t border-slate-100 pt-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-[#092775]">{t("blocks")}</h3><p className="mt-1 text-sm text-slate-500">{t("blocksHint")}</p></div><div className="flex flex-wrap gap-2">{(["heading", "paragraph", "image", "callout"] as const).map((type) => <Button key={type} type="button" size="sm" variant="outline" onClick={() => update("blocks", [...draft.blocks, { type }])}><Plus size={15} aria-hidden="true" />{t(`block.${type}`)}</Button>)}</div></div>
          <div className="mt-6 space-y-4">{draft.blocks.map((block, index) => <div key={index} className="rounded-2xl border border-slate-200 bg-[#f9fbff] p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[.16em] text-[#a78200]">{index + 1}. {t(`block.${block.type}`)}</span><div className="flex gap-1"><button type="button" aria-label={t("moveUp")} disabled={index === 0} onClick={() => moveBlock(index, -1)} className="rounded-lg p-2 text-slate-600 hover:bg-white disabled:opacity-30"><ArrowUp size={16} /></button><button type="button" aria-label={t("moveDown")} disabled={index === draft.blocks.length - 1} onClick={() => moveBlock(index, 1)} className="rounded-lg p-2 text-slate-600 hover:bg-white disabled:opacity-30"><ArrowDown size={16} /></button><button type="button" aria-label={t("removeBlock")} onClick={() => update("blocks", draft.blocks.filter((_, pos) => pos !== index))} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button></div></div>
            {block.type === "image" ? <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor={`block-image-${index}`}>{t("imageUrl")}</Label><Input id={`block-image-${index}`} value={block.image_url ?? ""} onChange={(event) => updateBlock(index, "image_url", event.target.value)} /><label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-primary"><ImagePlus size={16} aria-hidden="true" />{t("uploadImage")}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, index); }} /></label></div><div><Label htmlFor={`block-alt-en-${index}`}>{t("altEn")}</Label><Input id={`block-alt-en-${index}`} value={block.alt_en ?? ""} onChange={(event) => updateBlock(index, "alt_en", event.target.value)} maxLength={255} /></div><div><Label htmlFor={`block-alt-fr-${index}`}>{t("altFr")}</Label><Input id={`block-alt-fr-${index}`} value={block.alt_fr ?? ""} onChange={(event) => updateBlock(index, "alt_fr", event.target.value)} maxLength={255} /></div></div>
              : <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><Label htmlFor={`block-en-${index}`}>{t("textEn")}</Label><Textarea id={`block-en-${index}`} value={block.text_en ?? ""} onChange={(event) => updateBlock(index, "text_en", event.target.value)} rows={block.type === "paragraph" ? 5 : 2} /></div><div><Label htmlFor={`block-fr-${index}`}>{t("textFr")}</Label><Textarea id={`block-fr-${index}`} value={block.text_fr ?? ""} onChange={(event) => updateBlock(index, "text_fr", event.target.value)} rows={block.type === "paragraph" ? 5 : 2} /></div></div>}</div>)}</div>
        </div>
        <div className="mt-9 flex flex-wrap gap-3 border-t border-slate-100 pt-6"><Button type="button" variant="outline" disabled={busy} onClick={onSave}><Save size={17} aria-hidden="true" />{busy ? t("working") : t("save")}</Button><Button type="button" variant="accent" disabled={busy} onClick={onPublish}><Send size={17} aria-hidden="true" />{t("publish")}</Button>{selected && <Button type="button" variant="ghost" disabled={busy || !!selected.archived_at} onClick={onArchive}><Archive size={17} aria-hidden="true" />{t("archive")}</Button>}</div>
      </section>
    </div>
  </Container></div>;
}
