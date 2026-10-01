import api from "@/shared/infrastructure/http/client";
import type { AlbumLinksPort } from "../application/albumLinks";

interface AlbumLinkDto {
  listenUrl?: string | null;
  coverUrl?: string | null;
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("response" in error)) return false;
  const response = error.response;
  return typeof response === "object" && response !== null && "status" in response && response.status === 404;
}

export const albumLinksApi: AlbumLinksPort = {
  async openSession() {
    return {
      async findAlbum({ albumName, artistName }) {
        try {
          const { data } = await api.get<AlbumLinkDto>("/discs/spotify/album", {
            params: { albumName, artistName },
          });
          return {
            status: "found",
            link: data.listenUrl ?? "",
            image: data.coverUrl ?? null,
          };
        } catch (error: unknown) {
          if (isNotFoundError(error)) return { status: "not-found" };
          console.error(`Error al buscar el álbum ${albumName}:`, error);
          return { status: "failed" };
        }
      },
    };
  },
};
