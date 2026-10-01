import { albumLinksApi } from "@/integrations/spotify/infrastructure/albumLinksApi";
import type { AlbumLinkQuery, AlbumLinkResult } from "@/integrations/spotify/application/albumLinks";

export async function createImportAlbumResolver() {
  const session = await albumLinksApi.openSession();
  return (query: AlbumLinkQuery): Promise<AlbumLinkResult> =>
    session ? session.findAlbum(query) : Promise.resolve({ status: "failed" });
}
