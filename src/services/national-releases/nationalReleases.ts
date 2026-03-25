import api from "@services/api/api.ts";
import axios from "axios";

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export type DiscType = "single" | "ep" | "album";

export interface LinkedDisc {
  id: string;
  name: string;
  image: string;
  ep: boolean;
  link: string;
  artist: { id: string; name: string };
  genre: { id: string; name: string; color: string };
}

export interface NationalRelease {
  id: string;
  artistName: string;
  discName: string;
  discType: DiscType;
  genre: string;
  releaseDay: string;
  publishAt: string | null;
  link: string | null;
  approved: boolean;
  createdAt: string;
  discId: string | null;
  disc: LinkedDisc | null;
  suggestedDisc?: LinkedDisc | null;
}

export interface CreateNationalReleaseDto {
  artistName: string;
  discName: string;
  discType: DiscType;
  genre: string;
  releaseDay: string;
  publishAt?: string | null;
  link?: string | null;
}

export interface UpdateNationalReleaseDto {
  artistName?: string;
  discName?: string;
  discType?: DiscType;
  genre?: string;
  releaseDay?: string;
  publishAt?: string | null;
  link?: string | null;
  approved?: boolean;
}

export interface LinkDiscByIdDto {
  discId: string;
}

export interface LinkDiscCreateDto {
  name: string;
  artistId: string;
  genreId: string;
  releaseDate: string;
  ep: boolean;
  debut: boolean;
  link: string;
  image: string;
}

export interface CreateNationalReleaseFromDiscDto {
  discId: string;
  releaseDay: string;
  approved?: boolean;
  publishAt?: string;
  discType?: DiscType;
  genre?: string;
  link?: string;
}

export async function createNationalReleaseFromDisc(dto: CreateNationalReleaseFromDiscDto): Promise<NationalRelease> {
  const response = await api.post<NationalRelease>("/national-releases/from-disc", dto);
  return response.data;
}

export async function linkDisc(id: string, dto: LinkDiscByIdDto | LinkDiscCreateDto): Promise<NationalRelease> {
  const response = await api.patch<NationalRelease>(`/national-releases/${id}/link-disc`, dto);
  return response.data;
}

export async function createNationalRelease(dto: CreateNationalReleaseDto): Promise<NationalRelease>;
export async function createNationalRelease(dto: CreateNationalReleaseDto[]): Promise<NationalRelease[]>;
export async function createNationalRelease(
  dto: CreateNationalReleaseDto | CreateNationalReleaseDto[]
): Promise<NationalRelease | NationalRelease[]> {
  const response = await publicApi.post<NationalRelease | NationalRelease[]>("/national-releases", dto);
  return response.data;
}

export async function createNationalReleaseBulk(dto: CreateNationalReleaseDto[]): Promise<NationalRelease[]> {
  const response = await api.post<NationalRelease[]>("/national-releases/bulk", dto);
  return response.data;
}

export interface NationalReleasesResponse {
  data: NationalRelease[];
  pendingMonths?: number[];
}

export async function getNationalReleases(params?: { month?: number; year?: number; approved?: boolean }): Promise<NationalReleasesResponse> {
  const response = await api.get<NationalReleasesResponse>("/national-releases/all", { params });
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
