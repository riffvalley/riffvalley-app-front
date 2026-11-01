import api from "@services/api/api.ts";
import type { Disc } from "@services/discs/discs";
import type { PaginatedResponse } from "@services/api/pagination";

export interface RatePayload {
  discId: string;
  rate: number;
  cover: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  isActive: boolean;
  roles: string[];
  image: string | null;
}

export interface DiscRate {
  id: string;
  rate: string;
  cover: string;
  user: User;
  disc?: Disc;
}

export interface UserDiscRateListItem extends Omit<DiscRate, "disc" | "rate" | "cover"> {
  rate: string | number | null;
  cover: string | number | null;
  disc: Disc;
}

export type HistoryType = "rate" | "cover" | "both";
export type HistoryOrder = "ASC" | "DESC";
export type HistoryAction = "created" | "updated";

export interface HistoryDisc {
  id: string;
  name?: string;
  artist?: { id?: string; name?: string };
}

export interface HistoryEvent {
  rateId: string;
  action: HistoryAction;
  timestamp: string;     // ISO string del backend
  dayLabel: string;      // "D-M"
  rate: number | null;   // lo devolvemos como número
  cover: number | null;  // lo devolvemos como número
  disc: HistoryDisc;
}

export interface GetUserHistoryResponse {
  userId: string;
  type: HistoryType;
  order: HistoryOrder;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  data: HistoryEvent[];
}

export interface GetUserHistoryParams {
  userId: string;
  limit?: number;
  offset?: number;
  type?: HistoryType;
  order?: HistoryOrder;
  from?: string | Date; // 'YYYY-MM-DD' o Date
  to?: string | Date;   // 'YYYY-MM-DD' o Date
  /**
   * Convierte rate/cover a number y timestamp a Date
   * (por defecto true)
   */
  transform?: boolean;
}

export interface RatesDashboardPeriodDto {
  start: string;
  endExclusive: string;
  timezone: "Europe/Madrid";
}

export interface RatesDashboardGenreDto {
  id: string;
  name: string;
  activeRates: number;
}

export interface RatesDashboardDiscDto {
  rateId: string;
  discId: string;
  discName: string;
  artist: { id: string; name: string } | null;
  coverImage: string | null;
  rate: number;
}

export interface RatesDashboardRecentRateDto {
  id: string;
  discId: string;
  discName: string;
  artist: { id: string; name: string } | null;
  coverImage: string | null;
  rate: number | null;
  cover: number | null;
  lastActivityAt: string;
}

export interface RatesDashboardSummaryDto {
  period: RatesDashboardPeriodDto;
  metrics: {
    activeRates: number;
    averageMusicalRate: number | null;
    distinctGenres: number;
    bestRatedDisc: RatesDashboardDiscDto | null;
    dominantGenre: RatesDashboardGenreDto | null;
    weekOverWeek: {
      currentRates: number;
      previousRates: number;
      difference: number;
      percentageChange: number | null;
    };
  };
  recentRates: RatesDashboardRecentRateDto[];
}

export async function getRatesDashboardSummary(
  signal?: AbortSignal,
): Promise<RatesDashboardSummaryDto> {
  const response = await api.get<RatesDashboardSummaryDto>(
    "/rates/dashboard-summary",
    { signal },
  );
  return response.data;
}

/** Util: formatea Date a 'YYYY-MM-DD' */
const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};


export async function postRateService(payload: any): Promise<void> {
  const response = await api.post("/rates", payload);
  return response.data;
}

export async function updateRateService(ratingId: string, updateRateDto: any) {
  // PATCH /rates/:id
  return api.patch(`/rates/${ratingId}`, updateRateDto);
}

export async function getRatesByUser(
  limit: number,
  offset: number,
  query?: string,
  dateRange?: any,
  genre?: string,
  country?: string,
  type?: string,
  orderBy?: string,
  signal?: AbortSignal
): Promise<PaginatedResponse<UserDiscRateListItem>> {
  const response = await api.get<PaginatedResponse<UserDiscRateListItem>>("/rates", {
    params: {
      limit,
      offset,
      query,
      dateRange,
      genre,
      country,
      type,
      orderBy,
    },
    ...(signal ? { signal } : {}),
  });
  return response.data;
}

export async function getDiscRates(discId: string, signal?: AbortSignal): Promise<DiscRate[]> {
  const response = await api.get<DiscRate[]>(`/rates/disc/${discId}`, {
    ...(signal ? { signal } : {}),
  });

  return response.data;
}

