import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ScheduleMeetingForm } from "@/components/features/schedule-meeting-form";
import { ScheduleNonTeachingDaysPanel } from "@/components/features/schedule-non-teaching-days-panel";
import { ScheduleReadinessCard } from "@/components/features/schedule-readiness-card";
import { ScheduleClassroomsPanel } from "@/components/features/schedule-classrooms-panel";
import {
  addNonTeachingDay, getTimetableReadiness, listNonTeachingDays, updateClassroom,
  type Campus, type Classroom, type TimetableReadiness,
} from "@/lib/api/academic-schedule";
import { ApiError } from "@/lib/api/client";

// next-intl ships ESM-only; resolve keys against the real messages for the requested locale.
jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, values: Record<string, string | number> = {}) => {
    const messages = jest.requireActual("@/messages/en.json");
    const text = String(`${namespace}.${key}`.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages));
    return text
      .replace(/\{(\w+), plural, one \{([^}]*)\} other \{([^}]*)\}\}/g, (_, name, one, other) => (Number(values[name]) === 1 ? one : other).replace("#", String(values[name])))
      .replace(/\{(\w+)\}/g, (_, name) => String(values[name]));
  },
}));

jest.mock("@/lib/api/academic-schedule", () => ({
  addNonTeachingDay: jest.fn(),
  createClassroom: jest.fn(),
  getTimetableReadiness: jest.fn(),
  listNonTeachingDays: jest.fn(),
  removeNonTeachingDay: jest.fn(),
  updateClassroom: jest.fn(),
}));

const apiError = (code: string, status = 409) =>
  new ApiError(status, { code, message_en: "raw en", message_fr: "raw fr", details: [], reference_id: "r" });

const campus = (id: string, name: string): Campus => ({ id, code: id.toUpperCase(), name_en: name, name_fr: name, city: null, is_active: true });
const room = (id: string, campusId: string, code: string, active = true): Classroom => ({ id, campus_id: campusId, code, name: `Room ${code}`, capacity: 40, is_active: active });
const campuses = [campus("c1", "Main"), campus("c2", "Annex")];
const rooms = [room("r1", "c1", "A101"), room("r2", "c1", "A102", false), room("r3", "c2", "B201")];

const readiness = (overrides: Partial<TimetableReadiness> = {}): TimetableReadiness => ({
  term_id: "t1", sections_total: 4, sections_with_meetings: 3, meetings_without_classroom: 2,
  sections_without_meetings: [{ id: "s9", code: "B", course_code: "INF301", course_title_en: "Networks", course_title_fr: "Reseaux", department_id: "d1" }],
  ...overrides,
});

beforeEach(() => jest.resetAllMocks());

