import { loadAlbumDetails, type AlbumQuery } from "@/integrations/spotify";
import { albumDetailsApi } from "@/integrations/spotify/infrastructure/albumDetailsApi";

export function fetchDiscAlbumDetails(query: AlbumQuery) {
  return loadAlbumDetails(albumDetailsApi, query);
}
