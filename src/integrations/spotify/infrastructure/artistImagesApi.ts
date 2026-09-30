import axios from "axios";
import { obtenerTokenSpotify } from "@helpers/SpotifyFunctions.ts";
import type { ArtistImageQuery, ArtistImageSearchSessionPort, ArtistImagesPort } from "../application/artistImages";

interface ArtistImageDto {
  url: string;
  width?: number | null;
}

interface ArtistDto {
  name: string;
  images?: ArtistImageDto[];
}

interface SearchDto {
  artists?: { items?: ArtistDto[] };
}

async function createSearchSession() {
  const token = await obtenerTokenSpotify();
  if (!token) throw new Error("Spotify token unavailable");

  return async ({ name, limit }: ArtistImageQuery) => {
    const response = await axios.get<SearchDto>("https://api.spotify.com/v1/search", {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: name, type: "artist", limit },
    });

    return (response.data.artists?.items ?? []).flatMap((artist) => {
      const images = artist.images ?? [];
      if (!images.length) return [];
      const preferred = images.find((image) => image.width === 640) ?? images[0];
      return preferred?.url ? [{ name: artist.name, image: preferred.url }] : [];
    });
  };
}

export const artistImagesApi: ArtistImagesPort & ArtistImageSearchSessionPort = {
  async createSearchSession() {
    return createSearchSession();
  },
  async searchArtistImages(query) {
    return (await createSearchSession())(query);
  },
};
