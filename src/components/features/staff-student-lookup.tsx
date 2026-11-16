"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import {
  STUDENT_STATUSES,
  getStudentForStaff,
  searchStudents,
  updateStudentForStaff,
  type StudentListItem,
  type StudentStaffDetail,
  type StudentStaffUpdate,
  type StudentStatus,
} from "@/lib/api/students";
import type { Locale, Pagination } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const REGISTRY_ROLES = ["registrar", "admin", "super_admin"];
const selectClass = "h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900";

type FieldKey = Exclude<keyof StudentStaffUpdate, "current_level" | "current_semester" | "enrollment_status">;
const textFields: FieldKey[] = [
  "first_name", "last_name", "date_of_birth", "nationality", "phone_primary", "phone_secondary",
  "email_personal", "guardian_name", "guardian_phone", "emergency_contact_name", "emergency_contact_phone",
];

function programName(row: { program_name_en: string | null; program_name_fr: string | null }, locale: Locale) {
  return (locale === "fr" ? row.program_name_fr ?? row.program_name_en : row.program_name_en) ?? null;
}

export function StaffStudentLookup({ locale }: { locale: Locale }) {
  const t = useTranslations("staffStudents");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const authorized = !!user?.roles.some((role) => REGISTRY_ROLES.includes(role));

  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StudentStatus | "">("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<StudentListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentStaffDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Debounce the search box so we do not query on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      setSearch(term.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handle);
  }, [term]);

  useEffect(() => {
    if (!token || !authorized) return;
    let active = true;
    searchStudents({ search: search || undefined, enrollment_status: status || undefined, page }, token, locale)
      .then((result) => { if (active) { setRows(result.items); setPagination(result.pagination); setError(null); } })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, authorized, locale, search, status, page, t]);

  useEffect(() => {
    if (!token || !selectedId) return;
    let active = true;
    getStudentForStaff(selectedId, token, locale)
      .then((result) => { if (active) setDetail(result); })
      .catch((caught) => { if (active) setFormError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("detailError")); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [token, selectedId, locale, t]);

  function open(id: string) {
    setDetail(null); setNotice(null); setFormError(null); setDetailLoading(true); setSelectedId(id);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !detail) return;
    const form = new FormData(event.currentTarget);
    const payload: Record<string, string | number | null> = {};
    for (const key of textFields) {
      const raw = String(form.get(key) ?? "").trim();
      const next = raw === "" ? null : raw;
      if (next !== (detail[key] ?? null)) payload[key] = next;
    }
    for (const key of ["current_level", "current_semester"] as const) {
      const next = Number(form.get(key));
      if (next !== detail[key]) payload[key] = next;
    }
    const nextStatus = String(form.get("enrollment_status"));
    if (nextStatus !== detail.enrollment_status) payload.enrollment_status = nextStatus;
    if (Object.keys(payload).length === 0) { setNotice(t("noChanges")); return; }
    if ((payload.first_name === null) || (payload.last_name === null)) { setFormError(t("nameRequired")); return; }
    setSaving(true); setNotice(null); setFormError(null);
    try {
      const updated = await updateStudentForStaff(detail.id, payload as StudentStaffUpdate, token, locale);
      setDetail(updated);
      setRows((current) => current.map((row) => row.id === updated.id ? {
        ...row, first_name: updated.first_name, last_name: updated.last_name, current_level: updated.current_level,
        current_semester: updated.current_semester, enrollment_status: updated.enrollment_status, email_personal: updated.email_personal,
      } : row));
      setNotice(t("saved"));
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
    } finally { setSaving(false); }
  }

  if (!token || !authorized) {
    return <div className="mx-auto max-w-xl p-10 text-center"><h1 className="font-display text-2xl font-semibold">{t("accessTitle")}</h1><p className="mt-3 text-slate-600">{t("accessBody")}</p></div>;
  }

  return (
    <div className="px-4 py-9 sm:px-7 lg:px-9">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#aa7c00]">{t("eyebrow")}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-slate-900">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{t("intro")}</p>
        </header>

        <form role="search" onSubmit={(event) => event.preventDefault()} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_14rem]">
          <div>
            <Label htmlFor="student-search">{t("searchLabel")}</Label>
            <Input id="student-search" type="search" value={term} onChange={(event) => setTerm(event.target.value)} placeholder={t("searchPlaceholder")} autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="student-status">{t("statusLabel")}</Label>
            <select id="student-status" className={selectClass} value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value as StudentStatus | ""); setPage(1); }}>
              <option value="">{t("allStatuses")}</option>
              {STUDENT_STATUSES.map((value) => <option key={value} value={value}>{t(`statuses.${value}`)}</option>)}
            </select>
          </div>
        </form>

        {error && <p role="alert" className="rounded-lg bg-error-light p-4 text-sm text-error">{error}</p>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <section aria-live="polite" aria-label={t("results")} className="space-y-3">
            {loading ? <p className="text-sm text-slate-600">{t("loading")}</p> : rows.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">{t("empty")}</p>
            ) : (
              <>
                <p className="text-xs text-slate-500">{t("count", { count: pagination?.total ?? rows.length })}</p>
                <ul className="space-y-2">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <button type="button" onClick={() => open(row.id)} aria-pressed={selectedId === row.id}
                        className={`w-full rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-primary ${selectedId === row.id ? "border-primary ring-1 ring-primary" : "border-slate-200"}`}>
                        <span className="block text-xs font-bold uppercase tracking-wider text-primary">{row.student_id}</span>
                        <span className="mt-1 block font-display text-base font-semibold text-slate-900">{row.first_name} {row.last_name}</span>
                        <span className="mt-1 block text-xs text-slate-600">{programName(row, locale) ?? t("noProgramme")} · {t("levelSemester", { level: row.current_level, semester: row.current_semester })}</span>
                        <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">{t(`statuses.${row.enrollment_status}` as never)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {pagination && pagination.total_pages > 1 && (
                  <nav className="flex items-center justify-between pt-2" aria-label={t("pagination")}>
                    <Button type="button" variant="outline" size="sm" disabled={!pagination.has_previous} onClick={() => { setLoading(true); setPage((p) => p - 1); }}>{t("previous")}</Button>
                    <span className="text-xs text-slate-600">{t("pageOf", { page: pagination.page, total: pagination.total_pages })}</span>
                    <Button type="button" variant="outline" size="sm" disabled={!pagination.has_next} onClick={() => { setLoading(true); setPage((p) => p + 1); }}>{t("next")}</Button>
                  </nav>
                )}
              </>
            )}
          </section>

          <section aria-label={t("detailTitle")} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {!selectedId ? <p className="text-sm text-slate-600">{t("selectPrompt")}</p>
              : detailLoading ? <p className="text-sm text-slate-600">{t("loadingDetail")}</p>
              : !detail ? (formError && <p role="alert" className="text-sm text-error">{formError}</p>)
              : (
                <form key={`${detail.id}-${detail.updated_at}`} onSubmit={save} className="space-y-5" noValidate>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">{detail.student_id}</p>
                    <h2 className="mt-1 font-display text-xl font-semibold">{detail.first_name} {detail.last_name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{detail.email_institutional}</p>
                    <p className="text-sm text-slate-600">{programName(detail, locale) ?? t("noProgramme")} · {t("enrolledIn", { year: detail.enrollment_year })}</p>
                  </div>
                  {formError && <p role="alert" className="rounded-lg bg-error-light p-3 text-sm text-error">{formError}</p>}
                  {notice && <p role="status" className="rounded-lg bg-primary-subtle p-3 text-sm text-primary">{notice}</p>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {textFields.map((key) => (
                      <div key={key}>
                        <Label htmlFor={`f-${key}`}>{t(`fields.${key}`)}</Label>
                        <Input id={`f-${key}`} name={key} type={key === "date_of_birth" ? "date" : key === "email_personal" ? "email" : "text"}
                          defaultValue={(detail[key] as string | null) ?? ""} required={key === "first_name" || key === "last_name"} />
                      </div>
                    ))}
                    <div>
                      <Label htmlFor="f-level">{t("fields.current_level")}</Label>
                      <Input id="f-level" name="current_level" type="number" min={1} max={8} defaultValue={detail.current_level} required />
                    </div>
                    <div>
                      <Label htmlFor="f-semester">{t("fields.current_semester")}</Label>
                      <Input id="f-semester" name="current_semester" type="number" min={1} max={3} defaultValue={detail.current_semester} required />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="f-status">{t("fields.enrollment_status")}</Label>
                      <select id="f-status" name="enrollment_status" className={selectClass} defaultValue={detail.enrollment_status}>
                        {STUDENT_STATUSES.map((value) => <option key={value} value={value}>{t(`statuses.${value}`)}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{t("auditNote")}</p>
                  <Button type="submit" disabled={saving}>{saving ? t("saving") : t("save")}</Button>
                </form>
              )}
          </section>
        </div>
      </div>
    </div>
  );
}
