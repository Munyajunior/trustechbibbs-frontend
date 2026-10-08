"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, Expand, Play, Share2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import type { GalleryItem, Locale } from "@/lib/api/types";
import { localizedField } from "@/lib/i18n-field";
import { publicMediaSrc } from "@/lib/public-media";

import { PanoramaViewer } from "./panorama-viewer";

export function GalleryViewer({ items, locale }: { items: GalleryItem[]; locale: Locale }) {
  const t = useTranslations("gallery");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (active !== null && !dialog.open) dialog.showModal();
    if (active === null && dialog.open) dialog.close();
  }, [active]);

  async function share() {
    const url = window.location.href;
    const title = active === null ? document.title : localizedField(items[active], "caption", locale);
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); }
    } catch { /* Dismissing the native share sheet leaves the viewer open. */ }
  }

  const selected = active === null ? null : items[active];
  const selectedSrc = selected && selected.kind !== "youtube" && selected.kind !== "vimeo"
    ? publicMediaSrc(selected.source_url) : null;
  return <>
    <div className="gallery-items">{items.map((item, index) => {
      const source = item.kind === "photo" || item.kind === "tour" ? item.source_url : item.thumbnail_url;
      const image = publicMediaSrc(source);
      return <button type="button" className="gallery-item" key={item.id} onClick={() => { setCopied(false); setActive(index); }} aria-label={t("viewItem", { title: localizedField(item, "caption", locale) })}>
        <span className="gallery-item-visual">{image ? <Image src={image} alt={localizedField(item, "alt", locale) || localizedField(item, "caption", locale)} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" className="object-cover" /> : <Play aria-hidden="true" size={42} />}{item.kind === "youtube" || item.kind === "vimeo" || item.kind === "video" ? <span className="gallery-play"><Play aria-hidden="true" size={24} fill="currentColor" /></span> : item.kind === "tour" ? <span className="gallery-tour-badge">360°</span> : null}</span>
        <span className="gallery-item-caption">{localizedField(item, "caption", locale)}<Expand aria-hidden="true" size={16} /></span>
      </button>;
    })}</div>
    <dialog ref={dialogRef} className="gallery-lightbox" onClose={() => setActive(null)} onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }} onKeyDown={(event) => {
      if (event.key === "ArrowLeft" && active !== null) { event.preventDefault(); setActive((active - 1 + items.length) % items.length); }
      if (event.key === "ArrowRight" && active !== null) { event.preventDefault(); setActive((active + 1) % items.length); }
    }} aria-label={t("viewerLabel")}>
      {selected && <div className="gallery-lightbox-inner"><div className="gallery-lightbox-toolbar"><span>{active! + 1} / {items.length}</span><div><button type="button" onClick={() => void share()} aria-label={t("share")}><Share2 aria-hidden="true" size={18} />{copied ? t("copied") : t("share")}</button><button type="button" onClick={() => dialogRef.current?.close()} aria-label={t("close")}><X aria-hidden="true" size={22} /></button></div></div>
        <div className="gallery-lightbox-media">{selected.kind === "youtube" || selected.kind === "vimeo" ? <iframe key={selected.id} src={selected.source_url} title={localizedField(selected, "caption", locale)} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : selected.kind === "video" && selectedSrc ? <video key={selected.id} src={selectedSrc} controls playsInline preload="metadata" poster={publicMediaSrc(selected.thumbnail_url) ?? undefined} aria-label={localizedField(selected, "caption", locale)} /> : selected.kind === "tour" && selectedSrc ? <PanoramaViewer key={selected.id} src={selectedSrc} alt={localizedField(selected, "alt", locale) || localizedField(selected, "caption", locale)} hint={t("panoramaHint")} /> : selectedSrc ? <Image src={selectedSrc} alt={localizedField(selected, "alt", locale) || localizedField(selected, "caption", locale)} fill sizes="100vw" className="object-contain" /> : null}</div>
        <div className="gallery-lightbox-footer"><button type="button" onClick={() => { setCopied(false); setActive((active! - 1 + items.length) % items.length); }} aria-label={t("previousItem")}><ArrowLeft aria-hidden="true" size={19} /></button><p>{localizedField(selected, "caption", locale)}{selected.kind === "tour" && <small>{t("panoramaHint")}</small>}</p><button type="button" onClick={() => { setCopied(false); setActive((active! + 1) % items.length); }} aria-label={t("nextItem")}><ArrowRight aria-hidden="true" size={19} /></button></div>
      </div>}
    </dialog>
  </>;
}
