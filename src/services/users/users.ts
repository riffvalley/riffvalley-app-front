import api from "@services/api/api.ts";

export async function getUsers(): Promise<any> {
  const response = await api.get<any>("/auth/users");
  return response.data;
}

export async function getRvUsers(): Promise<any> {
  const response = await api.get<any>("/auth/usersRv");
  return response.data;
}

export async function postUserService(payload: any): Promise<void> {
  const response = await api.post("/auth/register", payload);
  return response.data;
}

export async function updateUserService( updateUserDto: any) {

  console.log("update rate", updateUserDto);
  return api.patch(`/auth`, updateUserDto);
}

export async function updateUserSuperAdminService( id: string, updateUserDto: any) {

  console.log("update rate", updateUserDto);
  return api.patch(`/auth/superadmin/${id}`, updateUserDto);
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
