import { ApiError } from "@/lib/api/client";
import {
  activateContract, addContractLine, closeContract, createContract, createLecturer, getContract,
  listContracts, listLecturerCandidates, listLecturers, removeContractLine, updateContract, updateLecturer, voidContract,
  type ContractInput,
} from "@/lib/api/hr";

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
  return { init, path: new URL(url).pathname, search: new URL(url).searchParams };
};

const input: ContractInput = {
  lecturer_id: "l1", term_id: "t1", contract_number: "C-1", pay_basis: "PER_HOUR",
  rate_cm: 5000, rate_td: 4000, rate_tp: 3000, per_course_payment: null, signed_on: null, notes: null,
};

describe("hr api", () => {
  it("lists lecturers with filters", async () => {
    fetchMock.mockReturnValue(ok([]));
    await listLecturers({ search: "ada", department_id: "d1", employment_status: "ACTIVE", page: 2 }, "tok", "en");
    const { path, search } = call();
    expect(path).toBe("/api/v1/hr/lecturers");
    expect(search.get("search")).toBe("ada");
    expect(search.get("department_id")).toBe("d1");
    expect(search.get("employment_status")).toBe("ACTIVE");
    expect(search.get("page")).toBe("2");
  });

  it("lists lecturer candidates from the dedicated endpoint", async () => {
    fetchMock.mockReturnValue(ok([]));
    await listLecturerCandidates({ search: "ada" }, "tok", "en");
    const { path, search } = call();
    expect(path).toBe("/api/v1/hr/lecturer-candidates");
    expect(search.get("search")).toBe("ada");
    expect(search.get("page")).toBe("1");
  });

  it("createLecturer POSTs and updateLecturer PATCHes", async () => {
    fetchMock.mockReturnValue(ok({ id: "l1" }));
    await createLecturer({ user_id: "u1", staff_number: "S1", primary_department_id: "d1" }, "tok", "en");
    expect(call().init.method).toBe("POST");
    fetchMock.mockClear();
    await updateLecturer("l1", { employment_status: "LEFT" }, "tok", "en");
    expect(call().path).toBe("/api/v1/hr/lecturers/l1");
    expect(call().init.method).toBe("PATCH");
  });

  it("createContract POSTs to the lecturer's contracts", async () => {
    fetchMock.mockReturnValue(ok({ id: "c1" }));
    await createContract(input, "tok", "en");
    const { path, init } = call();
    expect(path).toBe("/api/v1/hr/lecturers/l1/contracts");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(input);
  });

  it("reads contracts and updates a draft with the full input", async () => {
    fetchMock.mockReturnValue(ok([]));
    await listContracts("l1", "tok", "en");
    expect(call().path).toBe("/api/v1/hr/lecturers/l1/contracts");
    fetchMock.mockClear();
    await getContract("c1", "tok", "en");
    expect(call().path).toBe("/api/v1/hr/contracts/c1");
    fetchMock.mockClear();
    await updateContract("c1", input, "tok", "en");
    expect(call().init.method).toBe("PATCH");
    expect(JSON.parse(call().init.body as string)).toEqual(input);
  });

  it("adds and removes lines", async () => {
    fetchMock.mockReturnValue(ok({}));
    await addContractLine("c1", { section_id: "s1", planned_hours: 30 }, "tok", "en");
    expect(call().path).toBe("/api/v1/hr/contracts/c1/lines");
    expect(JSON.parse(call().init.body as string)).toEqual({ section_id: "s1", planned_hours: 30 });
    fetchMock.mockClear();
    await removeContractLine("c1", "ln1", "tok", "en");
    expect(call().path).toBe("/api/v1/hr/contracts/c1/lines/ln1");
    expect(call().init.method).toBe("DELETE");
  });

  it("activate and close POST without a body", async () => {
    fetchMock.mockReturnValue(ok({}));
    await activateContract("c1", "tok", "en");
    expect(call().path).toBe("/api/v1/hr/contracts/c1/activate");
    fetchMock.mockClear();
    await closeContract("c1", "tok", "en");
    expect(call().path).toBe("/api/v1/hr/contracts/c1/close");
    expect(call().init.method).toBe("POST");
  });

  it("voidContract POSTs the reason", async () => {
    fetchMock.mockReturnValue(ok({}));
    await voidContract("c1", "Signed in error", "tok", "en");
    const { path, init } = call();
    expect(path).toBe("/api/v1/hr/contracts/c1/void");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ reason: "Signed in error" });
  });

  it("surfaces the bilingual 409 message", async () => {
    fetchMock.mockResolvedValue({
      status: 409, ok: false, statusText: "Conflict",
      json: () => Promise.resolve({ success: false, error: {
        code: "CONTRACT_ACTIVE_EXISTS", message_en: "Active contract exists.", message_fr: "Un contrat actif existe.", details: [], reference_id: "r",
      } }),
    } as Response);
    const error = await activateContract("c1", "tok", "fr").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).code).toBe("CONTRACT_ACTIVE_EXISTS");
    expect((error as ApiError).localizedMessage("fr")).toBe("Un contrat actif existe.");
    expect((error as ApiError).localizedMessage("en")).toBe("Active contract exists.");
  });
});
