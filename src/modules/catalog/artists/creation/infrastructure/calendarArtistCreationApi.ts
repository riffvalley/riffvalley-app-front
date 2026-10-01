import api from "@/shared/infrastructure/http/client";
import type { CalendarArtistCreationPort } from "../../application/artistManagementPort";

export const calendarArtistCreationApi: CalendarArtistCreationPort = {
  async createArtist(name) {
    const response = await api.post<{ id: string; name: string }>("/artists", { name });
    return response.data;
  },
  async associateArtistToDisc(discId, artistId) {
    await api.patch(`/discs/${discId}`, { artistId });
  },
};
