import api from "@services/api/api";
import type { VersionItem } from "./versions";

export async function getCurrentVersionItems(signal?: AbortSignal): Promise<VersionItem[]> {
  const { data } = await api.get<VersionItem[]>("/versions/current/items", { signal });
  return data;
}
