import axios from "axios";
import { obtenerTokenSpotify } from "@helpers/SpotifyFunctions.ts";
import type { AlbumLinksPort } from "../application/albumLinks";
interface AlbumLinksSearchDto { albums: { items: { external_urls: { spotify: string }; images?: { url: string }[] }[] } }

export const albumLinksApi: AlbumLinksPort = {
  async openSession() {
    const token = await obtenerTokenSpotify();
    if (!token) return null;
    return {
      async findAlbum({ albumName, artistName }) {
        try {
          const query = encodeURIComponent(`album:${albumName} artist:${artistName}`);
          const { data } = await axios.get<AlbumLinksSearchDto>(`https://api.spotify.com/v1/search?q=${query}&type=album&limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const album = data.albums.items[0];
          return album ? { status: "found", link: album.external_urls.spotify, image: album.images?.[0]?.url || null } : { status: "not-found" };
        } catch (error: unknown) {
          console.error(`Error al buscar el álbum ${albumName}:`, error);
          return { status: "failed" };
        }
      },
    };
  },
};
