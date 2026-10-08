import { render, screen } from "@testing-library/react";

import { EventsCalendar, monthOffset } from "@/components/features/events-calendar";
import type { CampusEvent } from "@/lib/api/types";

jest.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const event: CampusEvent = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "open-day",
  title_en: "Open day",
  title_fr: "Journée portes ouvertes",
  description_en: "Meet the schools",
  description_fr: "Découvrez les écoles",
  starts_at: "2026-10-10T23:30:00Z",
  ends_at: "2026-10-11T02:00:00Z",
  venue: "Tradex, Logpom",
  category: "Open day",
  cover_image_url: null,
  registration_required: false,
  capacity: null,
};

describe("events month calendar", () => {
  it("navigates across year boundaries", () => {
    expect(monthOffset("2026-01", -1)).toBe("2025-12");
    expect(monthOffset("2026-12", 1)).toBe("2027-01");
  });

  it("places events on Cameroon-local dates and links to their details", () => {
    render(<EventsCalendar events={[event]} month="2026-10" locale="fr" moreLabel={(count) => `+${count}`} />);
    const day = screen.getByText("11", { selector: "time" });
    expect(day.closest("li")).toHaveTextContent("Journée portes ouvertes");
    expect(day.closest("li")?.querySelector("a")).toHaveAttribute("href", "/events/open-day");
    expect(screen.getByText("10", { selector: "time" }).closest("li")).not.toHaveTextContent("Journée portes ouvertes");
  });
});
