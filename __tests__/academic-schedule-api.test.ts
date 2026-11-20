import { ApiError } from "@/lib/api/client";
import {
  addMeeting,
  addNonTeachingDay,
  createClassroom,
  getTimetableReadiness,
  listClassrooms,
  listNonTeachingDays,
  removeNonTeachingDay,
  updateClassroom,
} from "@/lib/api/academic-schedule";

function ok(data: unknown) {
  return Promise.resolve({
    status: 200, ok: true, statusText: "OK",
    json: () => Promise.resolve({ success: true, data, meta: { timestamp: "t", request_id: "r" } }),
  } as Response);
}

const fetchMock = jest.fn();
beforeEach(() => { fetchMock.mockReset(); global.fetch = fetchMock as unknown as typeof fetch; });

const call = () => {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, init, path: new URL(url).pathname, search: new URL(url).searchParams };
};

describe("academic schedule api", () => {
  it("lists classrooms with campus and inactive filters", async () => {
    fetchMock.mockReturnValue(ok([]));
    await listClassrooms({ campus_id: "c1", include_inactive: true }, "tok", "en");
    const { path, search, init } = call();
    expect(path).toBe("/api/v1/academic/classrooms");
    expect(search.get("campus_id")).toBe("c1");
    expect(search.get("include_inactive")).toBe("true");
    expect(init.method ?? "GET").toBe("GET");
  });

  it("createClassroom POSTs the JSON body", async () => {
    fetchMock.mockReturnValue(ok({ id: "r1" }));
    const input = { campus_id: "c1", code: "A101", name: "Amphi A", capacity: 120, is_active: true };
    await createClassroom(input, "tok", "en");
    const { path, init } = call();
    expect(path).toBe("/api/v1/academic/classrooms");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(input);
  });

  it("updateClassroom PUTs to the classroom id", async () => {
    fetchMock.mockReturnValue(ok({ id: "r1" }));
    await updateClassroom("r1", { campus_id: "c1", code: "A101", name: "Amphi A", capacity: null, is_active: false }, "tok", "fr");
    const { path, init } = call();
    expect(path).toBe("/api/v1/academic/classrooms/r1");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string).is_active).toBe(false);
  });

  it("listNonTeachingDays sends from/to", async () => {
    fetchMock.mockReturnValue(ok([]));
    await listNonTeachingDays("2026-09-01", "2027-01-31", "tok", "en");
    const { path, search } = call();
    expect(path).toBe("/api/v1/academic/non-teaching-days");
    expect(search.get("from")).toBe("2026-09-01");
    expect(search.get("to")).toBe("2027-01-31");
  });

  it("addNonTeachingDay POSTs the JSON body", async () => {
    fetchMock.mockReturnValue(ok({ id: "d1" }));
    const input = { campus_id: null, day: "2026-12-25", label_en: "Christmas", label_fr: "Noël", kind: "HOLIDAY" as const };
    await addNonTeachingDay(input, "tok", "en");
    const { path, init } = call();
    expect(path).toBe("/api/v1/academic/non-teaching-days");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(input);
  });

  it("removeNonTeachingDay DELETEs by id", async () => {
    fetchMock.mockReturnValue(ok({ removed: true }));
    await removeNonTeachingDay("d1", "tok", "en");
    const { path, init } = call();
    expect(path).toBe("/api/v1/academic/non-teaching-days/d1");
    expect(init.method).toBe("DELETE");
  });

  it("getTimetableReadiness GETs the term readiness", async () => {
    fetchMock.mockReturnValue(ok({ term_id: "t1", sections_total: 2, sections_with_meetings: 1, sections_without_meetings: [], meetings_without_classroom: 0 }));
    const result = await getTimetableReadiness("t1", "tok", "en");
    expect(call().path).toBe("/api/v1/academic/terms/t1/readiness");
    expect(result.sections_total).toBe(2);
  });

  it("addMeeting sends session_type and classroom_id", async () => {
    fetchMock.mockReturnValue(ok({ id: "m1" }));
    await addMeeting("s1", { day_of_week: 1, starts_at: "08:00", ends_at: "10:00", venue_name: null, session_type: "TD", classroom_id: "r1" }, "tok", "en");
    const { path, init } = call();
    expect(path).toBe("/api/v1/academic/sections/s1/meetings");
    expect(JSON.parse(init.body as string)).toMatchObject({ session_type: "TD", classroom_id: "r1" });
  });

  it("surfaces MEETING_CONFLICT as an ApiError with its code", async () => {
    fetchMock.mockReturnValue(Promise.resolve({
      status: 409, ok: false, statusText: "Conflict",
      json: () => Promise.resolve({ success: false, error: { code: "MEETING_CONFLICT", message_en: "x", message_fr: "y", details: [], reference_id: "r" } }),
    } as Response));
    await expect(addMeeting("s1", { day_of_week: 1, starts_at: "08:00", ends_at: "10:00", venue_name: null, session_type: "CM", classroom_id: "r1" }, "tok", "en"))
      .rejects.toMatchObject({ code: "MEETING_CONFLICT" });
    expect(ApiError).toBeDefined();
  });
});
