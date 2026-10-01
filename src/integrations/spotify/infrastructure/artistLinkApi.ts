import axios from "axios";
import { obtenerTokenSpotify } from "@helpers/SpotifyFunctions.ts";
import type { ArtistLinkPort } from "../application/artistLink";

interface ArtistSearchDto {
  artists?: {
    items?: { external_urls?: { spotify?: string } }[];
  };
}

export const artistLinkApi: ArtistLinkPort = {
  async findArtistLink(artistName) {
    try {
      const token = await obtenerTokenSpotify();
      if (!token) {
        console.error("No se pudo obtener el token de Spotify.");
        return undefined;
      }

      const response = await axios.get<ArtistSearchDto>("https://api.spotify.com/v1/search", {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: artistName, type: "artist", limit: 1 },
      });
      const artist = response.data.artists?.items?.[0];
      if (artist) return artist.external_urls?.spotify;

      console.warn("Artista no encontrado en Spotify.");
      return undefined;
    } catch (error: unknown) {
      console.error("Error al buscar el artista en Spotify:", error);
      return undefined;
    }
  },
};
