import type { ArtistManagementParams, ArtistManagementResponse } from "../domain/artistManagement";

export interface ArtistManagementPort {
  getArtistsManagement(params: ArtistManagementParams): Promise<ArtistManagementResponse>;
}

export interface ArtistUpdatePort {
  updateArtist(id: string, data: UpdateArtistInput): Promise<void>;
}

export interface ArtistDeletePort {
  deleteArtist(id: string): Promise<void>;
}

export interface UpdateArtistInput {
  name?: string;
  countryId?: string;
  image?: string;
  description?: string;
}
