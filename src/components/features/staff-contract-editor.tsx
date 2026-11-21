"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";

import { StaffContractLines } from "@/components/features/staff-contract-lines";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { AcademicTerm } from "@/lib/api/academic-schedule";
import {
  activateContract, closeContract, createContract, getContract, updateContract, voidContract,
  type ContractDetail, type ContractInput, type Lecturer, type PayBasis, type PerCoursePayment,
} from "@/lib/api/hr";
import type { Locale } from "@/lib/api/types";
import { hrErrorMessage, parseAmount } from "@/lib/hr-ui";

interface Props {
  lecturer: Lecturer;
  /** null = a new contract being drafted. */
  contract: ContractDetail | null;
  terms: AcademicTerm[];
  onChange: (contract: ContractDetail, message?: string) => void;
  /** Shown on mount, so a notice survives the remount that follows creating a contract. */
  initialNotice?: string | null;
  onClose: () => void;
  token: string;
  locale: Locale;
}

const MIN_REASON = 5;
const BADGE: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700", ACTIVE: "bg-success-light text-success",
  CLOSED: "bg-primary-subtle text-primary", VOIDED: "bg-error-light text-error",
};

export const termLabel = (term: AcademicTerm | undefined, fallback: string) => term ? `${term.academic_year} · S${term.semester}` : fallback;

