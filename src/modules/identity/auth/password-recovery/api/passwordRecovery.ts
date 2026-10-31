import api from "@/services/api/api";

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const response = await api.post("/auth/forgot-password", { email });
  if (response.status !== 202) throw new Error("Unexpected password recovery response");
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  const response = await api.post("/auth/reset-password", payload);
  if (response.status !== 204) throw new Error("Unexpected password reset response");
}
