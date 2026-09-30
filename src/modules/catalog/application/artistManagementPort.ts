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

export interface CalendarArtistCreationPort {
  createArtist(name: string): Promise<{ id: string; name: string }>;
  associateArtistToDisc(discId: string, artistId: string): Promise<void>;
}

export interface UpdateArtistInput {
  name?: string;
  countryId?: string | null;
  image?: string;
  description?: string;
}
