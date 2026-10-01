import api from "@/shared/infrastructure/http/client";
import type { MostPopularTrackPort } from "../application/mostPopularTrack";

interface MostPopularTrackDto {
  trackId?: string | null;
}

export const mostPopularTrackApi: MostPopularTrackPort = {
  async findMostPopularTrackId({ spotifyAlbumId }) {
    try {
      const { data } = await api.get<MostPopularTrackDto>(
        `/spotify/albums/${encodeURIComponent(spotifyAlbumId)}/most-popular-track`,
      );
      return data.trackId ?? null;
    } catch (error: unknown) {
      console.error("Error al buscar el track más popular del álbum en Riff Valley:", error);
      return null;
    }
  },
};
