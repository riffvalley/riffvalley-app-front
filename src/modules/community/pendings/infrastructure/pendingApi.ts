import api from "@/shared/infrastructure/http/client";
import type { PendingPort } from "../application/pendingPort";
import type { UserPendingsQuery, UserPendingsResult } from "../domain/pending";

interface PendingListDto {
  id: string;
  disc: unknown;
}

interface PendingPageDto {
  totalItems: number;
  data: PendingListDto[];
}

function isPendingPage(value: unknown): value is PendingPageDto {
  if (typeof value !== "object" || value === null || !("totalItems" in value) || !("data" in value)) return false;
  const page = value as { totalItems: unknown; data: unknown };
  return typeof page.totalItems === "number" && Array.isArray(page.data)
    && page.data.every((item: unknown) => typeof item === "object" && item !== null
      && "id" in item && typeof item.id === "string" && "disc" in item);
}

export const pendingApi: PendingPort = {
  async create(discId) {
    const response = await api.post<unknown>("/pendings", { discId });
    if (typeof response.data !== "object" || response.data === null || !("id" in response.data)
      || typeof response.data.id !== "string") {
      throw new Error("La respuesta al guardar el pendiente no contiene su identificador.");
    }
    return response.data.id;
  },
  async remove(pendingId) {
    await api.delete(`/pendings/${pendingId}`);
  },
  async list(query: UserPendingsQuery): Promise<UserPendingsResult> {
    const response = await api.get<unknown>("/pendings", { params: query });
    if (!isPendingPage(response.data)) throw new Error("La lista de pendientes no tiene el formato esperado.");
    return response.data;
  },
};
