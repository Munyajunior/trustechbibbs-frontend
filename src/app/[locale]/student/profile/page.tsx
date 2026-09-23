"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { getMyStudentProfile, updateMyStudentProfile, type StudentProfile } from "@/lib/api/students";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

export default function StudentProfilePage() {
  const locale = useLocale() as Locale;
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isStudent = user?.roles.includes("student");

  useEffect(() => {
    if (!token || !isStudent) return;
    getMyStudentProfile(token, locale).then(setProfile).catch((caught) => setError(caught instanceof ApiError ? caught.localizedMessage(locale) : "Unable to load your profile."));
  }, [isStudent, locale, token]);

  async function save(formData: FormData) {
    if (!token) return;
    setSaving(true); setError(null);
    try {
      setProfile(await updateMyStudentProfile({ nationality: String(formData.get("nationality") || "") || null, phone_primary: String(formData.get("phone") || "") || null, email_personal: String(formData.get("email") || "") || null, guardian_name: null, guardian_phone: null, emergency_contact_name: null, emergency_contact_phone: null }, token, locale));
    } catch (caught) { setError(caught instanceof ApiError ? caught.localizedMessage(locale) : "Unable to save your profile."); } finally { setSaving(false); }
  }

  if (!user || !token || !isStudent) return <main className="mx-auto max-w-xl p-8 text-center"><h1 className="font-display text-2xl font-semibold text-gray-900">Student access required</h1><p className="mt-3 text-gray-600">Sign in with an enrolled student account to view your profile.</p></main>;
  if (!profile) return <main className="mx-auto max-w-3xl p-8 text-gray-600">{error ?? "Loading your profile…"}</main>;
  return <main className="mx-auto max-w-3xl p-8"><form action={save} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><div><h1 className="font-display text-3xl font-semibold text-gray-900">Student profile</h1><p className="mt-2 text-gray-600">Keep your personal contact information current.</p></div>{error && <p className="rounded bg-error-light p-3 text-sm text-error">{error}</p>}<dl className="grid gap-4 rounded-lg bg-gray-50 p-5 sm:grid-cols-2"><div><dt className="text-sm text-gray-500">Student ID</dt><dd className="font-mono font-semibold">{profile.student_id}</dd></div><div><dt className="text-sm text-gray-500">Institutional email</dt><dd className="font-medium">{profile.email_institutional}</dd></div></dl><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="nationality">Nationality</Label><Input id="nationality" name="nationality" defaultValue={profile.nationality ?? ""} /></div><div><Label htmlFor="phone">Primary phone</Label><Input id="phone" name="phone" defaultValue={profile.phone_primary ?? ""} /></div><div><Label htmlFor="email">Personal email</Label><Input id="email" name="email" type="email" defaultValue={profile.email_personal ?? ""} /></div></div><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button></form></main>;
}
