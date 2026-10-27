"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { CoursePrerequisiteEditor } from "@/components/features/course-prerequisite-editor";
import { Input, Label } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import {
  assignProgramCourse, assignProgramDepartment, createCourse, createDepartment,
  listCourses, listDepartments, listProgramCurriculum, listSchools, updateCourse,
  type Course, type CurriculumCourse, type Department, type School,
} from "@/lib/api/academic-catalogue";
import { ApiError } from "@/lib/api/client";
import { listAllEditorPrograms, type EditorProgram } from "@/lib/api/programs-editor";
import type { Locale, Pagination } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const TYPES = ["CORE", "ELECTIVE", "GENERAL_STUDIES", "REMEDIAL"] as const;

function value(data: FormData, key: string): string {
  return String(data.get(key) ?? "").trim();
}

export function CourseCatalogueEditor({ locale }: { locale: Locale }) {
  const t = useTranslations("courseEditor");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const authorized = !!user?.roles.some((role) => ["registrar", "department_head", "admin", "super_admin"].includes(role));
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<EditorProgram[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [curriculum, setCurriculum] = useState<CurriculumCourse[]>([]);
  const [coursePagination, setCoursePagination] = useState<Pagination | null>(null);
  const [schoolId, setSchoolId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [programId, setProgramId] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Course | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedProgram = programs.find((program) => program.id === programId);

  useEffect(() => {
    if (!token || !authorized) return;
    let active = true;
    Promise.all([listSchools(token, locale), listAllEditorPrograms(token, locale)])
      .then(([schoolRows, programRows]) => {
        if (active) { setSchools(schoolRows); setPrograms(programRows); }
      })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("unavailable")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, authorized, locale, t]);

  useEffect(() => {
    if (!token || !authorized || !schoolId) return;
    let active = true;
    listDepartments(token, locale, schoolId)
      .then((rows) => { if (active) setDepartments(rows); })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("unavailable")); });
    return () => { active = false; };
  }, [token, authorized, locale, schoolId, t]);

  useEffect(() => {
    if (!token || !authorized || !departmentId) return;
    let active = true;
    listCourses(token, locale, page, departmentId)
      .then((result) => { if (active) { setCourses(result.items); setCoursePagination(result.pagination); } })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("unavailable")); });
    return () => { active = false; };
  }, [token, authorized, locale, departmentId, page, t]);

  useEffect(() => {
    if (!token || !authorized || !programId) return;
    let active = true;
    listProgramCurriculum(programId, token, locale)
      .then((rows) => { if (active) setCurriculum(rows); })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("unavailable")); });
    return () => { active = false; };
  }, [token, authorized, locale, programId, t]);

  function fail(caught: unknown) {
    setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("unexpectedError"));
  }

  async function addDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !schoolId) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(null); setNotice(null);
    try {
      const row = await createDepartment({
        school_id: schoolId, code: value(data, "code").toUpperCase(),
        name_en: value(data, "name_en"), name_fr: value(data, "name_fr"),
      }, token, locale);
      setDepartments((current) => [...current, row].sort((a, b) => a.name_en.localeCompare(b.name_en)));
      setDepartmentId(row.id);
      setCourses([]); setCoursePagination(null);
      form.reset();
      setNotice(t("departmentSaved"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !departmentId) return;
    const data = new FormData(event.currentTarget);
    const payload = {
      department_id: departmentId,
      course_code: value(data, "course_code").toUpperCase(),
      name_en: value(data, "name_en"), name_fr: value(data, "name_fr") || null,
      credits: Number(data.get("credits")),
      contact_hours_lecture: Number(data.get("contact_hours_lecture")),
      contact_hours_tutorial: Number(data.get("contact_hours_tutorial")),
      contact_hours_practical: Number(data.get("contact_hours_practical")),
      level: Number(data.get("level")), semester: Number(data.get("semester")),
      course_type: value(data, "course_type") as Course["course_type"],
    };
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = editing
        ? await updateCourse(editing.id, {
            name_en: payload.name_en, name_fr: payload.name_fr,
            credits: payload.credits,
            contact_hours_lecture: payload.contact_hours_lecture,
            contact_hours_tutorial: payload.contact_hours_tutorial,
            contact_hours_practical: payload.contact_hours_practical,
            level: payload.level, semester: payload.semester, course_type: payload.course_type,
          }, token, locale)
        : await createCourse(payload, token, locale);
      setCourses((current) => current.some((row) => row.id === saved.id)
        ? current.map((row) => row.id === saved.id ? saved : row)
        : [saved, ...current]);
      setEditing(null);
      setNotice(t("courseSaved"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function toggleCourse(course: Course) {
    if (!token) return;
    setBusy(true); setError(null);
    try {
      const saved = await updateCourse(course.id, {
        status: course.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      }, token, locale);
      setCourses((current) => current.map((row) => row.id === saved.id ? saved : row));
      setNotice(t("courseSaved"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function linkDepartment() {
    if (!token || !programId || !departmentId) return;
    setBusy(true); setError(null);
    try {
      await assignProgramDepartment(programId, departmentId, token, locale);
      setPrograms((current) => current.map((row) => row.id === programId
        ? { ...row, department_id: departmentId } : row));
      setNotice(t("programLinked"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function addToCurriculum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !programId) return;
    const data = new FormData(event.currentTarget);
    const courseId = value(data, "course_id");
    if (!courseId) return;
    setBusy(true); setError(null);
    try {
      const row = await assignProgramCourse(programId, courseId, {
        level: Number(data.get("level")), semester: Number(data.get("semester")),
        is_required: data.get("is_required") === "on",
      }, token, locale);
      setCurriculum((current) => current.some((item) => item.course.id === courseId)
        ? current.map((item) => item.course.id === courseId ? row : item)
        : [...current, row]);
      setNotice(t("curriculumSaved"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  if (!token || !authorized) return <section className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center"><h1 className="font-display text-2xl font-semibold">{t("accessTitle")}</h1><p className="mt-3 text-gray-600">{t("accessBody")}</p></section>;

  return <div className="space-y-8">
    <header><p className="text-sm font-semibold uppercase tracking-widest text-accent-dark">{t("eyebrow")}</p><h1 className="mt-2 font-display text-3xl font-semibold">{t("title")}</h1><p className="mt-2 max-w-3xl text-gray-600">{t("subtitle")}</p><div className="mt-3 flex flex-wrap gap-5"><Link href="/staff/programs" className="text-sm font-semibold text-primary underline">{t("programEditorLink")}</Link><Link href="/staff/scheduling" className="text-sm font-semibold text-primary underline">{t("schedulingLink")}</Link></div></header>
    {error && <p role="alert" className="rounded-md bg-error-light px-4 py-3 text-sm text-error">{error}</p>}
    {notice && <p role="status" className="rounded-md bg-primary-subtle px-4 py-3 text-sm text-primary">{notice}</p>}
    {editing && token && <CoursePrerequisiteEditor key={editing.id} course={editing} token={token} locale={locale} />}
    {loading ? <p>{t("loading")}</p> : <>
      <section className="grid gap-5 rounded-2xl border border-gray-200 bg-white p-5 lg:grid-cols-2"><div><Label htmlFor="catalogue-school">{t("school")}</Label><select id="catalogue-school" value={schoolId} onChange={(event) => { setSchoolId(event.target.value); setDepartments([]); setDepartmentId(""); setCourses([]); setCoursePagination(null); setEditing(null); setPage(1); }} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("selectSchool")}</option>{schools.map((school) => <option key={school.id} value={school.id}>{locale === "fr" ? school.name_fr : school.name_en}</option>)}</select></div><div><Label htmlFor="catalogue-department">{t("department")}</Label><select id="catalogue-department" value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setCourses([]); setCoursePagination(null); setEditing(null); setPage(1); }} disabled={!schoolId} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("selectDepartment")}</option>{departments.map((row) => <option key={row.id} value={row.id}>{row.code} · {locale === "fr" ? row.name_fr : row.name_en}</option>)}</select></div></section>
      {schoolId && <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-display text-xl font-semibold">{t("newDepartment")}</h2><form onSubmit={(event) => void addDepartment(event)} className="mt-4 grid gap-4 md:grid-cols-[10rem_1fr_1fr_auto] md:items-end"><div><Label htmlFor="department-code">{t("code")}</Label><Input id="department-code" name="code" required maxLength={10} /></div><div><Label htmlFor="department-name-en">{t("nameEn")}</Label><Input id="department-name-en" name="name_en" required /></div><div><Label htmlFor="department-name-fr">{t("nameFr")}</Label><Input id="department-name-fr" name="name_fr" required /></div><Button type="submit" disabled={busy}>{t("createDepartment")}</Button></form></section>}
      {departmentId && <section className="grid gap-6 xl:grid-cols-[1fr_1fr]"><div className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-display text-xl font-semibold">{editing ? t("editCourse") : t("newCourse")}</h2><form key={editing?.id ?? "new"} onSubmit={(event) => void saveCourse(event)} className="mt-4 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="course-code">{t("code")}</Label><Input id="course-code" name="course_code" required disabled={!!editing} defaultValue={editing?.course_code} /></div><div><Label htmlFor="course-type">{t("courseType")}</Label><select id="course-type" name="course_type" defaultValue={editing?.course_type ?? "CORE"} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3">{TYPES.map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}</select></div><div><Label htmlFor="course-name-en">{t("nameEn")}</Label><Input id="course-name-en" name="name_en" required defaultValue={editing?.name_en} /></div><div><Label htmlFor="course-name-fr">{t("nameFr")}</Label><Input id="course-name-fr" name="name_fr" defaultValue={editing?.name_fr ?? ""} /></div><div><Label htmlFor="course-credits">{t("credits")}</Label><Input id="course-credits" name="credits" type="number" min={1} max={12} required defaultValue={editing?.credits ?? 3} /></div><div><Label htmlFor="course-level">{t("level")}</Label><Input id="course-level" name="level" type="number" min={1} max={7} required defaultValue={editing?.level ?? 1} /></div><div><Label htmlFor="course-semester">{t("semester")}</Label><select id="course-semester" name="semester" defaultValue={editing?.semester ?? 1} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value={1}>1</option><option value={2}>2</option></select></div><div><Label htmlFor="hours-lecture">{t("lectureHours")}</Label><Input id="hours-lecture" name="contact_hours_lecture" type="number" min={0} max={40} defaultValue={editing?.contact_hours_lecture ?? 0} /></div><div><Label htmlFor="hours-tutorial">{t("tutorialHours")}</Label><Input id="hours-tutorial" name="contact_hours_tutorial" type="number" min={0} max={40} defaultValue={editing?.contact_hours_tutorial ?? 0} /></div><div><Label htmlFor="hours-practical">{t("practicalHours")}</Label><Input id="hours-practical" name="contact_hours_practical" type="number" min={0} max={40} defaultValue={editing?.contact_hours_practical ?? 0} /></div><div className="flex gap-3 sm:col-span-2"><Button type="submit" disabled={busy}>{editing ? t("saveChanges") : t("createCourse")}</Button>{editing && <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("cancel")}</Button>}</div></form></div><div className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-display text-xl font-semibold">{t("courses")}</h2>{courses.length === 0 ? <p className="mt-4 text-sm text-gray-600">{t("noCourses")}</p> : <ul className="mt-4 divide-y divide-gray-100">{courses.map((course) => <li key={course.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{course.course_code} · {locale === "fr" ? course.name_fr || course.name_en : course.name_en}</p><p className="text-xs text-gray-600">{t("courseMeta", { credits: course.credits, level: course.level, semester: course.semester })} · {t(`statuses.${course.status}`)}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setEditing(course)}>{t("edit")}</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => void toggleCourse(course)}>{course.status === "ACTIVE" ? t("deactivate") : t("activate")}</Button></div></li>)}</ul>}{coursePagination && coursePagination.total_pages > 1 && <div className="mt-4 flex items-center justify-between gap-3"><Button variant="outline" disabled={!coursePagination.has_previous} onClick={() => setPage(page - 1)}>{t("previous")}</Button><span className="text-sm text-gray-600">{t("page", { page, total: coursePagination.total_pages })}</span><Button variant="outline" disabled={!coursePagination.has_next} onClick={() => setPage(page + 1)}>{t("next")}</Button></div>}</div></section>}
      <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-display text-xl font-semibold">{t("curriculumTitle")}</h2><p className="mt-1 text-sm text-gray-600">{t("curriculumIntro")}</p><div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><div><Label htmlFor="curriculum-program">{t("program")}</Label><select id="curriculum-program" value={programId} onChange={(event) => setProgramId(event.target.value)} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("selectProgram")}</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.code} · {locale === "fr" ? program.name_fr || program.name_en : program.name_en}</option>)}</select></div><Button variant="outline" disabled={!programId || !departmentId || busy} onClick={() => void linkDepartment()}>{t("linkDepartment")}</Button></div>{selectedProgram && <p className="mt-2 text-xs text-gray-600">{selectedProgram.department_id ? t("linkedDepartment") : t("departmentNeeded")}</p>}{programId && departmentId && <form onSubmit={(event) => void addToCurriculum(event)} className="mt-5 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-[2fr_1fr_1fr_auto_auto] sm:items-end"><div><Label htmlFor="curriculum-course">{t("course")}</Label><select id="curriculum-course" name="course_id" required className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("selectCourse")}</option>{courses.filter((course) => course.status === "ACTIVE").map((course) => <option key={course.id} value={course.id}>{course.course_code} · {course.name_en}</option>)}</select></div><div><Label htmlFor="curriculum-level">{t("level")}</Label><Input id="curriculum-level" name="level" type="number" min={1} max={7} defaultValue={1} required /></div><div><Label htmlFor="curriculum-semester">{t("semester")}</Label><select id="curriculum-semester" name="semester" className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value={1}>1</option><option value={2}>2</option></select></div><label className="flex h-11 items-center gap-2 text-sm"><input type="checkbox" name="is_required" defaultChecked />{t("required")}</label><Button type="submit" disabled={busy || !selectedProgram?.department_id}>{t("addCourse")}</Button></form>}{programId && <div className="mt-5 border-t border-gray-100 pt-5"><h3 className="font-semibold">{t("assignedCourses")}</h3>{curriculum.length === 0 ? <p className="mt-2 text-sm text-gray-600">{t("noAssignments")}</p> : <ul className="mt-3 grid gap-2 sm:grid-cols-2">{curriculum.map((item) => <li key={item.course.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm"><strong>{item.course.course_code}</strong> · {locale === "fr" ? item.course.name_fr || item.course.name_en : item.course.name_en}<span className="block text-xs text-gray-600">{t("courseMeta", { credits: item.course.credits, level: item.placement.level, semester: item.placement.semester })} · {item.placement.is_required ? t("required") : t("elective")}</span></li>)}</ul>}</div>}</section>
    </>}
  </div>;
}
