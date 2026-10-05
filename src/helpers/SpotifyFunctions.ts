import {
  findSpotifyArtist,
  getSpotifyAlbumMostPopularTrack,
  resolveSpotifyAlbum,
} from "@services/spotify/spotifyLookup";

export const obtenerEnlaceArtistaSpotify = async (
  artistName: string,
): Promise<string | undefined> => {
  try {
    return (await findSpotifyArtist(artistName))?.listenUrl ?? undefined;
  } catch (error) {
    console.error("Error al buscar el artista en Spotify:", error);
    return undefined;
  }
};

export const obtenerGeneroArtistaSpotify = async (
  artistName: string,
): Promise<string[] | undefined> => {
  try {
    const genres = (await findSpotifyArtist(artistName))?.genres;
    return genres?.length ? genres : undefined;
  } catch (error) {
    console.error("Error al buscar el artista en Spotify:", error);
    return undefined;
  }
};

export const obtenerTrackMasPopularAlbum = async (
  albumId: string,
): Promise<string | undefined> => {
  try {
    return (await getSpotifyAlbumMostPopularTrack(albumId)) ?? undefined;
  } catch (error) {
    console.error("Error al obtener el track más popular:", error);
    return undefined;
  }
};

export const buscarEnlacesSpotify = async (
  discs: any[],
): Promise<any[] | undefined> => {
  const updatedDiscs = [];

  for (const disc of discs) {
    if (
      disc.link &&
      disc.link !== "No se encontró el álbum" &&
      disc.link !== "Error al realizar la búsqueda"
    ) {
      updatedDiscs.push(disc);
      continue;
    }

    try {
      const album = await resolveSpotifyAlbum(disc.name, disc.artist.name);
      disc.link = album?.listenUrl ?? "No se encontró el álbum";
      disc.image = album?.coverUrl ?? null;
    } catch (error) {
      console.error(`Error al buscar el álbum ${disc.name}:`, error);
      disc.link = "Error al realizar la búsqueda";
    }
    updatedDiscs.push(disc);
  }

  return updatedDiscs;
};
