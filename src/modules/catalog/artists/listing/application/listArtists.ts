import type { ArtistManagementDisc, ArtistManagementItem, ArtistManagementParams, ArtistManagementResponse } from "../../domain/artistManagement";
import type { ArtistManagementPort } from "../../application/artistManagementPort";

export const ARTISTS_PAGE_SIZE = 30;

export function listArtists<TDisc extends ArtistManagementDisc, TArtist extends ArtistManagementItem<TDisc>>(
  port: ArtistManagementPort<TArtist>,
  params: ArtistManagementParams,
): Promise<ArtistManagementResponse<TArtist>> {
  return port.getArtistsManagement({ ...params, limit: params.limit ?? ARTISTS_PAGE_SIZE });
}
