import api from "@/shared/infrastructure/http/client";
import type { ArtistLinkPort } from "../application/artistLink";

interface ArtistProfileDto {
  listenUrl?: string | null;
}

export const artistLinkApi: ArtistLinkPort = {
  async findArtistLink(artistName) {
    try {
      const { data: artist } = await api.get<ArtistProfileDto | null>("/spotify/artists/search", {
        params: { artistName },
      });
      if (artist?.listenUrl) return artist.listenUrl;

      console.warn("Artista no encontrado en Spotify.");
      return undefined;
    } catch (error: unknown) {
      console.error("Error al buscar el artista en Spotify:", error);
      return undefined;
    }
  },
};
