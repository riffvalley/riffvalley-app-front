import { USER_ROLES, type UserRole } from "@interfaces/auth";

function isUserRole(role: unknown): role is UserRole {
  return typeof role === "string" && USER_ROLES.some((validRole) => validRole === role);
}

export function hasMinimumRole(
  currentRole: UserRole | null | undefined,
  minimumRole: UserRole,
): boolean {
  if (!isUserRole(currentRole) || !isUserRole(minimumRole)) {
    return false;
  }

  return USER_ROLES.indexOf(currentRole) >= USER_ROLES.indexOf(minimumRole);
}
