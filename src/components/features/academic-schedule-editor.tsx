"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { listAllCourses, type Course } from "@/lib/api/academic-catalogue";
import {
  addMeeting, createSection, createTerm, listMeetings, listSections, listTerms,
  removeMeeting, updateSection, updateTerm,
  type AcademicTerm, type CourseSection, type SectionMeeting, type TermInput,
} from "@/lib/api/academic-schedule";
import { ApiError } from "@/lib/api/client";
import type { Locale } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const cameroonIso = (local: string) => `${local}:00+01:00`;
const cameroonLocal = (iso: string) => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Africa/Douala", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
}).format(new Date(iso)).replace(" ", "T");

export function AcademicScheduleEditor({ locale }: { locale: Locale }) {
  const t = useTranslations("scheduleEditor");
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const authorized = !!user?.roles.some((role) => ["registrar", "admin", "super_admin"].includes(role));
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [meetings, setMeetings] = useState<SectionMeeting[]>([]);
  const [termId, setTermId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const selectedTerm = terms.find((term) => term.id === termId);
  const selectedSection = sections.find((section) => section.id === sectionId);

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
    if (!token || !termId) return;
    let active = true;
    listSections(termId, token, locale)
      .then((rows) => { if (active) setSections(rows); })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError")); });
    return () => { active = false; };
  }, [termId, token, locale, t]);

  useEffect(() => {
    if (!token || !sectionId) return;
    let active = true;
    listMeetings(sectionId, token, locale)
      .then((rows) => { if (active) setMeetings(rows); })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError")); });
    return () => { active = false; };
  }, [sectionId, token, locale, t]);

  const courseName = (id: string) => {
    const course = courses.find((row) => row.id === id);
    return course ? `${course.course_code} · ${locale === "fr" ? course.name_fr || course.name_en : course.name_en}` : id;
  };
  const fail = (caught: unknown) => setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));

  async function saveTerm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload: TermInput = {
      academic_year: field(data, "academic_year"),
      semester: editingTerm?.semester ?? Number(data.get("semester")),
      starts_on: field(data, "starts_on"), ends_on: field(data, "ends_on"),
      registration_opens_at: cameroonIso(field(data, "registration_opens_at")),
      registration_closes_at: cameroonIso(field(data, "registration_closes_at")),
      add_drop_closes_at: cameroonIso(field(data, "add_drop_closes_at")),
      min_credits: Number(data.get("min_credits")), max_credits: Number(data.get("max_credits")),
      is_published: editingTerm?.is_published ?? false,
    };
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = editingTerm ? await updateTerm(editingTerm.id, payload, token, locale)
        : await createTerm(payload, token, locale);
      setTerms((current) => current.some((row) => row.id === saved.id)
        ? current.map((row) => row.id === saved.id ? saved : row) : [saved, ...current]);
      setTermId(saved.id); setSections([]); setSectionId(""); setMeetings([]);
      setEditingTerm(null); form.reset(); setNotice(t("termSaved"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function toggleTerm(term: AcademicTerm) {
    if (!token) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const { id: _id, ...payload } = term;
      void _id;
      const saved = await updateTerm(term.id, { ...payload, is_published: !term.is_published }, token, locale);
      setTerms((current) => current.map((row) => row.id === saved.id ? saved : row));
      setNotice(t(saved.is_published ? "termPublished" : "termUnpublished"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function saveSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !termId) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = await createSection({
        term_id: termId, course_id: field(data, "course_id"), code: field(data, "code").toUpperCase(),
        capacity: Number(data.get("capacity")), lecturer_name: field(data, "lecturer_name") || null,
        delivery_mode: field(data, "delivery_mode") as CourseSection["delivery_mode"],
        is_published: false,
      }, token, locale);
      setSections((current) => [...current, saved]); setSectionId(saved.id); setMeetings([]); form.reset();
      setNotice(t("sectionSaved"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function toggleSection(section: CourseSection) {
    if (!token) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = await updateSection(section.id, { is_published: !section.is_published }, token, locale);
      setSections((current) => current.map((row) => row.id === saved.id ? saved : row));
      setNotice(t(saved.is_published ? "sectionPublished" : "sectionUnpublished"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function saveMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !sectionId) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = await addMeeting(sectionId, {
        day_of_week: Number(data.get("day_of_week")), starts_at: field(data, "starts_at"),
        ends_at: field(data, "ends_at"), venue_name: field(data, "venue_name") || null,
      }, token, locale);
      setMeetings((current) => [...current, saved]); form.reset(); setNotice(t("meetingSaved"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function deleteMeeting(meetingId: string) {
    if (!token || !sectionId) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await removeMeeting(sectionId, meetingId, token, locale);
      setMeetings((current) => current.filter((row) => row.id !== meetingId));
      setNotice(t("meetingRemoved"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  if (!token || !authorized) return <Container className="py-12"><section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center"><h1 className="font-display text-2xl font-semibold">{t("accessTitle")}</h1><p className="mt-3 text-gray-600">{t("accessBody")}</p><Link href="/login" className="mt-5 inline-block text-primary underline">{t("signIn")}</Link></section></Container>;

  return <Container className="py-12"><div className="mx-auto max-w-6xl space-y-8">
    <header><p className="text-sm font-semibold uppercase tracking-widest text-accent-dark">{t("eyebrow")}</p><h1 className="mt-2 font-display text-3xl font-semibold">{t("title")}</h1><p className="mt-2 text-gray-600">{t("intro")}</p><div className="mt-3 flex flex-wrap gap-5"><Link href="/staff/courses" className="text-sm font-semibold text-primary underline">{t("catalogueLink")}</Link><Link href="/staff/grades" className="text-sm font-semibold text-primary underline">{t("gradebookLink")}</Link></div></header>
    {error && <p role="alert" className="rounded-md bg-error-light p-4 text-error">{error}</p>}
    {notice && <p role="status" className="rounded-md bg-primary-subtle p-4 text-primary">{notice}</p>}
    {loading ? <p>{t("loading")}</p> : <>
      <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-display text-xl font-semibold">{editingTerm ? t("editTerm") : t("newTerm")}</h2>
        <form key={editingTerm?.id ?? "new"} onSubmit={(event) => void saveTerm(event)} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label htmlFor="term-year">{t("academicYear")}</Label><Input id="term-year" name="academic_year" placeholder="2026-2027" pattern="[0-9]{4}-[0-9]{4}" required readOnly={!!editingTerm} defaultValue={editingTerm?.academic_year} /></div>
          <div><Label htmlFor="term-semester">{t("semester")}</Label><select id="term-semester" name="semester" defaultValue={editingTerm?.semester ?? 1} disabled={!!editingTerm} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value={1}>1</option><option value={2}>2</option></select></div>
          <div><Label htmlFor="term-start">{t("termStart")}</Label><Input id="term-start" name="starts_on" type="date" required defaultValue={editingTerm?.starts_on} /></div>
          <div><Label htmlFor="term-end">{t("termEnd")}</Label><Input id="term-end" name="ends_on" type="date" required defaultValue={editingTerm?.ends_on} /></div>
          <div><Label htmlFor="registration-start">{t("registrationOpens")}</Label><Input id="registration-start" name="registration_opens_at" type="datetime-local" required defaultValue={editingTerm ? cameroonLocal(editingTerm.registration_opens_at) : undefined} /></div>
          <div><Label htmlFor="registration-end">{t("registrationCloses")}</Label><Input id="registration-end" name="registration_closes_at" type="datetime-local" required defaultValue={editingTerm ? cameroonLocal(editingTerm.registration_closes_at) : undefined} /></div>
          <div><Label htmlFor="add-drop-end">{t("addDropCloses")}</Label><Input id="add-drop-end" name="add_drop_closes_at" type="datetime-local" required defaultValue={editingTerm ? cameroonLocal(editingTerm.add_drop_closes_at) : undefined} /></div>
          <div><Label htmlFor="minimum-credits">{t("minCredits")}</Label><Input id="minimum-credits" name="min_credits" type="number" min={1} max={40} required defaultValue={editingTerm?.min_credits ?? 12} /></div>
          <div><Label htmlFor="maximum-credits">{t("maxCredits")}</Label><Input id="maximum-credits" name="max_credits" type="number" min={1} max={40} required defaultValue={editingTerm?.max_credits ?? 21} /></div>
          <div className="flex items-end gap-3 sm:col-span-2"><Button type="submit" disabled={busy}>{t("saveTerm")}</Button>{editingTerm && <Button type="button" variant="outline" onClick={() => setEditingTerm(null)}>{t("cancel")}</Button>}</div>
        </form><p className="mt-3 text-xs text-gray-600">{t("timezoneNote")}</p>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-display text-xl font-semibold">{t("terms")}</h2>{terms.length === 0 ? <p className="mt-3 text-gray-600">{t("noTerms")}</p> : <ul className="mt-3 divide-y divide-gray-100">{terms.map((term) => <li key={term.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{term.academic_year} · {t("semester")} {term.semester}</p><p className="text-sm text-gray-600">{t(term.is_published ? "published" : "draft")} · {t("creditRange", { min: term.min_credits, max: term.max_credits })}</p></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { setTermId(term.id); setSections([]); setSectionId(""); setMeetings([]); }}>{t("open")}</Button><Button type="button" variant="outline" onClick={() => setEditingTerm(term)}>{t("edit")}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => void toggleTerm(term)}>{t(term.is_published ? "unpublish" : "publish")}</Button></div></li>)}</ul>}</section>
      {selectedTerm && <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-display text-xl font-semibold">{t("sectionsTitle", { year: selectedTerm.academic_year, semester: selectedTerm.semester })}</h2><form onSubmit={(event) => void saveSection(event)} className="mt-4 grid gap-4 md:grid-cols-3 lg:grid-cols-6"><div className="lg:col-span-2"><Label htmlFor="section-course">{t("course")}</Label><select id="section-course" name="course_id" required className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("selectCourse")}</option>{courses.filter((course) => course.status === "ACTIVE").map((course) => <option key={course.id} value={course.id}>{courseName(course.id)}</option>)}</select></div><div><Label htmlFor="section-code">{t("sectionCode")}</Label><Input id="section-code" name="code" required maxLength={20} placeholder="A" /></div><div><Label htmlFor="section-capacity">{t("capacity")}</Label><Input id="section-capacity" name="capacity" type="number" min={1} max={1000} required defaultValue={30} /></div><div><Label htmlFor="section-lecturer">{t("lecturer")}</Label><Input id="section-lecturer" name="lecturer_name" /></div><div><Label htmlFor="section-mode">{t("mode")}</Label><select id="section-mode" name="delivery_mode" className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="ON_CAMPUS">{t("modes.ON_CAMPUS")}</option><option value="ONLINE">{t("modes.ONLINE")}</option><option value="HYBRID">{t("modes.HYBRID")}</option></select></div><Button type="submit" disabled={busy} className="md:col-span-3 lg:col-span-6">{t("addSection")}</Button></form>
        {sections.length === 0 ? <p className="mt-5 text-gray-600">{t("noSections")}</p> : <ul className="mt-5 divide-y divide-gray-100">{sections.map((section) => <li key={section.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{courseName(section.course_id)} · {section.code}</p><p className="text-sm text-gray-600">{t("capacityCount", { count: section.capacity })} · {t(section.is_published ? "published" : "draft")}</p></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { setSectionId(section.id); setMeetings([]); }}>{t("meetings")}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => void toggleSection(section)}>{t(section.is_published ? "unpublish" : "publish")}</Button></div></li>)}</ul>}
      </section>}
      {selectedSection && <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-display text-xl font-semibold">{t("meetingTitle", { section: selectedSection.code })}</h2><form onSubmit={(event) => void saveMeeting(event)} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"><div><Label htmlFor="meeting-day">{t("day")}</Label><select id="meeting-day" name="day_of_week" className="h-11 w-full rounded-md border border-gray-300 bg-white px-3">{[1, 2, 3, 4, 5, 6, 7].map((day) => <option key={day} value={day}>{t(`days.${day}`)}</option>)}</select></div><div><Label htmlFor="meeting-start">{t("startTime")}</Label><Input id="meeting-start" name="starts_at" type="time" required /></div><div><Label htmlFor="meeting-end">{t("endTime")}</Label><Input id="meeting-end" name="ends_at" type="time" required /></div><div><Label htmlFor="meeting-venue">{t("venue")}</Label><Input id="meeting-venue" name="venue_name" /></div><Button type="submit" disabled={busy}>{t("addMeeting")}</Button></form>{meetings.length === 0 ? <p className="mt-4 text-gray-600">{t("noMeetings")}</p> : <ul className="mt-4 divide-y divide-gray-100">{meetings.map((meeting) => <li key={meeting.id} className="flex items-center justify-between gap-3 py-3"><span>{t(`days.${meeting.day_of_week}`)} · {meeting.starts_at.slice(0, 5)}–{meeting.ends_at.slice(0, 5)}{meeting.venue_name ? ` · ${meeting.venue_name}` : ""}</span><Button type="button" variant="outline" disabled={busy} onClick={() => void deleteMeeting(meeting.id)}>{t("remove")}</Button></li>)}</ul>}</section>}
    </>}
  </div></Container>;
}
