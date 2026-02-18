import api from "@services/api/api.ts";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  id: string;
  password: string;
  username: string;
  token: string;
}

export interface Superuser {
  id: string;
  email: string;
  username: string;
  roles: string[];
  image: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/auth/login", payload);
  return response.data; // La respuesta ya incluye `token`, `username`, etc.
}

export async function getSuperusers(): Promise<Superuser[]> {
  const response = await api.get<Superuser[]>("/auth/users/superusers");
  return response.data;
}

export async function getUsersRv(): Promise<Superuser[]> {
  const response = await api.get<Superuser[]>("/auth/usersRv");
  return response.data;
}

export interface AdminStatsUser {
  id: string;
  username: string;
  email: string;
  image: string | null;
  createdAt: string;
  lastLogin: string | null;
  lastVoteDate: string | null;
}

export interface UsersPerDay {
  date: string;
  count: number;
}

export interface InactiveVotersPerDay {
  date: string;
  count: number;
}

export interface AdminStatsResponse {
  users: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    data: AdminStatsUser[];
  };
  usersPerDay: UsersPerDay[];
  lastLoginPerDay: UsersPerDay[];
  neverAccessed: number;
  lastVotePerDay: UsersPerDay[];
  inactiveVotersPerDay: InactiveVotersPerDay[];
}

export interface AdminStatsParams {
  limit: number;
  offset: number;
  notVotedDays?: number;
  accessDays?: number;
  inactiveDays?: number;
}

export async function getAdminStats(params: AdminStatsParams): Promise<AdminStatsResponse> {
  const cleanParams: Record<string, number> = { limit: params.limit, offset: params.offset };
  if (params.notVotedDays !== undefined) cleanParams.notVotedDays = params.notVotedDays;
  if (params.accessDays !== undefined) cleanParams.accessDays = params.accessDays;
  if (params.inactiveDays !== undefined) cleanParams.inactiveDays = params.inactiveDays;
  const response = await api.get<AdminStatsResponse>("/auth/users/admin-stats", { params: cleanParams });
  return response.data;
}
