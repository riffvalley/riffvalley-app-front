import api from "@services/api/api.ts";

// Interfaces
export interface Artist {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface Disc {
  id: string;
  name: string;
  description: string;
  image: string;
  releaseDate: string;
  artist: Artist;
  verified: boolean;
  EP: boolean;
  userRate?: any; // Opcional para compatibilidad
}

export interface GroupedDiscs {
  releaseDate: string;
  discs: Disc[];
}

export interface DiscsResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  data: GroupedDiscs[] | Disc[]; // Compatible con ambas estructuras de datos
}

export interface DiscsStatsResponse {
  discs: Disc[];
  totalDiscs: number;
  totalVotes: number;
  ratingDistribution: { rate: number; count: number }[];
  topUsersByRates: any[];
  topUsersByCover: any[];
}

// Servicios
export async function getDiscsDated(
  limit: number,
  offset: number,
  dateRange?: any,
  country?: string
): Promise<DiscsResponse> {
  const response = await api.get<DiscsResponse>("/discs/date", {
    params: {
      limit,
      offset,
      dateRange,
      ...(country && { country, countryId: country })
    },
  });

  return response.data;
}

export async function getDiscs(
  limit: number,
  offset: number,
  query?: string,
  dateRange?: any,
  genre?: string,
  country?: string,
  orderBy?: string,
  voted?: boolean,
  votedType?: string
): Promise<DiscsResponse> {
  const response = await api.get<DiscsResponse>("/discs", {
    params: {
      limit,
      offset,
      query, // Incluye el query en los parámetros si está definido
      dateRange,
      genre,
      country,
      orderBy,
      voted,
      votedType,
      ...(country && { countryId: country })
    },
  });
  return response.data;
}

export interface RandomDiscsParams {
  genre?: string;
  country?: string;
  countryId?: string;
  year?: number;
  ep?: boolean;
  debut?: boolean;
  limit?: number;
}

// GET /discs/random: selección aleatoria hecha por la propia base de datos
// (ORDER BY RANDOM() en Postgres), en vez del truco de "pedir el total y
// luego un offset al azar" desde el cliente.
export async function getRandomDiscs(params: RandomDiscsParams = {}): Promise<Disc[]> {
  const response = await api.get<Disc[]>("/discs/random", { params });
  return response.data;
}

export interface DiscOptionCountry {
  id: string;
  name: string;
  isoCode: string;
}

export interface DiscOptionGenre {
  id: string;
  name: string;
  color: string;
}

export interface DiscOptionsFilters {
  country?: string;
  genre?: string;
  year?: number;
  ep?: boolean;
  debut?: boolean;
}

// GET /discs/options: N valores al azar de `field` (país/género/año/ep/debut)
// que tienen garantizado al menos un disco para los filtros ya elegidos —
// nunca devuelve una opción que luego resulte en "no hay discos".
export function getDiscOptions(field: 'country', filters?: DiscOptionsFilters, limit?: number): Promise<DiscOptionCountry[]>;
export function getDiscOptions(field: 'genre', filters?: DiscOptionsFilters, limit?: number): Promise<DiscOptionGenre[]>;
export function getDiscOptions(field: 'year', filters?: DiscOptionsFilters, limit?: number): Promise<number[]>;
export function getDiscOptions(field: 'ep' | 'debut', filters?: DiscOptionsFilters, limit?: number): Promise<boolean[]>;
export async function getDiscOptions(
  field: 'country' | 'genre' | 'year' | 'ep' | 'debut',
  filters: DiscOptionsFilters = {},
  limit?: number
): Promise<DiscOptionCountry[] | DiscOptionGenre[] | number[] | boolean[]> {
  const response = await api.get<DiscOptionCountry[] | DiscOptionGenre[] | number[] | boolean[]>("/discs/options", {
    params: { field, ...filters, limit },
  });
  return response.data;
}

export async function updateDisc(
  id: string,
  data: {
    name?: string;
    genreId?: string;
    link?: string;
    image?: string;
    releaseDate?: any;
    verified?: boolean;
    ep?: boolean;
    debut?: boolean;
    artistId?: string;
  }
): Promise<void> {
  await api.patch(`/discs/${id}`, data);
}

export interface CreateDiscWithArtistDto {
  discName: string;
  artistName: string;
  genreId?: string;
  releaseDate?: string;
  ep?: boolean;
  debut?: boolean;
  link?: string;
  image?: string;
  description?: string;
  countryId?: string;
}

export async function createDiscWithArtist(dto: CreateDiscWithArtistDto): Promise<Disc> {
  const response = await api.post<Disc>("/discs/with-artist", dto);
  return response.data;
}

export async function deleteDisc(id: string): Promise<void> {
  await api.delete(`/discs/${id}`);
}

export async function getTopRatedOrFeaturedAndStats(
  dateRange?: [string, string],
  genreId?: string,
  country?: string,
  statsDateRange?: [string, string],
  distributionDateRange?: [string, string]
): Promise<DiscsStatsResponse> {
  const response = await api.get<DiscsStatsResponse>("/discs/homeDiscs", {
    params: {
      ...((dateRange) && { dateRange }),
      ...((genreId) && { genreId }),
      ...((country) && { country, countryId: country }),
      ...((statsDateRange) && { statsDateRange }),
      ...((distributionDateRange) && { distributionDateRange })
    },
  });
  return response.data;
}