"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Department } from "@/lib/api/academic-catalogue";
import { assignDepartmentHead, endDepartmentHead, listDepartmentHeads, type DepartmentHead } from "@/lib/api/hr";
import type { Locale } from "@/lib/api/types";
import { listManagedUsers, type ManagedUser } from "@/lib/api/user-management";
import { hrErrorMessage } from "@/lib/hr-ui";

interface Props {
  departments: Department[];
  token: string;
  locale: Locale;
}

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

/** Admin-only: assign and end department-head assignments (several current heads per department are allowed). */
export function StaffDepartmentHeadsPanel({ departments, token, locale }: Props) {
  const t = useTranslations("staffLecturers");
  const [heads, setHeads] = useState<DepartmentHead[] | null>(null);
  const [people, setPeople] = useState<ManagedUser[]>([]);
  // The failure itself is kept (not its message) so the effect does not depend on `t`.
  const [loadFailure, setLoadFailure] = useState<{ cause: unknown } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [endDates, setEndDates] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    Promise.all([
      listDepartmentHeads(token, locale),
      listManagedUsers(token, locale, { role: "department_head", per_page: 100 }),
    ])
      .then(([rows, users]) => { if (active) { setHeads(rows); setPeople(users.items); setLoadFailure(null); } })
      .catch((caught) => { if (active) setLoadFailure({ cause: caught }); });
    return () => { active = false; };
  }, [token, locale, attempt]);

  const personName = (id: string) => {
    const person = people.find((row) => row.id === id);
    if (!person) return "—";
    return locale === "fr" ? person.full_name_fr || person.full_name_en : person.full_name_en;
  };
  const departmentName = (id: string) => {
    const row = departments.find((item) => item.id === id);
    return row ? (locale === "fr" ? row.name_fr || row.name_en : row.name_en) : "—";
  };

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = { user_id: field(data, "user_id"), department_id: field(data, "department_id"), starts_on: field(data, "starts_on") };
    if (!input.user_id || !input.department_id || !input.starts_on) { setError(t("headFieldsRequired")); setNotice(null); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = await assignDepartmentHead(input, token, locale);
      setHeads((current) => [saved, ...(current ?? [])]);
      form.reset(); setNotice(t("headAssigned"));
    } catch (caught) { setError(hrErrorMessage(caught, locale, t("saveError"))); } finally { setBusy(false); }
  }

  async function end(head: DepartmentHead) {
    const endsOn = endDates[head.id] ?? "";
    if (!endsOn) { setError(t("headEndRequired")); setNotice(null); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = await endDepartmentHead(head.id, endsOn, token, locale);
      setHeads((current) => (current ?? []).map((row) => row.id === saved.id ? saved : row));
      setNotice(t("headEnded"));
    } catch (caught) { setError(hrErrorMessage(caught, locale, t("saveError"))); } finally { setBusy(false); }
  }

  const select = "h-11 w-full rounded-md border border-gray-300 bg-white px-3";
  const candidates = people.filter((row) => row.is_active);
  return <section aria-labelledby="department-heads-title" className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
    <h2 id="department-heads-title" className="font-display text-xl font-semibold">{t("headsTitle")}</h2>
    <p className="mt-1 text-sm text-gray-600">{t("headsIntro")}</p>
    {error && <p role="alert" className="mt-3 rounded-md bg-error-light p-3 text-error">{error}</p>}
    {notice && <p role="status" className="mt-3 rounded-md bg-primary-subtle p-3 text-primary">{notice}</p>}
    {loadFailure ? <div role="alert" className="mt-4 rounded-md bg-error-light p-3 text-error"><p>{hrErrorMessage(loadFailure.cause, locale, t("headsLoadError"))}</p><Button type="button" variant="outline" className="mt-2" onClick={() => { setLoadFailure(null); setAttempt((value) => value + 1); }}>{t("retry")}</Button></div>
      : !heads ? <p role="status" className="mt-4 text-gray-600">{t("loading")}</p>
      : <>
        <form onSubmit={(event) => void assign(event)} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div><Label htmlFor="head-user">{t("headPerson")}</Label><select id="head-user" name="user_id" className={select} defaultValue=""><option value="">{t("selectHeadPerson")}</option>{candidates.map((row) => <option key={row.id} value={row.id}>{`${personName(row.id)} (${row.email})`}</option>)}</select></div>
          <div><Label htmlFor="head-department">{t("department")}</Label><select id="head-department" name="department_id" className={select} defaultValue=""><option value="">{t("selectDepartment")}</option>{departments.filter((row) => row.is_active).map((row) => <option key={row.id} value={row.id}>{departmentName(row.id)}</option>)}</select></div>
          <div><Label htmlFor="head-starts">{t("headStartsOn")}</Label><Input id="head-starts" name="starts_on" type="date" /></div>
          <Button type="submit" disabled={busy}>{t("assignHead")}</Button>
        </form>
        {candidates.length === 0 && <p className="mt-2 text-sm text-gray-600">{t("noHeadPeople")}</p>}
        {heads.length === 0 ? <p className="mt-4 text-gray-600">{t("noHeads")}</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-600"><th scope="col" className="py-2 pr-3">{t("headPerson")}</th><th scope="col" className="py-2 pr-3">{t("department")}</th><th scope="col" className="py-2 pr-3">{t("headStartsOn")}</th><th scope="col" className="py-2 pr-3">{t("headEndsOn")}</th><th scope="col" className="py-2"><span className="sr-only">{t("actions")}</span></th></tr></thead>
          <tbody>{heads.map((head) => { const name = personName(head.user_id); return <tr key={head.id} className="border-b border-gray-100">
            <td className="py-2 pr-3">{name}</td><td className="py-2 pr-3">{departmentName(head.department_id)}</td><td className="py-2 pr-3">{head.starts_on}</td>
            <td className="py-2 pr-3">{head.ends_on ?? t("headCurrent")}</td>
            <td className="py-2">{!head.ends_on && <div className="flex flex-wrap items-center gap-2"><Label htmlFor={`head-end-${head.id}`} className="sr-only">{t("headEndDateFor", { name })}</Label><Input id={`head-end-${head.id}`} type="date" min={head.starts_on} value={endDates[head.id] ?? ""} onChange={(event) => setEndDates((current) => ({ ...current, [head.id]: event.target.value }))} className="w-auto" /><Button type="button" variant="outline" disabled={busy} aria-label={t("endHeadFor", { name })} onClick={() => void end(head)}>{t("endHead")}</Button></div>}</td>
          </tr>; })}</tbody>
        </table></div>}
      </>}
  </section>;
}
