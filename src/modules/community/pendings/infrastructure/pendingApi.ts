import api from "@/shared/infrastructure/http/client";
import type { PendingPort } from "../application/pendingPort";
import type { UserPendingsQuery, UserPendingsResult } from "../domain/pending";
import { parseUserDiscRelationPage } from "../../shared/infrastructure/userDiscRelationPage";

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
    return parseUserDiscRelationPage(response.data, "La lista de pendientes no tiene el formato esperado.");
  },
};
