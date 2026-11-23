"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { listAllCourses, type Course } from "@/lib/api/academic-catalogue";
import { listSections, type CourseSection } from "@/lib/api/academic-schedule";
import { addContractLine, removeContractLine, type ContractDetail, type ContractLine } from "@/lib/api/hr";
import type { Locale } from "@/lib/api/types";
import { hrErrorMessage, parseAmount } from "@/lib/hr-ui";

interface Props {
  contract: ContractDetail;
  /** Only DRAFT contracts are editable; every other status renders read-only. */
  editable: boolean;
  /** Called after the server accepted a change; the parent re-fetches the contract. */
  onChanged: () => Promise<void>;
  token: string;
  locale: Locale;
}

const formatXaf = (amount: number, locale: Locale) =>
  `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US").format(amount)} XAF`;

export function StaffContractLines({ contract, editable, onChanged, token, locale }: Props) {
  const t = useTranslations("staffLecturers");
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [sectionId, setSectionId] = useState("");
  const [hours, setHours] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const perCourse = contract.pay_basis === "PER_COURSE";
  const requestKey = `${token}:${locale}:${contract.term_id}:${retry}`;
  const loading = editable && loadedKey !== requestKey && !loadError;

  useEffect(() => {
    if (!editable) return;
    let active = true;
    Promise.all([listSections(contract.term_id, token, locale), listAllCourses(token, locale)])
      .then(([sectionRows, courseRows]) => {
        if (!active) return;
        setSections(sectionRows); setCourses(courseRows); setLoadError(null); setLoadedKey(requestKey);
      })
      .catch((caught) => { if (active) setLoadError(hrErrorMessage(caught, locale, t("sectionsLoadError"))); });
    return () => { active = false; };
  }, [editable, contract.term_id, token, locale, requestKey, t]);

  const courseName = (course: Course | undefined) => course ? (locale === "fr" ? course.name_fr || course.name_en : course.name_en) : "";
  const sectionLabel = (section: CourseSection) => {
    const course = courses.find((row) => row.id === section.course_id);
    return [course?.course_code, courseName(course), section.code].filter(Boolean).join(" · ");
  };
  const usedSections = useMemo(() => new Set(contract.lines.map((line) => line.section_id)), [contract.lines]);
  const available = sections.filter((section) => section.term_id === contract.term_id && !usedSections.has(section.id));

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const plannedHours = Number(hours);
    const twoDecimals = /^\d+(\.\d{1,2})?$/.test(hours.trim());
    if (!sectionId) { setError(t("sectionRequired")); return; }
    if (!twoDecimals || !(plannedHours > 0 && plannedHours <= 999.99)) { setError(t("hoursInvalid")); return; }
    const courseAmount = perCourse ? parseAmount(amount) : null;
    if (perCourse && courseAmount === null) { setError(t("amountInvalid")); return; }
    setBusy(true); setError(null);
    try {
      await addContractLine(contract.id, {
        section_id: sectionId, planned_hours: plannedHours,
        ...(perCourse ? { course_amount: courseAmount } : {}),
      }, token, locale);
      setSectionId(""); setHours(""); setAmount("");
      await onChanged();
    } catch (caught) { setError(hrErrorMessage(caught, locale, t("saveError"))); } finally { setBusy(false); }
  }

  async function remove(line: ContractLine) {
    setBusy(true); setError(null);
    try {
      await removeContractLine(contract.id, line.id, token, locale);
      await onChanged();
    } catch (caught) { setError(hrErrorMessage(caught, locale, t("saveError"))); } finally { setBusy(false); }
  }

  const lineName = (line: ContractLine) => `${line.course_code} · ${locale === "fr" ? line.course_name_fr || line.course_name_en : line.course_name_en}`;

  return <section aria-label={t("linesTitle")} className="mt-6">
    <h4 className="font-display text-lg font-semibold">{t("linesTitle")}</h4>
    {error && <p role="alert" className="mt-3 rounded-md bg-error-light p-3 text-error">{error}</p>}
    {contract.lines.length === 0 ? <p className="mt-3 text-sm text-gray-600">{t("noLines")}</p> : <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
      <thead><tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-600"><th scope="col" className="py-2 pr-3">{t("course")}</th><th scope="col" className="py-2 pr-3">{t("section")}</th><th scope="col" className="py-2 pr-3">{t("plannedHours")}</th>{perCourse && <th scope="col" className="py-2 pr-3">{t("courseAmount")}</th>}{editable && <th scope="col" className="py-2"><span className="sr-only">{t("actions")}</span></th>}</tr></thead>
      <tbody>{contract.lines.map((line) => <tr key={line.id} className="border-b border-gray-100"><td className="py-2 pr-3">{lineName(line)}</td><td className="py-2 pr-3">{line.section_code}</td><td className="py-2 pr-3">{Number(line.planned_hours)}</td>{perCourse && <td className="py-2 pr-3">{line.course_amount === null ? "—" : formatXaf(line.course_amount, locale)}</td>}{editable && <td className="py-2"><Button type="button" variant="outline" disabled={busy} aria-label={t("removeLine", { course: lineName(line) })} onClick={() => void remove(line)}>{t("remove")}</Button></td>}</tr>)}</tbody>
    </table></div>}
    {editable && (loadError ? <div role="alert" className="mt-4 rounded-md bg-error-light p-3 text-error"><p>{loadError}</p><Button type="button" variant="outline" className="mt-2" onClick={() => { setLoadError(null); setRetry((value) => value + 1); }}>{t("retry")}</Button></div> : loading ? <p role="status" className="mt-4 text-sm text-gray-600">{t("loadingSections")}</p> : <form noValidate onSubmit={(event) => void add(event)} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <div><Label htmlFor="line-section">{t("section")}</Label><select id="line-section" value={sectionId} onChange={(event) => setSectionId(event.target.value)} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("selectSection")}</option>{available.map((section) => <option key={section.id} value={section.id}>{sectionLabel(section)}</option>)}</select></div>
      <div><Label htmlFor="line-hours">{t("plannedHours")}</Label><Input id="line-hours" type="number" min={0.01} max={999.99} step="0.01" value={hours} onChange={(event) => setHours(event.target.value)} /></div>
      {perCourse && <div><Label htmlFor="line-amount">{t("courseAmountXaf")}</Label><Input id="line-amount" type="number" min={1} step={1} value={amount} onChange={(event) => setAmount(event.target.value)} /></div>}
      <Button type="submit" disabled={busy}>{t("addLine")}</Button>
      {available.length === 0 && <p className="text-sm text-gray-600 sm:col-span-2 lg:col-span-4">{t("noSections")}</p>}
    </form>)}
  </section>;
}
