"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { StaffContractEditor, termLabel } from "@/components/features/staff-contract-editor";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { Department } from "@/lib/api/academic-catalogue";
import type { AcademicTerm } from "@/lib/api/academic-schedule";
import {
  getContract, listContracts, updateLecturer,
  type Contract, type ContractDetail, type EmploymentStatus, type Lecturer,
} from "@/lib/api/hr";
import type { Locale } from "@/lib/api/types";
import { hrErrorMessage } from "@/lib/hr-ui";

interface Props {
  lecturer: Lecturer;
  departments: Department[];
  terms: AcademicTerm[];
  /** false = department head: read-only, no payout details, no contracts. */
  canWrite: boolean;
  onUpdated: (lecturer: Lecturer) => void;
  token: string;
  locale: Locale;
}

type Editing = { kind: "new" } | { kind: "open"; id: string } | null;
const STATUSES: EmploymentStatus[] = ["ACTIVE", "SUSPENDED", "LEFT"];

export function StaffLecturerDetail({ lecturer, departments, terms, canWrite, onUpdated, token, locale }: Props) {
  const t = useTranslations("staffLecturers");
  const [staffNumber, setStaffNumber] = useState(lecturer.staff_number);
  const [departmentId, setDepartmentId] = useState(lecturer.primary_department_id);
  const [phone, setPhone] = useState(lecturer.phone ?? "");
  const [employment, setEmployment] = useState<EmploymentStatus>(lecturer.employment_status);
  const [payout, setPayout] = useState(lecturer.payout_details ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsKey, setContractsKey] = useState("");
  const [contractsError, setContractsError] = useState<string | null>(null);
  const [contractsRetry, setContractsRetry] = useState(0);
  const [editing, setEditing] = useState<Editing>(null);
  const [opened, setOpened] = useState<ContractDetail | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [openRetry, setOpenRetry] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const openedRef = useRef<ContractDetail | null>(null);
  const contractsRequest = `${token}:${locale}:${lecturer.id}:${contractsRetry}`;
  const contractsLoading = canWrite && contractsKey !== contractsRequest && !contractsError;
  const openId = editing?.kind === "open" ? editing.id : null;

  useEffect(() => {
    if (!canWrite) return;
    let active = true;
    listContracts(lecturer.id, token, locale)
      .then((rows) => { if (active) { setContracts(rows); setContractsError(null); setContractsKey(contractsRequest); } })
      .catch((caught) => { if (active) setContractsError(hrErrorMessage(caught, locale, t("contractsLoadError"))); });
    return () => { active = false; };
  }, [canWrite, lecturer.id, token, locale, contractsRequest, t]);

  useEffect(() => { openedRef.current = opened; }, [opened]);

  useEffect(() => {
    // A contract just returned by create/save/activate is already current: do not refetch it.
    if (!openId || openedRef.current?.id === openId) return;
    let active = true;
    getContract(openId, token, locale)
      .then((detail) => { if (active) { setOpened(detail); setOpenError(null); } })
      .catch((caught) => { if (active) setOpenError(hrErrorMessage(caught, locale, t("contractLoadError"))); });
    return () => { active = false; };
  }, [openId, token, locale, openRetry, t]);

  const departmentName = (id: string) => {
    const row = departments.find((item) => item.id === id);
    return row ? (locale === "fr" ? row.name_fr || row.name_en : row.name_en) : "—";
  };
  const name = locale === "fr" ? lecturer.full_name_fr || lecturer.full_name_en : lecturer.full_name_en;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!staffNumber.trim()) { setError(t("lecturerFieldsRequired")); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      onUpdated(await updateLecturer(lecturer.id, {
        staff_number: staffNumber.trim(), primary_department_id: departmentId,
        phone: phone.trim() || null, employment_status: employment, payout_details: payout.trim() || null,
      }, token, locale));
      setNotice(t("lecturerSaved"));
    } catch (caught) { setError(hrErrorMessage(caught, locale, t("saveError"))); } finally { setBusy(false); }
  }

  function contractChanged(detail: ContractDetail, message?: string) {
    setOpened(detail);
    setFlash(message ?? null);
    setEditing({ kind: "open", id: detail.id });
    const summary: Contract = detail;
    setContracts((rows) => rows.some((row) => row.id === detail.id) ? rows.map((row) => row.id === detail.id ? summary : row) : [summary, ...rows]);
  }

  const closeEditor = () => { setEditing(null); setOpened(null); setOpenError(null); setFlash(null); };

  return <section aria-label={t("detailTitle", { name })} className="rounded-2xl border border-gray-200 bg-white p-5">
    <h2 className="font-display text-xl font-semibold">{name}</h2>
    {!canWrite ? <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4" aria-label={t("profile")}>
      <div><dt className="text-gray-600">{t("email")}</dt><dd className="font-medium">{lecturer.email}</dd></div>
      <div><dt className="text-gray-600">{t("staffNumber")}</dt><dd className="font-medium">{lecturer.staff_number}</dd></div>
      <div><dt className="text-gray-600">{t("department")}</dt><dd className="font-medium">{departmentName(lecturer.primary_department_id)}</dd></div>
      <div><dt className="text-gray-600">{t("phone")}</dt><dd className="font-medium">{lecturer.phone ?? "—"}</dd></div>
      <div><dt className="text-gray-600">{t("employmentStatus")}</dt><dd className="font-medium">{t(`employment.${lecturer.employment_status}`)}</dd></div>
    </dl> : <>
      <p className="mt-1 text-sm text-gray-600">{lecturer.email}</p>
      {error && <p role="alert" className="mt-3 rounded-md bg-error-light p-3 text-error">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-md bg-primary-subtle p-3 text-primary">{notice}</p>}
      <form onSubmit={(event) => void save(event)} aria-label={t("profile")} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><Label htmlFor="edit-staff-number">{t("staffNumber")}</Label><Input id="edit-staff-number" maxLength={32} value={staffNumber} onChange={(event) => setStaffNumber(event.target.value)} /></div>
        <div><Label htmlFor="edit-department">{t("department")}</Label><select id="edit-department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3">{departments.map((row) => <option key={row.id} value={row.id}>{departmentName(row.id)}</option>)}</select></div>
        <div><Label htmlFor="edit-phone">{t("phone")}</Label><Input id="edit-phone" maxLength={32} value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
        <div><Label htmlFor="edit-employment">{t("employmentStatus")}</Label><select id="edit-employment" value={employment} onChange={(event) => setEmployment(event.target.value as EmploymentStatus)} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3">{STATUSES.map((value) => <option key={value} value={value}>{t(`employment.${value}`)}</option>)}</select></div>
        <div className="sm:col-span-2 lg:col-span-4"><Label htmlFor="edit-payout">{t("payoutDetails")}</Label><Textarea id="edit-payout" rows={2} maxLength={2000} value={payout} onChange={(event) => setPayout(event.target.value)} /></div>
        <div><Button type="submit" disabled={busy}>{t("saveProfile")}</Button></div>
      </form>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3"><h3 className="font-display text-lg font-semibold">{t("contractsTitle")}</h3><Button type="button" onClick={() => { setOpened(null); setFlash(null); setEditing({ kind: "new" }); }}>{t("newContract")}</Button></div>
      {contractsError ? <div role="alert" className="mt-3 rounded-md bg-error-light p-3 text-error"><p>{contractsError}</p><Button type="button" variant="outline" className="mt-2" onClick={() => { setContractsError(null); setContractsRetry((value) => value + 1); }}>{t("retry")}</Button></div>
        : contractsLoading ? <p role="status" className="mt-3 text-sm text-gray-600">{t("loading")}</p>
        : contracts.length === 0 ? <p className="mt-3 text-sm text-gray-600">{t("noContracts")}</p>
        : <ul className="mt-3 divide-y divide-gray-100">{contracts.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-2"><span>{row.contract_number} · {termLabel(terms.find((term) => term.id === row.term_id), row.term_id)} · {t(`basis.${row.pay_basis}`)} · {t(`status.${row.status}`)}</span><Button type="button" variant="outline" aria-label={t("openContract", { number: row.contract_number })} onClick={() => { setOpened(null); setOpenError(null); setFlash(null); setEditing({ kind: "open", id: row.id }); }}>{t("open")}</Button></li>)}</ul>}

      {editing?.kind === "new" && <StaffContractEditor key="new" lecturer={lecturer} contract={null} terms={terms} onChange={contractChanged} onClose={closeEditor} token={token} locale={locale} />}
      {editing?.kind === "open" && (openError ? <div role="alert" className="mt-4 rounded-md bg-error-light p-3 text-error"><p>{openError}</p><Button type="button" variant="outline" className="mt-2" onClick={() => { setOpenError(null); setOpenRetry((value) => value + 1); }}>{t("retry")}</Button></div>
        : opened && opened.id === editing.id ? <StaffContractEditor key={opened.id} lecturer={lecturer} contract={opened} initialNotice={flash} terms={terms} onChange={contractChanged} onClose={closeEditor} token={token} locale={locale} />
        : <p role="status" className="mt-4 text-sm text-gray-600">{t("loading")}</p>)}
    </>}
  </section>;
}
