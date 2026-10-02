import type {
  CreateReunionPoint,
  Reunion,
  ReunionPoint,
  UpdateReunion,
  UpdateReunionPoint,
} from "../domain/reunions";

/** Application operations confirmed by the current meeting and point flows. */
export interface ReunionsPort {
  getReunions(limit?: number, offset?: number): Promise<Reunion[]>;
  getReunionDetails(reunionId: string): Promise<Reunion>;
  updateReunion(reunionId: string, data: UpdateReunion): Promise<void>;
  deleteReunion(reunionId: string): Promise<void>;
  createReunionPoint(data: CreateReunionPoint): Promise<ReunionPoint>;
  updateReunionPoint(pointId: string, data: UpdateReunionPoint): Promise<void>;
  deleteReunionPoint(pointId: string): Promise<void>;
}
