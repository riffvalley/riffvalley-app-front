import api from "../../../shared/infrastructure/http/client";
import type { LoginPayload } from "../application/session";

export interface LoginResponse {
  id: string;
  password: string;
  username: string;
  token: string;
  roles?: string[];
  image?: string | null;
  dashboardButtonsEnabled?: boolean;
  dashboardConfig?: { id: string; enabled: boolean }[] | null;
  mobileDashboardConfig?: { id: string; enabled: boolean }[] | null;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/auth/login", payload);
  return response.data;
}
