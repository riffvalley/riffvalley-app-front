import api from "@services/api/api.ts";

export interface ListSummary {
  id: string;
  name: string;
  type: "month" | "week" | "special" | "video";
  status?: string | null;
  listDate?: string | null;
  releaseDate?: string | null;
  closeDate?: string | null;
  asignations?: Array<{
    id: string;
    user?: { id?: string; username?: string; image?: string | null } | null;
  }>;
}

function assertValidYear(year: number): void {
  if (!Number.isInteger(year) || year < 100 || year > 275759) {
    throw new RangeError("List year must be an integer from 100 through 275759.");
  }
}

function assertValidMonth(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError("List month must be an integer from 1 through 12.");
  }
}

export interface ListAsignationDetails {
  id: string;
  done: boolean | null;
  position: number | null;
  description: string | null;
  disc?: {
    name?: string | null;
    link?: string | null;
    image?: string | null;
    artist?: { name?: string | null } | null;
  } | null;
  user?: { id?: string; username?: string; image?: string | null } | null;
}

/** List projection consumed by the existing Radar/Best actions modal. */
export interface RadarListDetails {
  id: string;
  name: string;
  type: "month" | "week" | "special" | "video";
  status?: string | null;
  releaseDate?: string | null;
  listDate?: string | null;
  closeDate?: string | null;
  asignations: ListAsignationDetails[];
  wpWeeklyPosts?: WeeklyWpPostRecord[];
}

export interface ListUpdatePayload {
  name?: string;
  type?: "month" | "week" | "special" | "video";
  status?: string | null;
  releaseDate?: string | null;
  listDate?: string | null;
  closeDate?: string | null;
}

export async function postList(payload: any): Promise<void> {
  const response = await api.post("/lists", payload);
  return response.data;
}

export async function getListDetails(
  listId: string,
  signal?: AbortSignal
): Promise<RadarListDetails> {
  const response = signal
    ? await api.get<RadarListDetails>(`/lists/${listId}`, { signal })
    : await api.get<RadarListDetails>(`/lists/${listId}`);
  return response.data;
}

export async function updateList(
  id: string,
  data: ListUpdatePayload,
  sourceId?: string
): Promise<RadarListDetails> {
  const config = sourceId ? { headers: { "X-Content-Calendar-Client-Id": sourceId } } : undefined;
  const response = config
    ? await api.patch(`/lists/${id}`, data, config)
    : await api.patch(`/lists/${id}`, data);
  return response.data;
}

export async function getLists(
  limit?: number,
  offset?: number,
  statusExclusions?: string[] // Nuevo parámetro para excluir estados
): Promise<any> {
  const response = await api.get<any>("/lists", {
    params: { limit, offset, statusExclusions }, // Agregar statusExclusions como parámetro
  });
  return response.data;
}

// Obtener listas semanales actuales
export async function getCurrentWeeklyLists(signal?: AbortSignal): Promise<ListSummary[]> {
  const response = signal
    ? await api.get<ListSummary[]>("/lists/weekly/current", { signal })
    : await api.get<ListSummary[]>("/lists/weekly/current");
  return response.data;
}

// Obtener listas semanales pasadas por año y mes
export async function getPastWeeklyLists(
  year: number,
  month: number,
  signal?: AbortSignal
): Promise<ListSummary[]> {
  assertValidYear(year);
  assertValidMonth(month);
  const response = signal
    ? await api.get<ListSummary[]>(`/lists/weekly/past/${year}/${month}`, { signal })
    : await api.get<ListSummary[]>(`/lists/weekly/past/${year}/${month}`);
  return response.data;
}

// Obtener listas mensuales actuales
export async function getCurrentMonthlyLists(signal?: AbortSignal): Promise<ListSummary[]> {
  const response = signal
    ? await api.get<ListSummary[]>("/lists/month/current", { signal })
    : await api.get<ListSummary[]>("/lists/month/current");
  return response.data;
}

// Obtener listas mensuales pasadas por año
export async function getPastMonthlyLists(
  year: number,
  signal?: AbortSignal
): Promise<ListSummary[]> {
  assertValidYear(year);
  const response = signal
    ? await api.get<ListSummary[]>(`/lists/month/past/${year}`, { signal })
    : await api.get<ListSummary[]>(`/lists/month/past/${year}`);
  return response.data;
}

// Obtener listas especiales
export async function getSpecialLists(): Promise<any> {
  const response = await api.get<any>("/lists/special");
  return response.data;
}

export interface WpPost {
  position: number;
  wpPostId: number;
  link: string;
  title: string;
  added?: number;
  updated?: number;
  removed?: number;
  warning?: string;
  adopted?: boolean;
}

export interface CreateWpPostsResponse {
  created: number;
  posts: WpPost[];
}

export interface WeeklyWpPostRecord {
  position: number;
  wpPostId: number;
  wpPostUrl: string;
}

export async function createWpPosts(id: string, position?: number): Promise<CreateWpPostsResponse> {
  const response = await api.post<CreateWpPostsResponse>(
    `/lists/${id}/wp-posts`,
    {},
    {
      params: position ? { position } : undefined,
    }
  );
  return response.data;
}

export interface BestDiscsWpPostResponse {
  wpPostId: number;
  link: string;
  title: string;
  skipped?: boolean;
  added?: number;
  removed?: number;
  message?: string;
  warning?: string;
}

export async function generateBestDiscsWpPost(id: string): Promise<BestDiscsWpPostResponse> {
  const response = await api.post<BestDiscsWpPostResponse>(`/lists/${id}/wp-best-post`);
  return response.data;
}

export async function deleteList(id: string, sourceId?: string): Promise<void> {
  const config = sourceId ? { headers: { "X-Content-Calendar-Client-Id": sourceId } } : undefined;
  if (config) await api.delete(`/lists/${id}`, config);
  else await api.delete(`/lists/${id}`);
}

// Obtener listas de video actuales
export async function getCurrentVideoLists(): Promise<any> {
  const response = await api.get<any>("/lists/video/current");
  return response.data;
}

// Obtener listas de video pasadas por año
export async function getPastVideoLists(year: number): Promise<any> {
  const response = await api.get<any>(`/lists/video/past/${year}`);
  return response.data;
}
