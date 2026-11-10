"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Landmark, ShieldCheck } from "lucide-react";

import { listDepartments, type Department } from "@/lib/api/academic-catalogue";
import { ApiError } from "@/lib/api/client";
import {
  DEGREE_LEVELS,
  deactivateRegistrationFee,
  deactivateTuitionFee,
  financeErrorCode,
  formatFeeDate,
  formatXaf,
  listRegistrationFees,
  listTuitionFees,
  parseXafInput,
  resolveProgramFees,
  setRegistrationFee,
  setTuitionFee,
  todayIso,
  type DegreeLevel,
  type RegistrationFee,
  type ResolvedFees,
  type TuitionFee,
} from "@/lib/api/finance";
import { listAllEditorPrograms, type EditorProgram } from "@/lib/api/programs-editor";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900";
const labelClass = "block text-xs font-semibold text-slate-700";
const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
const primaryButton = "inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const linkButton = "text-xs font-semibold text-primary hover:underline disabled:opacity-50";

type TuitionDraft = { scope: "PROGRAM" | "DEPARTMENT"; targetId: string; amount: string; effectiveFrom: string; notes: string };
type RegistrationDraft = { level: DegreeLevel; amount: string; effectiveFrom: string; notes: string };
type GapRow = { program: EditorProgram; resolved: ResolvedFees | null; failed: boolean };

