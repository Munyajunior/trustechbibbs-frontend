/** Mirror the staff-account password contract before sending a create request. */
export function isValidStaffPassword(password: string): boolean {
  const length = Array.from(password).length;
  return length >= 12 && length <= 128
    && /\p{Ll}/u.test(password)
    && /\p{Lu}/u.test(password)
    && /\p{Nd}/u.test(password)
    && /[^\p{L}\p{N}]/u.test(password);
}
