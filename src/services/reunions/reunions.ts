import api from "@services/api/api.ts";

// Interfaces
export interface Reunion {
  id: string;
  title: string;
  description?: string;
  date: string;
  points?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateReunionDto {
  title: string;
  description?: string;
  date: string;
}

// Mapper functions
const mapReunionFromBackend = (data: any): Reunion => ({
  ...data,
  title: data.titulo || data.title,
  date: data.fecha || data.date,
});

export async function postReunion(payload: CreateReunionDto): Promise<Reunion> {
  const backendPayload = {
    ...payload,
    titulo: payload.title,
    fecha: payload.date
  };
  const response = await api.post<any>("/reunions", backendPayload);
  return mapReunionFromBackend(response.data);
}

export async function getReunionDetails(reunionId: string): Promise<Reunion> {
  const response = await api.get<any>(`/reunions/${reunionId}`);
  return mapReunionFromBackend(response.data);
}

export async function updateReunion(id: string, data: any): Promise<void> {
  const backendData = {
    ...data,
    titulo: data.title,
    fecha: data.date
  };

  await api.patch(`/reunions/${id}`, backendData);
}

export async function getReunions(limit: number = 1000, offset: number = 0): Promise<Reunion[]> {
  const response = await api.get<any[]>("/reunions", {
    params: { limit, offset },
  });
  return Array.isArray(response.data) ? response.data.map(mapReunionFromBackend) : [];
}

// Crear un nuevo punto en una reunión
export async function postPoint(reunionId: string, payload: any): Promise<any> {
  const response = await api.post<any>(`/reunions/${reunionId}/points`, payload);
  return response.data;
}

// Actualizar un punto existente
export async function updatePoint(pointId: string, payload: any): Promise<any> {
  const response = await api.patch<any>(`/points/${pointId}`, payload);
  return response.data;
}

// Eliminar una reunión
export async function deleteReunion(reunionId: string): Promise<void> {
  await api.delete(`/reunions/${reunionId}`);
}