export function StaffFeeSchedule({ locale }: { locale: Locale }) {
  const t = useTranslations("finance");
  const token = useAuthStore((state) => state.accessToken);
  const principal = useAuthStore((state) => state.user);
  const roles = principal?.roles ?? [];
  const authorized = !!token && roles.some((role) => ["registrar", "admin", "super_admin"].includes(role));
  const canEdit = roles.some((role) => ["admin", "super_admin"].includes(role));

  const [showHistory, setShowHistory] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const [registration, setRegistration] = useState<RegistrationFee[]>([]);
  const [tuition, setTuition] = useState<TuitionFee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<EditorProgram[]>([]);
  const [regDraft, setRegDraft] = useState<RegistrationDraft | null>(null);
  const [tuitionDraft, setTuitionDraft] = useState<TuitionDraft>({ scope: "PROGRAM", targetId: "", amount: "", effectiveFrom: todayIso(), notes: "" });
  const [gaps, setGaps] = useState<GapRow[] | null>(null);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryKey = `${token ?? ""}:${locale}:${showHistory}:${refresh}`;
  const loading = loadedKey !== queryKey;

  useEffect(() => {
    if (!authorized || !token) return;
    let current = true;
    Promise.all([
      listRegistrationFees(showHistory, token, locale),
      listTuitionFees(showHistory, token, locale),
      listDepartments(token, locale).catch(() => [] as Department[]),
      listAllEditorPrograms(token, locale).catch(() => [] as EditorProgram[]),
    ])
      .then(([reg, tui, deps, progs]) => {
        if (!current) return;
        setRegistration(reg);
        setTuition(tui);
        setDepartments(deps);
        setPrograms(progs);
        setError(null);
        setLoadedKey(queryKey);
      })
      .catch((caught) => {
        if (!current) return;
        setError(describe(caught));
        setLoadedKey(queryKey);
      });
    return () => { current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, token, locale, showHistory, refresh, queryKey]);

  function describe(caught: unknown): string {
    const code = financeErrorCode(caught);
    if (code) return t(`errors.${code}`);
    return caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError");
  }

  const programName = useMemo(() => {
    const map = new Map<string, string>();
    for (const program of programs) map.set(program.id, (locale === "fr" && program.name_fr) || program.name_en);
    return (id: string | null) => (id && map.get(id)) || id || "—";
  }, [programs, locale]);
  const departmentName = useMemo(() => {
    const map = new Map<string, string>();
    for (const department of departments) map.set(department.id, (locale === "fr" && department.name_fr) || department.name_en);
    return (id: string | null) => (id && map.get(id)) || id || "—";
  }, [departments, locale]);

  async function run(action: () => Promise<unknown>, success: string) {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(success);
      setGaps(null);
      setRefresh((value) => value + 1);
    } catch (caught) {
      setError(describe(caught));
    } finally {
      setBusy(false);
    }
  }

  function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !regDraft) return;
    const amount = parseXafInput(regDraft.amount);
    if (amount === null) { setError(t("fees.invalidAmount")); setMessage(null); return; }
    const draft = regDraft;
    void run(async () => {
      await setRegistrationFee(draft.level, {
        amount, effective_from: draft.effectiveFrom || undefined, notes: draft.notes.trim() || undefined,
      }, token, locale);
      setRegDraft(null);
    }, t("fees.saved"));
  }

  function submitTuition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const amount = parseXafInput(tuitionDraft.amount);
    if (amount === null) { setError(t("fees.invalidAmount")); setMessage(null); return; }
    if (!tuitionDraft.targetId) { setError(t("errors.TUITION_SCOPE_REQUIRED")); setMessage(null); return; }
    const draft = tuitionDraft;
    void run(async () => {
      await setTuitionFee({
        ...(draft.scope === "PROGRAM" ? { program_id: draft.targetId } : { department_id: draft.targetId }),
        amount, effective_from: draft.effectiveFrom || undefined, notes: draft.notes.trim() || undefined,
      }, token, locale);
      setTuitionDraft((value) => ({ ...value, targetId: "", amount: "", notes: "" }));
    }, t("fees.saved"));
  }

  function deactivate(kind: "registration" | "tuition", id: string) {
    if (!token || !window.confirm(t("fees.confirmDeactivate"))) return;
    void run(() => (kind === "registration" ? deactivateRegistrationFee(id, token, locale) : deactivateTuitionFee(id, token, locale)), t("fees.deactivated"));
  }

  async function checkGaps() {
    if (!token || gapsLoading) return;
    setGapsLoading(true);
    setError(null);
    try {
      const rows: GapRow[] = [];
      for (let index = 0; index < programs.length; index += 6) {
        const batch = programs.slice(index, index + 6);
        const results = await Promise.all(batch.map(async (program): Promise<GapRow> => {
          try { return { program, resolved: await resolveProgramFees(program.id, token, locale), failed: false }; }
          catch { return { program, resolved: null, failed: true }; }
        }));
        rows.push(...results);
      }
      setGaps(rows);
    } finally {
      setGapsLoading(false);
    }
  }

  if (!authorized) return <section className="mx-auto max-w-lg px-4 py-16 text-center"><ShieldCheck className="mx-auto size-10 text-primary" aria-hidden="true" /><h1 className="mt-4 font-display text-2xl font-semibold">{t("accessTitle")}</h1><p className="mt-2 text-sm text-slate-600">{t("accessBody")}</p></section>;

  const activeRegistration = (level: DegreeLevel) => registration.find((fee) => fee.degree_level === level && fee.is_active);
  const historyFor = (level: DegreeLevel) => registration.filter((fee) => fee.degree_level === level && !fee.is_active);
  const activeTuition = tuition.filter((fee) => fee.is_active);
  const inactiveTuition = tuition.filter((fee) => !fee.is_active);
  const gapRows = gaps?.filter((row) => row.failed || !row.resolved || row.resolved.registration_fee === null || row.resolved.tuition_fee === null) ?? [];

  return <div className="px-4 py-8 sm:px-7 lg:px-9"><div className="mx-auto max-w-7xl space-y-7">
    <header>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#aa7c10]">{t("fees.eyebrow")}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-slate-950">{t("fees.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("fees.intro")}</p>
      {!canEdit && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("fees.readOnly")}</p>}
    </header>
    <div aria-live="polite">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
    </div>
    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={showHistory} onChange={(event) => setShowHistory(event.target.checked)} className="size-4" />{t("fees.showHistory")}</label>
    {loading && <p role="status" className="text-sm text-slate-600">{t("loading")}</p>}

    <section aria-labelledby="fees-registration-heading" className={cardClass}>
      <div className="flex items-center gap-3"><Landmark className="size-5 text-primary" aria-hidden="true" /><h2 id="fees-registration-heading" className="font-display text-xl font-semibold text-slate-900">{t("fees.registrationTitle")}</h2></div>
      <p className="mt-2 text-xs leading-5 text-slate-600">{t("fees.registrationHint")}</p>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">{t("fees.registrationTitle")}</caption>
        <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="py-2 pr-3">{t("fees.level")}</th><th scope="col" className="py-2 pr-3">{t("fees.amount")}</th><th scope="col" className="py-2 pr-3">{t("fees.effectiveFrom")}</th><th scope="col" className="py-2 pr-3">{t("fees.notes")}</th>{canEdit && <th scope="col" className="py-2"><span className="sr-only">{t("fees.actions")}</span></th>}</tr></thead>
        <tbody className="divide-y divide-slate-100">{DEGREE_LEVELS.map((level) => {
          const fee = activeRegistration(level);
          return <tr key={level} className="align-top"><th scope="row" className="py-3 pr-3 font-semibold text-slate-900">{t(`levels.${level}`)}</th>
            <td className="py-3 pr-3 tabular-nums">{fee ? formatXaf(fee.amount, locale) : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{t("fees.notConfigured")}</span>}</td>
            <td className="py-3 pr-3">{fee ? formatFeeDate(fee.effective_from, locale) : "—"}</td>
            <td className="py-3 pr-3 text-slate-600">{fee?.notes ?? "—"}</td>
            {canEdit && <td className="space-x-3 whitespace-nowrap py-3 text-right"><button type="button" className={linkButton} disabled={busy} onClick={() => { setRegDraft({ level, amount: fee ? String(fee.amount) : "", effectiveFrom: todayIso(), notes: "" }); setMessage(null); setError(null); }}>{fee ? t("fees.replace") : t("fees.set")}<span className="sr-only"> {t(`levels.${level}`)}</span></button>{fee && <button type="button" className={`${linkButton} !text-slate-600`} disabled={busy} onClick={() => deactivate("registration", fee.id)}>{t("fees.deactivate")}<span className="sr-only"> {t(`levels.${level}`)}</span></button>}</td>}
          </tr>;
        })}</tbody>
      </table></div>
      {showHistory && <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold text-slate-900">{t("fees.history")}</h3>
        {DEGREE_LEVELS.every((level) => historyFor(level).length === 0) ? <p className="mt-2 text-sm text-slate-600">{t("fees.noHistory")}</p> : <ul className="mt-2 space-y-1 text-sm text-slate-700">{DEGREE_LEVELS.flatMap((level) => historyFor(level).map((fee) => <li key={fee.id}>{t(`levels.${level}`)} · {formatXaf(fee.amount, locale)} · {formatFeeDate(fee.effective_from, locale)} → {formatFeeDate(fee.deactivated_at, locale)}</li>))}</ul>}</div>}
      {canEdit && regDraft && <form onSubmit={submitRegistration} className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2" aria-label={t("fees.editRegistration", { level: t(`levels.${regDraft.level}`) })}>
        <p className="text-sm font-semibold text-slate-900 sm:col-span-2">{t("fees.editRegistration", { level: t(`levels.${regDraft.level}`) })}</p>
        <label className={labelClass}>{t("fees.amountXaf")}<input required inputMode="numeric" autoFocus value={regDraft.amount} onChange={(event) => setRegDraft({ ...regDraft, amount: event.target.value })} className={inputClass} /></label>
        <label className={labelClass}>{t("fees.effectiveFrom")}<input type="date" value={regDraft.effectiveFrom} onChange={(event) => setRegDraft({ ...regDraft, effectiveFrom: event.target.value })} className={inputClass} /></label>
        <label className={`${labelClass} sm:col-span-2`}>{t("fees.notes")}<input maxLength={1000} value={regDraft.notes} onChange={(event) => setRegDraft({ ...regDraft, notes: event.target.value })} className={inputClass} /></label>
        <div className="flex gap-2 sm:col-span-2"><button type="submit" disabled={busy} className={primaryButton}>{t("fees.save")}</button><button type="button" onClick={() => setRegDraft(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t("cancel")}</button></div>
      </form>}
    </section>

    <section aria-labelledby="fees-tuition-heading" className={cardClass}>
      <h2 id="fees-tuition-heading" className="font-display text-xl font-semibold text-slate-900">{t("fees.tuitionTitle")}</h2>
      <p className="mt-2 text-xs leading-5 text-slate-600">{t("fees.tuitionHint")}</p>
      {activeTuition.length === 0 && !loading ? <p className="mt-5 text-sm text-slate-600">{t("fees.noTuition")}</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm">
        <caption className="sr-only">{t("fees.tuitionTitle")}</caption>
        <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="py-2 pr-3">{t("fees.scope")}</th><th scope="col" className="py-2 pr-3">{t("fees.target")}</th><th scope="col" className="py-2 pr-3">{t("fees.amount")}</th><th scope="col" className="py-2 pr-3">{t("fees.effectiveFrom")}</th><th scope="col" className="py-2 pr-3">{t("fees.notes")}</th>{canEdit && <th scope="col" className="py-2"><span className="sr-only">{t("fees.actions")}</span></th>}</tr></thead>
        <tbody className="divide-y divide-slate-100">{activeTuition.map((fee) => <tr key={fee.id} className="align-top"><td className="py-3 pr-3">{t(`fees.scopes.${fee.scope}`)}</td><td className="py-3 pr-3 font-semibold text-slate-900">{fee.scope === "PROGRAM" ? programName(fee.program_id) : departmentName(fee.department_id)}</td><td className="py-3 pr-3 tabular-nums">{formatXaf(fee.amount, locale)}</td><td className="py-3 pr-3">{formatFeeDate(fee.effective_from, locale)}</td><td className="py-3 pr-3 text-slate-600">{fee.notes ?? "—"}</td>{canEdit && <td className="space-x-3 whitespace-nowrap py-3 text-right"><button type="button" className={linkButton} disabled={busy} onClick={() => { setTuitionDraft({ scope: fee.scope, targetId: (fee.scope === "PROGRAM" ? fee.program_id : fee.department_id) ?? "", amount: String(fee.amount), effectiveFrom: todayIso(), notes: "" }); setMessage(null); document.getElementById("tuition-amount")?.focus(); }}>{t("fees.replace")}</button><button type="button" className={`${linkButton} !text-slate-600`} disabled={busy} onClick={() => deactivate("tuition", fee.id)}>{t("fees.deactivate")}</button></td>}</tr>)}</tbody>
      </table></div>}
      {showHistory && <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold text-slate-900">{t("fees.history")}</h3>{inactiveTuition.length === 0 ? <p className="mt-2 text-sm text-slate-600">{t("fees.noHistory")}</p> : <ul className="mt-2 space-y-1 text-sm text-slate-700">{inactiveTuition.map((fee) => <li key={fee.id}>{fee.scope === "PROGRAM" ? programName(fee.program_id) : `${departmentName(fee.department_id)} (${t("fees.scopes.DEPARTMENT")})`} · {formatXaf(fee.amount, locale)} · {formatFeeDate(fee.effective_from, locale)} → {formatFeeDate(fee.deactivated_at, locale)}</li>)}</ul>}</div>}
      {canEdit && <form onSubmit={submitTuition} className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
        <p className="text-sm font-semibold text-slate-900 sm:col-span-2">{t("fees.setTuition")}</p>
        <label className={labelClass}>{t("fees.scope")}<select value={tuitionDraft.scope} onChange={(event) => setTuitionDraft({ ...tuitionDraft, scope: event.target.value as TuitionDraft["scope"], targetId: "" })} className={inputClass}><option value="PROGRAM">{t("fees.scopes.PROGRAM")}</option><option value="DEPARTMENT">{t("fees.scopes.DEPARTMENT")}</option></select></label>
        <label className={labelClass}>{t("fees.target")}<select required value={tuitionDraft.targetId} onChange={(event) => setTuitionDraft({ ...tuitionDraft, targetId: event.target.value })} className={inputClass}><option value="">{t("fees.chooseTarget")}</option>{tuitionDraft.scope === "PROGRAM" ? programs.map((program) => <option key={program.id} value={program.id}>{program.code} · {(locale === "fr" && program.name_fr) || program.name_en}</option>) : departments.map((department) => <option key={department.id} value={department.id}>{department.code} · {(locale === "fr" && department.name_fr) || department.name_en}</option>)}</select></label>
        <label className={labelClass}>{t("fees.amountXaf")}<input id="tuition-amount" required inputMode="numeric" value={tuitionDraft.amount} onChange={(event) => setTuitionDraft({ ...tuitionDraft, amount: event.target.value })} className={inputClass} /></label>
        <label className={labelClass}>{t("fees.effectiveFrom")}<input type="date" value={tuitionDraft.effectiveFrom} onChange={(event) => setTuitionDraft({ ...tuitionDraft, effectiveFrom: event.target.value })} className={inputClass} /></label>
        <label className={`${labelClass} sm:col-span-2`}>{t("fees.notes")}<input maxLength={1000} value={tuitionDraft.notes} onChange={(event) => setTuitionDraft({ ...tuitionDraft, notes: event.target.value })} className={inputClass} /></label>
        <div className="sm:col-span-2"><button type="submit" disabled={busy} className={primaryButton}>{t("fees.save")}</button></div>
      </form>}
    </section>

    <section aria-labelledby="fees-gaps-heading" className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="fees-gaps-heading" className="font-display text-xl font-semibold text-slate-900">{t("fees.gapsTitle")}</h2><p className="mt-1 text-xs leading-5 text-slate-600">{t("fees.gapsHint")}</p></div><button type="button" onClick={() => void checkGaps()} disabled={gapsLoading || programs.length === 0} className={primaryButton}>{gapsLoading ? t("loading") : t("fees.checkGaps")}</button></div>
      <div aria-live="polite">{gaps && (gapRows.length === 0 ? <p className="mt-5 text-sm font-medium text-emerald-700">{t("fees.noGaps")}</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><caption className="sr-only">{t("fees.gapsTitle")}</caption><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="py-2 pr-3">{t("fees.programme")}</th><th scope="col" className="py-2 pr-3">{t("fees.registrationTitle")}</th><th scope="col" className="py-2">{t("fees.tuitionTitle")}</th></tr></thead><tbody className="divide-y divide-slate-100">{gapRows.map((row) => <tr key={row.program.id}><th scope="row" className="py-3 pr-3 font-semibold text-slate-900">{row.program.code} · {(locale === "fr" && row.program.name_fr) || row.program.name_en}<span className="block text-xs font-normal text-slate-500">{row.program.degree_level}</span></th>{row.failed || !row.resolved ? <td colSpan={2} className="py-3 text-red-700">{t("fees.resolveFailed")}</td> : <><td className="py-3 pr-3">{row.resolved.registration_fee === null ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{row.resolved.registration_level ? t("fees.missing") : t("fees.unmappedLevel")}</span> : formatXaf(row.resolved.registration_fee, locale)}</td><td className="py-3">{row.resolved.tuition_fee === null ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{t("fees.missing")}</span> : `${formatXaf(row.resolved.tuition_fee, locale)} (${t(`fees.scopes.${row.resolved.tuition_source ?? "PROGRAM"}`)})`}</td></>}</tr>)}</tbody></table></div>)}</div>
    </section>
  </div></div>;
}
