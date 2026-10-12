"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { listAllCourses, type Course } from "@/lib/api/academic-catalogue";
import { listTerms, type AcademicTerm } from "@/lib/api/academic-schedule";
import { ApiError } from "@/lib/api/client";
import { getGradebook, saveGradeDraft, transitionGrade, type Grade, type GradebookEntry } from "@/lib/api/grades";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

export function GradebookEditor({ locale }: { locale: Locale }) {
  const t = useTranslations("gradebookEditor");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const authorized = !!user?.roles.some((role) => ["registrar", "admin", "super_admin"].includes(role));
  const canApprove = !!user?.roles.some((role) => ["admin", "super_admin"].includes(role));
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [termId, setTermId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [entries, setEntries] = useState<GradebookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !authorized) return;
    let active = true;
    Promise.all([listTerms(token, locale), listAllCourses(token, locale)])
      .then(([termRows, courseRows]) => { if (active) { setTerms(termRows); setCourses(courseRows); } })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, authorized, locale, t]);

  useEffect(() => {
    if (!token || !termId || !courseId) { setEntries([]); return; }
    let active = true;
    getGradebook(termId, courseId, token, locale)
      .then((rows) => { if (active) setEntries(rows); })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError")); });
    return () => { active = false; };
  }, [termId, courseId, token, locale, t]);

  const update = (enrollmentId: string, grade: Grade) => setEntries((current) =>
    current.map((row) => row.enrollment_id === enrollmentId ? { ...row, grade } : row));
  const fail = (caught: unknown) => setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));

  async function save(event: FormEvent<HTMLFormElement>, entry: GradebookEntry) {
    event.preventDefault();
    if (!token) return;
    const data = new FormData(event.currentTarget);
    const score = (key: string) => data.get(key) === "" ? null : Number(data.get(key));
    setBusyId(entry.enrollment_id); setError(null); setNotice(null);
    try {
      const grade = await saveGradeDraft(
        entry.enrollment_id, score("ca_score"), score("exam_score"),
        String(data.get("remarks") ?? "").trim() || null, token, locale,
      );
      update(entry.enrollment_id, grade); setNotice(t("saved"));
    } catch (caught) { fail(caught); } finally { setBusyId(null); }
  }

  async function transition(entry: GradebookEntry, action: "submit" | "approve" | "publish") {
    if (!token || !entry.grade) return;
    setBusyId(entry.enrollment_id); setError(null); setNotice(null);
    try {
      const grade = await transitionGrade(entry.grade.id, action, token, locale);
      update(entry.enrollment_id, grade); setNotice(t(`${action}Success`));
    } catch (caught) { fail(caught); } finally { setBusyId(null); }
  }

  if (!token || !authorized) return <Container className="py-12"><section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center"><h1 className="font-display text-2xl font-semibold">{t("accessTitle")}</h1><p className="mt-3 text-gray-600">{t("accessBody")}</p><Link href="/login" className="mt-5 inline-block text-primary underline">{t("signIn")}</Link></section></Container>;

  return <Container className="py-12"><div className="mx-auto max-w-6xl space-y-7">
    <header><p className="text-sm font-semibold uppercase tracking-widest text-accent-dark">{t("eyebrow")}</p><h1 className="mt-2 font-display text-3xl font-semibold">{t("title")}</h1><p className="mt-2 text-gray-600">{t("intro")}</p><Link href="/staff/scheduling" className="mt-3 inline-block text-sm font-semibold text-primary underline">{t("schedulingLink")}</Link></header>
    {error && <p role="alert" className="rounded-md bg-error-light p-4 text-error">{error}</p>}
    {notice && <p role="status" className="rounded-md bg-primary-subtle p-4 text-primary">{notice}</p>}
    {loading ? <p>{t("loading")}</p> : <><section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-2"><div><Label htmlFor="grade-term">{t("term")}</Label><select id="grade-term" value={termId} onChange={(event) => setTermId(event.target.value)} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("selectTerm")}</option>{terms.map((term) => <option key={term.id} value={term.id}>{term.academic_year} · {t("semester")} {term.semester}</option>)}</select></div><div><Label htmlFor="grade-course">{t("course")}</Label><select id="grade-course" value={courseId} onChange={(event) => setCourseId(event.target.value)} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("selectCourse")}</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.course_code} · {locale === "fr" ? course.name_fr || course.name_en : course.name_en}</option>)}</select></div></section>
      {termId && courseId && <section className="space-y-4"><h2 className="font-display text-xl font-semibold">{t("enrollments")}</h2>{entries.length === 0 ? <p className="rounded-xl border border-gray-200 bg-white p-5 text-gray-600">{t("empty")}</p> : entries.map((entry) => <form key={`${entry.enrollment_id}-${entry.grade?.status ?? "new"}`} onSubmit={(event) => void save(event, entry)} className="rounded-2xl border border-gray-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{entry.student_name}</p><p className="text-sm text-gray-600">{entry.student_id} · {entry.course_code}</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">{t(`statuses.${entry.grade?.status ?? "NEW"}`)}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-[8rem_8rem_1fr]"><div><Label htmlFor={`ca-${entry.enrollment_id}`}>{t("caScore")}</Label><Input id={`ca-${entry.enrollment_id}`} name="ca_score" type="number" step="0.01" min={0} max={30} defaultValue={entry.grade?.ca_score ?? ""} disabled={entry.grade?.status !== undefined && entry.grade.status !== "DRAFT"} /></div><div><Label htmlFor={`exam-${entry.enrollment_id}`}>{t("examScore")}</Label><Input id={`exam-${entry.enrollment_id}`} name="exam_score" type="number" step="0.01" min={0} max={70} defaultValue={entry.grade?.exam_score ?? ""} disabled={entry.grade?.status !== undefined && entry.grade.status !== "DRAFT"} /></div><div><Label htmlFor={`remarks-${entry.enrollment_id}`}>{t("remarks")}</Label><Input id={`remarks-${entry.enrollment_id}`} name="remarks" defaultValue={entry.grade?.remarks ?? ""} disabled={entry.grade?.status !== undefined && entry.grade.status !== "DRAFT"} /></div></div>{entry.grade?.total_score !== null && entry.grade?.total_score !== undefined && <p className="mt-3 text-sm text-gray-600">{t("calculated", { total: entry.grade.total_score, grade: entry.grade.grade ?? "—" })}</p>}<div className="mt-4 flex flex-wrap gap-2">{(!entry.grade || entry.grade.status === "DRAFT") && <Button type="submit" disabled={busyId === entry.enrollment_id}>{t("saveDraft")}</Button>}{entry.grade?.status === "DRAFT" && <Button type="button" variant="outline" disabled={busyId === entry.enrollment_id || entry.grade.total_score === null} onClick={() => void transition(entry, "submit")}>{t("submit")}</Button>}{entry.grade?.status === "SUBMITTED" && canApprove && <Button type="button" variant="outline" disabled={busyId === entry.enrollment_id || entry.grade.entered_by === user?.id} onClick={() => void transition(entry, "approve")}>{t("approve")}</Button>}{entry.grade?.status === "APPROVED" && <Button type="button" disabled={busyId === entry.enrollment_id} onClick={() => void transition(entry, "publish")}>{t("publish")}</Button>}</div></form>)}</section>}
    </>}
    <p className="text-xs text-gray-600">{t("policyNote")}</p>
  </div></Container>;
}
