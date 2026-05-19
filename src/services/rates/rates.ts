import api from "@services/api/api.ts";
import type { Disc } from "@services/discs/discs";

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
): Promise<DiscRate[]> {
  const response = await api.get<any>("/rates", {
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
  });
  return response.data;
}

export async function getDiscRates(discId: string): Promise<DiscRate[]> {
  const response = await api.get<DiscRate[]>(`/rates/disc/${discId}`);

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

export interface RatesStatsResponse {
  totalVotes: number;
  mean: string;
  median: number;
  totalUsers: number;
  rank: number;
  votesByGenre: {
    genre: string;
    count: number;
  }[];
  votesByMonth: {
    month: string;
    count: number;
    weeks: {
      week: string;
      count: number;
    }[];
  }[];
  votesByScore: {
    score: number;
    count: number;
  }[];
}

export async function getRatesStats(year?: number): Promise<RatesStatsResponse> {
  const response = await api.get<RatesStatsResponse>("/rates/stats", {
    params: year ? { year } : undefined,
  });
  return response.data;
}
