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

export interface FillImagesResponse {
  updated: number;
  notFound: string[];
}

export async function getArtistInfo(artistName: string): Promise<LastFmArtist> {
  const response = await api.get("/lastfm/artist", {
    params: { artist: artistName },
  });
  return response.data.artist ?? response.data;
}

export async function fillImages(month: number, year: number, week: number): Promise<FillImagesResponse> {
  const response = await api.post("/lastfm/fill-images", null, {
    params: { month, year, week },
  });
  return response.data;
}
