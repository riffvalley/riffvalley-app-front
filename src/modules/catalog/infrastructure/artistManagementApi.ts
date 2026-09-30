import api from "@services/api/api.ts";
import type { ArtistDeletePort, ArtistManagementPort, ArtistUpdatePort } from "../application/artistManagementPort";
import type { ArtistManagementResponse } from "../domain/artistManagement";
import type { UpdateArtistInput } from "../application/artistManagementPort";

export const artistManagementApi: ArtistManagementPort & ArtistUpdatePort & ArtistDeletePort = {
  async getArtistsManagement(params) {
    const response = await api.get<ArtistManagementResponse>("/artists/management", { params });
    return response.data;
  },
  async updateArtist(id: string, data: UpdateArtistInput) {
    await api.patch(`/artists/${id}`, data);
  },
  async deleteArtist(id: string) {
    await api.delete(`/artists/${id}`);
  },
};
