"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import {
  deleteLeadershipProfile, listStaffLeadership, saveLeadershipProfile, setLeadershipPublished,
  type LeadershipInput,
} from "@/lib/api/leadership";
import { uploadCmsCover } from "@/lib/api/media";
import type { LeadershipProfile, Locale } from "@/lib/api/types";
import { publicMediaSrc } from "@/lib/public-media";
import { useAuthStore } from "@/stores/auth-store";

const blank: LeadershipInput = {
  name: "", title_en: "", title_fr: "", department_en: "", department_fr: "",
  biography_en: "", biography_fr: "", email: null, phone: null, photo_url: null,
  reports_to_id: null, sort_order: 0,
};

export function LeadershipEditor({ locale }: { locale: Locale }) {
  const t = useTranslations("leadershipEditor");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const allowed = !!token && !!user?.roles.some((role) => ["editor", "admin", "super_admin"].includes(role));
  const [profiles, setProfiles] = useState<LeadershipProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LeadershipInput>(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed || !token) return;
    let cancelled = false;
    listStaffLeadership(token, locale).then((records) => {
      if (!cancelled) setProfiles(records);
    }).catch((caught: unknown) => {
      if (!cancelled) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError"));
    });
    return () => { cancelled = true; };
  }, [allowed, token, locale, t]);

  function choose(profile: LeadershipProfile) {
    setSelectedId(profile.id);
    setDraft({
      name: profile.name, title_en: profile.title_en, title_fr: profile.title_fr,
      department_en: profile.department_en, department_fr: profile.department_fr,
      biography_en: profile.biography_en, biography_fr: profile.biography_fr,
      email: profile.email, phone: profile.phone, photo_url: profile.photo_url,
      reports_to_id: profile.reports_to_id, sort_order: profile.sort_order,
    });
    setError(null); setNotice(null);
  }
  function report(caught: unknown) {
    setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
  }
  async function upload(file?: File) {
    if (!file || !token) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const photo_url = await uploadCmsCover(file, token, locale);
      setDraft((previous) => ({ ...previous, photo_url }));
      setNotice(t("uploadReady"));
    } catch (caught) { report(caught); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!token) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = await saveLeadershipProfile(draft, token, locale, selectedId ?? undefined);
      setProfiles(await listStaffLeadership(token, locale));
      choose(saved);
      setNotice(t("saved"));
    } catch (caught) { report(caught); }
    finally { setBusy(false); }
  }
  async function togglePublished(publish: boolean) {
    if (!token || !selectedId) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = await setLeadershipPublished(selectedId, publish, token, locale);
      setProfiles(await listStaffLeadership(token, locale));
      choose(saved);
      setNotice(publish ? t("published") : t("unpublished"));
    } catch (caught) { report(caught); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!token || !selectedId || !window.confirm(t("deleteConfirm"))) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await deleteLeadershipProfile(selectedId, token, locale);
      setProfiles(await listStaffLeadership(token, locale));
      setSelectedId(null); setDraft(blank); setNotice(t("deleted"));
    } catch (caught) { report(caught); }
    finally { setBusy(false); }
  }

  if (!allowed) return <Container className="py-20"><h1 className="text-3xl font-semibold">{t("title")}</h1><p className="mt-3">{t("access")}</p><Link href="/login" className="text-primary underline">{t("signIn")}</Link></Container>;
  const selected = profiles.find((profile) => profile.id === selectedId);
  const dirty = !!selected && Object.entries(draft).some(([key, value]) =>
    value !== selected[key as keyof LeadershipProfile]);
  const photo = publicMediaSrc(draft.photo_url);
  return <Container className="leadership-editor py-12 md:py-20">
    <div className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-semibold uppercase tracking-widest text-[#b58100]">{t("eyebrow")}</p><h1 className="mt-2 font-display text-4xl font-semibold text-primary">{t("title")}</h1><p className="mt-3 max-w-2xl text-slate-600">{t("intro")}</p></div><Link href="/staff/content" className="font-semibold text-primary underline">{t("back")}</Link></div>
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {notice && <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 text-green-800">{notice}</p>}
    <div className="gallery-editor-layout"><aside><div className="gallery-editor-list-title"><h2>{t("profiles")}</h2><button type="button" disabled={busy} onClick={() => { setSelectedId(null); setDraft(blank); setError(null); setNotice(null); }}>{t("newProfile")}</button></div>{profiles.map((profile) => <button type="button" key={profile.id} disabled={busy} className={profile.id === selectedId ? "selected" : ""} onClick={() => choose(profile)}><strong>{profile.name}</strong><span>{profile.published_at ? t("live") : t("draft")}</span></button>)}</aside>
      <div className="gallery-editor-main"><section><h2>{selectedId ? t("editProfile") : t("newProfile")}</h2><div className="gallery-editor-fields">
        <label>{t("name")}<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label>{t("sortOrder")}<input type="number" min="0" max="10000" value={draft.sort_order} onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) })} /></label>
        <label>{t("titleEn")}<input value={draft.title_en} onChange={(event) => setDraft({ ...draft, title_en: event.target.value })} /></label>
        <label>{t("titleFr")}<input value={draft.title_fr ?? ""} onChange={(event) => setDraft({ ...draft, title_fr: event.target.value })} /></label>
        <label>{t("departmentEn")}<input value={draft.department_en ?? ""} onChange={(event) => setDraft({ ...draft, department_en: event.target.value })} /></label>
        <label>{t("departmentFr")}<input value={draft.department_fr ?? ""} onChange={(event) => setDraft({ ...draft, department_fr: event.target.value })} /></label>
        <label>{t("biographyEn")}<textarea value={draft.biography_en ?? ""} onChange={(event) => setDraft({ ...draft, biography_en: event.target.value })} /></label>
        <label>{t("biographyFr")}<textarea value={draft.biography_fr ?? ""} onChange={(event) => setDraft({ ...draft, biography_fr: event.target.value })} /></label>
        <label>{t("email")}<input type="email" value={draft.email ?? ""} onChange={(event) => setDraft({ ...draft, email: event.target.value || null })} /></label>
        <label>{t("phone")}<input type="tel" value={draft.phone ?? ""} onChange={(event) => setDraft({ ...draft, phone: event.target.value || null })} /></label>
        <label>{t("reportsTo")}<select value={draft.reports_to_id ?? ""} onChange={(event) => setDraft({ ...draft, reports_to_id: event.target.value || null })}><option value="">{t("topLevel")}</option>{profiles.filter((profile) => profile.id !== selectedId).map((profile) => <option key={profile.id} value={profile.id}>{profile.name} — {profile.title_en}</option>)}</select></label>
        <label>{t("photo")}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
      </div>{photo && <div className="leadership-editor-preview"><Image src={photo} alt={draft.name || t("photo")} fill sizes="200px" className="object-cover" /></div>}
        <div className="gallery-editor-actions"><button type="button" disabled={busy} onClick={() => void save()}>{busy ? t("working") : t("saveDraft")}</button>{selectedId && <button type="button" className="secondary" disabled={busy || dirty} onClick={() => void togglePublished(!selected?.published_at)}>{selected?.published_at ? t("unpublish") : t("publish")}</button>}{selectedId && <button type="button" className="danger" disabled={busy} onClick={() => void remove()}>{t("delete")}</button>}{selected?.published_at && <Link href="/about/leadership">{t("viewPublic")}</Link>}</div><p className="gallery-editor-note">{t("publishHint")}</p>
      </section></div>
    </div>
  </Container>;
}
