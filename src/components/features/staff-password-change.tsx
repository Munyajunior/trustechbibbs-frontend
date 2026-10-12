"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

import { changePassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

export function StaffPasswordChange({ locale }: { locale: Locale }) {
  const t = useTranslations("staffPassword");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user || busy) return;
    setError(null);
    if (newPassword !== confirmation) {
      setError(t("mismatch"));
      return;
    }
    setBusy(true);
    try {
      const updated = await changePassword(currentPassword, newPassword, token, locale);
      setSession({
        ...user,
        full_name: updated.user.full_name_en,
        roles: updated.user.roles,
        must_change_password: updated.user.must_change_password,
      }, updated.tokens.access_token);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  return <main className="min-h-[calc(100vh-76px)] bg-[#f4f6fb] px-4 py-12 sm:py-20">
    <section className="mx-auto max-w-lg overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-blue-950/10">
      <div className="bg-[#09276f] px-7 py-8 text-white sm:px-9"><span className="grid size-12 place-items-center rounded-xl bg-white/15"><ShieldCheck className="size-6" aria-hidden="true" /></span><p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-amber-300">{t("eyebrow")}</p><h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">{t("title")}</h1><p className="mt-2 text-sm leading-relaxed text-blue-100">{t("intro")}</p></div>
      <form onSubmit={submit} className="space-y-5 p-7 sm:p-9">
        <div><label htmlFor="staff-current-password" className="mb-1.5 block text-sm font-semibold text-slate-800">{t("current")}</label><input id="staff-current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" /></div>
        <div><label htmlFor="staff-new-password" className="mb-1.5 block text-sm font-semibold text-slate-800">{t("new")}</label><input id="staff-new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" /><p className="mt-1.5 text-xs leading-relaxed text-slate-500">{t("requirements")}</p></div>
        <div><label htmlFor="staff-confirm-password" className="mb-1.5 block text-sm font-semibold text-slate-800">{t("confirm")}</label><input id="staff-confirm-password" type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" /></div>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <button type="submit" disabled={busy || !token} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1035a0] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#09276f] disabled:opacity-60"><LockKeyhole className="size-4" aria-hidden="true" />{busy ? t("saving") : t("submit")}</button>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500"><KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{t("privacy")}</p>
      </form>
    </section>
  </main>;
}
