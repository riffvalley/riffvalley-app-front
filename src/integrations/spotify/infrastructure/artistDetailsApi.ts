import api from "@/shared/infrastructure/http/client";
import type { ArtistDetailsPort } from "../application/artistDetails";

interface ArtistProfileDto {
  spotifyId: string;
  name: string;
  imageUrl?: string | null;
  genres?: string[] | null;
  followers?: number | null;
  popularity?: number | null;
  listenUrl?: string | null;
}

interface TopTrackDto {
  id: string;
  name: string;
  albumName?: string | null;
  albumImageUrl?: string | null;
  previewUrl?: string | null;
  listenUrl?: string | null;
  durationMs?: number | null;
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("response" in error)) return false;
  const response = error.response;
  return typeof response === "object" && response !== null && "status" in response && response.status === 404;
}

export const artistDetailsApi: ArtistDetailsPort = {
  async findArtistDetails({ artistName }) {
    try {
      const { data: artist } = await api.get<ArtistProfileDto | null>("/spotify/artists/search", {
        params: { artistName },
      });
      if (!artist) return { status: "not-found" };

      const { data: tracks } = await api.get<TopTrackDto[]>(
        `/spotify/artists/${encodeURIComponent(artist.spotifyId)}/top-tracks`,
      );

      return {
        status: "found",
        details: {
          artist: {
            name: artist.name,
            imageUrl: artist.imageUrl ?? undefined,
            genres: artist.genres ?? [],
            followers: artist.followers ?? undefined,
            popularity: artist.popularity ?? undefined,
            spotifyUrl: artist.listenUrl ?? undefined,
          },
          topTracks: (Array.isArray(tracks) ? tracks : []).map((track) => ({
            id: track.id,
            name: track.name,
            albumName: track.albumName ?? undefined,
            albumImageUrl: track.albumImageUrl ?? undefined,
            previewUrl: track.previewUrl ?? undefined,
            spotifyUrl: track.listenUrl ?? undefined,
            durationMs: track.durationMs ?? 0,
          })),
        },
      };
    } catch (error: unknown) {
      if (isNotFoundError(error)) return { status: "not-found" };
      console.error("Error al buscar el artista en Riff Valley:", error);
      return { status: "failed" };
    }
  },
};
