// @helpers/SpotifyFunctions.ts

import axios from "axios";

/**
 * Obtiene un token de acceso para la API de Spotify.
 * @returns {Promise<string | undefined>} Retorna el token de acceso o undefined si hay un error.
 */
export const obtenerTokenSpotify = async (): Promise<string | undefined> => {
  const client_id = import.meta.env.VITE_CLIENT_ID;
  const client_secret = import.meta.env.VITE_CLIENT_SECRET;
  const credentials = btoa(`${client_id}:${client_secret}`);

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      "grant_type=client_credentials",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Error al obtener el token de Spotify:", error);
    return undefined;
  }
};

/**
 * Busca el enlace de Spotify para un artista por su nombre.
 * @param {string} artistName - El nombre del artista a buscar.
 * @returns {Promise<string | undefined>} Retorna el enlace de Spotify del artista o undefined si no se encuentra.
 */
export const obtenerEnlaceArtistaSpotify = async (
  artistName: string
): Promise<string | undefined> => {
  try {
    const token = await obtenerTokenSpotify();
    if (!token) {
      console.error("No se pudo obtener el token de Spotify.");
      return undefined;
    }

    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        q: artistName,
        type: "artist",
        limit: 1,
      },
    });

    const artist = response.data.artists.items[0];
    if (artist) {
      return artist.external_urls.spotify;
    } else {
      console.warn("Artista no encontrado en Spotify.");
      return undefined;
    }
  } catch (error) {
    console.error("Error al buscar el artista en Spotify:", error);
    return undefined;
  }
};

/**
 * Busca información de un artista en Spotify y retorna su género (si lo encuentra).
 * @param {string} artistName - El nombre del artista a buscar.
 * @returns {Promise<string[] | undefined>} Retorna el género del artista o undefined si no se encuentra.
 */
export const obtenerGeneroArtistaSpotify = async (
  artistName: string
): Promise<string[] | undefined> => {
  try {
    const token = await obtenerTokenSpotify();
    if (!token) {
      console.error("No se pudo obtener el token de Spotify.");
      return undefined;
    }

    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        q: artistName,
        type: "artist",
        limit: 1,
      },
    });

    const artist = response.data.artists.items[0];
    if (artist && artist.genres && artist.genres.length > 0) {
      return artist.genres;
    } else {
      console.warn("Artista no encontrado en Spotify o sin géneros asociados.");
      return undefined;
    }
  } catch (error) {
    console.error("Error al buscar el artista en Spotify:", error);
    return undefined;
  }
};

/**
 * Busca enlaces de Spotify para una lista de discos.
 * @param {any[]} discs - La lista de discos para los que se buscarán enlaces.
 * @returns {Promise<any[] | undefined>} Retorna la lista de discos actualizada con enlaces de Spotify o undefined si hay un error.
 */
export const buscarEnlacesSpotify = async (discs: any[]): Promise<any[] | undefined> => {
  const token = await obtenerTokenSpotify();
  if (!token) {
      console.error("No se pudo obtener el token de Spotify");
      return undefined;
  }

  const updatedDiscs = [];

  for (const disc of discs) {
      // Comprobación clave: Si ya tiene un enlace, no buscar.
      if (disc.link && disc.link !== "No se encontró el álbum" && disc.link !== "Error al realizar la búsqueda") {
          updatedDiscs.push(disc); // Añadir el disco tal cual, ya que no necesita actualización.
          continue; // Saltar al siguiente disco en el bucle.
      }


      try {
          const query = encodeURIComponent(`album:${disc.name} artist:${disc.artist.name}`);
          const response = await axios.get(
              `https://api.spotify.com/v1/search?q=${query}&type=album&limit=1`,
              {
                  headers: {
                      Authorization: `Bearer ${token}`,
                  },
              }
          );

          if (response.data.albums.items.length > 0) {
              const album = response.data.albums.items[0];
              disc.link = album.external_urls.spotify;
              disc.image = album.images?.[0]?.url || null;
          } else {
              disc.link = "No se encontró el álbum";
          }
      } catch (error) {
          console.error(`Error al buscar el álbum ${disc.name}:`, error);
          disc.link = "Error al realizar la búsqueda";
      }
      updatedDiscs.push(disc); // Añade *siempre* el disco, haya sido actualizado o no.
  }

  return updatedDiscs;
};
