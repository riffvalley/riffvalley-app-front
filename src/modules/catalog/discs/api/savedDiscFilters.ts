import api from "@services/api/api";
import type {
  SaveDiscFilterPayload,
  SavedDiscFilter,
  UpdateDiscFilterPayload,
} from "../types/savedDiscFilter";

const SAVED_DISC_FILTERS_PATH = "/discs/list/saved-filters";

export async function getSavedDiscFilters(signal?: AbortSignal): Promise<SavedDiscFilter[]> {
  const response = await api.get<SavedDiscFilter[]>(SAVED_DISC_FILTERS_PATH, {
    ...(signal ? { signal } : {}),
  });
  return response.data;
}

export async function createSavedDiscFilter(
  payload: SaveDiscFilterPayload
): Promise<SavedDiscFilter> {
  const response = await api.post<SavedDiscFilter>(SAVED_DISC_FILTERS_PATH, payload);
  return response.data;
}

export async function updateSavedDiscFilter(
  id: string,
  payload: UpdateDiscFilterPayload
): Promise<SavedDiscFilter> {
  const response = await api.patch<SavedDiscFilter>(
    `${SAVED_DISC_FILTERS_PATH}/${encodeURIComponent(id)}`,
    payload
  );
  return response.data;
}

export async function deleteSavedDiscFilter(id: string): Promise<void> {
  await api.delete(`${SAVED_DISC_FILTERS_PATH}/${encodeURIComponent(id)}`);
}
