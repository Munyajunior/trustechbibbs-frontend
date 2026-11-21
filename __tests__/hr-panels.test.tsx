import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffLecturerForm } from "@/components/features/staff-lecturer-form";
import { StaffContractEditor } from "@/components/features/staff-contract-editor";
import { StaffLecturerDetail } from "@/components/features/staff-lecturer-detail";
import { StaffLecturers } from "@/components/features/staff-lecturers";
import { listAllCourses, listDepartments, type Department } from "@/lib/api/academic-catalogue";
import { listSections, listTerms, type AcademicTerm } from "@/lib/api/academic-schedule";
import { ApiError } from "@/lib/api/client";
import {
  activateContract, addContractLine, createContract, createLecturer, getContract, listContracts, listLecturerCandidates, listLecturers,
  updateContract, voidContract, type ContractDetail, type Lecturer,
} from "@/lib/api/hr";
import { useAuthStore } from "@/stores/auth-store";

// next-intl ships ESM-only; resolve keys against the real messages for the requested locale.
jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, values: Record<string, string | number> = {}) => {
    const messages = jest.requireActual("@/messages/en.json");
    const text = String(`${namespace}.${key}`.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages));
    return text.replace(/\{(\w+)\}/g, (_, name) => String(values[name]));
  },
}));

jest.mock("@/lib/api/hr");
jest.mock("@/lib/api/academic-schedule", () => ({ listSections: jest.fn(), listTerms: jest.fn() }));
jest.mock("@/lib/api/academic-catalogue", () => ({ listAllCourses: jest.fn(), listDepartments: jest.fn() }));

const term: AcademicTerm = {
  id: "t1", academic_year: "2026/2027", semester: 1, starts_on: "2026-09-01", ends_on: "2027-01-31",
  registration_opens_at: "", registration_closes_at: "", add_drop_closes_at: "", min_credits: 12, max_credits: 30, is_published: true,
};
const department: Department = {
  id: "d1", school_id: "sc1", code: "INF", name_en: "Computing", name_fr: "Informatique",
  description_en: null, description_fr: null, is_active: true,
};
const lecturer: Lecturer = {
  id: "l1", user_id: "u1", staff_number: "S-001", primary_department_id: "d1", phone: "677000000",
  employment_status: "ACTIVE", payout_details: "MoMo 677000000", full_name_en: "Ada Lovelace", full_name_fr: null, email: "ada@example.org",
};
const contract = (overrides: Partial<ContractDetail> = {}): ContractDetail => ({
  id: "c1", lecturer_id: "l1", term_id: "t1", contract_number: "C-001", pay_basis: "PER_HOUR",
  rate_cm: 5000, rate_td: 4000, rate_tp: 3000, per_course_payment: null, status: "DRAFT", void_reason: null,
  signed_on: null, notes: null, created_at: "2026-09-01T00:00:00Z",
  lines: [{
    id: "ln1", section_id: "s1", section_code: "A", course_id: "co1", course_code: "INF101",
    course_name_en: "Intro", course_name_fr: null, planned_hours: "30.00", course_amount: null, completed_at: null,
  }],
  ...overrides,
});

