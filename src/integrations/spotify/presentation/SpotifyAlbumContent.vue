<script setup lang="ts">
import type { AlbumDetails } from "../application/albumDetails";

defineProps<{ album: AlbumDetails }>();
</script>

<template>
      <div>

        <!-- Header con portada + blur de fondo -->
        <div class="relative rounded-t-2xl overflow-hidden">

          <!-- Fondo blur extraído de la portada -->
          <div class="absolute inset-0">
            <img v-if="album.coverUrl" :src="album.coverUrl"
                 class="w-full h-full object-cover scale-110 blur-2xl opacity-40 dark:opacity-25" />
            <div class="absolute inset-0 bg-gradient-to-b from-white/30 to-white dark:from-rv-darkCard/30 dark:to-rv-darkCard"></div>
          </div>

          <!-- Fila portada + meta -->
          <div class="relative z-10 flex items-center gap-5 px-6 pt-10 pb-6 pr-14">

            <!-- Portada -->
            <a v-if="album.coverUrl"
               :href="album.coverUrl" target="_blank" rel="noopener noreferrer"
               class="shrink-0 block group">
              <img :src="album.coverUrl" alt="Portada"
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
                {{ album.artistLabel }}
              </p>

              <div class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-300 mb-4">
                <span><i class="fa-solid fa-calendar-days mr-1 text-gray-600 dark:text-white"></i>{{ album.releaseDate }}</span>
                <span><i class="fa-solid fa-music mr-1 text-gray-600 dark:text-white"></i>{{ album.totalTracks }} canciones</span>
                <span><i class="fa-solid fa-clock mr-1 text-gray-600 dark:text-white"></i>{{ album.totalDurationLabel }}</span>
              </div>

              <a v-if="album.listenUrl"
                 :href="album.listenUrl" target="_blank" rel="noopener noreferrer"
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
            <li v-for="track in album.tracks" :key="track.id"
                class="flex items-center gap-3 py-2 px-2 rounded-lg
                       hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group/track">

              <!-- Número -->
              <span class="w-6 text-center text-xs text-gray-400 dark:text-gray-400 shrink-0 font-mono tabular-nums">
                {{ track.number }}
              </span>

              <!-- Nombre -->
              <span class="flex-1 min-w-0 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                {{ track.name }}
              </span>

              <!-- Preview (aparece en hover) -->
              <audio v-if="track.previewUrl" :src="track.previewUrl" controls
                     class="h-7 w-28 shrink-0 opacity-0 group-hover/track:opacity-100 transition-opacity duration-200"></audio>

              <!-- Duración -->
              <span class="text-xs text-gray-400 dark:text-gray-300 shrink-0 font-mono tabular-nums w-9 text-right">
                {{ track.durationLabel }}
              </span>
            </li>
          </ul>
        </div>

      </div>
</template>
