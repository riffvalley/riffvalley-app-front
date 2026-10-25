export const USER_ROLES = ["user", "collaborator", "riffvalley", "superadmin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface LoginPayload {
  username: string;
  password: string;
}
