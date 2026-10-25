import type { UserRole } from "../../shared/types/auth";

export interface UserListItem {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  image: string | null;
}

export type RvUser = Omit<UserListItem, "role"> & {
  role: Extract<UserRole, "riffvalley" | "superadmin">;
};

export type Superuser = Omit<UserListItem, "role"> & {
  role: "superadmin";
};

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
  notes: string | null;
  isActive: boolean;
}

export interface RegisterUserPayload {
  email: string;
  password: string;
  username: string;
  image?: string;
  dashboardConfig?: { id: string; enabled: boolean }[];
  mobileDashboardConfig?: { id: string; enabled: boolean }[];
  dashboardButtonsEnabled?: boolean;
}

export interface RegisterUserResponse {
  id: string;
  email: string;
  username: string;
  role: "user";
  createdAt: string;
  token: string;
  image?: string | null;
  dashboardConfig?: { id: string; enabled: boolean }[] | null;
  mobileDashboardConfig?: { id: string; enabled: boolean }[] | null;
  dashboardButtonsEnabled?: boolean;
}

export type UpdateProfilePayload = Partial<RegisterUserPayload>;

export type AdminUpdateUserPayload = UpdateProfilePayload & {
  role?: UserRole;
  notes?: string | null;
  createdAt?: string;
};

export interface ActivityVote {
  id: string;
  rate: number | null;
  cover: number | null;
  createdAt: string;
  editedAt: string | null;
  user: { id: string; username: string; image?: string };
  disc: { id: string; name: string };
}

export interface GlobalActivityResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  data: ActivityVote[];
}
