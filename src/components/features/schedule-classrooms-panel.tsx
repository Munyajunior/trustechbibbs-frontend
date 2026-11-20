"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClassroom, updateClassroom, type Campus, type Classroom } from "@/lib/api/academic-schedule";
import { ApiError } from "@/lib/api/client";
import type { Locale } from "@/lib/api/types";

interface Props {
  campuses: Campus[];
  classrooms: Classroom[];
  onChange: (next: Classroom[]) => void;
  token: string;
  locale: Locale;
}

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

export function ScheduleClassroomsPanel({ campuses, classrooms, onChange, token, locale }: Props) {
  const t = useTranslations("scheduleEditor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const campusName = (id: string) => {
    const campus = campuses.find((row) => row.id === id);
    return campus ? (locale === "fr" ? campus.name_fr || campus.name_en : campus.name_en) : id;
  };
  const fail = (caught: unknown) => setError(caught instanceof ApiError ? caught.localizedMessage(locale) : t("saveError"));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const capacity = field(data, "capacity");
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = await createClassroom({
        campus_id: field(data, "campus_id"), code: field(data, "code").toUpperCase(), name: field(data, "name"),
        capacity: capacity ? Number(capacity) : null, is_active: true,
      }, token, locale);
      onChange([...classrooms, saved]); form.reset(); setNotice(t("classroomSaved"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  async function toggle(room: Classroom) {
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = await updateClassroom(room.id, {
        campus_id: room.campus_id, code: room.code, name: room.name,
        capacity: room.capacity, is_active: !room.is_active,
      }, token, locale);
      onChange(classrooms.map((row) => row.id === saved.id ? saved : row));
      setNotice(t(saved.is_active ? "classroomActivated" : "classroomDeactivated"));
    } catch (caught) { fail(caught); } finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-gray-200 bg-white p-5">
    <h2 className="font-display text-xl font-semibold">{t("classroomsTitle")}</h2>
    <p className="mt-1 text-sm text-gray-600">{t("classroomsIntro")}</p>
    {error && <p role="alert" className="mt-3 rounded-md bg-error-light p-3 text-error">{error}</p>}
    {notice && <p role="status" className="mt-3 rounded-md bg-primary-subtle p-3 text-primary">{notice}</p>}
    <form onSubmit={(event) => void save(event)} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <div><Label htmlFor="room-campus">{t("campus")}</Label><select id="room-campus" name="campus_id" required className="h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">{t("selectCampus")}</option>{campuses.filter((campus) => campus.is_active).map((campus) => <option key={campus.id} value={campus.id}>{campusName(campus.id)}</option>)}</select></div>
      <div><Label htmlFor="room-code">{t("roomCode")}</Label><Input id="room-code" name="code" required maxLength={20} placeholder="A101" /></div>
      <div><Label htmlFor="room-name">{t("roomName")}</Label><Input id="room-name" name="name" required maxLength={100} /></div>
      <div><Label htmlFor="room-capacity">{t("capacity")}</Label><Input id="room-capacity" name="capacity" type="number" min={1} /></div>
      <Button type="submit" disabled={busy}>{t("addClassroom")}</Button>
    </form>
    {classrooms.length === 0 ? <p className="mt-4 text-gray-600">{t("noClassrooms")}</p> : <div className="mt-4 space-y-4">{campuses.filter((campus) => classrooms.some((room) => room.campus_id === campus.id)).map((campus) => <div key={campus.id}><h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">{campusName(campus.id)}</h3><ul className="divide-y divide-gray-100">{classrooms.filter((room) => room.campus_id === campus.id).map((room) => <li key={room.id} className="flex flex-wrap items-center justify-between gap-3 py-2"><span>{room.code} · {room.name}{room.capacity ? ` · ${t("capacityCount", { count: room.capacity })}` : ""} · {t(room.is_active ? "roomActive" : "roomInactive")}</span><Button type="button" variant="outline" disabled={busy} onClick={() => void toggle(room)}>{t(room.is_active ? "deactivate" : "activate")}</Button></li>)}</ul></div>)}</div>}
  </section>;
}
