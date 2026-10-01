import api from "@/shared/infrastructure/http/client";
import type { ArtistDeletePort, ArtistManagementPort, ArtistSearchPort, ArtistUpdatePort } from "../application/artistManagementPort";
import type { ArtistManagementMatch, ArtistManagementResponse } from "../domain/artistManagement";
import type { UpdateArtistInput } from "../application/artistManagementPort";

export const artistManagementApi: ArtistManagementPort & ArtistUpdatePort & ArtistDeletePort & ArtistSearchPort = {
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
  async searchArtistsByName(name: string) {
    const response = await api.get<ArtistManagementMatch[]>("/artists/search/by-name", { params: { name } });
    return response.data;
  },
};
