import api from "@/shared/infrastructure/http/client";
import type { ReunionsPort } from "../application/reunionsPort";
import type { Reunion, ReunionPoint } from "../domain/reunions";

/** Wire shape returned by /reunions before the legacy field normalization. */
interface ReunionDto {
  id: string;
  title?: string;
  titulo?: string;
  description?: string;
  date?: string;
  fecha?: string;
  points?: ReunionPointDto[];
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

/** Point wire fields used by current meeting screens and /points operations. */
interface ReunionPointDto {
  id: string;
  titulo: string;
  content: string;
  done: boolean;
  [key: string]: unknown;
}

interface ReunionPointCreateDto {
  titulo: string;
  content: string;
  reunionId: string;
}

interface ReunionPointUpdateDto {
  titulo?: string;
  content?: string;
  done?: boolean;
}

function mapReunionFromBackend(data: ReunionDto): Reunion {
  return {
    ...data,
    title: (data.titulo || data.title) as string,
    date: (data.fecha || data.date) as string,
  };
}

export const reunionsApi: ReunionsPort = {
  async getReunions(limit = 1000, offset = 0) {
    const response = await api.get<ReunionDto[]>("/reunions", { params: { limit, offset } });
    return Array.isArray(response.data) ? response.data.map(mapReunionFromBackend) : [];
  },

  async getReunionDetails(reunionId) {
    const response = await api.get<ReunionDto>(`/reunions/${reunionId}`);
    return mapReunionFromBackend(response.data);
  },

  async updateReunion(reunionId, data) {
    await api.patch(`/reunions/${reunionId}`, {
      ...data,
      titulo: data.title,
      fecha: data.date,
    });
  },

  async deleteReunion(reunionId) {
    await api.delete(`/reunions/${reunionId}`);
  },

  async createReunionPoint(data) {
    const response = await api.post<ReunionPointDto>("/points", data satisfies ReunionPointCreateDto);
    return response.data as ReunionPoint;
  },

  async updateReunionPoint(pointId, data) {
    await api.patch(`/points/${pointId}`, data satisfies ReunionPointUpdateDto);
  },

  async deleteReunionPoint(pointId) {
    await api.delete(`/points/${pointId}`);
  },
};
