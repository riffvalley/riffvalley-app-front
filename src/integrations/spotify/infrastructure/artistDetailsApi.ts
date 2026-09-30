import axios from "axios";
import { obtenerTokenSpotify } from "@helpers/SpotifyFunctions.ts";
import type { ArtistDetailsPort } from "../application/artistDetails";

interface SearchDto {
  albums?: { items?: { artists?: { id: string }[] }[] };
}

interface ArtistDto {
  name: string;
  images?: { url: string }[];
  genres?: string[];
  followers?: { total?: number };
  popularity?: number;
  external_urls?: { spotify?: string };
}

interface TopTracksDto {
  tracks?: {
    id: string;
    name: string;
    album?: { name?: string; images?: { url: string }[] };
    preview_url?: string | null;
    external_urls?: { spotify?: string };
    duration_ms: number;
  }[];
}

export const artistDetailsApi: ArtistDetailsPort = {
  async findArtistDetails({ discName, artistName }) {
    try {
      const token = await obtenerTokenSpotify();
      if (!token) return { status: "token-unavailable" };
      const headers = { Authorization: `Bearer ${token}` };
      const query = encodeURIComponent(`album:${discName} artist:${artistName}`);
      const search = await axios.get<SearchDto>(
        `https://api.spotify.com/v1/search?q=${query}&type=album&limit=5`, { headers },
      );
      const firstAlbum = search.data.albums?.items?.[0];
      if (!firstAlbum) return { status: "not-found" };
      const firstArtist = firstAlbum.artists?.[0];
      if (!firstArtist) return { status: "artist-not-found" };

      const artistResponse = await axios.get<ArtistDto>(
        `https://api.spotify.com/v1/artists/${firstArtist.id}`, { headers },
      );
      const tracksResponse = await axios.get<TopTracksDto>(
        `https://api.spotify.com/v1/artists/${firstArtist.id}/top-tracks?market=US`, { headers },
      );
      const artist = artistResponse.data;
      return {
        status: "found",
        details: {
          artist: {
            name: artist.name,
            imageUrl: artist.images?.[0]?.url,
            genres: artist.genres ?? [],
            followers: artist.followers?.total,
            popularity: artist.popularity,
            spotifyUrl: artist.external_urls?.spotify,
          },
          topTracks: (tracksResponse.data.tracks ?? []).map((track) => {
            const albumImages = track.album?.images ?? [];
            return {
              id: track.id,
              name: track.name,
              albumName: track.album?.name,
              albumImageUrl: albumImages.length ? albumImages[albumImages.length - 1]?.url : undefined,
              previewUrl: track.preview_url ?? undefined,
              spotifyUrl: track.external_urls?.spotify,
              durationMs: track.duration_ms,
            };
          }),
        },
      };
    } catch (error: unknown) {
      console.error("Error al buscar el artista en Spotify:", error);
      return { status: "failed" };
    }
  },
};
