import api from "@services/api/api.ts";
import type { ArtistManagementPort } from "../application/artistManagementPort";
import type { ArtistManagementResponse } from "../domain/artistManagement";

export const artistManagementApi: ArtistManagementPort = {
  async getArtistsManagement(params) {
    const response = await api.get<ArtistManagementResponse>("/artists/management", { params });
    return response.data;
  },
};