const renderEditor = (value: ContractDetail | null, onChange = jest.fn()) =>
  render(<StaffContractEditor lecturer={lecturer} contract={value} terms={[term]} onChange={onChange} onClose={jest.fn()} token="tok" locale="en" />);

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(listSections).mockResolvedValue([]);
  jest.mocked(listAllCourses).mockResolvedValue([]);
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("StaffContractEditor", () => {
  it("shows hourly rate inputs for PER_HOUR and the payment mode for PER_COURSE", async () => {
    renderEditor(null);
    expect(screen.getByLabelText("CM rate per hour (XAF)")).toBeInTheDocument();
    expect(screen.getByLabelText("TD rate per hour (XAF)")).toBeInTheDocument();
    expect(screen.getByLabelText("TP rate per hour (XAF)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Payment mode")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Per course" }));
    expect(screen.getByLabelText("Payment mode")).toBeInTheDocument();
    expect(screen.queryByLabelText("CM rate per hour (XAF)")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Per hour" }));
    expect(screen.getByLabelText("CM rate per hour (XAF)")).toBeInTheDocument();
  });

  it("creates a draft with complete per-hour rates and no payment mode", async () => {
    const onChange = jest.fn();
    jest.mocked(createContract).mockResolvedValue(contract());
    renderEditor(null, onChange);
    await userEvent.selectOptions(screen.getByLabelText("Term"), "t1");
    await userEvent.type(screen.getByLabelText("Contract number"), "C-001");
    await userEvent.type(screen.getByLabelText("CM rate per hour (XAF)"), "5000");
    await userEvent.type(screen.getByLabelText("TD rate per hour (XAF)"), "4000");
    await userEvent.type(screen.getByLabelText("TP rate per hour (XAF)"), "3000");
    await userEvent.click(screen.getByRole("button", { name: "Create draft contract" }));
    await waitFor(() => expect(createContract).toHaveBeenCalled());
    expect(jest.mocked(createContract).mock.calls[0][0]).toEqual({
      lecturer_id: "l1", term_id: "t1", contract_number: "C-001", pay_basis: "PER_HOUR",
      rate_cm: 5000, rate_td: 4000, rate_tp: 3000, per_course_payment: null, signed_on: null, notes: null,
    });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  it("blocks a per-hour save with a missing rate", async () => {
    renderEditor(null);
    await userEvent.selectOptions(screen.getByLabelText("Term"), "t1");
    await userEvent.type(screen.getByLabelText("Contract number"), "C-001");
    await userEvent.type(screen.getByLabelText("CM rate per hour (XAF)"), "5000");
    await userEvent.click(screen.getByRole("button", { name: "Create draft contract" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter whole CM, TD and TP rates");
    expect(createContract).not.toHaveBeenCalled();
  });

  it("sends the full input when saving a draft and shows the server error in the user's locale", async () => {
    jest.mocked(updateContract).mockRejectedValue(new ApiError(409, { code: "CONTRACT_NOT_DRAFT", message_en: "Only drafts can be edited.", message_fr: "Seuls les brouillons.", details: [], reference_id: "r" }));
    renderEditor(contract());
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updateContract).toHaveBeenCalled());
    expect(jest.mocked(updateContract).mock.calls[0][1]).toMatchObject({ pay_basis: "PER_HOUR", rate_cm: 5000, rate_td: 4000, rate_tp: 3000, per_course_payment: null });
    expect(await screen.findByRole("alert")).toHaveTextContent("Only drafts can be edited.");
  });

  it("renders an ACTIVE contract read-only with only close and void actions", () => {
    renderEditor(contract({ status: "ACTIVE" }));
    expect(screen.queryByLabelText("Contract number")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("CM rate per hour (XAF)")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activate contract" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Remove line/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add section" })).not.toBeInTheDocument();
    expect(screen.getByText("C-001")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close contract" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Void contract" })).toBeInTheDocument();
    expect(listSections).not.toHaveBeenCalled();
  });

  it("requires a reason of at least five characters before voiding", async () => {
    const onChange = jest.fn();
    jest.mocked(voidContract).mockResolvedValue(contract({ status: "VOIDED", void_reason: "Signed in error" }));
    renderEditor(contract({ status: "ACTIVE" }), onChange);
    await userEvent.click(screen.getByRole("button", { name: "Void contract" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm void" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("at least 5 characters");
    expect(voidContract).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText("Reason for voiding"), " abc ");
    await userEvent.click(screen.getByRole("button", { name: "Confirm void" }));
    expect(voidContract).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText("Reason for voiding"));
    await userEvent.type(screen.getByLabelText("Reason for voiding"), "Signed in error");
    await userEvent.click(screen.getByRole("button", { name: "Confirm void" }));
    await waitFor(() => expect(voidContract).toHaveBeenCalledWith("c1", "Signed in error", "tok", "en"));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  it("activates a draft and surfaces a server refusal", async () => {
    jest.mocked(activateContract).mockRejectedValue(new ApiError(422, { code: "CONTRACT_LINES_REQUIRED", message_en: "Add at least one section.", message_fr: "Ajoutez une section.", details: [], reference_id: "r" }));
    renderEditor(contract({ lines: [] }));
    await userEvent.click(screen.getByRole("button", { name: "Activate contract" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Add at least one section.");
  });

  it("offers only sections of the contract's term and omits the amount for PER_HOUR lines", async () => {
    jest.mocked(listSections).mockResolvedValue([
      { id: "s1", term_id: "t1", course_id: "co1", code: "A", capacity: 30, lecturer_name: null, delivery_mode: "ON_CAMPUS", is_published: true },
      { id: "s2", term_id: "t1", course_id: "co1", code: "B", capacity: 30, lecturer_name: null, delivery_mode: "ON_CAMPUS", is_published: true },
      { id: "s3", term_id: "other", course_id: "co1", code: "C", capacity: 30, lecturer_name: null, delivery_mode: "ON_CAMPUS", is_published: true },
    ]);
    jest.mocked(addContractLine).mockResolvedValue({ id: "ln2", contract_id: "c1", section_id: "s2", planned_hours: "20", course_amount: null, completed_at: null });
    jest.mocked(getContract).mockResolvedValue(contract());
    renderEditor(contract());
    const select = await screen.findByLabelText("Section");
    expect(listSections).toHaveBeenCalledWith("t1", "tok", "en");
    const labels = Array.from((select as HTMLSelectElement).options).map((option) => option.text);
    expect(labels).toEqual(["Select a section", "B"]); // s1 already on the contract, s3 belongs to another term
    expect(screen.queryByLabelText("Course amount (XAF)")).not.toBeInTheDocument();
    await userEvent.selectOptions(select, "s2");
    await userEvent.type(screen.getByLabelText("Planned hours"), "20");
    await userEvent.click(screen.getByRole("button", { name: "Add section" }));
    await waitFor(() => expect(addContractLine).toHaveBeenCalledWith("c1", { section_id: "s2", planned_hours: 20 }, "tok", "en"));
  });

  it("rejects planned hours with more than two decimals", async () => {
    jest.mocked(listSections).mockResolvedValue([
      { id: "s2", term_id: "t1", course_id: "co1", code: "B", capacity: 30, lecturer_name: null, delivery_mode: "ON_CAMPUS", is_published: true },
    ]);
    renderEditor(contract({ lines: [] }));
    await userEvent.selectOptions(await screen.findByLabelText("Section"), "s2");
    await userEvent.type(screen.getByLabelText("Planned hours"), "12.345");
    await userEvent.click(screen.getByRole("button", { name: "Add section" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("at most 2 decimals");
    expect(addContractLine).not.toHaveBeenCalled();
  });

  it("focuses the void reason on open, closes on Escape and returns focus to the Void button", async () => {
    renderEditor(contract({ status: "ACTIVE" }));
    await userEvent.click(screen.getByRole("button", { name: "Void contract" }));
    expect(screen.getByLabelText("Reason for voiding")).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Void contract" })).toHaveFocus();
  });

  it("requires a course amount on PER_COURSE lines", async () => {
    jest.mocked(listSections).mockResolvedValue([
      { id: "s2", term_id: "t1", course_id: "co1", code: "B", capacity: 30, lecturer_name: null, delivery_mode: "ON_CAMPUS", is_published: true },
    ]);
    renderEditor(contract({ pay_basis: "PER_COURSE", rate_cm: null, rate_td: null, rate_tp: null, per_course_payment: "ON_COMPLETION", lines: [] }));
    await userEvent.selectOptions(await screen.findByLabelText("Section"), "s2");
    await userEvent.type(screen.getByLabelText("Planned hours"), "20");
    await userEvent.click(screen.getByRole("button", { name: "Add section" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("whole course amount");
    expect(addContractLine).not.toHaveBeenCalled();
  });

  it("shows a localized error with Retry when sections fail to load", async () => {
    jest.mocked(listSections).mockRejectedValueOnce(new Error("boom")).mockResolvedValue([]);
    renderEditor(contract());
    expect(await screen.findByText("Could not load the term's sections.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByLabelText("Section")).toBeInTheDocument();
  });
});

describe("StaffLecturerDetail", () => {
  it("hides payout details and contracts from a department head", () => {
    render(<StaffLecturerDetail lecturer={lecturer} departments={[department]} terms={[]} canWrite={false} onUpdated={jest.fn()} token="tok" locale="en" />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("S-001")).toBeInTheDocument();
    expect(screen.queryByText("Payout details")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Payout details")).not.toBeInTheDocument();
    expect(screen.queryByText(/MoMo 677000000/)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(/MoMo 677000000/)).not.toBeInTheDocument();
    expect(screen.queryByText("Teaching contracts")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save profile" })).not.toBeInTheDocument();
    expect(listContracts).not.toHaveBeenCalled();
  });

  it("shows payout details and contracts to payroll staff", async () => {
    jest.mocked(listContracts).mockResolvedValue([]);
    render(<StaffLecturerDetail lecturer={lecturer} departments={[department]} terms={[term]} canWrite onUpdated={jest.fn()} token="tok" locale="en" />);
    expect(screen.getByLabelText("Payout details")).toHaveValue("MoMo 677000000");
    expect(await screen.findByText("This lecturer has no contracts yet.")).toBeInTheDocument();
  });

  it("shows a dash, not a raw id, when departments could not be resolved", () => {
    render(<StaffLecturerDetail lecturer={lecturer} departments={[]} terms={[]} canWrite={false} onUpdated={jest.fn()} token="tok" locale="en" />);
    expect(screen.queryByText("d1")).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("keeps the created notice after the editor remounts and does not refetch the new contract", async () => {
    jest.mocked(listContracts).mockResolvedValue([]);
    jest.mocked(createContract).mockResolvedValue(contract({ lines: [] }));
    render(<StaffLecturerDetail lecturer={lecturer} departments={[department]} terms={[term]} canWrite onUpdated={jest.fn()} token="tok" locale="en" />);
    await screen.findByText("This lecturer has no contracts yet.");
    await userEvent.click(screen.getByRole("button", { name: "New contract" }));
    await userEvent.selectOptions(screen.getByLabelText("Term"), "t1");
    await userEvent.type(screen.getByLabelText("Contract number"), "C-001");
    await userEvent.type(screen.getByLabelText("CM rate per hour (XAF)"), "5000");
    await userEvent.type(screen.getByLabelText("TD rate per hour (XAF)"), "4000");
    await userEvent.type(screen.getByLabelText("TP rate per hour (XAF)"), "3000");
    await userEvent.click(screen.getByRole("button", { name: "Create draft contract" }));
    expect(await screen.findByText("Draft contract created.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Contract C-001" })).toBeInTheDocument();
    expect(getContract).not.toHaveBeenCalled();
  });

  it("shows an error with Retry when contracts fail to load, never an empty list", async () => {
    jest.mocked(listContracts).mockRejectedValueOnce(new Error("boom")).mockResolvedValue([]);
    render(<StaffLecturerDetail lecturer={lecturer} departments={[department]} terms={[term]} canWrite onUpdated={jest.fn()} token="tok" locale="en" />);
    expect(await screen.findByText("Could not load contracts.")).toBeInTheDocument();
    expect(screen.queryByText("This lecturer has no contracts yet.")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("This lecturer has no contracts yet.")).toBeInTheDocument();
  });
});

describe("StaffLecturerForm", () => {
  it("picks from the lecturer-candidates endpoint and creates the record", async () => {
    jest.mocked(listLecturerCandidates).mockResolvedValue({
      items: [{ user_id: "u7", email: "grace@example.org", full_name_en: "Grace Hopper", full_name_fr: null }],
      pagination: { page: 1, per_page: 20, total: 1, total_pages: 1, has_next: false, has_previous: false },
    });
    jest.mocked(createLecturer).mockResolvedValue(lecturer);
    const onCreated = jest.fn();
    render(<StaffLecturerForm departments={[department]} onCreated={onCreated} onCancel={jest.fn()} token="tok" locale="en" />);
    await screen.findByRole("option", { name: "Grace Hopper (grace@example.org)" });
    expect(listLecturerCandidates).toHaveBeenCalledWith({ search: undefined }, "tok", "en");
    await userEvent.selectOptions(screen.getByLabelText("Staff account"), "u7");
    await userEvent.type(screen.getByLabelText("Staff number"), "S-009");
    await userEvent.selectOptions(screen.getByLabelText("Department"), "d1");
    await userEvent.click(screen.getByRole("button", { name: "Save lecturer" }));
    await waitFor(() => expect(createLecturer).toHaveBeenCalledWith(
      { user_id: "u7", staff_number: "S-009", primary_department_id: "d1", phone: null, payout_details: null }, "tok", "en",
    ));
    expect(onCreated).toHaveBeenCalled();
  });

  it("shows a localized error with Retry when candidates fail to load", async () => {
    jest.mocked(listLecturerCandidates).mockRejectedValueOnce(new Error("boom")).mockResolvedValue({
      items: [], pagination: { page: 1, per_page: 20, total: 0, total_pages: 0, has_next: false, has_previous: false },
    });
    render(<StaffLecturerForm departments={[department]} onCreated={jest.fn()} onCancel={jest.fn()} token="tok" locale="en" />);
    expect(await screen.findByText("Could not load staff accounts.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/No active lecturer accounts match/)).toBeInTheDocument();
  });
});

describe("StaffLecturers", () => {
  const page = (items: Lecturer[]) => ({ items, pagination: { page: 1, per_page: 20, total: items.length, total_pages: 1, has_next: false, has_previous: false } });
  const signIn = (roles: string[]) => useAuthStore.setState({
    accessToken: "tok",
    user: { id: "u9", email: "x@example.org", full_name: "X", roles, must_change_password: false, preferred_locale: "en" },
  });

  it("gives a department head a read-only view with no add button and no payout", async () => {
    signIn(["department_head"]);
    jest.mocked(listDepartments).mockResolvedValue([department]);
    jest.mocked(listLecturers).mockResolvedValue(page([lecturer]));
    render(<StaffLecturers locale="en" />);
    await userEvent.click(await screen.findByRole("button", { name: "Open Ada Lovelace" }));
    expect(await screen.findByRole("region", { name: "Lecturer Ada Lovelace" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add lecturer" })).not.toBeInTheDocument();
    expect(screen.queryByText("Payout details")).not.toBeInTheDocument();
    expect(screen.queryByText(/MoMo 677000000/)).not.toBeInTheDocument();
    expect(listTerms).not.toHaveBeenCalled();
    expect(listContracts).not.toHaveBeenCalled();
  });

  it("shows an error with Retry when the lecturer list fails, never an empty table", async () => {
    signIn(["accountant"]);
    jest.mocked(listDepartments).mockResolvedValue([department]);
    jest.mocked(listTerms).mockResolvedValue([term]);
    jest.mocked(listLecturers).mockRejectedValueOnce(new Error("boom")).mockResolvedValue(page([lecturer]));
    render(<StaffLecturers locale="en" />);
    expect(await screen.findByText("Could not load lecturers.")).toBeInTheDocument();
    expect(screen.queryByText("No lecturers match these filters.")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("S-001")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add lecturer" })).toBeInTheDocument();
  });

  it("refuses a user without a lecturer-workspace role", () => {
    signIn(["registrar"]);
    render(<StaffLecturers locale="en" />);
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have access");
    expect(listLecturers).not.toHaveBeenCalled();
  });
});
