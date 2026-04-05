import api from "@services/api/api.ts";
import type { VersionItem } from "@services/versions/versions";

export type SuggestionType = 'suggestion' | 'bug';
export type SuggestionStatus = 'in_progress' | 'done' | 'rejected';
export type SuggestionPriority = 'low' | 'medium' | 'high';

export interface SuggestionUser {
  id: string;
  username: string;
  image?: string | null;
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: SuggestionType;
  status: SuggestionStatus;
  priority: SuggestionPriority;
  rejectionReason: string | null;
  userId: string | null;
  user: SuggestionUser;
  versionItemId: string | null;
  versionItem: VersionItem | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSuggestionDto {
  title: string;
  description: string;
  type?: SuggestionType;
  priority?: SuggestionPriority;
}

export interface UpdateSuggestionDto {
  title?: string;
  description?: string;
  type?: SuggestionType;
  priority?: SuggestionPriority;
}

export async function createSuggestion(dto: CreateSuggestionDto): Promise<Suggestion> {
  const { data } = await api.post<Suggestion>('/suggestions', dto);
  return data;
}

export async function getSuggestions(type?: SuggestionType): Promise<Suggestion[]> {
  const { data } = await api.get<Suggestion[]>('/suggestions', { params: type ? { type } : {} });
  return data;
}

export async function getMySuggestions(): Promise<Suggestion[]> {
  const { data } = await api.get<Suggestion[]>('/suggestions/my');
  return data;
}

export async function updateSuggestion(id: string, dto: UpdateSuggestionDto): Promise<Suggestion> {
  const { data } = await api.patch<Suggestion>(`/suggestions/${id}`, dto);
  return data;
}

export async function progressSuggestion(id: string): Promise<Suggestion> {
  const { data } = await api.patch<Suggestion>(`/suggestions/${id}/progress`);
  return data;
}

export async function rejectSuggestion(id: string, rejectionReason: string): Promise<Suggestion> {
  const { data } = await api.patch<Suggestion>(`/suggestions/${id}/reject`, { rejectionReason });
  return data;
}

export async function doneSuggestion(id: string, versionItemId: string): Promise<Suggestion> {
  const { data } = await api.patch<Suggestion>(`/suggestions/${id}/done`, { versionItemId });
  return data;
}

export async function deleteSuggestion(id: string): Promise<void> {
  await api.delete(`/suggestions/${id}`);
}

export async function getCurrentVersionItems(): Promise<VersionItem[]> {
  const { data } = await api.get<VersionItem[]>('/versions/current/items');
  return data;
}
