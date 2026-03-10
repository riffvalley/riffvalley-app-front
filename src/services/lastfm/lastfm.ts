import api from "@services/api/api.ts";

export interface LastFmTag {
  name: string;
  url: string;
}

export interface LastFmArtist {
  bio: {
    summary: string;
  };
  tags: {
    tag: LastFmTag[];
  };
}

export async function getArtistInfo(artistName: string): Promise<LastFmArtist> {
  const response = await api.get("/lastfm/artist", {
    params: { artist: artistName },
  });
  return response.data.artist;
}
