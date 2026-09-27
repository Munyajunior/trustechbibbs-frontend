"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import { getMyStudentProfile, updateMyStudentProfile, type StudentProfile, type StudentProfileUpdate } from "@/lib/api/students";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const optionalText = (value: FormDataEntryValue | null) => String(value ?? "").trim() || null;

export function StudentProfileForm({ locale }: { locale: Locale }) {
  const t = useTranslations("student.profile");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isStudent = user?.roles.includes("student") ?? false;
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !isStudent) return;
    let active = true;
    getMyStudentProfile(token, locale)
      .then((result) => { if (active) setProfile(result); })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError")); });
    return () => { active = false; };
  }, [isStudent, locale, t, token]);

  async function save(formData: FormData) {
    if (!token) return;
    const payload: StudentProfileUpdate = {
      nationality: optionalText(formData.get("nationality")),
      phone_primary: optionalText(formData.get("phone_primary")),
      phone_secondary: optionalText(formData.get("phone_secondary")),
      email_personal: optionalText(formData.get("email_personal")),
      address_permanent: {
        country: String(formData.get("country") ?? "").trim(),
        city: String(formData.get("city") ?? "").trim(),
        detail: String(formData.get("address_detail") ?? "").trim(),
      },
      guardian_name: optionalText(formData.get("guardian_name")),
      guardian_phone: optionalText(formData.get("guardian_phone")),
      emergency_contact_name: optionalText(formData.get("emergency_contact_name")),
      emergency_contact_phone: optionalText(formData.get("emergency_contact_phone")),
      medical_conditions: optionalText(formData.get("medical_conditions")),
    };
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      setProfile(await updateMyStudentProfile(payload, token, locale));
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (!token || !isStudent) return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-semibold text-gray-900">{t("accessTitle")}</h1>
        <p className="mt-3 text-gray-600">{t("accessBody")}</p>
        <Link href="/login" className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-white">{t("signIn")}</Link>
      </div>
    </Container>
  );

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <Link href="/student" className="text-sm font-semibold text-primary underline underline-offset-2">{t("back")}</Link>
        <h1 className="mt-5 font-display text-3xl font-semibold text-gray-900">{t("title")}</h1>
        {profile ? (
          <>
            <p className="mt-2 text-gray-600">{profile.first_name} {profile.last_name}</p>
            <dl className="mt-6 grid gap-4 rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-gray-500">{t("studentId")}</dt><dd className="mt-1 font-mono font-semibold text-gray-900">{profile.student_id}</dd></div>
              <div><dt className="text-gray-500">{t("institutionalEmail")}</dt><dd className="mt-1 break-all font-medium text-gray-900">{profile.email_institutional}</dd></div>
              <div><dt className="text-gray-500">{t("level")}</dt><dd className="mt-1 font-medium text-gray-900">{profile.current_level}</dd></div>
              <div><dt className="text-gray-500">{t("semester")}</dt><dd className="mt-1 font-medium text-gray-900">{profile.current_semester}</dd></div>
            </dl>
            <form key={profile.updated_at} action={save} className="mt-7 space-y-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
              <div aria-live="polite">
                {error && <p className="rounded-md bg-error-light p-3 text-sm text-error">{error}</p>}
                {saved && <p className="rounded-md bg-success-light p-3 text-sm text-success">{t("saved")}</p>}
              </div>
              <fieldset>
                <legend className="font-display text-xl font-semibold text-gray-900">{t("contactHeading")}</legend>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="nationality">{t("nationality")}</Label><Input id="nationality" name="nationality" defaultValue={profile.nationality ?? ""} maxLength={100} /></div>
                  <div><Label htmlFor="phone_primary">{t("primaryPhone")}</Label><Input id="phone_primary" name="phone_primary" type="tel" defaultValue={profile.phone_primary ?? ""} maxLength={20} /></div>
                  <div><Label htmlFor="phone_secondary">{t("secondaryPhone")}</Label><Input id="phone_secondary" name="phone_secondary" type="tel" defaultValue={profile.phone_secondary ?? ""} maxLength={20} /></div>
                  <div><Label htmlFor="email_personal">{t("personalEmail")}</Label><Input id="email_personal" name="email_personal" type="email" defaultValue={profile.email_personal ?? ""} maxLength={255} /></div>
                  <div><Label htmlFor="country">{t("country")}</Label><Input id="country" name="country" defaultValue={profile.address_permanent?.country ?? ""} /></div>
                  <div><Label htmlFor="city">{t("city")}</Label><Input id="city" name="city" defaultValue={profile.address_permanent?.city ?? ""} /></div>
                  <div className="sm:col-span-2"><Label htmlFor="address_detail">{t("address")}</Label><Input id="address_detail" name="address_detail" defaultValue={profile.address_permanent?.detail ?? ""} /></div>
                </div>
              </fieldset>
              <fieldset>
                <legend className="font-display text-xl font-semibold text-gray-900">{t("supportHeading")}</legend>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="guardian_name">{t("guardianName")}</Label><Input id="guardian_name" name="guardian_name" defaultValue={profile.guardian_name ?? ""} maxLength={255} /></div>
                  <div><Label htmlFor="guardian_phone">{t("guardianPhone")}</Label><Input id="guardian_phone" name="guardian_phone" type="tel" defaultValue={profile.guardian_phone ?? ""} maxLength={20} /></div>
                  <div><Label htmlFor="emergency_contact_name">{t("emergencyName")}</Label><Input id="emergency_contact_name" name="emergency_contact_name" defaultValue={profile.emergency_contact_name ?? ""} maxLength={255} /></div>
                  <div><Label htmlFor="emergency_contact_phone">{t("emergencyPhone")}</Label><Input id="emergency_contact_phone" name="emergency_contact_phone" type="tel" defaultValue={profile.emergency_contact_phone ?? ""} maxLength={20} /></div>
                  <div className="sm:col-span-2"><Label htmlFor="medical_conditions">{t("medicalConditions")}</Label><Textarea id="medical_conditions" name="medical_conditions" defaultValue={profile.medical_conditions ?? ""} maxLength={5000} /></div>
                </div>
              </fieldset>
              <Button type="submit" size="lg" disabled={saving}>{saving ? t("saving") : t("save")}</Button>
            </form>
          </>
        ) : <p className="mt-6 rounded-lg border border-gray-200 bg-white p-5 text-gray-600" role="status">{error ?? t("loading")}</p>}
      </div>
    </Container>
  );
}
