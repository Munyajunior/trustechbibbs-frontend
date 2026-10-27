import { isValidStaffPassword } from "@/lib/staff-password-policy";

describe("staff account password validation", () => {
  test.each([
    ["short!A1", false],
    ["Longpassword123", false],
    ["LONGPASSWORD123!", false],
    ["Longpasswordabc!", false],
    ["Longpassword123!", true],
    ["SécuriséPassword123!", true],
    ["A1!" + "a".repeat(126), false],
  ])("validates %s", (password, expected) => {
    expect(isValidStaffPassword(password)).toBe(expected);
  });
});
