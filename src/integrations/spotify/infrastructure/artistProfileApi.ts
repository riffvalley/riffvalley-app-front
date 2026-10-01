import api from "@/shared/infrastructure/http/client";
import type { ArtistProfilePort } from "../application/artistProfile";

interface ArtistProfileDto {
  genres?: string[] | null;
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("response" in error)) return false;
  const response = error.response;
  return typeof response === "object" && response !== null && "status" in response && response.status === 404;
}

export const artistProfileApi: ArtistProfilePort = {
  async findArtistProfile({ artistName }) {
    try {
      const { data: artist } = await api.get<ArtistProfileDto | null>("/spotify/artists/search", {
        params: { artistName },
      });
      if (!artist) return { status: "not-found" };
      return { status: "found", profile: { genres: artist.genres ?? [] } };
    } catch (error: unknown) {
      if (isNotFoundError(error)) return { status: "not-found" };
      console.error("Error al buscar el perfil del artista en Riff Valley:", error);
      return { status: "failed" };
    }
  },
};