/**
 * Servicio: histórico de acciones del usuario (creadas/actualizadas).
 * Endpoint: GET /rates/user/:userId/history
 */
export async function getUserHistoryService(
  params: GetUserHistoryParams
): Promise<GetUserHistoryResponse> {
  const {
    userId,
    limit = 20,
    offset = 0,
    type = "both",
    order = "DESC",
    from,
    to,
    transform = true,
  } = params;

  const qp: Record<string, any> = {
    limit,
    offset,
    type,
    order,
  };

  if (from && to) {
    qp.from = typeof from === "string" ? from : toYMD(from);
    qp.to = typeof to === "string" ? to : toYMD(to);
  }

  const { data } = await api.get<GetUserHistoryResponse>(
    `/rates/user/${userId}/history`,
    { params: qp }
  );

  if (!transform) return data;

  // Normalizamos rate/cover a number y (opcional) timestamp a Date si te viene bien en el front
  const normalized: GetUserHistoryResponse = {
    ...data,
    data: data.data.map((e) => ({
      ...e,
      // Algunos backends mandan "7.50" como string:
      rate: e.rate === null ? null : Number(e.rate),
      cover: e.cover === null ? null : Number(e.cover),
      // Si prefieres Date en vez de string, descomenta la siguiente línea
      // timestamp: new Date(e.timestamp) as any,
    })),
  };

  return normalized;
}

export interface TopDisc {
  id: string;
  name: string;
  image: string | null;
  rate: number;
  artist: { name: string };
  genre: { name: string; color: string } | null;
}

export interface ControversialDisc {
  id: string;
  name: string;
  image: string | null;
  userRate: number;
  communityAverage: number;
  diff: number;
  artist: { name: string };
  genre: { name: string; color: string } | null;
}

export interface YearOverYearPeriod {
  year: number;
  votes: number;
  mean: string | number;
}

export interface YearOverYear {
  current: YearOverYearPeriod;
  previous: YearOverYearPeriod;
}

export interface RatesStatsResponse {
  totalVotes: number;
  mean: string;
  median: number;
  totalUsers: number;
  rank: number;
  votesByGenre: {
    genre: string;
    count: number;
    topDisc: TopDisc | null;
  }[];
  votesByMonth: {
    month: string;
    count: number;
    weeks: {
      week: string;
      count: number;
    }[];
    topDisc: TopDisc | null;
  }[];
  votesByScore: {
    score: number;
    count: number;
  }[];
  votesByDay: { date: string; count: number }[];
  topDiscOverall: TopDisc | null;
  mostControversial: ControversialDisc[];
  yearOverYear: YearOverYear;
}

export interface RatesGeographyCountryDto {
  isoCode: string;
  name: string;
  count: number;
  percentage: number;
}

export interface RatesGeographyTopResponseDto {
  countries: RatesGeographyCountryDto[];
}

export interface RatesGeographyWorldResponseDto {
  totalRatedDiscs: number;
  mappedDiscs: number;
  unmappedDiscs: number;
  countryCount: number;
  countries: RatesGeographyCountryDto[];
}

export async function getRatesGeographyWorld(
  signal?: AbortSignal,
): Promise<RatesGeographyWorldResponseDto> {
  const response = await api.get<RatesGeographyWorldResponseDto>(
    "/rates/geography/world",
    { signal },
  );
  return response.data;
}

export async function getRatesGeographyTop(
  signal?: AbortSignal,
): Promise<RatesGeographyTopResponseDto> {
  const response = await api.get<RatesGeographyTopResponseDto>(
    "/rates/geography/top",
    { signal },
  );
  return response.data;
}

export interface RatesHomeInsightsResponse {
  topArtists: {
    id: string;
    name: string;
    image: string;
    averageRate: number;
    ratingCount: number;
  }[];
  countries: {
    isoCode: string;
    name: string;
    count: number;
    percentage: number;
  }[];
}

export interface RatesTopArtistDto {
  id: string;
  name: string;
  image: string | null;
  ratingCount: number;
  averageRate: number;
}

export interface RatesTopArtistsResponseDto {
  artists: RatesTopArtistDto[];
}

export type RatesArtistLastfmStatus =
  | "available"
  | "not_found"
  | "unavailable"
  | "not_configured"
  | "invalid_response";

export interface RatesArtistLastfmLinkDto {
  name: string;
  url: string | null;
}

