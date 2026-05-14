<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
       @click.self="$emit('close')">

    <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-2xl
                w-full max-w-2xl relative max-h-[88vh] overflow-y-auto
                border border-gray-100 dark:border-white/10">

      <!-- Botón cerrar siempre visible -->
      <button @click="$emit('close')"
        class="absolute top-4 right-4 z-20 text-white bg-rv-navy hover:bg-rv-pink
               rounded-full w-9 h-9 flex items-center justify-center shadow-md transition-all
               border-0 outline-none focus:outline-none ring-0 focus:ring-0">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>

      <!-- ── Loading ─────────────────────────────────── -->
      <div v-if="loading" class="py-20 text-center">
        <i class="fa-solid fa-spinner animate-spin text-2xl text-rv-pink mb-3 block"></i>
        <span class="text-sm text-gray-400 dark:text-gray-500">Buscando en Spotify...</span>
      </div>

      <!-- ── Error ──────────────────────────────────── -->
      <div v-else-if="error" class="py-16 text-center px-6">
        <i class="fa-brands fa-spotify text-4xl text-gray-300 dark:text-white/20 mb-3 block"></i>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ error }}</p>
      </div>

      <!-- ── Contenido ──────────────────────────────── -->
      <div v-else-if="album">

        <!-- Header con portada + blur de fondo -->
        <div class="relative rounded-t-2xl overflow-hidden">

          <!-- Fondo blur extraído de la portada -->
          <div class="absolute inset-0">
            <img v-if="album.images?.length" :src="album.images[0].url"
                 class="w-full h-full object-cover scale-110 blur-2xl opacity-40 dark:opacity-25" />
            <div class="absolute inset-0 bg-gradient-to-b from-white/30 to-white dark:from-rv-darkCard/30 dark:to-rv-darkCard"></div>
          </div>

          <!-- Fila portada + meta -->
          <div class="relative z-10 flex items-center gap-5 px-6 pt-10 pb-6 pr-14">

            <!-- Portada -->
            <a v-if="album.images?.length"
               :href="album.images[0].url" target="_blank" rel="noopener noreferrer"
               class="shrink-0 block group">
              <img :src="album.images[0].url" alt="Portada"
                   class="w-36 h-36 sm:w-44 sm:h-44 object-cover rounded-xl shadow-2xl
                          transition-transform duration-300 group-hover:scale-105" />
            </a>

            <!-- Meta -->
            <div class="flex-1 min-w-0 pb-1 flex flex-col items-center text-center">
              <span class="bg-rv-navy dark:bg-rv-purple text-white px-3 py-0.5 rounded-full
                           text-[11px] font-bold tracking-wide uppercase inline-block mb-2">
                Álbum
              </span>
              <h2 class="text-xl sm:text-2xl font-bold text-rv-navy dark:text-white leading-tight mb-1">
                {{ album.name }}
              </h2>
              <p class="text-sm font-semibold text-rv-pink mb-3">
                {{ album.artists.map((a: any) => a.name).join(', ') }}
              </p>

              <div class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-300 mb-4">
                <span><i class="fa-solid fa-calendar-days mr-1 text-gray-600 dark:text-white"></i>{{ album.release_date }}</span>
                <span><i class="fa-solid fa-music mr-1 text-gray-600 dark:text-white"></i>{{ album.total_tracks }} canciones</span>
                <span><i class="fa-solid fa-clock mr-1 text-gray-600 dark:text-white"></i>{{ totalDurationFormatted }}</span>
              </div>

              <a v-if="album.external_urls?.spotify"
                 :href="album.external_urls.spotify" target="_blank" rel="noopener noreferrer"
                 class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold
                        bg-[#1DB954] text-white hover:bg-[#1aa34a] hover:text-white
                        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97]
                        shadow-md">
                <i class="fa-brands fa-spotify"></i>
                Escuchar en Spotify
              </a>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="border-t border-gray-100 dark:border-white/10"></div>

        <!-- ── Tracklist ───────────────────────────── -->
        <div class="px-5 py-4">
          <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-2 px-2">
            Canciones
          </p>
          <ul>
            <li v-for="track in tracks" :key="track.id"
                class="flex items-center gap-3 py-2 px-2 rounded-lg
                       hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group/track">

              <!-- Número -->
              <span class="w-6 text-center text-xs text-gray-400 dark:text-gray-400 shrink-0 font-mono tabular-nums">
                {{ track.track_number }}
              </span>

              <!-- Nombre -->
              <span class="flex-1 min-w-0 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                {{ track.name }}
              </span>

              <!-- Preview (aparece en hover) -->
              <audio v-if="track.preview_url" :src="track.preview_url" controls
                     class="h-7 w-28 shrink-0 opacity-0 group-hover/track:opacity-100 transition-opacity duration-200"></audio>

              <!-- Duración -->
              <span class="text-xs text-gray-400 dark:text-gray-300 shrink-0 font-mono tabular-nums w-9 text-right">
                {{ formatDuration(track.duration_ms) }}
              </span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  </div>
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