import { getApplicationsForReview } from "@/lib/api/admissions";
import { apiList } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  API_BASE_URL: "http://localhost:8000/api/v1",
  apiList: jest.fn(),
  apiRequest: jest.fn(),
}));

test("review queue requests the selected status and page rather than only the first page", async () => {
  jest.mocked(apiList).mockResolvedValue({
    items: [],
    pagination: {
      page: 3,
      per_page: 20,
      total: 53,
      total_pages: 3,
      has_next: false,
      has_previous: true,
    },
  });

  const result = await getApplicationsForReview("staff-token", "fr", "ADMITTED", 3);

  expect(apiList).toHaveBeenCalledWith("/admissions/applications", {
    token: "staff-token",
    locale: "fr",
    query: { page: 3, per_page: 20, status: "ADMITTED" },
    cache: "no-store",
  });
  expect(result.pagination.page).toBe(3);
});
