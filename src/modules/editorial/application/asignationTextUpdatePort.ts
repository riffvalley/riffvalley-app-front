import type { AsignationTextUpdate } from "../domain/asignationTextUpdate";

export interface AsignationTextUpdatePort {
  updateAsignationText(asignationId: string, data: AsignationTextUpdate): Promise<void>;
}
