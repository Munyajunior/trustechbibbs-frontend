"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import { listMediaSlots, replaceMediaSlot, restoreMediaSlot, type MediaSlot } from "@/lib/api/media";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

export function MediaLibrary({ locale }: { locale: Locale }) {
  const t = useTranslations("mediaLibrary");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const allowed = !!token && !!user?.roles.some((role) => ["editor", "admin", "super_admin"].includes(role));
  const [slots, setSlots] = useState<MediaSlot[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!allowed || !token) return;
    listMediaSlots(token, locale).then(setSlots).catch((caught: unknown) =>
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError")));
  }, [allowed, token, locale, t]);

  async function update(slot: string, file: File | undefined) {
    if (!file || !token) return;
    setBusy(slot); setError(null); setNotice(null);
    try {
      await replaceMediaSlot(slot, file, token, locale);
      setSlots(await listMediaSlots(token, locale));
      setRevision((value) => value + 1);
      setNotice(t("saved"));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
    } finally { setBusy(null); }
  }

  async function restore(slot: string) {
    if (!token) return;
    setBusy(slot); setError(null); setNotice(null);
    try {
      await restoreMediaSlot(slot, token, locale);
      setSlots(await listMediaSlots(token, locale));
      setRevision((value) => value + 1);
      setNotice(t("restored"));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
    } finally { setBusy(null); }
  }

  if (!allowed) return <Container className="py-20"><h1 className="text-3xl font-semibold">{t("title")}</h1><p className="mt-3">{t("access")}</p><Link href="/login" className="text-primary underline">{t("signIn")}</Link></Container>;

  return <Container className="py-12 md:py-20">
    <div className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-semibold uppercase tracking-widest text-[#b58100]">{t("eyebrow")}</p><h1 className="mt-2 font-display text-4xl font-semibold text-primary">{t("title")}</h1><p className="mt-3 max-w-2xl text-slate-600">{t("intro")}</p></div><Link href="/staff/content" className="font-semibold text-primary underline">{t("back")}</Link></div>
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {notice && <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 text-green-800">{notice}</p>}
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {slots.map(({ slot, custom }) => <article key={slot} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* A route-local image keeps the browser and API on their respective origins. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/site-media/${slot}?v=${revision}`} alt="" className="aspect-[16/10] w-full bg-slate-100 object-cover" />
        <div className="p-5"><h2 className="text-lg font-semibold capitalize text-primary">{slot.replaceAll("-", " ")}</h2><p className="mt-1 text-sm text-slate-500">{custom ? t("custom") : t("default")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3"><label className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">{busy === slot ? t("working") : t("replace")}<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={!!busy} onChange={(event) => { void update(slot, event.target.files?.[0]); event.target.value = ""; }} /></label>{custom && <button type="button" disabled={!!busy} onClick={() => void restore(slot)} className="text-sm font-semibold text-primary underline">{t("restore")}</button>}</div>
        </div></article>)}
    </div>
    {slots.length === 0 && !error && <p>{t("loading")}</p>}
    <p className="mt-8 text-sm text-slate-500">{t("formatHint")}</p>
  </Container>;
}
