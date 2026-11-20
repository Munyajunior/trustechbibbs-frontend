"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Campus, Classroom, MeetingInput, SessionType } from "@/lib/api/academic-schedule";
import { ApiError } from "@/lib/api/client";
import type { Locale } from "@/lib/api/types";

interface Props {
  /** Campus resolved from section, course, department, school; null when unknown. */
  campusId: string | null;
  campuses: Campus[];
  classrooms: Classroom[];
  locale: Locale;
  busy?: boolean;
  /** Persist the meeting; reject with the ApiError so the form can show it. */
  onAdd: (input: MeetingInput) => Promise<void>;
}

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

export function ScheduleMeetingForm({ campusId, campuses, classrooms, locale, busy = false, onAdd }: Props) {
  const t = useTranslations("scheduleEditor");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = classrooms.filter((room) => room.is_active);
  const rooms = campusId ? active.filter((room) => room.campus_id === campusId) : active;
  const campusName = (id: string) => {
    const campus = campuses.find((row) => row.id === id);
    return campus ? (locale === "fr" ? campus.name_fr || campus.name_en : campus.name_en) : id;
  };
  const option = (room: Classroom) => <option key={room.id} value={room.id}>{room.code} · {room.name}{room.capacity ? ` (${room.capacity})` : ""}</option>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true); setError(null);
    try {
      await onAdd({
        day_of_week: Number(data.get("day_of_week")), starts_at: field(data, "starts_at"),
        ends_at: field(data, "ends_at"), venue_name: null,
        session_type: field(data, "session_type") as SessionType, classroom_id: field(data, "classroom_id"),
      });
      form.reset();
    } catch (caught) {
      setError(caught instanceof ApiError
        ? (caught.code === "MEETING_CONFLICT" ? t("meetingConflict") : caught.localizedMessage(locale))
        : t("saveError"));
    } finally { setSaving(false); }
  }

  const select = "h-11 w-full rounded-md border border-gray-300 bg-white px-3";
  return <div>
    {error && <p role="alert" className="mb-3 rounded-md bg-error-light p-3 text-error">{error}</p>}
    <form onSubmit={(event) => void submit(event)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
      <div><Label htmlFor="meeting-day">{t("day")}</Label><select id="meeting-day" name="day_of_week" className={select}>{[1, 2, 3, 4, 5, 6, 7].map((day) => <option key={day} value={day}>{t(`days.${day}`)}</option>)}</select></div>
      <div><Label htmlFor="meeting-start">{t("startTime")}</Label><Input id="meeting-start" name="starts_at" type="time" required /></div>
      <div><Label htmlFor="meeting-end">{t("endTime")}</Label><Input id="meeting-end" name="ends_at" type="time" required /></div>
      <div><Label htmlFor="meeting-type">{t("sessionType")}</Label><select id="meeting-type" name="session_type" defaultValue="CM" className={select}><option value="CM">{t("sessionTypes.CM")}</option><option value="TD">{t("sessionTypes.TD")}</option><option value="TP">{t("sessionTypes.TP")}</option></select></div>
      <div><Label htmlFor="meeting-room">{t("classroom")}</Label><select id="meeting-room" name="classroom_id" required className={select}><option value="">{t("selectClassroom")}</option>{campusId ? rooms.map(option) : campuses.filter((campus) => active.some((room) => room.campus_id === campus.id)).map((campus) => <optgroup key={campus.id} label={campusName(campus.id)}>{active.filter((room) => room.campus_id === campus.id).map(option)}</optgroup>)}</select>{campusId && rooms.length === 0 && <p className="mt-1 text-xs text-gray-600">{t("noActiveRoomsOnCampus")}</p>}</div>
      <Button type="submit" disabled={busy || saving}>{t("addMeeting")}</Button>
    </form>
  </div>;
}
