import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffUserManagement } from "@/components/features/staff-user-management";
import {
  createManagedStaff, listManagedUsers, staffRoleParts, updateManagedStaff, type ManagedUser,
} from "@/lib/api/user-management";
import { useAuthStore } from "@/stores/auth-store";

jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const messages = jest.requireActual("@/messages/en.json");
    const lookup = (key: string) => `${namespace}.${key}`.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
    const t = (key: string, values: Record<string, string | number> = {}) => String(lookup(key)).replace(/\{(\w+)\}/g, (_, name) => String(values[name]));
    t.has = (key: string) => lookup(key) !== undefined;
    return t;
  },
}));
jest.mock("@/lib/api/user-management", () => ({
  ...jest.requireActual("@/lib/api/user-management"),
  createManagedStaff: jest.fn(), listManagedUsers: jest.fn(), setManagedUserActive: jest.fn(), updateManagedStaff: jest.fn(),
}));

const MANAGED = ["editor", "registrar", "department_head", "lecturer", "discipline_master", "accountant", "finance_director", "admin"];
const account = (roles: string[]): ManagedUser => ({
  id: `id-${roles.join("-")}`, email: `${roles.join(".")}@example.org`, full_name_en: `Person ${roles.join(" ")}`, full_name_fr: null,
  roles, is_active: true, created_at: "2026-01-01T00:00:00Z",
});
const page = (items: ManagedUser[]) => ({ items, pagination: { page: 1, per_page: 20, total: items.length, total_pages: 1, has_next: false, has_previous: false } });
const createRoleSelect = () => screen.getAllByLabelText("Role").at(-1) as HTMLSelectElement;

beforeEach(() => {
  jest.resetAllMocks();
  useAuthStore.setState({
    accessToken: "tok",
    user: { id: "me", email: "admin@example.org", full_name: "Admin", roles: ["admin"], must_change_password: false, preferred_locale: "en" },
  });
});

describe("staffRoleParts", () => {
  it("accepts one staff role, or one non-payroll staff role plus lecturer", () => {
    expect(staffRoleParts(["registrar"], MANAGED)).toEqual({ primary: "registrar", alsoLecturer: false });
    expect(staffRoleParts(["department_head", "lecturer"], MANAGED)).toEqual({ primary: "department_head", alsoLecturer: true });
    expect(staffRoleParts(["lecturer", "admin"], MANAGED)).toEqual({ primary: "admin", alsoLecturer: true });
    for (const roles of [["accountant", "lecturer"], ["finance_director", "lecturer"], ["editor", "registrar"], ["lecturer", "lecturer"], ["student"], ["student", "lecturer"]]) {
      expect(staffRoleParts(roles, MANAGED)).toBeNull();
    }
  });
});

describe("StaffUserManagement multi-role", () => {
  it("creates a department head who also lectures", async () => {
    jest.mocked(listManagedUsers).mockResolvedValue(page([]));
    jest.mocked(createManagedStaff).mockResolvedValue(account(["department_head", "lecturer"]));
    render(<StaffUserManagement locale="en" />);
    await screen.findByText("No accounts match these filters.");
    await userEvent.type(screen.getByLabelText("Full name (English)"), "Grace Hopper");
    await userEvent.type(screen.getByLabelText("Email address"), "grace@example.org");
    await userEvent.type(screen.getByLabelText("Temporary password"), "Str0ng!Passw0rd");
    await userEvent.selectOptions(createRoleSelect(), "department_head");
    await userEvent.click(screen.getByRole("checkbox", { name: /Also lectures/ }));
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(createManagedStaff).toHaveBeenCalled());
    expect(jest.mocked(createManagedStaff).mock.calls[0][0]).toMatchObject({ role: "department_head", also_lecturer: true });
  });

  it("hides Also lectures for payroll roles and for the lecturer role itself", async () => {
    jest.mocked(listManagedUsers).mockResolvedValue(page([]));
    render(<StaffUserManagement locale="en" />);
    await screen.findByText("No accounts match these filters.");
    for (const role of ["accountant", "finance_director", "lecturer"]) {
      await userEvent.selectOptions(createRoleSelect(), role);
      expect(screen.queryByRole("checkbox", { name: /Also lectures/ })).not.toBeInTheDocument();
    }
    await userEvent.selectOptions(createRoleSelect(), "registrar");
    expect(screen.getByRole("checkbox", { name: /Also lectures/ })).toBeInTheDocument();
  });

  it("edits an HOD-lecturer account, keeping the flag and allowing it to be cleared", async () => {
    const both = account(["department_head", "lecturer"]);
    jest.mocked(listManagedUsers).mockResolvedValue(page([both, account(["accountant", "lecturer"])]));
    jest.mocked(updateManagedStaff).mockResolvedValue(account(["department_head"]));
    render(<StaffUserManagement locale="en" />);
    const editButtons = await screen.findAllByRole("button", { name: "Edit" });
    expect(editButtons).toHaveLength(1); // accountant + lecturer is not a manageable combination
    await userEvent.click(editButtons[0]);
    const editForm = screen.getByRole("heading", { name: "Edit staff access" }).closest("section") as HTMLElement;
    const checkbox = within(editForm).getByRole("checkbox", { name: /Also lectures/ });
    expect(checkbox).toBeChecked();
    await userEvent.click(checkbox);
    await userEvent.click(within(editForm).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updateManagedStaff).toHaveBeenCalledWith(
      both.id, expect.objectContaining({ role: "department_head", also_lecturer: false }), "tok", "en",
    ));
  });
});
