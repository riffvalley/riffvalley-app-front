import api from "@/shared/infrastructure/http/client";
import type { AsignationTextUpdatePort } from "../application/asignationTextUpdatePort";

export const asignationTextUpdateApi: AsignationTextUpdatePort = {
  async updateAsignationText(asignationId, data) {
    await api.patch(`/asignations/${asignationId}`, data);
  },
};
