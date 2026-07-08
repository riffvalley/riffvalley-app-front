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

export interface RandomDiscsFilters {
  genre?: string;
  country?: string;
  countryId?: string;
  year?: number;
  limit?: number;
}

export interface RandomDisc {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  verified: boolean;
  ep: boolean;
  debut: boolean;
  link: string | null;
  releaseDate: string;
  featured: boolean;
  pinned: boolean;
  artist: {
    id: string;
    name: string;
    country: { id: string; name: string | null; isoCode?: string | null } | null;
  };
  genre: { id: string; name: string; color?: string } | null;
  userRate: { id: string; rate: string | null; cover: string | null } | null;
  averageRate: number | null;
  averageCover: number | null;
  commentCount: number;
  voteCount: number;
  favoriteId: string | null;
  pendingId: string | null;
}

export async function getRandomDiscs(
  filters: RandomDiscsFilters = {}
): Promise<RandomDisc[]> {
  const response = await api.get<RandomDisc[]>("/discs/random", {
    params: filters,
  });
  return response.data;
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