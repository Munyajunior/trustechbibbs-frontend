import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffDepartmentHeadsPanel } from "@/components/features/staff-department-heads-panel";
import type { Department } from "@/lib/api/academic-catalogue";
import { ApiError } from "@/lib/api/client";
import { assignDepartmentHead, endDepartmentHead, listDepartmentHeads, type DepartmentHead } from "@/lib/api/hr";
import { listManagedUsers, type ManagedUser } from "@/lib/api/user-management";

// next-intl ships ESM-only; resolve keys against the real messages.
jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, values: Record<string, string | number> = {}) => {
    const messages = jest.requireActual("@/messages/en.json");
    const text = String(`${namespace}.${key}`.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages));
    return text.replace(/\{(\w+)\}/g, (_, name) => String(values[name]));
  },
}));
jest.mock("@/lib/api/hr");
jest.mock("@/lib/api/user-management", () => ({ listManagedUsers: jest.fn() }));

const department: Department = {
  id: "d1", school_id: "sc1", code: "INF", name_en: "Computing", name_fr: "Informatique",
  description_en: null, description_fr: null, is_active: true,
};
const hod: ManagedUser = {
  id: "u1", email: "grace@example.org", full_name_en: "Grace Hopper", full_name_fr: null,
  roles: ["department_head", "lecturer"], is_active: true, created_at: "2026-01-01T00:00:00Z",
};
const head = (overrides: Partial<DepartmentHead> = {}): DepartmentHead => ({
  id: "h1", user_id: "u1", department_id: "d1", starts_on: "2026-09-01", ends_on: null, created_at: "2026-09-01T00:00:00Z", ...overrides,
});
const people = (items: ManagedUser[]) => ({ items, pagination: { page: 1, per_page: 100, total: items.length, total_pages: 1, has_next: false, has_previous: false } });
const renderPanel = () => render(<StaffDepartmentHeadsPanel departments={[department]} token="tok" locale="en" />);
const refusal = new ApiError(422, {
  code: "INVALID_DATES", message_en: "The end date cannot precede the start date.", message_fr: "Date invalide.", details: [], reference_id: "r",
});

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(listManagedUsers).mockResolvedValue(people([hod]));
});

describe("StaffDepartmentHeadsPanel", () => {
  it("lists current and ended assignments with names, and only offers department-head accounts", async () => {
    jest.mocked(listDepartmentHeads).mockResolvedValue([head(), head({ id: "h0", starts_on: "2025-09-01", ends_on: "2026-08-31" })]);
    renderPanel();
    const table = await screen.findByRole("table");
    expect(within(table).getAllByText("Grace Hopper")).toHaveLength(2);
    expect(within(table).getByText("Current")).toBeInTheDocument();
    expect(within(table).getByText("2026-08-31")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "End assignment for Grace Hopper" })).toHaveLength(1);
    expect(listManagedUsers).toHaveBeenCalledWith("tok", "en", { role: "department_head", per_page: 100 });
    expect(screen.getByRole("option", { name: "Grace Hopper (grace@example.org)" })).toBeInTheDocument();
  });

  it("assigns a head with person, department and start date", async () => {
    jest.mocked(listDepartmentHeads).mockResolvedValue([]);
    jest.mocked(assignDepartmentHead).mockResolvedValue(head());
    renderPanel();
    expect(await screen.findByText("No department heads have been assigned yet.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Assign head" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a person, a department and a start date.");
    expect(assignDepartmentHead).not.toHaveBeenCalled();

    await userEvent.selectOptions(screen.getByLabelText("Department head"), "u1");
    await userEvent.selectOptions(screen.getByLabelText("Department"), "d1");
    await userEvent.type(screen.getByLabelText("Starts on"), "2026-09-01");
    await userEvent.click(screen.getByRole("button", { name: "Assign head" }));
    await waitFor(() => expect(assignDepartmentHead).toHaveBeenCalledWith({ user_id: "u1", department_id: "d1", starts_on: "2026-09-01" }, "tok", "en"));
    expect(await screen.findByText("Department head assigned.")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("ends a current assignment with a date and shows a server refusal in the user's locale", async () => {
    jest.mocked(listDepartmentHeads).mockResolvedValue([head()]);
    jest.mocked(endDepartmentHead).mockRejectedValueOnce(refusal).mockResolvedValue(head({ ends_on: "2026-12-31" }));
    renderPanel();
    const endButton = await screen.findByRole("button", { name: "End assignment for Grace Hopper" });
    await userEvent.click(endButton);
    expect(screen.getByRole("alert")).toHaveTextContent("Choose an end date first.");
    await userEvent.type(screen.getByLabelText("End date for Grace Hopper"), "2026-08-01");
    await userEvent.click(endButton);
    expect(await screen.findByRole("alert")).toHaveTextContent("The end date cannot precede the start date.");
    await userEvent.clear(screen.getByLabelText("End date for Grace Hopper"));
    await userEvent.type(screen.getByLabelText("End date for Grace Hopper"), "2026-12-31");
    await userEvent.click(screen.getByRole("button", { name: "End assignment for Grace Hopper" }));
    await waitFor(() => expect(endDepartmentHead).toHaveBeenLastCalledWith("h1", "2026-12-31", "tok", "en"));
    expect(await screen.findByText("Assignment ended.")).toBeInTheDocument();
    expect(screen.getByText("2026-12-31")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End assignment for Grace Hopper" })).not.toBeInTheDocument();
  });

  it("shows a localized error with Retry when loading fails, never an empty list", async () => {
    jest.mocked(listDepartmentHeads).mockRejectedValueOnce(new Error("boom")).mockResolvedValue([head()]);
    renderPanel();
    expect(await screen.findByText("Could not load department heads.")).toBeInTheDocument();
    expect(screen.queryByText("No department heads have been assigned yet.")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
  });
});
