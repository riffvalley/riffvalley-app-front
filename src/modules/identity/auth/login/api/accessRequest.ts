import api from "@services/api/api";
import type { AccessRequestDto } from "../types/accessRequest";

export async function sendAccessRequest(dto: AccessRequestDto): Promise<void> {
  await api.post("/access-requests", dto);
}