describe("ScheduleReadinessCard", () => {
  it("shows counts and an expandable list of sections without a timetable", async () => {
    jest.mocked(getTimetableReadiness).mockResolvedValue(readiness());
    render(<ScheduleReadinessCard termId="t1" token="tok" locale="en" />);
    expect(await screen.findByText("3 of 4 sections have a timetable")).toBeInTheDocument();
    expect(screen.getByText("2 slots have no classroom")).toBeInTheDocument();
    expect(screen.queryByText(/INF301/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Show sections without a timetable \(1\)/ }));
    expect(screen.getByText("INF301 · Networks · B")).toBeInTheDocument();
  });

  it("shows an error with retry on failure instead of vanishing, then recovers", async () => {
    jest.mocked(getTimetableReadiness).mockRejectedValueOnce(new Error("boom")).mockResolvedValue(readiness());
    render(<ScheduleReadinessCard termId="t1" token="tok" locale="en" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load timetable readiness.");
    expect(screen.queryByText(/sections have a timetable/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("3 of 4 sections have a timetable")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the last good card and flags the error when a refresh fails", async () => {
    jest.mocked(getTimetableReadiness).mockResolvedValueOnce(readiness()).mockRejectedValueOnce(new Error("boom"));
    const view = render(<ScheduleReadinessCard termId="t1" token="tok" locale="en" refreshKey={0} />);
    await screen.findByText("3 of 4 sections have a timetable");
    view.rerender(<ScheduleReadinessCard termId="t1" token="tok" locale="en" refreshKey={1} />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("3 of 4 sections have a timetable")).toBeInTheDocument();
  });

  it("ignores a stale response from the previous term", async () => {
    let resolveOld: (value: TimetableReadiness) => void = () => undefined;
    jest.mocked(getTimetableReadiness).mockImplementation((termId) => termId === "old"
      ? new Promise((resolve) => { resolveOld = resolve; })
      : Promise.resolve(readiness({ term_id: "new", sections_total: 9, sections_with_meetings: 9 })));
    const view = render(<ScheduleReadinessCard key="old" termId="old" token="tok" locale="en" />);
    view.rerender(<ScheduleReadinessCard key="new" termId="new" token="tok" locale="en" />);
    expect(await screen.findByText("9 of 9 sections have a timetable")).toBeInTheDocument();
    resolveOld(readiness({ sections_total: 1, sections_with_meetings: 0 }));
    await waitFor(() => expect(screen.getByText("9 of 9 sections have a timetable")).toBeInTheDocument());
    expect(screen.queryByText("0 of 1 sections have a timetable")).not.toBeInTheDocument();
  });
});

describe("ScheduleMeetingForm", () => {
  const options = () => within(screen.getByLabelText("Classroom")).getAllByRole("option").map((o) => o.textContent);

  it("lists only active classrooms on the section campus", () => {
    render(<ScheduleMeetingForm campusId="c1" campuses={campuses} classrooms={rooms} locale="en" onAdd={jest.fn()} />);
    expect(options()).toEqual(["Choose a classroom", "A101 · Room A101 (40)"]);
  });

  it("falls back to all active classrooms grouped by campus when the campus is unknown", () => {
    render(<ScheduleMeetingForm campusId={null} campuses={campuses} classrooms={rooms} locale="en" onAdd={jest.fn()} />);
    expect(options()).toEqual(["Choose a classroom", "A101 · Room A101 (40)", "B201 · Room B201 (40)"]);
    expect(screen.getByRole("group", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Annex" })).toBeInTheDocument();
  });

  it("hints when the campus has no active classroom", () => {
    render(<ScheduleMeetingForm campusId="c1" campuses={campuses} classrooms={[room("r2", "c1", "A102", false)]} locale="en" onAdd={jest.fn()} />);
    expect(screen.getByText(/No active classrooms on this campus/)).toBeInTheDocument();
  });

  it("submits the chosen session type and classroom", async () => {
    const onAdd = jest.fn().mockResolvedValue(undefined);
    render(<ScheduleMeetingForm campusId="c1" campuses={campuses} classrooms={rooms} locale="en" onAdd={onAdd} />);
    await userEvent.type(screen.getByLabelText("Starts"), "08:00");
    await userEvent.type(screen.getByLabelText("Ends"), "10:00");
    await userEvent.selectOptions(screen.getByLabelText("Session type"), "TD");
    await userEvent.selectOptions(screen.getByLabelText("Classroom"), "r1");
    await userEvent.click(screen.getByRole("button", { name: "Add meeting" }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ session_type: "TD", classroom_id: "r1", venue_name: null })));
  });

  it("renders the conflict message when the API answers MEETING_CONFLICT", async () => {
    const onAdd = jest.fn().mockRejectedValue(apiError("MEETING_CONFLICT"));
    render(<ScheduleMeetingForm campusId="c1" campuses={campuses} classrooms={rooms} locale="en" onAdd={onAdd} />);
    await userEvent.type(screen.getByLabelText("Starts"), "08:00");
    await userEvent.type(screen.getByLabelText("Ends"), "10:00");
    await userEvent.selectOptions(screen.getByLabelText("Classroom"), "r1");
    await userEvent.click(screen.getByRole("button", { name: "Add meeting" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Classroom already booked at that time");
  });
});

describe("ScheduleNonTeachingDaysPanel", () => {
  const term = { id: "t1", academic_year: "2026-2027", semester: 1, starts_on: "2026-09-01", ends_on: "2027-01-31" };

  async function fillAndSubmit() {
    await userEvent.type(screen.getByLabelText("Date"), "2026-12-25");
    await userEvent.type(screen.getByLabelText("Label (English)"), "Christmas");
    await userEvent.type(screen.getByLabelText("Label (French)"), "Noel");
    await userEvent.click(screen.getByRole("button", { name: "Add day" }));
  }

  it("renders the duplicate message for NON_TEACHING_DAY_EXISTS", async () => {
    jest.mocked(listNonTeachingDays).mockResolvedValue([]);
    jest.mocked(addNonTeachingDay).mockRejectedValue(apiError("NON_TEACHING_DAY_EXISTS"));
    render(<ScheduleNonTeachingDaysPanel term={term} campuses={campuses} token="tok" locale="en" />);
    await screen.findByText("No non-teaching days in this term.");
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("This non-teaching day already exists.");
  });

  it("shows a load error with retry rather than an empty list", async () => {
    jest.mocked(listNonTeachingDays).mockRejectedValueOnce(new Error("boom")).mockResolvedValue([]);
    render(<ScheduleNonTeachingDaysPanel term={term} campuses={campuses} token="tok" locale="en" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load non-teaching days.");
    expect(screen.queryByText("No non-teaching days in this term.")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No non-teaching days in this term.")).toBeInTheDocument();
  });
});

describe("ScheduleClassroomsPanel", () => {
  it("sends an explicit full payload with the toggled is_active", async () => {
    const onChange = jest.fn();
    jest.mocked(updateClassroom).mockResolvedValue({ ...rooms[0], is_active: false });
    render(<ScheduleClassroomsPanel campuses={campuses} classrooms={[rooms[0]]} onChange={onChange} token="tok" locale="en" />);
    await userEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(updateClassroom).toHaveBeenCalledWith(
      "r1", { campus_id: "c1", code: "A101", name: "Room A101", capacity: 40, is_active: false }, "tok", "en",
    ));
    expect(onChange).toHaveBeenCalledWith([{ ...rooms[0], is_active: false }]);
  });
});
