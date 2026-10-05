import axios from "axios";
import api from "@services/api/api.ts";

export interface SpotifyArtistProfile {
  spotifyId: string;
  name: string;
  listenUrl: string | null;
  imageUrl: string | null;
  genres: string[];
  followers: number | null;
  popularity: number | null;
}

export interface SpotifyArtistCandidate {
  spotifyId: string;
  name: string;
  listenUrl: string | null;
  imageUrl: string | null;
  genres: string[];
}

export interface SpotifyArtistAlbum {
  id: string;
  name: string;
  albumType: string;
  releaseDate: string | null;
  listenUrl: string | null;
  coverUrl: string | null;
}

export interface SpotifyArtistAlbums {
  spotifyId: string;
  items: SpotifyArtistAlbum[];
}

export interface SpotifyArtistTopTrack {
  id: string;
  name: string;
  listenUrl: string | null;
  previewUrl: string | null;
  albumName: string | null;
  albumImageUrl: string | null;
  durationMs: number | null;
}

export interface SpotifyAlbumSummary {
  spotifyId: string;
  name: string;
  listenUrl: string | null;
  coverUrl: string | null;
}

export interface SpotifyAlbumTrack {
  id: string;
  name: string;
  number: number;
  durationMs: number;
  previewUrl: string | null;
}

export interface SpotifyAlbumDetails extends SpotifyAlbumSummary {
  artistNames: string[];
  releaseDate: string | null;
  totalTracks: number;
  tracks: SpotifyAlbumTrack[];
}

export async function findSpotifyArtist(
  artistName: string,
): Promise<SpotifyArtistProfile | null> {
  try {
    const response = await api.get<SpotifyArtistProfile | null>("/spotify/artists/search", {
      params: { artistName },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function findSpotifyArtistCandidates(
  artistName: string,
): Promise<SpotifyArtistCandidate[]> {
  try {
    const response = await api.get<SpotifyArtistCandidate[]>("/spotify/artists/search/multiple", {
      params: { artistName },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return [];
    throw error;
  }
}

export async function getSpotifyArtistTopTracks(
  spotifyId: string,
): Promise<SpotifyArtistTopTrack[]> {
  const response = await api.get<SpotifyArtistTopTrack[]>(
    `/spotify/artists/${encodeURIComponent(spotifyId)}/top-tracks`,
  );
  return response.data;
}

export async function getSpotifyArtistAlbums(
  spotifyId: string,
  includeGroups: string[] = ["album", "single"],
  limit = 1,
): Promise<SpotifyArtistAlbums> {
  const response = await api.get<SpotifyArtistAlbums>(
    `/spotify/artists/${encodeURIComponent(spotifyId)}/albums`,
    { params: { include_groups: includeGroups.join(","), limit } },
  );
  return response.data;
}

export async function resolveSpotifyAlbum(
  albumName: string,
  artistName: string,
): Promise<SpotifyAlbumSummary | null> {
  try {
    const response = await api.get<SpotifyAlbumSummary>("/discs/spotify/album", {
      params: { albumName, artistName },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function getSpotifyAlbumDetails(
  spotifyAlbumId: string,
): Promise<SpotifyAlbumDetails> {
  const response = await api.get<SpotifyAlbumDetails>(
    `/discs/spotify/album/${encodeURIComponent(spotifyAlbumId)}`,
  );
  return response.data;
}

export async function getSpotifyAlbumMostPopularTrack(
  spotifyAlbumId: string,
): Promise<string | null> {
  const response = await api.get<{ trackId: string | null }>(
    `/spotify/albums/${encodeURIComponent(spotifyAlbumId)}/most-popular-track`,
  );
  return response.data.trackId;
}
