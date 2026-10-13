import api from "@services/api/api.ts";
import type { UserRole } from "@interfaces/auth";
import type { RvUser } from "@services/auth/auth";

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
  notes?: string;
  createdAt?: string;
};

export async function getUsers(): Promise<AdminUser[]> {
  const response = await api.get<AdminUser[]>("/auth/users");
  return response.data;
}

export async function getRvUsers(): Promise<RvUser[]> {
  const response = await api.get<RvUser[]>("/auth/usersRv");
  return response.data;
}

export async function postUserService(payload: RegisterUserPayload): Promise<RegisterUserResponse> {
  const response = await api.post<RegisterUserResponse>("/auth/register", payload);
  return response.data;
}

export async function updateUserService(updateUserDto: UpdateProfilePayload) {
  return api.patch<unknown>(`/auth`, updateUserDto);
}

export async function updateUserSuperAdminService(id: string, updateUserDto: AdminUpdateUserPayload) {
  return api.patch<unknown>(`/auth/superadmin/${id}`, updateUserDto);
}

export async function deleteUserService(id: string): Promise<void> {
  await api.delete(`/auth/${id}`);
}

export async function deactivateUserService(id: string): Promise<void> {
  await api.patch(`/auth/${id}/deactivate`);
}

export async function activateUserService(id: string): Promise<void> {
  await api.patch(`/auth/${id}/activate`);
}

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

export interface UserActivityResponse {
  votes: (Omit<ActivityVote, 'user'> & { disc: any })[];
  logins: { date: string }[];
}

export async function getGlobalActivity(limit = 20, offset = 0): Promise<GlobalActivityResponse> {
  const response = await api.get<GlobalActivityResponse>('/auth/activity', { params: { limit, offset } });
  return response.data;
}

export async function getUserActivity(userId: string): Promise<UserActivityResponse> {
  const response = await api.get<UserActivityResponse>(`/auth/${userId}/activity`);
  return response.data;
}
