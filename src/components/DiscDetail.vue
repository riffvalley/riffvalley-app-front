<template>
  <!-- Contenedor principal con diseño optimizado -->
<div 
  class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
  @click.self="$emit('close')"
>
  <!-- MODAL -->
  <div 
    class="spotify-album-details relative w-full max-w-2xl mx-auto my-3 sm:my-3 p-4 sm:p-4 
bg-gradient-to-b from-gray-50 to-gray-100 dark:from-rv-darkCard dark:to-rv-darkSurface
rounded-lg shadow-md max-h-[80vh] overflow-y-auto border border-gray-100 dark:border-white/10"
  >
    <!-- Botón de cierre en la esquina superior derecha -->
<button
  @click="$emit('close')"
  class="absolute top-2 right-2 text-white bg-rv-navy hover:bg-[#e46e8a]
         rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all
         border-0 outline-none focus:outline-none focus-visible:outline-none
         ring-0 focus:ring-0 focus-visible:ring-0"
  aria-label="Cerrar"
  title="Cerrar"
>
  <i class="fas fa-times"></i>
</button>

<div v-if="loading" class="text-center py-4 text-gray-600 dark:text-gray-300">
      Cargando detalles del disco...
    </div>

    <div v-else-if="error" class="text-center text-red-600 py-4">
      {{ error }}
    </div>

    <div v-else-if="album">
      <!-- Información del álbum -->
<div class="album-info flex flex-col sm:flex-row gap-6 p-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-rv-darkSurface dark:to-rv-darkCard rounded-md shadow-md justify-center items-center text-center border border-gray-100 dark:border-white/10">
        <a 
    v-if="album.images?.length"
    :href="album.images[0].url" 
    target="_blank" 
    rel="noopener noreferrer"
    class="block"
  >
    <img
      :src="album.images[0].url"
      alt="Portada del álbum"
      class="album-cover w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-lg shadow-md cursor-zoom-in transition-transform hover:scale-110 mt-1"
    />
  </a>
        <div class="album-meta flex flex-col justify-center ml-4">
<h2 class="text-xl sm:text-2xl font-bold mb-1 text-gray-800 dark:text-white">
            {{ album.name }}
          </h2>
          <p class="text-gray-700 dark:text-gray-300"><strong>Artista(s):</strong> {{album.artists.map(a => a.name).join(", ")}}</p>
          <p class="text-gray-700 dark:text-gray-300"><strong>Fecha:</strong> {{ album.release_date }}</p>
          <p class="text-gray-700 dark:text-gray-300"><strong>Canciones:</strong> {{ album.total_tracks }}</p>
          <p class="text-gray-700 dark:text-gray-300"><strong>Duración:</strong> {{ totalDurationFormatted }}</p>

          <!-- Botón para abrir el álbum en Spotify -->
          <div class="flex flex-col items-center">
            <a v-if="album.external_urls?.spotify" :href="album.external_urls.spotify" target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-2 py-1 text-xsm justify-center shadow-md text-white bg-green-500 hover:bg-green-600 hover:text-white rounded-full mt-2 transition-all">
              <i class="fab fa-spotify text-xs mr-1"></i>
              Escuchar
            </a>
          </div>
        </div>
      </div>

      <!-- Lista de canciones -->
      <div class="track-list mt-3 sm:mt-4 text-center">
        <h3 class="text-lg sm:text-xl font-bold mb-2 text-gray-900 dark:text-white">Lista de canciones</h3>
        <ul class="flex flex-col items-center">
          <li v-for="track in tracks" :key="track.id"
            class="track-item py-1 px-2 flex flex-col sm:flex-row sm:items-center justify-center gap-1 sm:gap-2 w-full max-w-md">
            <div>
              <p class="font-semibold text-gray-900 dark:text-gray-100">
                {{ track.track_number }}. {{ track.name }}
              </p>
              <p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Duración: {{ formatDuration(track.duration_ms) }}</p>
            </div>
            <div v-if="track.preview_url" class="mt-1 sm:mt-0">
              <audio :src="track.preview_url" controls class="w-28 sm:w-36"></audio>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div> <!-- modal -->
</div>   <!-- overlay -->
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from "vue";
import axios from "axios";
import { obtenerTokenSpotify } from "@helpers/SpotifyFunctions.ts";

export default defineComponent({
  name: "SpotifyAlbumDetails",
  props: {
    // Se espera que el objeto "disc" tenga al menos "name" y "artist.name"
    disc: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const album = ref<any>(null);
    const tracks = ref<any[]>([]);
    const loading = ref<boolean>(true);
    const error = ref<string>("");

    // Busca el álbum en Spotify
    const searchAlbum = async () => {
      try {
        const token = await obtenerTokenSpotify();
        if (!token) {
          error.value = "No se pudo obtener el token de Spotify";
          loading.value = false;
          return;
        }

        // Construir la consulta de búsqueda (ejemplo: "album:NombreDelÁlbum artist:NombreDelArtista")
        const query = encodeURIComponent(
          `album:${props.disc.name} artist:${props.disc.artist.name}`
        );
        const searchResponse = await axios.get(
          `https://api.spotify.com/v1/search?q=${query}&type=album&limit=1`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (searchResponse.data.albums.items.length > 0) {
          const foundAlbum = searchResponse.data.albums.items[0];

          // Obtener los detalles completos del álbum (pistas, etc.)
          const albumResponse = await axios.get(
            `https://api.spotify.com/v1/albums/${foundAlbum.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          album.value = albumResponse.data;
          tracks.value = albumResponse.data.tracks.items;
        } else {
          error.value = "Álbum no encontrado en Spotify";
        }
      } catch (err: any) {
        console.error("Error al buscar el álbum en Spotify:", err);
        error.value = "Error al buscar el álbum en Spotify";
      } finally {
        loading.value = false;
      }
    };

    // Formatea la duración de una pista (en ms) a mm:ss
    const formatDuration = (durationMs: number) => {
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    };

    // Calcula la duración total de todas las pistas del álbum
    const totalDurationMs = computed(() =>
      tracks.value.reduce((acc, track) => acc + track.duration_ms, 0)
    );

    // Formatea la duración total a "HHh MMm SSs" o "MMm SSs" si < 1 hora
    const totalDurationFormatted = computed(() => {
      const hours = Math.floor(totalDurationMs.value / 3600000);
      const minutes = Math.floor((totalDurationMs.value % 3600000) / 60000);
      const seconds = Math.floor(
        ((totalDurationMs.value % 3600000) % 60000) / 1000
      );

      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else {
        return `${minutes}m ${seconds}s`;
      }
    });

    onMounted(() => {
      searchAlbum();
    });

    return {
      album,
      tracks,
      loading,
      error,
      formatDuration,
      totalDurationFormatted,
    };
  },
});
</script>

<style scoped>
.track-item+.track-item {
  margin-top: 0.5rem;
}
</style>