/**
 * Roles admitted to the /staff workspace. One list for the shell gate, the header account link
 * and the post-login redirect. (`lecturer` has its own portal and is deliberately absent.)
 */
export const STAFF_WORKSPACE_ROLES: readonly string[] = [
  "editor", "registrar", "department_head", "accountant", "finance_director",
  "discipline_master", "admin", "super_admin",
];

export const hasStaffWorkspaceRole = (roles: readonly string[]) =>
  roles.some((role) => STAFF_WORKSPACE_ROLES.includes(role));
