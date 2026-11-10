import { ApiError } from "@/lib/api/client";
import {
  FINANCE_ERROR_CODES,
  balanceAfterPayment,
  buildPaymentQuery,
  exceedsBalanceDetail,
  financeErrorCode,
  formatFeeDate,
  formatXaf,
  isFeeEligibleStatus,
  isOverpayment,
  missingFeeTypes,
  parseXafInput,
  todayIso,
  type FeeBalance,
} from "@/lib/api/finance";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

function apiError(code: string, details: unknown[] = []): ApiError {
  return new ApiError(409, { code, message_en: "en", message_fr: "fr", details: details as never, reference_id: "r" });
}

const registration: FeeBalance = {
  fee_type: "REGISTRATION", fee_configured: true, amount_due: 50000, amount_paid: 20000, balance: 30000,
  overpaid: 0, status: "PARTIAL", payment_count: 1, last_paid_at: "2026-11-10",
};

describe("formatXaf", () => {
  test("groups thousands per locale and appends FCFA", () => {
    expect(formatXaf(150000, "en")).toBe("150,000 FCFA");
    expect(formatXaf(150000, "fr")).toBe("150 000 FCFA");
  });
  test("handles small, large and zero amounts without decimals", () => {
    expect(formatXaf(0, "en")).toBe("0 FCFA");
    expect(formatXaf(999, "fr")).toBe("999 FCFA");
    expect(formatXaf(1000, "en")).toBe("1,000 FCFA");
    expect(formatXaf(1234567, "fr")).toBe("1 234 567 FCFA");
    expect(formatXaf(1500.4, "en")).toBe("1,500 FCFA");
  });
});

describe("parseXafInput", () => {
  test.each([
    ["150000", 150000], ["150 000", 150000], ["150,000", 150000], ["150 000", 150000], [" 1000 ", 1000],
  ])("accepts %s", (raw, expected) => expect(parseXafInput(raw)).toBe(expected));
  test.each([["", null], ["0", null], ["-5", null], ["12abc", null], ["1e5", null], ["1000000001", null]])(
    "rejects %p", (raw, expected) => expect(parseXafInput(raw)).toBe(expected),
  );
});

describe("balance preview", () => {
  test("computes balance after a payment", () => {
    expect(balanceAfterPayment(registration, 10000)).toBe(20000);
    expect(balanceAfterPayment(registration, 30000)).toBe(0);
  });
  test("flags overpayment only when above the balance", () => {
    expect(isOverpayment(registration, 30000)).toBe(false);
    expect(isOverpayment(registration, 30001)).toBe(true);
  });
  test("no preview when fee not configured or amount invalid", () => {
    expect(balanceAfterPayment({ ...registration, fee_configured: false, amount_due: null, balance: null }, 100)).toBeNull();
    expect(balanceAfterPayment(registration, null)).toBeNull();
    expect(balanceAfterPayment(undefined, 100)).toBeNull();
    expect(isOverpayment(undefined, 100)).toBe(false);
  });
});

describe("buildPaymentQuery", () => {
  test("drops empty values, trims search and defaults the page", () => {
    expect(buildPaymentQuery({ fee_type: "", status: "VOIDED", search: "  R-1 ", paid_from: "2026-01-01" })).toEqual({
      page: 1, per_page: 20, status: "VOIDED", search: "R-1", paid_from: "2026-01-01",
    });
  });
  test("keeps scope ids and page", () => {
    expect(buildPaymentQuery({ application_id: "a1", page: 3 }, 50)).toEqual({ page: 3, per_page: 50, application_id: "a1" });
  });
});

describe("finance error helpers", () => {
  test("recognises every contract error code", () => {
    for (const code of FINANCE_ERROR_CODES) expect(financeErrorCode(apiError(code))).toBe(code);
  });
  test("ignores other errors", () => {
    expect(financeErrorCode(apiError("NOT_FOUND"))).toBeNull();
    expect(financeErrorCode(new Error("boom"))).toBeNull();
  });
  test("reads PAYMENT_EXCEEDS_BALANCE and FEE_NOT_CONFIGURED details", () => {
    const detail = { fee_type: "TUITION", amount_due: 100, amount_paid: 80, balance: 20 };
    expect(exceedsBalanceDetail(apiError("PAYMENT_EXCEEDS_BALANCE", [detail]))).toEqual(detail);
    expect(exceedsBalanceDetail(apiError("RECEIPT_NUMBER_EXISTS"))).toBeNull();
    expect(missingFeeTypes(apiError("FEE_NOT_CONFIGURED", [{ fee_types: ["TUITION"], program_id: "p" }]))).toEqual(["TUITION"]);
    expect(missingFeeTypes(apiError("FEE_NOT_CONFIGURED"))).toEqual([]);
  });
  test("every code has English and French messages", () => {
    for (const code of FINANCE_ERROR_CODES) {
      expect((en.finance.errors as Record<string, string>)[code]).toBeTruthy();
      expect((fr.finance.errors as Record<string, string>)[code]).toBeTruthy();
    }
  });
});

describe("misc helpers", () => {
  test("only ADMITTED and ENROLLED applications see fees", () => {
    expect(isFeeEligibleStatus("ADMITTED")).toBe(true);
    expect(isFeeEligibleStatus("ENROLLED")).toBe(true);
    for (const status of ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW", "REJECTED"]) expect(isFeeEligibleStatus(status)).toBe(false);
  });
  test("formats date-only values without timezone drift", () => {
    expect(formatFeeDate("2026-11-01", "en")).toContain("2026");
    expect(formatFeeDate("2026-11-01", "en")).toContain("1");
    expect(formatFeeDate(null, "fr")).toBe("—");
    expect(todayIso(new Date("2026-11-10T23:59:59Z"))).toBe("2026-11-10");
  });
  test("en and fr finance namespaces have the same keys", () => {
    const flat = (value: unknown, prefix = ""): string[] => typeof value === "object" && value !== null
      ? Object.entries(value).flatMap(([key, child]) => flat(child, `${prefix}${key}.`)) : [prefix];
    expect(flat(fr.finance).sort()).toEqual(flat(en.finance).sort());
  });
});