export function StaffContractEditor({ lecturer, contract, terms, onChange, initialNotice = null, onClose, token, locale }: Props) {
  const t = useTranslations("staffLecturers");
  const [termId, setTermId] = useState(contract?.term_id ?? "");
  const [number, setNumber] = useState(contract?.contract_number ?? "");
  const [basis, setBasis] = useState<PayBasis>(contract?.pay_basis ?? "PER_HOUR");
  const [rateCm, setRateCm] = useState(contract?.rate_cm?.toString() ?? "");
  const [rateTd, setRateTd] = useState(contract?.rate_td?.toString() ?? "");
  const [rateTp, setRateTp] = useState(contract?.rate_tp?.toString() ?? "");
  const [payment, setPayment] = useState<PerCoursePayment>(contract?.per_course_payment ?? "ON_COMPLETION");
  const [signedOn, setSignedOn] = useState(contract?.signed_on ?? "");
  const [notes, setNotes] = useState(contract?.notes ?? "");
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const voidButtonRef = useRef<HTMLButtonElement>(null);
  const status = contract?.status ?? "DRAFT";
  const editable = status === "DRAFT";
  const term = terms.find((row) => row.id === (contract?.term_id ?? termId));

  async function run(action: () => Promise<ContractDetail>, message: string) {
    setBusy(true); setError(null); setNotice(null);
    try {
      const next = await action();
      onChange({ ...next, lines: next.lines ?? contract?.lines ?? [] }, message);
      setNotice(message);
      return true;
    } catch (caught) {
      setError(hrErrorMessage(caught, locale, t("saveError")));
      return false;
    } finally { setBusy(false); }
  }

  function buildInput(): ContractInput | null {
    if (!termId) { setError(t("termRequired")); return null; }
    if (!number.trim()) { setError(t("numberRequired")); return null; }
    let rates: [number | null, number | null, number | null] = [null, null, null];
    if (basis === "PER_HOUR") {
      const parsed = [parseAmount(rateCm), parseAmount(rateTd), parseAmount(rateTp)];
      if (parsed.some((rate) => rate === null)) { setError(t("ratesInvalid")); return null; }
      rates = parsed as [number, number, number];
    }
    return {
      lecturer_id: lecturer.id, term_id: termId, contract_number: number.trim(), pay_basis: basis,
      rate_cm: rates[0], rate_td: rates[1], rate_tp: rates[2],
      per_course_payment: basis === "PER_COURSE" ? payment : null,
      signed_on: signedOn || null, notes: notes.trim() || null,
    };
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null); setNotice(null);
    const input = buildInput();
    if (!input) return;
    // The server needs complete basis fields on every save (PUT semantics).
    await run(
      () => contract ? updateContract(contract.id, input, token, locale) : createContract(input, token, locale),
      t(contract ? "contractSaved" : "contractCreated"),
    );
  }

  async function confirmVoid() {
    if (!contract) return;
    const trimmed = reason.trim();
    if (trimmed.length < MIN_REASON) { setReasonError(true); return; }
    setReasonError(false);
    if (await run(() => voidContract(contract.id, trimmed, token, locale), t("contractVoided"))) { setVoiding(false); setReason(""); }
  }

  useEffect(() => { if (voiding) reasonRef.current?.focus(); }, [voiding]);

  const dismissVoid = () => { setVoiding(false); setReason(""); setReasonError(false); voidButtonRef.current?.focus(); };
  const onVoidKeyDown = (event: KeyboardEvent<HTMLDivElement>) => { if (event.key === "Escape") { event.stopPropagation(); dismissVoid(); } };

  const refresh = async () => { if (contract) onChange(await getContract(contract.id, token, locale)); };

  return <section aria-label={t("contractTitle")} className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-display text-xl font-semibold">{contract ? t("contractHeading", { number: contract.contract_number }) : t("newContract")}</h3>
      <div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE[status]}`}>{t(`status.${status}`)}</span><Button type="button" variant="outline" onClick={onClose}>{t("closeEditor")}</Button></div>
    </div>
    {error && <p role="alert" className="mt-3 rounded-md bg-error-light p-3 text-error">{error}</p>}
    {notice && <p role="status" className="mt-3 rounded-md bg-primary-subtle p-3 text-primary">{notice}</p>}
    {contract?.status === "VOIDED" && contract.void_reason && <p className="mt-3 text-sm text-gray-700"><span className="font-semibold">{t("voidReason")}:</span> {contract.void_reason}</p>}

    {editable ? <form onSubmit={(event) => void save(event)} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><Label htmlFor="contract-term">{t("term")}</Label><select id="contract-term" value={termId} disabled={!!contract} onChange={(event) => setTermId(event.target.value)} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 disabled:bg-gray-50"><option value="">{t("selectTerm")}</option>{terms.map((row) => <option key={row.id} value={row.id}>{termLabel(row, row.id)}</option>)}</select></div>
        <div><Label htmlFor="contract-number">{t("contractNumber")}</Label><Input id="contract-number" value={number} maxLength={40} onChange={(event) => setNumber(event.target.value)} /></div>
        <div><Label htmlFor="contract-signed">{t("signedOn")}</Label><Input id="contract-signed" type="date" value={signedOn} onChange={(event) => setSignedOn(event.target.value)} /></div>
      </div>
      <fieldset className="space-y-3"><legend className="text-sm font-medium text-gray-900">{t("payBasis")}</legend>
        <div className="flex flex-wrap gap-4">{(["PER_HOUR", "PER_COURSE"] as const).map((value) => <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="pay-basis" value={value} checked={basis === value} onChange={() => setBasis(value)} />{t(`basis.${value}`)}</label>)}</div>
        {basis === "PER_HOUR" ? <div className="grid gap-4 sm:grid-cols-3">
          <div><Label htmlFor="rate-cm">{t("rateCm")}</Label><Input id="rate-cm" type="number" min={1} step={1} value={rateCm} onChange={(event) => setRateCm(event.target.value)} /></div>
          <div><Label htmlFor="rate-td">{t("rateTd")}</Label><Input id="rate-td" type="number" min={1} step={1} value={rateTd} onChange={(event) => setRateTd(event.target.value)} /></div>
          <div><Label htmlFor="rate-tp">{t("rateTp")}</Label><Input id="rate-tp" type="number" min={1} step={1} value={rateTp} onChange={(event) => setRateTp(event.target.value)} /></div>
        </div> : <div className="max-w-sm"><Label htmlFor="per-course-payment">{t("paymentMode")}</Label><select id="per-course-payment" value={payment} onChange={(event) => setPayment(event.target.value as PerCoursePayment)} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="ON_COMPLETION">{t("payment.ON_COMPLETION")}</option><option value="MONTHLY_INSTALMENTS">{t("payment.MONTHLY_INSTALMENTS")}</option></select></div>}
      </fieldset>
      <div><Label htmlFor="contract-notes">{t("notes")}</Label><Textarea id="contract-notes" rows={3} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
      <Button type="submit" disabled={busy}>{contract ? t("saveContract") : t("createContract")}</Button>
    </form> : contract && <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4" aria-label={t("contractDetails")}>
      <div><dt className="text-gray-600">{t("term")}</dt><dd className="font-medium">{termLabel(term, contract.term_id)}</dd></div>
      <div><dt className="text-gray-600">{t("contractNumber")}</dt><dd className="font-medium">{contract.contract_number}</dd></div>
      <div><dt className="text-gray-600">{t("signedOn")}</dt><dd className="font-medium">{contract.signed_on ?? "—"}</dd></div>
      <div><dt className="text-gray-600">{t("payBasis")}</dt><dd className="font-medium">{t(`basis.${contract.pay_basis}`)}</dd></div>
      {contract.pay_basis === "PER_HOUR" ? <>
        <div><dt className="text-gray-600">{t("rateCm")}</dt><dd className="font-medium">{contract.rate_cm}</dd></div>
        <div><dt className="text-gray-600">{t("rateTd")}</dt><dd className="font-medium">{contract.rate_td}</dd></div>
        <div><dt className="text-gray-600">{t("rateTp")}</dt><dd className="font-medium">{contract.rate_tp}</dd></div>
      </> : <div><dt className="text-gray-600">{t("paymentMode")}</dt><dd className="font-medium">{contract.per_course_payment ? t(`payment.${contract.per_course_payment}`) : "—"}</dd></div>}
      {contract.notes && <div className="sm:col-span-2 lg:col-span-4"><dt className="text-gray-600">{t("notes")}</dt><dd className="font-medium">{contract.notes}</dd></div>}
    </dl>}

    {contract && <StaffContractLines contract={contract} editable={editable} onChanged={refresh} token={token} locale={locale} />}

    {contract && (status === "DRAFT" || status === "ACTIVE") && <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
      {status === "DRAFT" && <Button type="button" disabled={busy} onClick={() => void run(() => activateContract(contract.id, token, locale), t("contractActivated"))}>{t("activate")}</Button>}
      {status === "ACTIVE" && <Button type="button" variant="outline" disabled={busy} onClick={() => void run(() => closeContract(contract.id, token, locale), t("contractClosed"))}>{t("closeContract")}</Button>}
      <Button ref={voidButtonRef} type="button" variant="outline" disabled={busy} onClick={() => { setVoiding(true); setReasonError(false); }}>{t("void")}</Button>
    </div>}

    {contract && voiding && <div role="dialog" aria-labelledby="void-title" onKeyDown={onVoidKeyDown} className="mt-4 rounded-xl border border-error bg-error-light/40 p-4">
      <h4 id="void-title" className="font-semibold">{t("voidTitle")}</h4>
      <p className="mt-1 text-sm text-gray-700">{t("voidIntro")}</p>
      <div className="mt-3"><Label htmlFor="void-reason">{t("voidReasonLabel")}</Label><Textarea ref={reasonRef} id="void-reason" rows={3} maxLength={1000} value={reason} invalid={reasonError} aria-describedby={reasonError ? "void-reason-error" : undefined} onChange={(event) => setReason(event.target.value)} /></div>
      {reasonError && <p id="void-reason-error" role="alert" className="mt-2 text-sm text-error">{t("voidReasonRequired", { min: MIN_REASON })}</p>}
      <div className="mt-3 flex gap-3"><Button type="button" disabled={busy} onClick={() => void confirmVoid()}>{t("confirmVoid")}</Button><Button type="button" variant="outline" disabled={busy} onClick={dismissVoid}>{t("cancel")}</Button></div>
    </div>}
  </section>;
}
