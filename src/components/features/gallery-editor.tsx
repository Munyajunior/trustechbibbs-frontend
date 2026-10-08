"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import {
  listStaffAlbums, listStaffItems, saveAlbum, saveItem, setAlbumPublished, setItemPublished,
  type GalleryAlbumInput, type GalleryItemInput,
} from "@/lib/api/gallery";
import { uploadCmsCover, uploadCmsPanorama, uploadCmsVideo } from "@/lib/api/media";
import type { GalleryAlbum, GalleryItem, Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const emptyAlbum: GalleryAlbumInput = {
  slug: "", title_en: "", title_fr: "", description_en: "", description_fr: "",
  cover_image_url: null, sort_order: 0,
};
const emptyItem: GalleryItemInput = {
  kind: "photo", source_url: "", thumbnail_url: null, caption_en: "", caption_fr: "",
  alt_en: "", alt_fr: "", sort_order: 0,
};

export function GalleryEditor({ locale }: { locale: Locale }) {
  const t = useTranslations("galleryEditor");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const allowed = !!token && !!user?.roles.some((role) => ["editor", "admin", "super_admin"].includes(role));
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [albumDraft, setAlbumDraft] = useState<GalleryAlbumInput>(emptyAlbum);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [itemId, setItemId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<GalleryItemInput>(emptyItem);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed || !token) return;
    let cancelled = false;
    listStaffAlbums(token, locale).then((result) => {
      if (!cancelled) setAlbums(result);
    }).catch((caught: unknown) => {
      if (!cancelled) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError"));
    });
    return () => { cancelled = true; };
  }, [allowed, token, locale, t]);
  useEffect(() => {
    if (!allowed || !albumId || !token) return;
    let cancelled = false;
    listStaffItems(albumId, token, locale).then((result) => {
      if (!cancelled) setItems(result);
    }).catch((caught: unknown) => {
      if (!cancelled) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError"));
    });
    return () => { cancelled = true; };
  }, [allowed, albumId, token, locale, t]);

  function report(caught: unknown) {
    setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
  }
  function chooseAlbum(album: GalleryAlbum) {
    if (album.id !== albumId) setItems([]);
    setAlbumId(album.id);
    setAlbumDraft({ slug: album.slug, title_en: album.title_en, title_fr: album.title_fr,
      description_en: album.description_en, description_fr: album.description_fr,
      cover_image_url: album.cover_image_url, sort_order: album.sort_order });
    setItemId(null); setItemDraft(emptyItem); setError(null); setNotice(null);
  }
  function chooseItem(item: GalleryItem) {
    setItemId(item.id);
    setItemDraft({ kind: item.kind, source_url: item.source_url, thumbnail_url: item.thumbnail_url,
      caption_en: item.caption_en, caption_fr: item.caption_fr, alt_en: item.alt_en,
      alt_fr: item.alt_fr, sort_order: item.sort_order });
    setError(null); setNotice(null);
  }
  async function upload(file: File | undefined, field: "cover_image_url" | "source_url" | "thumbnail_url") {
    if (!file || !token) return;
    setBusy(field); setError(null);
    try {
      const url = field === "source_url" && itemDraft.kind === "video"
        ? await uploadCmsVideo(file, token, locale)
        : field === "source_url" && itemDraft.kind === "tour"
          ? await uploadCmsPanorama(file, token, locale)
          : await uploadCmsCover(file, token, locale);
      if (field === "cover_image_url") setAlbumDraft((draft) => ({ ...draft, cover_image_url: url }));
      else setItemDraft((draft) => ({ ...draft, [field]: url }));
      setNotice(t("uploadReady"));
    } catch (caught) { report(caught); }
    finally { setBusy(null); }
  }
  async function submitAlbum() {
    if (!token) return;
    setBusy("album"); setError(null); setNotice(null);
    try {
      const saved = await saveAlbum(albumDraft, token, locale, albumId ?? undefined);
      setAlbums(await listStaffAlbums(token, locale));
      chooseAlbum(saved);
      setNotice(t("savedDraft"));
    } catch (caught) { report(caught); }
    finally { setBusy(null); }
  }
  async function toggleAlbum(publish: boolean) {
    if (!token || !albumId) return;
    setBusy("album"); setError(null); setNotice(null);
    try {
      const saved = await setAlbumPublished(albumId, publish, token, locale);
      setAlbums(await listStaffAlbums(token, locale));
      chooseAlbum(saved);
      setNotice(publish ? t("published") : t("unpublished"));
    } catch (caught) { report(caught); }
    finally { setBusy(null); }
  }
  async function submitItem() {
    if (!token || !albumId) return;
    setBusy("item"); setError(null); setNotice(null);
    try {
      const saved = await saveItem(albumId, itemDraft, token, locale, itemId ?? undefined);
      setItems(await listStaffItems(albumId, token, locale));
      chooseItem(saved);
      setNotice(t("savedDraft"));
    } catch (caught) { report(caught); }
    finally { setBusy(null); }
  }
  async function toggleItem(publish: boolean) {
    if (!token || !albumId || !itemId) return;
    setBusy("item"); setError(null); setNotice(null);
    try {
      const saved = await setItemPublished(itemId, publish, token, locale);
      setItems(await listStaffItems(albumId, token, locale));
      chooseItem(saved);
      setNotice(publish ? t("published") : t("unpublished"));
    } catch (caught) { report(caught); }
    finally { setBusy(null); }
  }

  if (!allowed) return <Container className="py-20"><h1 className="text-3xl font-semibold">{t("title")}</h1><p className="mt-3">{t("access")}</p><Link href="/login" className="text-primary underline">{t("signIn")}</Link></Container>;
  const selectedAlbum = albums.find((album) => album.id === albumId);
  const selectedItem = items.find((item) => item.id === itemId);
  const albumDirty = !!selectedAlbum && (
    albumDraft.slug !== selectedAlbum.slug || albumDraft.title_en !== selectedAlbum.title_en ||
    albumDraft.title_fr !== selectedAlbum.title_fr || albumDraft.description_en !== selectedAlbum.description_en ||
    albumDraft.description_fr !== selectedAlbum.description_fr || albumDraft.cover_image_url !== selectedAlbum.cover_image_url ||
    albumDraft.sort_order !== selectedAlbum.sort_order
  );
  const itemDirty = !!selectedItem && (
    itemDraft.kind !== selectedItem.kind || itemDraft.source_url !== selectedItem.source_url ||
    itemDraft.thumbnail_url !== selectedItem.thumbnail_url || itemDraft.caption_en !== selectedItem.caption_en ||
    itemDraft.caption_fr !== selectedItem.caption_fr || itemDraft.alt_en !== selectedItem.alt_en ||
    itemDraft.alt_fr !== selectedItem.alt_fr || itemDraft.sort_order !== selectedItem.sort_order
  );
  return <Container className="gallery-editor py-12 md:py-20">
    <div className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-semibold uppercase tracking-widest text-[#b58100]">{t("eyebrow")}</p><h1 className="mt-2 font-display text-4xl font-semibold text-primary">{t("title")}</h1><p className="mt-3 max-w-2xl text-slate-600">{t("intro")}</p></div><Link href="/staff/content" className="font-semibold text-primary underline">{t("back")}</Link></div>
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {notice && <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 text-green-800">{notice}</p>}
    <div className="gallery-editor-layout"><aside><div className="gallery-editor-list-title"><h2>{t("albums")}</h2><button type="button" disabled={!!busy} onClick={() => { setAlbumId(null); setAlbumDraft(emptyAlbum); setItems([]); setItemId(null); setItemDraft(emptyItem); }}>{t("newAlbum")}</button></div>{albums.map((album) => <button type="button" key={album.id} disabled={!!busy} className={album.id === albumId ? "selected" : ""} onClick={() => chooseAlbum(album)}><strong>{album.title_en}</strong><span>{album.published_at ? t("live") : t("draft")}</span></button>)}</aside>
      <div className="gallery-editor-main"><section><h2>{albumId ? t("editAlbum") : t("newAlbum")}</h2><div className="gallery-editor-fields">
        <label>{t("slug")}<input value={albumDraft.slug} onChange={(event) => setAlbumDraft({ ...albumDraft, slug: event.target.value })} placeholder="campus-life" /></label>
        <label>{t("titleEn")}<input value={albumDraft.title_en} onChange={(event) => setAlbumDraft({ ...albumDraft, title_en: event.target.value })} /></label>
        <label>{t("titleFr")}<input value={albumDraft.title_fr ?? ""} onChange={(event) => setAlbumDraft({ ...albumDraft, title_fr: event.target.value })} /></label>
        <label>{t("descriptionEn")}<textarea value={albumDraft.description_en ?? ""} onChange={(event) => setAlbumDraft({ ...albumDraft, description_en: event.target.value })} /></label>
        <label>{t("descriptionFr")}<textarea value={albumDraft.description_fr ?? ""} onChange={(event) => setAlbumDraft({ ...albumDraft, description_fr: event.target.value })} /></label>
        <label>{t("sortOrder")}<input type="number" min="0" max="10000" value={albumDraft.sort_order} onChange={(event) => setAlbumDraft({ ...albumDraft, sort_order: Number(event.target.value) })} /></label>
        <label>{t("coverImage")}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!busy} onChange={(event) => { void upload(event.target.files?.[0], "cover_image_url"); event.target.value = ""; }} /></label>
        {albumDraft.cover_image_url && <p className="gallery-editor-url">{albumDraft.cover_image_url}</p>}
      </div><div className="gallery-editor-actions"><button type="button" disabled={!!busy} onClick={() => void submitAlbum()}>{busy === "album" ? t("working") : t("saveDraft")}</button>{albumId && <button type="button" className="secondary" disabled={!!busy || albumDirty} onClick={() => void toggleAlbum(!selectedAlbum?.published_at)}>{selectedAlbum?.published_at ? t("unpublish") : t("publish")}</button>}{selectedAlbum?.published_at && <Link href={`/gallery/${selectedAlbum.slug}`}>{t("viewPublic")}</Link>}</div><p className="gallery-editor-note">{t("albumPublishHint")}</p></section>
      {albumId && <section><div className="gallery-editor-list-title"><h2>{t("items")}</h2><button type="button" disabled={!!busy} onClick={() => { setItemId(null); setItemDraft(emptyItem); }}>{t("newItem")}</button></div><div className="gallery-editor-item-list">{items.map((item) => <button type="button" disabled={!!busy} className={item.id === itemId ? "selected" : ""} key={item.id} onClick={() => chooseItem(item)}><strong>{item.caption_en}</strong><span>{item.kind} · {item.published_at ? t("live") : t("draft")}</span></button>)}</div><h3>{itemId ? t("editItem") : t("newItem")}</h3><div className="gallery-editor-fields">
        <label>{t("kind")}<select value={itemDraft.kind} onChange={(event) => setItemDraft({ ...itemDraft, kind: event.target.value as GalleryItemInput["kind"], source_url: "" })}><option value="photo">{t("photo")}</option><option value="youtube">YouTube</option><option value="vimeo">Vimeo</option><option value="video">{t("hostedVideo")}</option><option value="tour">{t("panorama")}</option></select></label>
        {itemDraft.kind === "photo" || itemDraft.kind === "tour" || itemDraft.kind === "video" ? <label>{itemDraft.kind === "video" ? t("mediaVideo") : t("mediaImage")}<input type="file" accept={itemDraft.kind === "video" ? "video/mp4,video/webm" : "image/png,image/jpeg,image/webp"} disabled={!!busy} onChange={(event) => { void upload(event.target.files?.[0], "source_url"); event.target.value = ""; }} /></label> : <label>{t("videoUrl")}<input type="url" value={itemDraft.source_url} onChange={(event) => setItemDraft({ ...itemDraft, source_url: event.target.value })} placeholder="https://www.youtube.com/watch?v=..." /></label>}
        {itemDraft.source_url && <p className="gallery-editor-url">{itemDraft.source_url}</p>}
        <label>{t("thumbnailImage")}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!busy} onChange={(event) => { void upload(event.target.files?.[0], "thumbnail_url"); event.target.value = ""; }} /></label>
        {itemDraft.thumbnail_url && <p className="gallery-editor-url">{itemDraft.thumbnail_url}</p>}
        <label>{t("captionEn")}<input value={itemDraft.caption_en} onChange={(event) => setItemDraft({ ...itemDraft, caption_en: event.target.value })} /></label>
        <label>{t("captionFr")}<input value={itemDraft.caption_fr ?? ""} onChange={(event) => setItemDraft({ ...itemDraft, caption_fr: event.target.value })} /></label>
        <label>{t("altEn")}<input value={itemDraft.alt_en ?? ""} onChange={(event) => setItemDraft({ ...itemDraft, alt_en: event.target.value })} /></label>
        <label>{t("altFr")}<input value={itemDraft.alt_fr ?? ""} onChange={(event) => setItemDraft({ ...itemDraft, alt_fr: event.target.value })} /></label>
        <label>{t("sortOrder")}<input type="number" min="0" max="10000" value={itemDraft.sort_order} onChange={(event) => setItemDraft({ ...itemDraft, sort_order: Number(event.target.value) })} /></label>
      </div><div className="gallery-editor-actions"><button type="button" disabled={!!busy} onClick={() => void submitItem()}>{busy === "item" ? t("working") : t("saveDraft")}</button>{itemId && <button type="button" className="secondary" disabled={!!busy || itemDirty} onClick={() => void toggleItem(!selectedItem?.published_at)}>{selectedItem?.published_at ? t("unpublish") : t("publish")}</button>}</div><p className="gallery-editor-note">{t("itemPublishHint")}</p></section>}
      </div>
    </div>
  </Container>;
}
