<template>
  <!-- Contenedor principal con scroll si el contenido excede el 80% del alto de la pantalla -->
<div 
  class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
  @click.self="$emit('close')"
>
  <!-- MODAL -->
  <div 
    class="spotify-artist-details relative w-full max-w-2xl mx-auto my-3 sm:my-3 p-4 sm:p-4 
    bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg shadow-md max-h-[80vh] overflow-y-auto"
  >
<button
  @click="$emit('close')"
  aria-label="Cerrar"
  title="Cerrar"
  class="absolute top-2 right-2 text-white bg-rv-navy hover:bg-[#e46e8a]
         rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all
         border-0 outline-none focus:outline-none focus-visible:outline-none
         ring-0 focus:ring-0 focus-visible:ring-0"
>
  <i class="fas fa-times"></i>
</button>
    <!-- Estado de carga -->
    <div v-if="loading" class="text-center py-4">
      Cargando detalles del artista...
    </div>

    <!-- Errores -->
    <div v-else-if="error" class="text-center py-4">
      <h2 class="text-2xl font-bold mb-2 text-rv-navy">
        {{ artistNameProp }}
      </h2>
      <p class="text-red-600">{{ error }}</p>
    </div>

    <!-- Información del artista -->
    <div>
      <!-- Datos obtenidos de Spotify -->
      <div
        v-if="artist"
        class="artist-info flex flex-col sm:flex-row gap-6 p-4 bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg shadow-md justify-center items-center text-center">
        <!-- Imagen del artista -->
        <img
          v-if="artist.images && artist.images.length"
          :src="artist.images[0].url"
          alt="Foto del artista"
          class="artist-photo w-40 h-40 object-cover rounded-full shadow-lg cursor-zoom-in transition-transform hover:scale-110"
        />

        <!-- Metadatos del artista -->
        <div class="artist-meta">
          <h2 class="text-2xl font-bold mb-2 text-rv-navy">
            {{ artist.name }}
          </h2>
          <p class="mb-1 text-rv-navy">
            <strong>Seguidores:</strong>
            {{ artist.followers.total.toLocaleString() }}
          </p>
          <p class="mb-1 text-rv-navy">
            <strong>Popularidad:</strong> {{ artist.popularity }}
          </p>
          <p class="mb-1 text-rv-navy">
            <strong>Géneros:</strong>
            {{
              artist.genres && artist.genres.length
                ? artist.genres.join(", ")
                : "Sin géneros"
            }}
          </p>
          <!-- Botón para ver el perfil en Spotify -->
          <div class="mt-3" v-if="artist">
            <a
              v-if="artist.external_urls && artist.external_urls.spotify"
              :href="artist.external_urls.spotify"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-3 py-1 text-xsm justify-center shadow-md text-white bg-green-500 hover:bg-green-600 hover:text-white rounded-full mt-2 mb-1 transition-all">
              <i class="fab fa-spotify mr-2"></i>
              Ver en Spotify
            </a>
          </div>
        </div>
      </div>

      <div v-if="lastFmData" class="lastfm-info mt-6">
        <h3 class="text-xl font-semibold mb-3 text-rv-navy">Biografía</h3>
        <!-- La biografía de Last.fm suele venir en HTML, por eso usamos v-html -->
        <div
          class="text-sm text-rv-n avy"
          v-html="lastFmData.bio.summary"
        ></div>

        <div v-if="lastFmData.tags && lastFmData.tags.tag" class="mt-4">
<h4 class="text-md font-semibold mb-2 text-rv-navy flex items-center justify-center gap-2">
<i class="fab fa-lastfm text-rv-navy relative top-[1px]"></i>
  Etiquetas de Last.fm
</h4>
<div class="flex flex-wrap justify-center gap-2">
  <span
    v-for="tag in lastFmData.tags.tag"
    :key="tag.name"
    class="px-2 py-1 bg-[#e46e8a] rounded-full text-white text-xs font-semibold"
  >
    {{ tag.name }}
  </span>
