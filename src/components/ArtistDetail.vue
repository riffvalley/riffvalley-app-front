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
      <div v-else-if="artist">

        <!-- Header con foto + blur de fondo -->
        <div class="relative rounded-t-2xl overflow-hidden">

          <!-- Fondo blur extraído de la foto del artista -->
          <div class="absolute inset-0">
            <img v-if="artist.images?.length" :src="artist.images[0].url"
                 class="w-full h-full object-cover scale-110 blur-2xl opacity-40 dark:opacity-25" />
            <div class="absolute inset-0 bg-gradient-to-b from-white/30 to-white dark:from-rv-darkCard/30 dark:to-rv-darkCard"></div>
          </div>

          <!-- Fila foto + meta -->
          <div class="relative z-10 flex items-center gap-5 px-6 pt-10 pb-6 pr-14">

            <!-- Foto circular -->
            <a v-if="artist.images?.length"
               :href="artist.images[0].url" target="_blank" rel="noopener noreferrer"
               class="shrink-0 block group">
              <img :src="artist.images[0].url" alt="Foto del artista"
                   class="w-36 h-36 sm:w-44 sm:h-44 object-cover rounded-full shadow-2xl
                          transition-transform duration-300 group-hover:scale-105" />
            </a>

            <!-- Meta -->
            <div class="flex-1 min-w-0 pb-1 flex flex-col items-center text-center">
              <span class="bg-rv-navy dark:bg-rv-purple text-white px-3 py-0.5 rounded-full
                           text-[11px] font-bold tracking-wide uppercase inline-block mb-2">
                Artista
              </span>
              <h2 class="text-xl sm:text-2xl font-bold text-rv-navy dark:text-white leading-tight mb-1">
                {{ artist.name }}
              </h2>

              <!-- Géneros -->
              <p v-if="artist.genres?.length" class="text-sm font-semibold text-rv-pink mb-3">
                {{ artist.genres.slice(0, 3).join(' · ') }}
              </p>

              <div class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-300 mb-4">
                <span>
                  <i class="fa-solid fa-users mr-1 text-gray-600 dark:text-white"></i>
                  {{ artist.followers.total.toLocaleString() }} seguidores
                </span>
                <span>
                  <i class="fa-solid fa-fire mr-1 text-gray-600 dark:text-white"></i>
                  Popularidad {{ artist.popularity }}/100
                </span>
              </div>

              <a v-if="artist.external_urls?.spotify"
                 :href="artist.external_urls.spotify" target="_blank" rel="noopener noreferrer"
                 class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold
                        bg-[#1DB954] text-white hover:bg-[#1aa34a] hover:text-white
                        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97]
                        shadow-md">
                <i class="fa-brands fa-spotify"></i>
                Ver en Spotify
              </a>
            </div>
          </div>
        </div>

        <!-- ── Biografía Last.fm ───────────────────── -->
        <div v-if="lastFmData?.bio?.summary" class="px-6 pt-5 pb-4">
          <div class="flex items-center gap-2 mb-3">
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
              Biografía
            </p>
            <i class="fa-brands fa-lastfm text-xs text-gray-400 dark:text-gray-400"></i>
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed biography-content"
               v-html="lastFmData.bio.summary"></div>
        </div>

        <!-- ── Tags Last.fm ───────────────────────── -->
        <div v-if="lastFmData?.tags?.tag?.length" class="px-6 pb-4">
          <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-2">
            Etiquetas
          </p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="tag in lastFmData.tags.tag" :key="tag.name"
                  class="px-2.5 py-0.5 bg-rv-pink/10 dark:bg-rv-pink/20 text-rv-pink
                         text-[11px] font-semibold rounded-full border border-rv-pink/20">
              {{ tag.name }}
            </span>
          </div>
        </div>

        <!-- Divider -->
        <div class="border-t border-gray-100 dark:border-white/10 mx-0"></div>

        <!-- ── Top Tracks ─────────────────────────── -->
        <div class="px-5 py-4">
          <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-2 px-2">
            Top canciones
          </p>
          <ul>
            <li v-for="(track, index) in topTracks" :key="track.id"
                class="flex items-center gap-3 py-2 px-2 rounded-lg
                       hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group/track">

              <!-- Número -->
              <span class="w-6 text-center text-xs text-gray-400 dark:text-gray-400 shrink-0 font-mono tabular-nums">
                {{ index + 1 }}
              </span>

              <!-- Miniatura álbum -->
              <img v-if="track.album?.images?.length"
                   :src="track.album.images[track.album.images.length - 1].url"
                   class="w-8 h-8 rounded object-cover shrink-0 shadow-sm" />
              <div v-else class="w-8 h-8 rounded bg-gray-100 dark:bg-white/10 shrink-0"></div>

              <!-- Nombre + álbum -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate leading-tight">
                  {{ track.name }}
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500 truncate leading-tight">
                  {{ track.album?.name }}
                </p>
              </div>

              <!-- Preview (aparece en hover) -->
              <audio v-if="track.preview_url" :src="track.preview_url" controls
                     class="h-7 w-28 shrink-0 opacity-0 group-hover/track:opacity-100 transition-opacity duration-200"></audio>

              <!-- Botón Spotify (aparece en hover) -->
              <a v-if="track.external_urls?.spotify" :href="track.external_urls.spotify"
                 target="_blank" rel="noopener noreferrer"
                 class="shrink-0 opacity-0 group-hover/track:opacity-100 transition-opacity duration-200
                        inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
                        bg-[#1DB954] text-white hover:bg-[#1aa34a] shadow-sm">
                <i class="fa-brands fa-spotify text-xs"></i>
              </a>

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
import { defineComponent, ref, onMounted } from "vue";
import axios from "axios";
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
        const response = await axios.get("https://ws.audioscrobbler.com/2.0/", {
          params: {
            method: "artist.getinfo",
            artist: artistName,
            api_key: "288147ee12920ea60b59f72f491ebada",
            format: "json",
          },
        });
        lastFmData.value = response.data.artist;
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

    const formatDuration = (durationMs: number) => {
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
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
      formatDuration,
    };
  },
});
</script>

<style scoped>
/* Limpia los enlaces que inyecta Last.fm en el v-html de la bio */
.biography-content :deep(a) {
  color: #e46e8a;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.biography-content :deep(a:hover) {
  opacity: 0.8;
}
</style>
