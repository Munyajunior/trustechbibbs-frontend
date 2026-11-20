import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StudentTimetable } from "@/components/features/student-timetable";
import { getMyTimetable, type TimetableEntry } from "@/lib/api/course-registration";
import { useAuthStore } from "@/stores/auth-store";

// next-intl ships ESM-only; resolve keys against the real English messages instead.
jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, values: Record<string, string> = {}) => {
    const messages = jest.requireActual("@/messages/en.json");
    const text = `${namespace}.${key}`.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
    return String(text).replace(/\{(\w+)\}/g, (_, name) => values[name]);
  },
}));

jest.mock("@/lib/api/course-registration", () => ({ getMyTimetable: jest.fn() }));

const entry = (overrides: Partial<TimetableEntry> = {}): TimetableEntry => ({
  day_of_week: 1,
  starts_at: "08:00:00",
  ends_at: "10:00:00",
  session_type: "CM",
  course_code: "INF201",
  course_name_en: "Algorithms",
  course_name_fr: "Algorithmes",
  section_code: "A",
  classroom_name: "Amphi A",
  classroom_code: "A101",
  lecturer_name: "Dr X",
  ...overrides,
});

function renderTimetable() {
  useAuthStore.setState({
    accessToken: "tok",
    user: { id: "u", email: "s@t.test", full_name: "S", roles: ["student"] },
  });
  return render(<StudentTimetable locale="en" />);
}

describe("student timetable", () => {
  it("renders a day-grouped list with time, type, course, room and lecturer, and prints", async () => {
    jest.mocked(getMyTimetable).mockResolvedValue([
      entry(),
      entry({ day_of_week: 3, starts_at: "14:00:00", ends_at: "16:00:00", session_type: "TD", classroom_code: null, classroom_name: null, lecturer_name: null }),
    ]);
    const print = jest.spyOn(window, "print").mockImplementation(() => undefined);
    renderTimetable();

    expect(await screen.findByText("08:00–10:00 · CM · INF201 · Room A101 (Amphi A) · Dr X")).toBeInTheDocument();
    expect(screen.getByText("14:00–16:00 · TD · INF201 · Room to be announced")).toBeInTheDocument();
    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("Wednesday")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Print timetable" }));
    expect(print).toHaveBeenCalled();
  });

  it("shows an empty state when there are no enrollments", async () => {
    jest.mocked(getMyTimetable).mockResolvedValue([]);
    renderTimetable();
    await waitFor(() => expect(screen.getByText(/Your timetable is empty/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Print timetable" })).not.toBeInTheDocument();
  });
});