</div>

        </div>
                </div>
      </div>

      <!-- Galería de Top Tracks -->
      <div class="top-tracks mt-6" v-if="artist">
        <h3 class="text-xl font-semibold mb-3 text-rv-navy">Top canciones</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div
            v-for="track in topTracks"
            :key="track.id"
            class="track-card bg-gray-100 rounded-lg overflow-hidden shadow hover:shadow-md transition-shadow duration-300"
          >
            <img
              v-if="
                track.album && track.album.images && track.album.images.length
              "
              :src="track.album.images[0].url"
              alt="Cover del álbum"
              class="w-full h-32 object-cover"
            />
            <div class="p-2">
              <h4
                class="text-sm font-bold text-gray-800 truncate"
                :title="track.name"
              >
                {{ track.name }}
              </h4>
              <p
                class="text-xs text-gray-600 truncate"
                :title="track.album.name"
              >
                {{ track.album.name }}
              </p>
              <a
                v-if="track.external_urls && track.external_urls.spotify"
                :href="track.external_urls.spotify"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-1 inline-block text-xs px-2 py-1 text-white shadow-md text-white bg-green-500 hover:bg-green-600 hover:text-white rounded-full mt-2 mb-1 transition-all"
              >
                <i class="fab fa-spotify mr-1"></i>Escuchar
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Información adicional de Last.fm -->
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import axios from "axios";
import { getArtistInfo } from "@services/lastfm/lastfm.ts";
import { obtenerTokenSpotify } from "@helpers/SpotifyFunctions.ts";

export default defineComponent({
  name: "ArtistByDisc",
  props: {
    discName: {
      type: String,
      required: true,
    },
    artistName: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const artist = ref<any>(null);
    const topTracks = ref<any[]>([]);
    const lastFmData = ref<any>(null);
    const loading = ref<boolean>(true);
    const error = ref<string>("");
    const artistNameProp = ref<string>(props.artistName);

    // Función para obtener datos adicionales desde Last.fm
    const fetchLastFmData = async (artistName: string) => {
      try {
        lastFmData.value = await getArtistInfo(artistName);
      } catch (err: any) {
        console.error("Error al obtener datos de Last.fm:", err);
      }
    };

    const fetchArtistDataFromSpotify = async (
      artistId: string,
      token: string
    ) => {
      // Obtener la información completa del artista
      const artistResponse = await axios.get(
        `https://api.spotify.com/v1/artists/${artistId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      artist.value = artistResponse.data;

      // Obtener los Top Tracks
      const topTracksResponse = await axios.get(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      topTracks.value = topTracksResponse.data.tracks;

      // Llamada a Last.fm con el nombre real del artista
    };

    const searchByAlbumAndArtist = async () => {
      try {
        const token = await obtenerTokenSpotify();
        if (!token) {
          error.value = "No se pudo obtener el token de Spotify";
          loading.value = false;
          return;
        }

        // Construir la consulta: "album:DISCO artist:ARTISTA"
        const query = encodeURIComponent(
          `album:${props.discName} artist:${props.artistName}`
        );
        // Buscar álbumes
        const searchResponse = await axios.get(
          `https://api.spotify.com/v1/search?q=${query}&type=album&limit=5`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const albums = searchResponse.data.albums.items;
        if (!albums || albums.length === 0) {
          error.value = "No se encontró ningún álbum en Spotify con esos datos";
          return;
        }

        // Toma el primer álbum que coincida, o filtra según necesites
        const chosenAlbum = albums[0];

        // Normalmente, un álbum tiene un array de 'artists'; tomamos el primero
        // o filtras si hubiera varios
        const primaryArtist = chosenAlbum.artists[0];
        if (!primaryArtist) {
          error.value = "No se encontró un artista válido en el álbum";
          return;
        }

        // Ahora que tenemos el artistId, obtenemos su info y top tracks
        await fetchArtistDataFromSpotify(primaryArtist.id, token);
      } catch (err: any) {
        console.error("Error al buscar el artista en Spotify:", err);
        error.value = "Error al buscar el artista en Spotify";
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      searchByAlbumAndArtist();
      fetchLastFmData(props.artistName);
    });

    return {
      artist,
      topTracks,
      lastFmData,
      loading,
      error,
      artistNameProp,
    };
  },
});
</script>

<style scoped>
.track-card img {
  transition: transform 0.3s;
}
.track-card img:hover {
  transform: scale(1.05);
}
</style>
