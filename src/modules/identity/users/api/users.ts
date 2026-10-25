import api from "@services/api/api.ts";
import type {
  AdminUpdateUserPayload,
  AdminUser,
  GlobalActivityResponse,
  RegisterUserPayload,
  RegisterUserResponse,
  RvUser,
  Superuser,
  UpdateProfilePayload,
} from "../types/users";

export async function getUsers(signal?: AbortSignal): Promise<AdminUser[]> {
  const response = signal
    ? await api.get<AdminUser[]>("/auth/users", { signal })
    : await api.get<AdminUser[]>("/auth/users");
  return response.data;
}

export async function getRvUsers(): Promise<RvUser[]> {
  const response = await api.get<RvUser[]>("/auth/usersRv");
  return response.data;
}

export async function getSuperusers(): Promise<Superuser[]> {
  const response = await api.get<Superuser[]>("/auth/users/superusers");
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

export async function getGlobalActivity(limit = 20, offset = 0, signal?: AbortSignal): Promise<GlobalActivityResponse> {
  const response = await api.get<GlobalActivityResponse>("/auth/activity", signal
    ? { params: { limit, offset }, signal }
    : { params: { limit, offset } });
  return response.data;
}