export interface RatesArtistLastfmCatalogDiscDto {
  id: string;
  name: string;
  image: string | null;
  releaseYear: number | null;
  releaseDate: string | null;
  link: string | null;
  ep: boolean;
  debut: boolean;
  genre: { name: string; color: string | null } | null;
  averageRate: number | null;
  averageCover: number | null;
  voteCount: number;
  commentCount: number;
  userRate: { id: string; rate: number | null; cover: number | null } | null;
  favoriteId: string | null;
  pendingId: string | null;
}

export interface RatesArtistLastfmSimilarArtistDto extends RatesArtistLastfmLinkDto {
  catalogArtistId: string | null;
  catalogDiscCount: number;
  catalogDiscs: RatesArtistLastfmCatalogDiscDto[];
}

export interface RatesArtistLastfmResponseDto {
  artistId: string;
  status: RatesArtistLastfmStatus;
  biography: { summary: string | null; url: string | null } | null;
  tags: RatesArtistLastfmLinkDto[];
  similarArtists: RatesArtistLastfmSimilarArtistDto[];
  listeners: number | null;
  playCount: number | null;
  lastfmUrl: string | null;
}

export async function getRatesArtistLastfm(
  artistId: string,
  signal?: AbortSignal,
): Promise<RatesArtistLastfmResponseDto> {
  const response = await api.get<RatesArtistLastfmResponseDto>(
    `/rates/artists/${encodeURIComponent(artistId)}/lastfm`,
    { signal },
  );
  return response.data;
}

export type ArtistRankingPeriod = "month" | "year" | "all";

export interface RatesArtistSummaryGenreDto {
  id: string;
  name: string;
}

export interface RatesArtistSummaryCountryDto {
  id: string;
  name: string;
  isoCode: string | null;
}

export interface RatesArtistSummaryDiscHighlightDto {
  id: string;
  name: string;
  rate: number;
}

export interface RatesArtistSummaryDiscDto {
  id: string;
  name: string;
  image: string | null;
  releaseDate: string | null;
  rate: number;
  cover: number | null;
  rateId: string;
  lastActivityAt: string;
}

export interface RatesArtistSummaryResponseDto {
  artist: {
    id: string;
    name: string;
    image: string | null;
    country: RatesArtistSummaryCountryDto | null;
    genres: RatesArtistSummaryGenreDto[];
  };
  stats: {
    ratedDiscCount: number;
    averageRate: number | null;
    highestRatedDisc: RatesArtistSummaryDiscHighlightDto | null;
    lowestRatedDisc: RatesArtistSummaryDiscHighlightDto | null;
    firstAvailableActivityAt: string | null;
    lastAvailableActivityAt: string | null;
  };
  discs: {
    data: RatesArtistSummaryDiscDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RatesArtistSummaryParams {
  page?: number;
  limit?: number;
}

export async function getRatesTopArtists(
  signal?: AbortSignal,
  period: ArtistRankingPeriod = "all",
): Promise<RatesTopArtistsResponseDto> {
  const response = await api.get<RatesTopArtistsResponseDto>(
    "/rates/artists/top",
    { params: { period }, signal },
  );
  return response.data;
}

export async function getRatesArtistSummary(
  artistId: string,
  params?: RatesArtistSummaryParams,
  signal?: AbortSignal,
): Promise<RatesArtistSummaryResponseDto> {
  const response = await api.get<RatesArtistSummaryResponseDto>(
    `/rates/artists/${encodeURIComponent(artistId)}/summary`,
    { params, signal },
  );
  return response.data;
}

export async function getRatesHomeInsights(): Promise<RatesHomeInsightsResponse> {
  const response = await api.get<RatesHomeInsightsResponse>("/rates/home-insights");
  return response.data;
}

export async function getRatesStats(year?: number): Promise<RatesStatsResponse> {
  const response = await api.get<RatesStatsResponse>("/rates/stats", {
    params: year ? { year } : undefined,
  });
  return response.data;
}

export interface RatedDiscItem {
  id: string;
  name: string;
  rate: number;
  artist: { name: string };
  genre: { name: string; color: string } | null;
}

// Bajo demanda (galaxia de discos): no se pide en cada visita a Estadísticas.
export async function getUserRatedDiscs(year?: number): Promise<RatedDiscItem[]> {
  const response = await api.get<RatedDiscItem[]>("/rates/stats/discs", {
    params: year ? { year } : undefined,
  });
  return response.data;
}
