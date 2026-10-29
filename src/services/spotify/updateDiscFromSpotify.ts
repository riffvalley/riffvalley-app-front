import { updateDisc } from "@services/discs/discs";
import { resolveSpotifyAlbum } from "@services/spotify/spotifyLookup";

/** Busca y guarda los datos de Spotify de un disco ya existente. */
export async function updateDiscFromSpotify(
  discId: string,
  discName: string,
  artistName: string
): Promise<boolean> {
  const album = await resolveSpotifyAlbum(discName, artistName);
  if (!album) return false;

  await updateDisc(discId, {
    link: album.listenUrl,
    image: album.coverUrl,
    verified: true,
  });
  return true;
}
