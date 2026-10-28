// @services/versions/versions.ts
import api from '@services/api/api';

// =========================
// Tipos
// =========================
export type ChangeType =
  | 'feat' | 'fix' | 'docs' | 'style' | 'refactor'
  | 'perf' | 'test' | 'build' | 'ci' | 'chore' | 'revert';

export type DevState = 'todo' | 'in_progress' | 'in_review' | 'done';

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  SUGGESTION = 'suggestion'
}

export interface VersionItem {
  id: string;
  type: ChangeType;
  description: string;
  scope?: string | null;
  priority?: Priority;
  branch?: string;
  state: DevState;
  backUser?: {
    id: string;
    username: string;
    isActive: boolean;
    image: string;
  } | null;
  frontUser?: {
    id: string;
    username: string;
    isActive: boolean;
    image: string;
  } | null;
}

// Respuesta para versión en desarrollo (incluye backlog)
export interface DevVersionResponse {
  version: Version;
  backlog: VersionItem[];
}

export interface Version {
  id: string;
  version: string;
  releaseDate?: string;   // ISO
  notes?: string;
  link?: string | null;   // Telegram link
  isActive: boolean;
  publishedAt?: string;   // ISO
  status?: 'en_desarrollo' | 'en_produccion';
  createdAt: string;      // ISO
  updatedAt: string;      // ISO
  items: VersionItem[];
}

// Respuesta cursor
export interface VersionsInfiniteResponse {
  data: Version[];
  nextCursor?: string;
}

// Respuesta paginada
export interface PaginatedVersionsResponse {
  data: Version[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Crear/Actualizar DTOs (frontend)
export interface CreateVersionItemDto {
  type: ChangeType;
  description: string;
  scope?: string;
  priority?: Priority;
  state?: DevState;
  branch?: string;
}

export interface UpdateVersionItemDto extends Partial<CreateVersionItemDto> {
  version?: string | null; // ID de la versión o null para desasignar
}

export interface CreateVersionDto {
  version: string;
  releaseDate?: string; // 'YYYY-MM-DD'
  notes?: string;
  link?: string | null; // Telegram link
  isActive?: boolean;
  publishedAt?: string; // ISO
  items?: CreateVersionItemDto[];
}

export interface UpdateVersionDto extends Partial<CreateVersionDto> {
  status?: 'en_desarrollo' | 'en_produccion';
}

// Utils
export const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// =========================
// Endpoints PÚBLICOS
// =========================

// Última versión activa (para footer)
export async function getLatestPublicVersion(): Promise<Version | null> {
  const { data } = await api.get<Version | null>('/versions/production/latest');
  return data;
}

// Scroll infinito (cursor-based)
export async function getPublicVersionsInfinite(
  limit = 20,
  cursor?: string
): Promise<VersionsInfiniteResponse> {
  const { data } = await api.get<VersionsInfiniteResponse>('/versions/public/infinite', {
    params: { limit, cursor },
  });
  return data;
}

// (Opcional) listar públicas sin cursor (no recomendado para infinito)
export async function getPublicVersions(): Promise<Version[]> {
  const { data } = await api.get<Version[]>('/versions/public');
  return data;
}

// Versiones de producción paginadas
export async function getProductionVersionsPaginated(
  page: number,
  limit = 9
): Promise<PaginatedVersionsResponse> {
  const { data } = await api.get<PaginatedVersionsResponse>('/versions/production/paginated', {
    params: { page, limit },
  });
  return data;
}

// Última versión de producción
export async function getLatestProductionVersion(): Promise<string | null> {
  try {
    const { data } = await api.get<{ version: string } | null>('/versions/production/latest');
    return data?.version || null;
  } catch (error) {
    console.error('Error fetching latest production version:', error);
    return null;
  }
}

// =========================
// CRUD de Version (admin)
// =========================

export async function createVersion(dto: CreateVersionDto): Promise<Version> {
  const { data } = await api.post<Version>('/versions', dto);
  return data;
}

export interface ListVersionsParams {
  limit?: number;
  offset?: number;
  query?: string;
  isActive?: boolean;
}

export async function listVersions(params: ListVersionsParams = {}): Promise<Version[]> {
  const { data } = await api.get<Version[]>('/versions', { params });
  return data;
}

export async function getVersion(id: string): Promise<Version> {
  const { data } = await api.get<Version>(`/versions/${id}`);
  return data;
}

export async function updateVersion(id: string, dto: UpdateVersionDto): Promise<Version> {
  const { data } = await api.patch<Version>(`/versions/${id}`, dto);
  return data;
}

export async function removeVersion(id: string): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/versions/${id}`);
  return data;
}

// Activar / desactivar una versión
export async function setVersionActive(id: string, active: boolean): Promise<Version> {
  const { data } = await api.patch<Version>(`/versions/${id}/active`, { active });
  return data;
}

// =========================
// CRUD anidado de Items (por versión)
// =========================

// Listar items de una versión
export async function listVersionItems(
  versionId: string,
  opts?: { state?: DevState }
): Promise<VersionItem[]> {
  const { data } = await api.get<VersionItem[]>(`/versions/${versionId}/items`, {
    params: opts,
  });
  return data;
}

// Crear item en una versión
export async function createVersionItem(
  versionId: string,
  dto: CreateVersionItemDto
): Promise<VersionItem> {
  const { data } = await api.post<VersionItem>(`/versions/${versionId}/items`, dto);
  return data;
}

// Actualizar item de una versión
export async function updateVersionItem(
  versionId: string,
  itemId: string,
  dto: UpdateVersionItemDto
): Promise<VersionItem> {
  const { data } = await api.patch<VersionItem>(`/versions/${versionId}/items/${itemId}`, dto);
  return data;
}

// Eliminar item de una versión
export async function removeVersionItem(
  versionId: string,
  itemId: string
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/versions/${versionId}/items/${itemId}`);
  return data;
}

// =========================
// CRUD directo de Items (sin versión)
// =========================

// Crear item (sin asociar a versión específica)
export async function createItem(dto: CreateVersionItemDto): Promise<VersionItem> {
  const { data } = await api.post<VersionItem>('/versions/items', dto);
  return data;
}

// Obtener un item por ID
export async function getItem(itemId: string): Promise<VersionItem> {
  const { data } = await api.get<VersionItem>(`/versions/items/${itemId}`);
  return data;
}

// Actualizar item directamente
export async function updateItem(
  itemId: string,
  dto: UpdateVersionItemDto
): Promise<VersionItem> {
  const { data } = await api.patch<VersionItem>(`/versions/items/${itemId}`, dto);
  return data;
}

// Eliminar item directamente
export async function removeItem(itemId: string): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/versions/items/${itemId}`);
  return data;
}

// =========================
// Versión en desarrollo
// =========================

export async function getDevVersion(): Promise<DevVersionResponse | null> {
  const { data } = await api.get<DevVersionResponse | null>('/versions/dev');
  return data;
}

