import {
  ALLOWED_STATUS_TRANSITIONS,
  buildReviewQuery,
  getAllowedTransitions,
  getApplicationsForReview,
  isCommentRequired,
  isValidReviewSort,
  parseReviewFilters,
  serializeReviewFilters,
} from "@/lib/api/admissions";
import { apiList } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  API_BASE_URL: "http://localhost:8000/api/v1",
  apiList: jest.fn(),
  apiRequest: jest.fn(),
}));

const emptyPage = {
  items: [],
  pagination: { page: 3, per_page: 20, total: 53, total_pages: 3, has_next: false, has_previous: true },
};

test("review queue requests the selected status and page rather than only the first page", async () => {
  jest.mocked(apiList).mockResolvedValue(emptyPage);

  const result = await getApplicationsForReview("staff-token", "fr", { status: "ADMITTED", page: 3 });

  expect(apiList).toHaveBeenCalledWith("/admissions/applications", {
    token: "staff-token",
    locale: "fr",
    query: { page: 3, per_page: 20, status: "ADMITTED" },
    cache: "no-store",
  });
  expect(result.pagination.page).toBe(3);
});

test("legacy positional (status, page) form still works for the staff dashboard", async () => {
  jest.mocked(apiList).mockResolvedValue(emptyPage);
  await getApplicationsForReview("t", "en", "SUBMITTED");
  expect(jest.mocked(apiList).mock.calls.at(-1)?.[1]?.query).toEqual({ page: 1, per_page: 20, status: "SUBMITTED" });
  await getApplicationsForReview("t", "en", "INTERVIEW", 2);
  expect(jest.mocked(apiList).mock.calls.at(-1)?.[1]?.query).toEqual({ page: 2, per_page: 20, status: "INTERVIEW" });
});

test("review queue forwards search, programme, intake, date range and sort", async () => {
  jest.mocked(apiList).mockResolvedValue(emptyPage);

  await getApplicationsForReview("t", "en", {
    search: "  jane  ", program_id: "p-1", intake: "September 2026",
    submitted_from: "2026-01-01", submitted_to: "2026-02-01", sort: "-applicant_name",
  });

  expect(jest.mocked(apiList).mock.calls.at(-1)?.[1]?.query).toEqual({
    page: 1, per_page: 20, search: "jane", program_id: "p-1", intake: "September 2026",
    submitted_from: "2026-01-01", submitted_to: "2026-02-01", sort: "-applicant_name",
  });
});

describe("buildReviewQuery", () => {
  test("omits blank values, malformed dates and unknown sorts", () => {
    expect(buildReviewQuery({ status: "", search: "   ", submitted_from: "01/02/2026", sort: "bogus" }))
      .toEqual({ page: 1, per_page: 20 });
  });

  test("clamps the page to at least 1", () => {
    expect(buildReviewQuery({ page: 0 }).page).toBe(1);
    expect(buildReviewQuery({ page: -4 }).page).toBe(1);
  });
});

describe("sort validation", () => {
  test.each(["created_at", "-submitted_at", "reference_number", "-status", "intake", "applicant_name", "-program_name"])(
    "accepts %s", (value) => expect(isValidReviewSort(value)).toBe(true));
  test.each(["", "-", "name", "--created_at", "created_at desc"])(
    "rejects %p", (value) => expect(isValidReviewSort(value)).toBe(false));
});

describe("URL query round trip", () => {
  test("serialisation omits defaults and parsing restores the filters", () => {
    const query = serializeReviewFilters({
      status: "SHORTLISTED", search: "jane", page: 2, sort: "-created_at", submitted_from: "2026-03-01",
    });
    expect(query).toBe("page=2&status=SHORTLISTED&search=jane&submitted_from=2026-03-01");
    expect(parseReviewFilters(new URLSearchParams(query))).toMatchObject({
      status: "SHORTLISTED", search: "jane", page: 2, submitted_from: "2026-03-01", sort: "",
    });
  });

  test("empty filters produce an empty query string", () => {
    expect(serializeReviewFilters({})).toBe("");
  });

  test("parsing ignores invalid page, dates and sort values from a hand-edited URL", () => {
    const parsed = parseReviewFilters(new URLSearchParams("page=abc&submitted_to=tomorrow&sort=drop_table"));
    expect(parsed).toMatchObject({ page: 1, submitted_to: "", sort: "" });
  });
});

describe("allowed status transitions (mirror the backend table)", () => {
  test.each([
    ["SUBMITTED", ["UNDER_REVIEW"]],
    ["UNDER_REVIEW", ["SHORTLISTED", "INTERVIEW", "ADMITTED", "REJECTED"]],
    ["SHORTLISTED", ["INTERVIEW", "ADMITTED", "REJECTED"]],
    ["INTERVIEW", ["ADMITTED", "REJECTED"]],
  ])("%s -> %j", (from, expected) => {
    expect(getAllowedTransitions(from)).toEqual(expected);
  });

  test.each(["ADMITTED", "REJECTED", "WITHDRAWN", "EXPIRED", "ENROLLED", "DRAFT", "UNKNOWN"])(
    "%s offers no transitions", (status) => expect(getAllowedTransitions(status)).toEqual([]));

  test("SUBMITTED cannot be rejected directly and no status moves backwards or to ENROLLED", () => {
    expect(getAllowedTransitions("SUBMITTED")).not.toContain("REJECTED");
    for (const targets of Object.values(ALLOWED_STATUS_TRANSITIONS)) {
      expect(targets).not.toContain("ENROLLED");
      expect(targets).not.toContain("SUBMITTED");
    }
  });

  test("returned list is a copy, so callers cannot mutate the table", () => {
    getAllowedTransitions("SUBMITTED").push("ADMITTED");
    expect(getAllowedTransitions("SUBMITTED")).toEqual(["UNDER_REVIEW"]);
  });

  test("only REJECTED requires a comment", () => {
    expect(isCommentRequired("REJECTED")).toBe(true);
    for (const status of ["UNDER_REVIEW", "SHORTLISTED", "INTERVIEW", "ADMITTED"]) {
      expect(isCommentRequired(status)).toBe(false);
    }
  });
});
