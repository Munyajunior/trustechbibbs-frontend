"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { Department } from "@/lib/api/academic-catalogue";
import { createLecturer, listLecturerCandidates, type Lecturer, type LecturerCandidate } from "@/lib/api/hr";
import type { Locale } from "@/lib/api/types";
import { hrErrorMessage } from "@/lib/hr-ui";

interface Props {
  departments: Department[];
  onCreated: (lecturer: Lecturer) => void;
  onCancel: () => void;
  token: string;
  locale: Locale;
}

export function StaffLecturerForm({ departments, onCreated, onCancel, token, locale }: Props) {
  const t = useTranslations("staffLecturers");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<LecturerCandidate[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [userId, setUserId] = useState("");
  const [staffNumber, setStaffNumber] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [phone, setPhone] = useState("");
  const [payout, setPayout] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestKey = `${token}:${locale}:${search}:${retry}`;
  const loading = loadedKey !== requestKey && !loadError;

  useEffect(() => {
    let active = true;
    listLecturerCandidates({ search: search || undefined }, token, locale)
      .then((result) => { if (active) { setUsers(result.items); setLoadError(null); setLoadedKey(requestKey); } })
      .catch((caught) => { if (active) setLoadError(hrErrorMessage(caught, locale, t("usersLoadError"))); });
    return () => { active = false; };
  }, [token, locale, search, requestKey, t]);

  const userName = (user: LecturerCandidate) => `${locale === "fr" ? user.full_name_fr || user.full_name_en : user.full_name_en} (${user.email})`;
  const departmentName = (row: Department) => locale === "fr" ? row.name_fr || row.name_en : row.name_en;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !staffNumber.trim() || !departmentId) { setError(t("lecturerFieldsRequired")); return; }
    setBusy(true); setError(null);
    try {
      onCreated(await createLecturer({
        user_id: userId, staff_number: staffNumber.trim(), primary_department_id: departmentId,
        phone: phone.trim() || null, payout_details: payout.trim() || null,
      }, token, locale));
    } catch (caught) { setError(hrErrorMessage(caught, locale, t("saveError"))); } finally { setBusy(false); }
  }

  return <section aria-label={t("addLecturer")} className="rounded-2xl border border-gray-200 bg-white p-5">
    <h2 className="font-display text-xl font-semibold">{t("addLecturer")}</h2>
    <p className="mt-1 text-sm text-gray-600">{t("addLecturerIntro")}</p>
    {error && <p role="alert" className="mt-3 rounded-md bg-error-light p-3 text-error">{error}</p>}
    <form onSubmit={(event) => { event.preventDefault(); setSearch(searchDraft.trim()); }} role="search" aria-label={t("findUser")} className="mt-4 flex max-w-xl items-end gap-3">
      <div className="flex-1"><Label htmlFor="lecturer-user-search">{t("findUser")}</Label><Input id="lecturer-user-search" type="search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} /></div>
      <Button type="submit" variant="outline">{t("search")}</Button>
    </form>
    {loadError ? <div role="alert" className="mt-4 rounded-md bg-error-light p-3 text-error"><p>{loadError}</p><Button type="button" variant="outline" className="mt-2" onClick={() => { setLoadError(null); setRetry((value) => value + 1); }}>{t("retry")}</Button></div>
      : <form onSubmit={(event) => void submit(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="lecturer-user">{t("staffUser")}</Label><select id="lecturer-user" value={userId} disabled={loading} onChange={(event) => setUserId(event.target.value)} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{loading ? t("loading") : t("selectUser")}</option>{users.map((user) => <option key={user.user_id} value={user.user_id}>{userName(user)}</option>)}</select>{!loading && users.length === 0 && <p className="mt-1 text-sm text-gray-600">{t("noLecturerUsers")}</p>}</div>
        <div><Label htmlFor="lecturer-staff-number">{t("staffNumber")}</Label><Input id="lecturer-staff-number" maxLength={32} value={staffNumber} onChange={(event) => setStaffNumber(event.target.value)} /></div>
        <div><Label htmlFor="lecturer-department">{t("department")}</Label><select id="lecturer-department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("selectDepartment")}</option>{departments.filter((row) => row.is_active).map((row) => <option key={row.id} value={row.id}>{departmentName(row)}</option>)}</select></div>
        <div><Label htmlFor="lecturer-phone">{t("phone")}</Label><Input id="lecturer-phone" maxLength={32} value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
        <div className="sm:col-span-2"><Label htmlFor="lecturer-payout">{t("payoutDetails")}</Label><Textarea id="lecturer-payout" rows={2} maxLength={2000} value={payout} onChange={(event) => setPayout(event.target.value)} /></div>
        <div className="flex gap-3 sm:col-span-2"><Button type="submit" disabled={busy}>{t("saveLecturer")}</Button><Button type="button" variant="outline" onClick={onCancel}>{t("cancel")}</Button></div>
      </form>}
  </section>;
}
