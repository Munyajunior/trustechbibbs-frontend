"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import {
  assignCoursePrerequisite, listAllCourses, listCoursePrerequisites,
  removeCoursePrerequisite, type Course, type CoursePrerequisite,
} from "@/lib/api/academic-catalogue";
import { ApiError } from "@/lib/api/client";
import type { Locale } from "@/lib/api/types";

export function CoursePrerequisiteEditor({ course, token, locale }: {
  course: Course; token: string; locale: Locale;
}) {
  const t = useTranslations("courseEditor.prerequisites");
  const [courses, setCourses] = useState<Course[]>([]);
  const [rows, setRows] = useState<CoursePrerequisite[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      listAllCourses(token, locale), listCoursePrerequisites(course.id, token, locale),
    ]).then(([courseRows, prerequisiteRows]) => {
      if (active) { setCourses(courseRows); setRows(prerequisiteRows); }
    }).catch((caught) => {
      if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError"));
    });
    return () => { active = false; };
  }, [course.id, token, locale, t]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const prerequisiteId = String(data.get("prerequisite_id") ?? "");
    if (!prerequisiteId) return;
    setBusy(true); setError(null);
    try {
      const row = await assignCoursePrerequisite(course.id, prerequisiteId, {
        is_corequisite: data.get("is_corequisite") === "on",
        minimum_grade: (String(data.get("minimum_grade") ?? "") || null) as CoursePrerequisite["minimum_grade"],
      }, token, locale);
      setRows((current) => [...current.filter((item) => item.prerequisite_id !== prerequisiteId), row]);
      form.reset();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
    } finally { setBusy(false); }
  }

  async function remove(prerequisiteId: string) {
    setBusy(true); setError(null);
    try {
      await removeCoursePrerequisite(course.id, prerequisiteId, token, locale);
      setRows((current) => current.filter((item) => item.prerequisite_id !== prerequisiteId));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
    } finally { setBusy(false); }
  }

  const name = (id: string) => {
    const match = courses.find((row) => row.id === id);
    return match ? `${match.course_code} · ${locale === "fr" ? match.name_fr || match.name_en : match.name_en}` : id;
  };

  return <section className="rounded-2xl border border-gray-200 bg-white p-5">
    <h2 className="font-display text-xl font-semibold">{t("title", { course: course.course_code })}</h2>
    <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>
    {error && <p role="alert" className="mt-3 rounded-md bg-error-light p-3 text-sm text-error">{error}</p>}
    {rows.length > 0 && <ul className="mt-4 divide-y divide-gray-100">{rows.map((row) => <li key={row.prerequisite_id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span>{name(row.prerequisite_id)} · {row.is_corequisite ? t("corequisite") : t("prerequisite")}{row.minimum_grade ? ` · ${t("minimumGrade")}: ${row.minimum_grade}` : ""}</span><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void remove(row.prerequisite_id)}>{t("remove")}</Button></li>)}</ul>}
    <form onSubmit={(event) => void save(event)} className="mt-4 grid gap-4 border-t border-gray-100 pt-4 md:grid-cols-[2fr_1fr_auto_auto] md:items-end">
      <div><Label htmlFor="prerequisite-course">{t("course")}</Label><select id="prerequisite-course" name="prerequisite_id" required className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("selectCourse")}</option>{courses.filter((row) => row.id !== course.id && row.status === "ACTIVE").map((row) => <option key={row.id} value={row.id}>{name(row.id)}</option>)}</select></div>
      <div><Label htmlFor="prerequisite-grade">{t("minimumGrade")}</Label><select id="prerequisite-grade" name="minimum_grade" className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("noMinimum")}</option>{["A", "B+", "B", "C+", "C", "D"].map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></div>
      <label className="flex h-11 items-center gap-2 text-sm"><input type="checkbox" name="is_corequisite" />{t("corequisite")}</label>
      <Button type="submit" disabled={busy}>{t("add")}</Button>
    </form>
  </section>;
}
