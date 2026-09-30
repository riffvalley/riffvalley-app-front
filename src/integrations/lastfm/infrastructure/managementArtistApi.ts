import api from "@/shared/infrastructure/http/client";
import type {
  LastFmManagementArtist,
  LastFmManagementArtistPort,
} from "../application/managementArtist";

interface LastFmManagementArtistDto {
  artist?: LastFmManagementArtist;
  url?: string;
  ontour?: string;
  stats?: { listeners?: string; playcount?: string };
  tags?: { tag?: { name: string; url?: string }[] };
  bio?: { content?: string; published?: string };
  similar?: { artist?: { name: string }[] };
}

export const managementArtistApi: LastFmManagementArtistPort = {
  async fetchManagementArtist(name) {
    const response = await api.get<LastFmManagementArtistDto>("/lastfm/artist", {
      params: { artist: name },
    });
    return response.data.artist ?? response.data;
  },
};
