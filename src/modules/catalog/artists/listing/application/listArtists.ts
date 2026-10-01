import type { ArtistManagementParams, ArtistManagementResponse } from "../../domain/artistManagement";
import type { ArtistManagementPort } from "../../application/artistManagementPort";

export const ARTISTS_PAGE_SIZE = 30;

export function listArtists(port: ArtistManagementPort, params: ArtistManagementParams): Promise<ArtistManagementResponse> {
  return port.getArtistsManagement({ ...params, limit: params.limit ?? ARTISTS_PAGE_SIZE });
}
