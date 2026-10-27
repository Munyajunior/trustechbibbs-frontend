"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { confirmPasswordReset, requestPasswordReset } from "@/lib/api/auth";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import type { Locale } from "@/lib/api/types";
import { isValidStaffPassword } from "@/lib/staff-password-policy";

export function PasswordRecoveryForm({
  locale,
  mode,
}: {
  locale: Locale;
  mode: "request" | "reset";
}) {
  const t = useTranslations("auth.recovery");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  async function submit(formData: FormData) {
    setError(null);
    setBusy(true);
    try {
      if (mode === "request") {
        await requestPasswordReset(String(formData.get("email") ?? "").trim(), locale);
      } else {
        const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
        const password = String(formData.get("password") ?? "");
        if (!token) { setError(t("missingLink")); return; }
        if (!isValidStaffPassword(password)) { setError(t("passwordRule")); return; }
        if (password !== String(formData.get("confirmPassword") ?? "")) {
          setError(t("passwordMismatch")); return;
        }
        await confirmPasswordReset(token, password, locale);
        window.history.replaceState(null, "", window.location.pathname);
      }
      setComplete(true);
    } catch (caught) {
      if (caught instanceof ApiError) setError(caught.localizedMessage(locale));
      else if (caught instanceof ApiUnreachableError) setError(t("serviceUnavailable"));
      else setError(t("unexpectedError"));
    } finally {
      setBusy(false);
    }
  }

  return <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <h1 className="font-display text-2xl font-semibold text-slate-900">{t(`${mode}.title`)}</h1>
    <p className="mt-2 text-sm leading-6 text-slate-600">{t(`${mode}.intro`)}</p>
    {complete ? <p role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">{t(`${mode}.success`)}</p> :
      <form action={submit} className="mt-6 space-y-5">
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {mode === "request" ? <div><Label htmlFor="recovery-email" required>{t("email")}</Label><Input id="recovery-email" name="email" type="email" autoComplete="email" required /></div> : <>
          <div><Label htmlFor="recovery-password" required>{t("newPassword")}</Label><Input id="recovery-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /><p className="mt-1 text-xs text-slate-500">{t("passwordRule")}</p></div>
          <div><Label htmlFor="recovery-confirm" required>{t("confirmPassword")}</Label><Input id="recovery-confirm" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></div>
        </>}
        <Button type="submit" fullWidth disabled={busy}>{busy ? t("working") : t(`${mode}.submit`)}</Button>
      </form>}
    <div className="mt-6 flex flex-wrap gap-4 text-sm"><Link href="/login" className="font-semibold text-primary underline underline-offset-2">{t("signIn")}</Link>{mode === "reset" && <Link href="/forgot-password" className="font-semibold text-primary underline underline-offset-2">{t("newLink")}</Link>}</div>
  </section>;
}
