import axios from "axios";
import { obtenerTokenSpotify } from "@helpers/SpotifyFunctions.ts";
import type { AlbumDetailsPort } from "../application/albumDetails";

// DTOs remain at the provider boundary and never reach presentation.
interface SearchDto {
  albums: { items: { id: string }[] };
}
interface AlbumDto {
  name: string;
  artists: { name: string }[];
  images?: { url: string }[];
  release_date: string;
  total_tracks: number;
  external_urls?: { spotify?: string };
  tracks: { items: {
    id: string;
    name: string;
    track_number: number;
    duration_ms: number;
    preview_url: string | null;
  }[] };
}

/** Temporary token facade: preserve existing browser authentication in 3.2. */
export const albumDetailsApi: AlbumDetailsPort = {
  async findAlbum({ albumName, artistName }) {
    try {
      const token = await obtenerTokenSpotify();
      if (!token) return { status: "token-unavailable" };
      const headers = { Authorization: `Bearer ${token}` };
      const query = encodeURIComponent(`album:${albumName} artist:${artistName}`);
      const search = await axios.get<SearchDto>(
        `https://api.spotify.com/v1/search?q=${query}&type=album&limit=1`, { headers },
      );
      const match = search.data.albums.items[0];
      if (!match) return { status: "not-found" };
      const { data } = await axios.get<AlbumDto>(
        `https://api.spotify.com/v1/albums/${match.id}`, { headers },
      );
      return {
        status: "found",
        album: {
          name: data.name,
          artistNames: data.artists.map((artist) => artist.name),
          coverUrl: data.images?.[0]?.url ?? null,
          releaseDate: data.release_date,
          totalTracks: data.total_tracks,
          listenUrl: data.external_urls?.spotify ?? null,
          tracks: data.tracks.items.map((track) => ({
            id: track.id, name: track.name, number: track.track_number,
            durationMs: track.duration_ms, previewUrl: track.preview_url,
          })),
        },
      };
    } catch (error: unknown) {
      console.error("Error al buscar el álbum en Spotify:", error);
      return { status: "failed" };
    }
  },
};
