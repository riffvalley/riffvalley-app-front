import api from "@services/api/api";
import type {
  DiscListApiCard,
  DiscListApiComment,
  DiscListMode,
  DiscListApiPage,
  DiscListSuggestions,
  DiscListOptions,
  DiscListRequest,
} from "../types/discList";

export interface DiscListHttpParams {
  mode: DiscListMode;
  query?: string;
  dateRange?: [string, string];
  countryId?: string;
  artistId?: string;
  genreIds?: string;
  sort?: string;
  eligibility?: "unvotedRate" | "unvotedCover";
  offset?: number;
  limit?: number;
}

function calendarRange(range: [string, string] | null): [string, string] | undefined {
  return range ? [range[0].slice(0, 10), range[1].slice(0, 10)] : undefined;
}

function normalizeGenreIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean))].sort();
}

function getSort(
  mode: DiscListMode,
  orderBy: string
): Pick<DiscListHttpParams, "sort" | "eligibility"> {
  if (mode === "all" && orderBy === "UNVOTED:rate") return { eligibility: "unvotedRate" };
  if (mode === "all" && orderBy === "UNVOTED:cover") return { eligibility: "unvotedCover" };

  const exactSorts: Record<string, string> = {
    "disc.releaseDate:DESC,artist.name:ASC": "releaseDateDesc",
    "disc.releaseDate:ASC,artist.name:ASC": "releaseDateAsc",
    "disc.averageRate:DESC,disc.releaseDate:DESC": "averageRateDesc",
    "disc.averageRate:ASC,disc.releaseDate:DESC": "averageRateAsc",
    "rate.rate:DESC,disc.releaseDate:DESC": "myRateDesc",
    "rate.rate:ASC,disc.releaseDate:DESC": "myRateAsc",
    "rate.cover:DESC,artist.name:ASC": "myCoverDesc",
    "rate.cover:ASC,artist.name:ASC": "myCoverAsc",
  };
  const fallback = mode === "all" ? "releaseDateDesc" : "releaseDateDesc";
  const sort = exactSorts[orderBy] ?? fallback;
  return { sort };
}

export function buildDiscListParams(request: DiscListRequest): DiscListHttpParams {
  const genreIds = normalizeGenreIds(request.genreIds);
  return {
    mode: request.mode,
    ...(request.query.trim() ? { query: request.query.trim() } : {}),
    ...(calendarRange(request.dateRange) ? { dateRange: calendarRange(request.dateRange) } : {}),
    ...(request.countryId ? { countryId: request.countryId } : {}),
    ...(request.artistId ? { artistId: request.artistId } : {}),
    ...(genreIds.length ? { genreIds: genreIds.join(",") } : {}),
    ...getSort(request.mode, request.orderBy),
    offset: request.offset,
    limit: request.limit,
  };
}

export interface DiscListOptionsRequest {
  mode: DiscListMode;
  query: string;
  dateRange: [string, string] | null;
  countryId: string;
  genreIds: string[];
  artistId?: string;
}

export function buildDiscListOptionsParams(request: DiscListOptionsRequest): DiscListHttpParams {
  const genreIds = normalizeGenreIds(request.genreIds);
  return {
    mode: request.mode,
    ...(request.query.trim() ? { query: request.query.trim() } : {}),
    ...(calendarRange(request.dateRange) ? { dateRange: calendarRange(request.dateRange) } : {}),
    ...(request.countryId ? { countryId: request.countryId } : {}),
    ...(request.artistId ? { artistId: request.artistId } : {}),
    ...(genreIds.length ? { genreIds: genreIds.join(",") } : {}),
  };
}

export async function getDiscListSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<DiscListSuggestions> {
  const response = await api.get<DiscListSuggestions>("/discs/list/suggestions", {
    params: { query: query.trim() },
    ...(signal ? { signal } : {}),
  });
  return response.data;
}

export function getDiscListPage(
  request: DiscListRequest & { mode: "comments" },
  signal?: AbortSignal
): Promise<DiscListApiPage<DiscListApiComment>>;
export function getDiscListPage(
  request: DiscListRequest & { mode: Exclude<DiscListMode, "comments"> },
  signal?: AbortSignal
): Promise<DiscListApiPage<DiscListApiCard>>;
export async function getDiscListPage(
  request: DiscListRequest,
  signal?: AbortSignal
): Promise<DiscListApiPage<DiscListApiComment | DiscListApiCard>> {
  const response = await api.get<DiscListApiPage<DiscListApiComment | DiscListApiCard>>(
    "/discs/list",
    {
      params: buildDiscListParams(request),
      ...(signal ? { signal } : {}),
    }
  );
  return response.data;
}

export async function getDiscListOptions(
  request: DiscListOptionsRequest,
  signal?: AbortSignal
): Promise<DiscListOptions> {
  const response = await api.get<DiscListOptions>("/discs/list/options", {
    params: buildDiscListOptionsParams(request),
    ...(signal ? { signal } : {}),
  });
  return response.data;
}
