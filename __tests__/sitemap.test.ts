import sitemap from "@/app/sitemap";
import { getEvents, getGalleryAlbums, getNews, getPrograms } from "@/lib/api/public";

jest.mock("@/i18n/routing", () => ({ routing: { locales: ["en", "fr"] } }));
jest.mock("@/lib/api/public", () => ({
  getPrograms: jest.fn(),
  getNews: jest.fn(),
  getEvents: jest.fn(),
  getGalleryAlbums: jest.fn(),
}));

function page(slugs: string[], current: number, totalPages = 1) {
  return {
    items: slugs.map((slug) => ({ slug })),
    pagination: {
      page: current,
      per_page: 100,
      total: slugs.length,
      total_pages: totalPages,
      has_next: current < totalPages,
      has_previous: current > 1,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getPrograms).mockResolvedValue(page([], 1) as never);
  jest.mocked(getNews).mockResolvedValue(page([], 1) as never);
  jest.mocked(getEvents).mockResolvedValue(page([], 1) as never);
  jest.mocked(getGalleryAlbums).mockResolvedValue([]);
});

test("includes all published slugs in both locales and excludes private admission routes", async () => {
  jest.mocked(getPrograms)
    .mockResolvedValueOnce(page(["software-engineering"], 1, 2) as never)
    .mockResolvedValueOnce(page(["nursing"], 2, 2) as never);
  jest.mocked(getNews).mockResolvedValue(page(["campus-update"], 1) as never);
  jest.mocked(getEvents).mockResolvedValue(page(["open-day"], 1) as never);
  jest.mocked(getGalleryAlbums).mockResolvedValue([{ slug: "campus-life" }] as never);

  const entries = await sitemap();
  const urls = entries.map((entry) => entry.url);

  for (const locale of ["en", "fr"]) {
    for (const path of [
      "/programs/software-engineering", "/programs/nursing", "/news/campus-update",
      "/events/open-day", "/gallery/campus-life", "/about/leadership",
    ]) {
      expect(urls).toContain(`http://localhost:3000/${locale}${path}`);
    }
  }
  expect(urls.some((url) => /\/admissions\/(application|login|register|status)/.test(url))).toBe(false);
  expect(entries.find((entry) => entry.url.endsWith("/en/news/campus-update"))?.alternates?.languages).toEqual({
    en: "http://localhost:3000/en/news/campus-update",
    fr: "http://localhost:3000/fr/news/campus-update",
  });
  expect(getPrograms).toHaveBeenCalledTimes(2);
});

test("keeps static pages and healthy sections when one public API is unavailable", async () => {
  jest.mocked(getNews).mockRejectedValue(new Error("API unavailable"));
  jest.mocked(getPrograms).mockResolvedValue(page(["civil-engineering"], 1) as never);
  const log = jest.spyOn(console, "error").mockImplementation(() => undefined);
  try {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain("http://localhost:3000/en");
    expect(urls).toContain("http://localhost:3000/en/programs/civil-engineering");
    expect(urls).not.toContain("http://localhost:3000/en/news/campus-update");
  } finally {
    log.mockRestore();
  }
});
