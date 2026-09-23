"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import { loginApplicant, registerApplicant } from "@/lib/api/auth";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

type ApplicantAuthFormProps = {
  locale: Locale;
  mode: "login" | "register";
};

export function ApplicantAuthForm({ locale, mode }: ApplicantAuthFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "").trim();
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (mode === "register" && password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result =
        mode === "register"
          ? await registerApplicant({ email, password, full_name_en: fullName }, locale)
          : await loginApplicant({ email, password }, locale);
      setSession(
        {
          id: result.user.id,
          email: result.user.email,
          full_name: result.user.full_name_en,
          roles: result.user.roles,
          preferred_locale: locale,
        },
        result.tokens.access_token,
      );
      router.push("/admissions/application");
    } catch (caught) {
      if (caught instanceof ApiError) setError(caught.localizedMessage(locale));
      else if (caught instanceof ApiUnreachableError) setError(t("serviceUnavailable"));
      else setError(t("unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <form action={onSubmit} className="mx-auto max-w-md space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-900">{t(`${mode}.title`)}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">{t(`${mode}.subtitle`)}</p>
      </div>
      <div aria-live="polite">
        {error && <p className="rounded-md bg-error-light px-4 py-3 text-sm text-error">{error}</p>}
      </div>
      {isRegister && (
        <div>
          <Label htmlFor="fullName" required>{t("fullName")}</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </div>
      )}
      <div>
        <Label htmlFor="email" required>{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password" required>{t("password")}</Label>
        <Input id="password" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={8} required />
      </div>
      {isRegister && (
        <div>
          <Label htmlFor="confirmPassword" required>{t("confirmPassword")}</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
        </div>
      )}
      <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
        {isSubmitting ? t("submitting") : t(`${mode}.submit`)}
      </Button>
      <p className="text-center text-sm text-gray-600">
        {isRegister ? t("hasAccount") : t("needsAccount")} {" "}
        <Link href={isRegister ? "/admissions/login" : "/admissions/register"} className="font-semibold text-primary underline underline-offset-2">
          {isRegister ? t("loginLink") : t("registerLink")}
        </Link>
      </p>
    </form>
  );
}
