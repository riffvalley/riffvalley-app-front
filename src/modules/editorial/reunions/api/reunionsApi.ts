import api from "@services/api/api";
import type {
  CreatePointDto,
  CreatePointResponse,
  CreateReunionDto,
  CreateReunionResponse,
  Point,
  PointHttpResponse,
  Reunion,
  ReunionHttpResponse,
  UpdatePointDto,
  UpdatePointResponse,
  UpdateReunionDto,
  UpdateReunionResponse,
} from "../types/reunions";

function mapPoint(response: PointHttpResponse): Point {
  return {
    id: response.id,
    title: response.titulo,
    content: response.content,
    done: response.done,
    createdAt: response.createdAt,
    reunion: response.reunion ?? null,
  };
}

export function mapReunion(response: ReunionHttpResponse): Reunion {
  return {
    id: response.id,
    title: response.titulo,
    date: response.fecha,
    description: response.description ?? null,
    points: (response.points ?? []).map(mapPoint),
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}

function sourceConfig(sourceId?: string) {
  return sourceId ? { headers: { "X-Riff-Valley-Client-Id": sourceId } } : undefined;
}

export async function getReunions(signal?: AbortSignal): Promise<Reunion[]> {
  const response = await api.get<ReunionHttpResponse[]>("/reunions", { signal });
  return response.data.map(mapReunion);
}

export async function getReunionDetails(id: string, signal?: AbortSignal): Promise<Reunion> {
  const response = await api.get<ReunionHttpResponse>(`/reunions/${id}`, { signal });
  return mapReunion(response.data);
}

export async function createReunion(dto: CreateReunionDto, sourceId: string): Promise<Reunion> {
  const config = sourceConfig(sourceId);
  const response = config
    ? await api.post<CreateReunionResponse>("/reunions", dto, config)
    : await api.post<CreateReunionResponse>("/reunions", dto);
  return mapReunion(response.data);
}

export async function updateReunion(
  id: string,
  dto: UpdateReunionDto,
  sourceId: string
): Promise<UpdateReunionResponse> {
  const config = sourceConfig(sourceId);
  const response = config
    ? await api.patch<UpdateReunionResponse>(`/reunions/${id}`, dto, config)
    : await api.patch<UpdateReunionResponse>(`/reunions/${id}`, dto);
  return response.data;
}

export async function deleteReunion(id: string, sourceId: string): Promise<void> {
  const config = sourceConfig(sourceId);
  if (config) await api.delete(`/reunions/${id}`, config);
  else await api.delete(`/reunions/${id}`);
}

export async function createPoint(
  dto: CreatePointDto,
  sourceId: string
): Promise<CreatePointResponse> {
  const config = sourceConfig(sourceId);
  const response = config
    ? await api.post<CreatePointResponse>("/points", dto, config)
    : await api.post<CreatePointResponse>("/points", dto);
  return response.data;
}

export async function updatePoint(
  id: string,
  dto: UpdatePointDto,
  sourceId: string
): Promise<UpdatePointResponse> {
  const config = sourceConfig(sourceId);
  const response = config
    ? await api.patch<UpdatePointResponse>(`/points/${id}`, dto, config)
    : await api.patch<UpdatePointResponse>(`/points/${id}`, dto);
  return response.data;
}

export async function deletePoint(id: string, sourceId: string): Promise<void> {
  const config = sourceConfig(sourceId);
  if (config) await api.delete(`/points/${id}`, config);
  else await api.delete(`/points/${id}`);
}
