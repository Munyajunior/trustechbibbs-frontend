"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { listAllCourses, listDepartments, listSchools, type Course, type Department, type School } from "@/lib/api/academic-catalogue";
import {
  addMeeting, addNonTeachingDay, createClassroom, createSection, createTerm, getTimetableReadiness,
  listCampuses, listClassrooms, listMeetings, listNonTeachingDays, listSections, listTerms,
  removeMeeting, removeNonTeachingDay, updateClassroom, updateSection, updateTerm,
  type AcademicTerm, type Campus, type Classroom, type CourseSection, type NonTeachingDay,
  type NonTeachingKind, type SectionMeeting, type SessionType, type TermInput, type TimetableReadiness,
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
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [days, setDays] = useState<NonTeachingDay[]>([]);
  const [readiness, setReadiness] = useState<TimetableReadiness | null>(null);
  const [showMissing, setShowMissing] = useState(false);
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
    Promise.all([
      listTerms(token, locale), listAllCourses(token, locale), listCampuses(token, locale),
      listSchools(token, locale), listDepartments(token, locale), listClassrooms({ include_inactive: true }, token, locale),
    ])
      .then(([termRows, courseRows, campusRows, schoolRows, departmentRows, classroomRows]) => {
        if (!active) return;
        setTerms(termRows); setCourses(courseRows); setCampuses(campusRows);
        setSchools(schoolRows); setDepartments(departmentRows); setClassrooms(classroomRows);
      })
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

  const refreshReadiness = useCallback(() => {
    if (!token || !termId) return Promise.resolve();
    return getTimetableReadiness(termId, token, locale).then(setReadiness).catch(() => setReadiness(null));
  }, [token, termId, locale]);

  const termStart = selectedTerm?.starts_on;
  const termEnd = selectedTerm?.ends_on;
  useEffect(() => {
    if (!token || !termId) return;
    let active = true;
    getTimetableReadiness(termId, token, locale)
      .then((row) => { if (active) setReadiness(row); })
      .catch(() => { if (active) setReadiness(null); });
    return () => { active = false; };
  }, [termId, token, locale]);

  useEffect(() => {
    if (!token || !termStart || !termEnd) return;
    let active = true;
    listNonTeachingDays(termStart, termEnd, token, locale)
      .then((rows) => { if (active) setDays(rows); })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("loadError")); });
    return () => { active = false; };
  }, [termStart, termEnd, token, locale, t]);

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
  const campusName = (id: string | null) => {
    if (!id) return t("allCampuses");
    const campus = campuses.find((row) => row.id === id);
    return campus ? (locale === "fr" ? campus.name_fr || campus.name_en : campus.name_en) : id;
  };
  const classroomLabel = (id: string | null) => {
    const room = classrooms.find((row) => row.id === id);
    return room ? `${room.code} (${room.name})` : null;
  };
  // section -> course -> department -> school -> campus
  const sectionCampusId = (section: CourseSection | undefined) => {
    const course = courses.find((row) => row.id === section?.course_id);
    const department = departments.find((row) => row.id === course?.department_id);
    return schools.find((row) => row.id === department?.school_id)?.campus_id ?? null;
  };
  const meetingCampusId = sectionCampusId(selectedSection);
  const activeRooms = classrooms.filter((room) => room.is_active);
  const pickerRooms = meetingCampusId ? activeRooms.filter((room) => room.campus_id === meetingCampusId) : activeRooms;
  const roomOption = (room: Classroom) => <option key={room.id} value={room.id}>{room.code} · {room.name}{room.capacity ? ` (${room.capacity})` : ""}</option>;
  const fail = (caught: unknown) => setError(caught instanceof ApiError
    ? (caught.code === "MEETING_CONFLICT" ? t("meetingConflict") : caught.localizedMessage(locale))
    : t("saveError"));

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
      void refreshReadiness();
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
        ends_at: field(data, "ends_at"), venue_name: null,
        session_type: field(data, "session_type") as SessionType, classroom_id: field(data, "classroom_id"),
      }, token, locale);
      setMeetings((current) => [...current, saved]); form.reset(); setNotice(t("meetingSaved"));
      void refreshReadiness();
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function saveClassroom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const capacity = field(data, "capacity");
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = await createClassroom({
        campus_id: field(data, "campus_id"), code: field(data, "code").toUpperCase(), name: field(data, "name"),
        capacity: capacity ? Number(capacity) : null, is_active: true,
      }, token, locale);
      setClassrooms((current) => [...current, saved]); form.reset(); setNotice(t("classroomSaved"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function toggleClassroom(room: Classroom) {
    if (!token) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const { id: _id, ...payload } = room;
      void _id;
      const saved = await updateClassroom(room.id, { ...payload, is_active: !room.is_active }, token, locale);
      setClassrooms((current) => current.map((row) => row.id === saved.id ? saved : row));
      setNotice(t(saved.is_active ? "classroomActivated" : "classroomDeactivated"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function saveDay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = await addNonTeachingDay({
        campus_id: field(data, "campus_id") || null, day: field(data, "day"),
        label_en: field(data, "label_en"), label_fr: field(data, "label_fr"),
        kind: field(data, "kind") as NonTeachingKind,
      }, token, locale);
      setDays((current) => [...current, saved].sort((a, b) => a.day.localeCompare(b.day)));
      form.reset(); setNotice(t("dayAdded"));
    } catch (caught) {
      setError(caught instanceof ApiError && caught.code === "NON_TEACHING_DAY_EXISTS" ? t("dayExists") : caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));
    } finally { setBusy(false); }
  }

  async function deleteDay(id: string) {
    if (!token) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await removeNonTeachingDay(id, token, locale);
      setDays((current) => current.filter((row) => row.id !== id)); setNotice(t("dayRemoved"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function deleteMeeting(meetingId: string) {
    if (!token || !sectionId) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await removeMeeting(sectionId, meetingId, token, locale);
      setMeetings((current) => current.filter((row) => row.id !== meetingId));
      setNotice(t("meetingRemoved")); void refreshReadiness();
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
      <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-display text-xl font-semibold">{t("classroomsTitle")}</h2><p className="mt-1 text-sm text-gray-600">{t("classroomsIntro")}</p>
        <form onSubmit={(event) => void saveClassroom(event)} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"><div><Label htmlFor="room-campus">{t("campus")}</Label><select id="room-campus" name="campus_id" required className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("selectCampus")}</option>{campuses.filter((campus) => campus.is_active).map((campus) => <option key={campus.id} value={campus.id}>{campusName(campus.id)}</option>)}</select></div><div><Label htmlFor="room-code">{t("roomCode")}</Label><Input id="room-code" name="code" required maxLength={20} placeholder="A101" /></div><div><Label htmlFor="room-name">{t("roomName")}</Label><Input id="room-name" name="name" required maxLength={100} /></div><div><Label htmlFor="room-capacity">{t("capacity")}</Label><Input id="room-capacity" name="capacity" type="number" min={1} /></div><Button type="submit" disabled={busy}>{t("addClassroom")}</Button></form>
        {classrooms.length === 0 ? <p className="mt-4 text-gray-600">{t("noClassrooms")}</p> : <div className="mt-4 space-y-4">{campuses.filter((campus) => classrooms.some((room) => room.campus_id === campus.id)).map((campus) => <div key={campus.id}><h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">{campusName(campus.id)}</h3><ul className="divide-y divide-gray-100">{classrooms.filter((room) => room.campus_id === campus.id).map((room) => <li key={room.id} className="flex flex-wrap items-center justify-between gap-3 py-2"><span>{room.code} · {room.name}{room.capacity ? ` · ${t("capacityCount", { count: room.capacity })}` : ""} · {t(room.is_active ? "roomActive" : "roomInactive")}</span><Button type="button" variant="outline" disabled={busy} onClick={() => void toggleClassroom(room)}>{t(room.is_active ? "deactivate" : "activate")}</Button></li>)}</ul></div>)}</div>}
      </section>
      {selectedTerm && readiness && <section aria-label={t("readinessTitle")} className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-display text-xl font-semibold">{t("readinessTitle")}</h2><p className="mt-2">{t("readinessSections", { withMeetings: readiness.sections_with_meetings, total: readiness.sections_total })}</p><p>{t("readinessNoRoom", { count: readiness.meetings_without_classroom })}</p>{readiness.sections_without_meetings.length > 0 && <div className="mt-3"><Button type="button" variant="outline" aria-expanded={showMissing} onClick={() => setShowMissing((value) => !value)}>{t(showMissing ? "hideMissing" : "showMissing", { count: readiness.sections_without_meetings.length })}</Button>{showMissing && <ul className="mt-3 divide-y divide-gray-100">{readiness.sections_without_meetings.map((row) => <li key={row.id} className="py-2">{row.course_code} · {locale === "fr" ? row.course_title_fr || row.course_title_en : row.course_title_en} · {row.code}</li>)}</ul>}</div>}</section>}
      {selectedTerm && <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-display text-xl font-semibold">{t("daysTitle", { year: selectedTerm.academic_year, semester: selectedTerm.semester })}</h2><p className="mt-1 text-sm text-gray-600">{t("daysIntro")}</p>
        <form onSubmit={(event) => void saveDay(event)} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end"><div><Label htmlFor="day-date">{t("date")}</Label><Input id="day-date" name="day" type="date" required min={selectedTerm.starts_on} max={selectedTerm.ends_on} /></div><div><Label htmlFor="day-campus">{t("campus")}</Label><select id="day-campus" name="campus_id" className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("allCampuses")}</option>{campuses.filter((campus) => campus.is_active).map((campus) => <option key={campus.id} value={campus.id}>{campusName(campus.id)}</option>)}</select></div><div><Label htmlFor="day-kind">{t("kind")}</Label><select id="day-kind" name="kind" className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="HOLIDAY">{t("kinds.HOLIDAY")}</option><option value="EXAM_PERIOD">{t("kinds.EXAM_PERIOD")}</option><option value="OTHER">{t("kinds.OTHER")}</option></select></div><div><Label htmlFor="day-label-en">{t("labelEn")}</Label><Input id="day-label-en" name="label_en" required maxLength={200} /></div><div><Label htmlFor="day-label-fr">{t("labelFr")}</Label><Input id="day-label-fr" name="label_fr" required maxLength={200} /></div><Button type="submit" disabled={busy}>{t("addDay")}</Button></form>
        {days.length === 0 ? <p className="mt-4 text-gray-600">{t("noDays")}</p> : <ul className="mt-4 divide-y divide-gray-100">{days.map((day) => <li key={day.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span>{day.day} · {locale === "fr" ? day.label_fr : day.label_en} · {t(`kinds.${day.kind}`)} · {campusName(day.campus_id)}</span><Button type="button" variant="outline" disabled={busy} onClick={() => void deleteDay(day.id)}>{t("remove")}</Button></li>)}</ul>}
      </section>}
      {selectedTerm && <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-display text-xl font-semibold">{t("sectionsTitle", { year: selectedTerm.academic_year, semester: selectedTerm.semester })}</h2><form onSubmit={(event) => void saveSection(event)} className="mt-4 grid gap-4 md:grid-cols-3 lg:grid-cols-6"><div className="lg:col-span-2"><Label htmlFor="section-course">{t("course")}</Label><select id="section-course" name="course_id" required className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("selectCourse")}</option>{courses.filter((course) => course.status === "ACTIVE").map((course) => <option key={course.id} value={course.id}>{courseName(course.id)}</option>)}</select></div><div><Label htmlFor="section-code">{t("sectionCode")}</Label><Input id="section-code" name="code" required maxLength={20} placeholder="A" /></div><div><Label htmlFor="section-capacity">{t("capacity")}</Label><Input id="section-capacity" name="capacity" type="number" min={1} max={1000} required defaultValue={30} /></div><div><Label htmlFor="section-lecturer">{t("lecturer")}</Label><Input id="section-lecturer" name="lecturer_name" /></div><div><Label htmlFor="section-mode">{t("mode")}</Label><select id="section-mode" name="delivery_mode" className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="ON_CAMPUS">{t("modes.ON_CAMPUS")}</option><option value="ONLINE">{t("modes.ONLINE")}</option><option value="HYBRID">{t("modes.HYBRID")}</option></select></div><Button type="submit" disabled={busy} className="md:col-span-3 lg:col-span-6">{t("addSection")}</Button></form>
        {sections.length === 0 ? <p className="mt-5 text-gray-600">{t("noSections")}</p> : <ul className="mt-5 divide-y divide-gray-100">{sections.map((section) => <li key={section.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{courseName(section.course_id)} · {section.code}</p><p className="text-sm text-gray-600">{t("capacityCount", { count: section.capacity })} · {t(section.is_published ? "published" : "draft")}</p></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { setSectionId(section.id); setMeetings([]); }}>{t("meetings")}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => void toggleSection(section)}>{t(section.is_published ? "unpublish" : "publish")}</Button></div></li>)}</ul>}
      </section>}
      {selectedSection && <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-display text-xl font-semibold">{t("meetingTitle", { section: selectedSection.code })}</h2><form onSubmit={(event) => void saveMeeting(event)} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end"><div><Label htmlFor="meeting-day">{t("day")}</Label><select id="meeting-day" name="day_of_week" className="h-11 w-full rounded-md border border-gray-300 bg-white px-3">{[1, 2, 3, 4, 5, 6, 7].map((day) => <option key={day} value={day}>{t(`days.${day}`)}</option>)}</select></div><div><Label htmlFor="meeting-start">{t("startTime")}</Label><Input id="meeting-start" name="starts_at" type="time" required /></div><div><Label htmlFor="meeting-end">{t("endTime")}</Label><Input id="meeting-end" name="ends_at" type="time" required /></div><div><Label htmlFor="meeting-type">{t("sessionType")}</Label><select id="meeting-type" name="session_type" defaultValue="CM" className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="CM">{t("sessionTypes.CM")}</option><option value="TD">{t("sessionTypes.TD")}</option><option value="TP">{t("sessionTypes.TP")}</option></select></div><div><Label htmlFor="meeting-room">{t("classroom")}</Label><select id="meeting-room" name="classroom_id" required className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("selectClassroom")}</option>{meetingCampusId ? pickerRooms.map(roomOption) : campuses.filter((campus) => activeRooms.some((room) => room.campus_id === campus.id)).map((campus) => <optgroup key={campus.id} label={campusName(campus.id)}>{activeRooms.filter((room) => room.campus_id === campus.id).map(roomOption)}</optgroup>)}</select></div><Button type="submit" disabled={busy}>{t("addMeeting")}</Button></form>{meetings.length === 0 ? <p className="mt-4 text-gray-600">{t("noMeetings")}</p> : <ul className="mt-4 divide-y divide-gray-100">{meetings.map((meeting) => <li key={meeting.id} className="flex items-center justify-between gap-3 py-3"><span>{t(`days.${meeting.day_of_week}`)} · {meeting.starts_at.slice(0, 5)}–{meeting.ends_at.slice(0, 5)}{" · "}{t(`sessionTypes.${meeting.session_type}`)}{" · "}{classroomLabel(meeting.classroom_id) ?? meeting.venue_name ?? t("noClassroom")}</span><Button type="button" variant="outline" disabled={busy} onClick={() => void deleteMeeting(meeting.id)}>{t("remove")}</Button></li>)}</ul>}</section>}
    </>}
  </div></Container>;
}
