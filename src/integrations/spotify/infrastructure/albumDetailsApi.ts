import api from "@/shared/infrastructure/http/client";
import type { AlbumDetailsPort } from "../application/albumDetails";

interface ResolvedAlbumDto {
  spotifyId: string;
}

interface AlbumDetailsDto {
  name: string;
  artistNames: string[];
  coverUrl?: string | null;
  releaseDate?: string | null;
  totalTracks: number;
  listenUrl?: string | null;
  tracks: {
    id: string;
    name: string;
    number: number;
    durationMs: number;
    previewUrl?: string | null;
  }[];
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("response" in error)) return false;
  const response = error.response;
  return typeof response === "object" && response !== null && "status" in response && response.status === 404;
}

export const albumDetailsApi: AlbumDetailsPort = {
  async findAlbum({ albumName, artistName }) {
    try {
      const { data: resolvedAlbum } = await api.get<ResolvedAlbumDto>("/discs/spotify/album", {
        params: { albumName, artistName },
      });
      const { data } = await api.get<AlbumDetailsDto>(
        `/discs/spotify/album/${encodeURIComponent(resolvedAlbum.spotifyId)}`,
      );

      return {
        status: "found",
        album: {
          name: data.name,
          artistNames: data.artistNames,
          coverUrl: data.coverUrl ?? null,
          releaseDate: data.releaseDate ?? "",
          totalTracks: data.totalTracks,
          listenUrl: data.listenUrl ?? null,
          tracks: data.tracks.map((track) => ({
            id: track.id,
            name: track.name,
            number: track.number,
            durationMs: track.durationMs,
            previewUrl: track.previewUrl ?? null,
          })),
        },
      };
    } catch (error: unknown) {
      if (isNotFoundError(error)) return { status: "not-found" };
      console.error("Error al buscar el álbum de Spotify:", error);
      return { status: "failed" };
    }
  },
};
