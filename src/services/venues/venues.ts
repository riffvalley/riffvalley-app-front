import api from "@services/api/api";
import type { Country } from "@services/countries/countries";

export interface Venue {
  id: string;
  name: string;
  type: "venue";
  address?: string | null;
  city: string;
  province?: string | null;
  countryId?: string | null;
  country: Country | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  images?: string[] | null;
}

export interface VenueProvinceStat {
  province: string | null;
  count: number;
}

export interface CreateVenueDto {
  name: string;
  address?: string | null;
  city: string;
  countryId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  images?: string[] | null;
}

export interface UpdateVenueDto extends Partial<CreateVenueDto> {}

export async function getVenues(province?: string | null): Promise<Venue[]> {
  const { data } = await api.get<Venue[]>("/locations", {
    params: { type: "venue", ...(province ? { province } : {}) },
  });
  return data;
}

export async function getVenueStatsByProvince(): Promise<VenueProvinceStat[]> {
  const { data } = await api.get<VenueProvinceStat[]>("/locations/stats/by-province", {
    params: { type: "venue" },
  });
  return data;
}

export async function getVenue(id: string): Promise<Venue> {
  const { data } = await api.get<Venue>(`/locations/${id}`);
  return data;
}

export async function createVenue(dto: CreateVenueDto): Promise<Venue> {
  const { data } = await api.post<Venue>("/locations", { ...dto, type: "venue" });
  return data;
}

export async function updateVenue(id: string, dto: UpdateVenueDto): Promise<Venue> {
  const { data } = await api.patch<Venue>(`/locations/${id}`, dto);
  return data;
}

export async function deleteVenue(id: string): Promise<void> {
  await api.delete(`/locations/${id}`);
}

export async function geocodeVenue(id: string): Promise<Venue> {
  const { data } = await api.post<Venue>(`/locations/${id}/geocode`);
  return data;
}

export async function uploadVenueImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<{ url: string }>("/uploads/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.url;
}
