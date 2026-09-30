import type { ArtistManagementParams, ArtistManagementResponse } from "../domain/artistManagement";

export interface ArtistManagementPort {
  getArtistsManagement(params: ArtistManagementParams): Promise<ArtistManagementResponse>;
}
