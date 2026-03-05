import api from "@services/api/api.ts";
import axios from "axios";

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export type DiscType = "single" | "ep" | "album";

export interface NationalRelease {
  id: string;
  artistName: string;
  discName: string;
  discType: DiscType;
  genre: string;
  releaseDay: string;
  publishAt: string | null;
  approved: boolean;
  createdAt: string;
}

export interface CreateNationalReleaseDto {
  artistName: string;
  discName: string;
  discType: DiscType;
  genre: string;
  releaseDay: string;
  publishAt?: string | null;
}

export interface UpdateNationalReleaseDto {
  artistName?: string;
  discName?: string;
  discType?: DiscType;
  genre?: string;
  releaseDay?: string;
  publishAt?: string | null;
  approved?: boolean;
}

export async function createNationalRelease(dto: CreateNationalReleaseDto): Promise<NationalRelease>;
export async function createNationalRelease(dto: CreateNationalReleaseDto[]): Promise<NationalRelease[]>;
export async function createNationalRelease(
  dto: CreateNationalReleaseDto | CreateNationalReleaseDto[]
): Promise<NationalRelease | NationalRelease[]> {
  const response = await publicApi.post<NationalRelease | NationalRelease[]>("/national-releases", dto);
  return response.data;
}

export async function getNationalReleases(params?: { month?: number; year?: number }): Promise<NationalRelease[]> {
  const response = await publicApi.get<NationalRelease[]>("/national-releases", { params });
  return response.data;
}

export async function getNationalRelease(id: string): Promise<NationalRelease> {
  const response = await publicApi.get<NationalRelease>(`/national-releases/${id}`);
  return response.data;
}

export async function updateNationalRelease(id: string, dto: UpdateNationalReleaseDto): Promise<NationalRelease> {
  const response = await api.patch<NationalRelease>(`/national-releases/${id}`, dto);
  return response.data;
}

export async function deleteNationalRelease(id: string): Promise<void> {
  await api.delete(`/national-releases/${id}`);
}
