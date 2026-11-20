"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { StaffLecturerDetail } from "@/components/features/staff-lecturer-detail";
import { StaffLecturerForm } from "@/components/features/staff-lecturer-form";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { listDepartments, type Department } from "@/lib/api/academic-catalogue";
import { listTerms, type AcademicTerm } from "@/lib/api/academic-schedule";
import { listLecturers, type EmploymentStatus, type Lecturer } from "@/lib/api/hr";
import type { Locale, Paginated } from "@/lib/api/types";
import { hrErrorMessage, LECTURER_READER_ROLES, PAYROLL_ROLES } from "@/lib/hr-ui";
import { useAuthStore } from "@/stores/auth-store";

export function StaffLecturers({ locale }: { locale: Locale }) {
  const t = useTranslations("staffLecturers");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const authorized = !!token && roles.some((role) => LECTURER_READER_ROLES.includes(role));
  const canWrite = roles.some((role) => PAYROLL_ROLES.includes(role));

  const [departments, setDepartments] = useState<Department[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [refKey, setRefKey] = useState("");
  const [refError, setRefError] = useState<string | null>(null);
  const [refRetry, setRefRetry] = useState(0);

  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState<EmploymentStatus | "">("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<Lecturer> | null>(null);
  const [listKey, setListKey] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [listRetry, setListRetry] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refRequest = `${token ?? ""}:${locale}:${refRetry}`;
  const listRequest = `${token ?? ""}:${locale}:${search}:${departmentId}:${status}:${page}:${listRetry}`;
  const refLoading = refKey !== refRequest && !refError;
  const listLoading = listKey !== listRequest && !listError;

  useEffect(() => {
    if (!authorized || !token) return;
    let active = true;
    // Terms are only needed for contracts, which department heads cannot see.
    Promise.all([listDepartments(token, locale), canWrite ? listTerms(token, locale) : Promise.resolve([] as AcademicTerm[])])
      .then(([departmentRows, termRows]) => {
        if (!active) return;
        setDepartments(departmentRows); setTerms(termRows); setRefError(null); setRefKey(refRequest);
      })
      .catch((caught) => { if (active) setRefError(hrErrorMessage(caught, locale, t("loadError"))); });
    return () => { active = false; };
  }, [authorized, canWrite, token, locale, refRequest, t]);

  useEffect(() => {
    if (!authorized || !token) return;
    let active = true;
    listLecturers({ page, search: search || undefined, department_id: departmentId || undefined, employment_status: status }, token, locale)
      .then((data) => { if (active) { setResult(data); setListError(null); setListKey(listRequest); } })
      .catch((caught) => { if (active) setListError(hrErrorMessage(caught, locale, t("loadError"))); });
    return () => { active = false; };
  }, [authorized, token, locale, page, search, departmentId, status, listRequest, t]);

  if (!authorized || !token) return <Container className="py-10"><p role="alert" className="rounded-md bg-error-light p-4 text-error">{t("forbidden")}</p></Container>;

  const items = result?.items ?? [];
  const selected = items.find((row) => row.id === selectedId) ?? null;
  const pagination = result?.pagination;
  const departmentName = (id: string) => {
    const row = departments.find((item) => item.id === id);
    return row ? (locale === "fr" ? row.name_fr || row.name_en : row.name_en) : id;
  };
  const resetPage = () => setPage(1);

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchDraft.trim()); resetPage();
  }

  function replaceLecturer(next: Lecturer) {
    setResult((current) => current ? { ...current, items: current.items.map((row) => row.id === next.id ? next : row) } : current);
  }

  return <Container className="py-8 lg:py-10"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-3xl font-semibold text-gray-900">{t("title")}</h1><p className="mt-2 max-w-2xl text-gray-600">{t(canWrite ? "intro" : "introReadOnly")}</p></div>{canWrite && !adding && <Button type="button" onClick={() => { setAdding(true); setNotice(null); }}>{t("addLecturer")}</Button>}</div>
    {notice && <p role="status" className="mb-4 rounded-md bg-primary-subtle p-3 text-primary">{notice}</p>}
    {refError && <div role="alert" className="mb-4 rounded-md bg-error-light p-3 text-error"><p>{refError}</p><Button type="button" variant="outline" className="mt-2" onClick={() => { setRefError(null); setRefRetry((value) => value + 1); }}>{t("retry")}</Button></div>}
    {adding && canWrite && !refError && !refLoading && <div className="mb-6"><StaffLecturerForm departments={departments} token={token} locale={locale} onCancel={() => setAdding(false)} onCreated={(created) => { setAdding(false); setNotice(t("lecturerCreated")); setSelectedId(created.id); setListRetry((value) => value + 1); }} /></div>}

    <section aria-label={t("listTitle")} className="rounded-2xl border border-gray-200 bg-white p-5">
      <form onSubmit={applySearch} role="search" aria-label={t("filters")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <div><Label htmlFor="lecturer-search">{t("search")}</Label><Input id="lecturer-search" type="search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} /></div>
        <div><Label htmlFor="lecturer-filter-department">{t("department")}</Label><select id="lecturer-filter-department" value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); resetPage(); }} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("allDepartments")}</option>{departments.map((row) => <option key={row.id} value={row.id}>{departmentName(row.id)}</option>)}</select></div>
        <div><Label htmlFor="lecturer-filter-status">{t("employmentStatus")}</Label><select id="lecturer-filter-status" value={status} onChange={(event) => { setStatus(event.target.value as EmploymentStatus | ""); resetPage(); }} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("allStatuses")}</option>{(["ACTIVE", "SUSPENDED", "LEFT"] as const).map((value) => <option key={value} value={value}>{t(`employment.${value}`)}</option>)}</select></div>
        <Button type="submit" variant="outline">{t("search")}</Button>
      </form>
      {listError ? <div role="alert" className="mt-4 rounded-md bg-error-light p-3 text-error"><p>{listError}</p><Button type="button" variant="outline" className="mt-2" onClick={() => { setListError(null); setListRetry((value) => value + 1); }}>{t("retry")}</Button></div>
        : listLoading ? <p role="status" className="mt-4 text-gray-600">{t("loading")}</p>
        : items.length === 0 ? <p className="mt-4 text-gray-600">{t("noLecturers")}</p>
        : <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-600"><th scope="col" className="py-2 pr-3">{t("name")}</th><th scope="col" className="py-2 pr-3">{t("staffNumber")}</th><th scope="col" className="py-2 pr-3">{t("department")}</th><th scope="col" className="py-2 pr-3">{t("employmentStatus")}</th><th scope="col" className="py-2"><span className="sr-only">{t("actions")}</span></th></tr></thead>
          <tbody>{items.map((row) => { const name = locale === "fr" ? row.full_name_fr || row.full_name_en : row.full_name_en; return <tr key={row.id} className="border-b border-gray-100"><td className="py-2 pr-3">{name}</td><td className="py-2 pr-3">{row.staff_number}</td><td className="py-2 pr-3">{departmentName(row.primary_department_id)}</td><td className="py-2 pr-3">{t(`employment.${row.employment_status}`)}</td><td className="py-2"><Button type="button" variant="outline" aria-pressed={row.id === selectedId} aria-label={t("openLecturer", { name })} onClick={() => setSelectedId(row.id)}>{t("open")}</Button></td></tr>; })}</tbody>
        </table></div>}
      {pagination && pagination.total_pages > 1 && !listError && <nav aria-label={t("pagination")} className="mt-4 flex items-center justify-between text-sm"><Button type="button" variant="outline" disabled={!pagination.has_previous || listLoading} onClick={() => setPage((value) => Math.max(1, value - 1))}>{t("previous")}</Button><span>{t("pageOf", { page: pagination.page, total: pagination.total_pages })}</span><Button type="button" variant="outline" disabled={!pagination.has_next || listLoading} onClick={() => setPage((value) => value + 1)}>{t("next")}</Button></nav>}
    </section>

    {selected && !refError && !refLoading && <div className="mt-6"><StaffLecturerDetail key={selected.id} lecturer={selected} departments={departments} terms={terms} canWrite={canWrite} onUpdated={replaceLecturer} token={token} locale={locale} /></div>}
  </Container>;
}
