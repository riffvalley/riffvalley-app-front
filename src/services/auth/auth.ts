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
