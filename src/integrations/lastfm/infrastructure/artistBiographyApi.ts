import axios from "axios";
import type { ArtistBiographyPort } from "../application/artistBiography";

interface ArtistBiographyDto {
  artist?: {
    bio?: { summary?: string };
    tags?: { tag?: { name: string }[] };
  };
}

export const artistBiographyApi: ArtistBiographyPort = {
  async fetchArtistBiography(artistName) {
    try {
      const response = await axios.get<ArtistBiographyDto>("https://ws.audioscrobbler.com/2.0/", {
        params: {
          method: "artist.getinfo",
          artist: artistName,
          api_key: "288147ee12920ea60b59f72f491ebada",
          format: "json",
        },
      });
      return response.data.artist ?? null;
    } catch (error: unknown) {
      console.error("Error al obtener datos de Last.fm:", error);
      return null;
    }
  },
};
