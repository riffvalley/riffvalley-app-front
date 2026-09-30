<script setup lang="ts">
import type { ArtistDetails } from "../application/artistDetails";

defineProps<{ details: ArtistDetails }>();

function formatDuration(durationMs: number): string {
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}
</script>

<template>
  <div>
    <div class="relative rounded-t-2xl overflow-hidden">
      <div class="absolute inset-0">
        <img v-if="details.artist.imageUrl" :src="details.artist.imageUrl"
             class="w-full h-full object-cover scale-110 blur-2xl opacity-40 dark:opacity-25" />
        <div class="absolute inset-0 bg-gradient-to-b from-white/30 to-white dark:from-rv-darkCard/30 dark:to-rv-darkCard"></div>
      </div>

      <div class="relative z-10 flex items-center gap-5 px-6 pt-10 pb-6 pr-14">
        <a v-if="details.artist.imageUrl" :href="details.artist.imageUrl" target="_blank"
           rel="noopener noreferrer" class="shrink-0 block group">
          <img :src="details.artist.imageUrl" alt="Foto del artista"
               class="w-36 h-36 sm:w-44 sm:h-44 object-cover rounded-full shadow-2xl transition-transform duration-300 group-hover:scale-105" />
        </a>

        <div class="flex-1 min-w-0 pb-1 flex flex-col items-center text-center">
          <span class="bg-rv-navy dark:bg-rv-purple text-white px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase inline-block mb-2">
            Artista
          </span>
          <h2 class="text-xl sm:text-2xl font-bold text-rv-navy dark:text-white leading-tight mb-1">
            {{ details.artist.name }}
          </h2>
          <p v-if="details.artist.genres.length" class="text-sm font-semibold text-rv-pink mb-3">
            {{ details.artist.genres.slice(0, 3).join(' · ') }}
          </p>

          <div class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-300 mb-4">
            <span v-if="details.artist.followers !== undefined">
              <i class="fa-solid fa-users mr-1 text-gray-600 dark:text-white"></i>
              {{ details.artist.followers.toLocaleString() }} seguidores
            </span>
            <span v-if="details.artist.popularity !== undefined">
              <i class="fa-solid fa-fire mr-1 text-gray-600 dark:text-white"></i>
              Popularidad {{ details.artist.popularity }}/100
            </span>
          </div>

          <a v-if="details.artist.spotifyUrl" :href="details.artist.spotifyUrl" target="_blank"
             rel="noopener noreferrer"
             class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-[#1DB954] text-white hover:bg-[#1aa34a] hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] shadow-md">
            <i class="fa-brands fa-spotify"></i>
            Ver en Spotify
          </a>
        </div>
      </div>
    </div>

    <slot />

    <div class="border-t border-gray-100 dark:border-white/10 mx-0"></div>
    <div class="px-5 py-4">
      <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-2 px-2">
        Top canciones
      </p>
      <ul>
        <li v-for="(track, index) in details.topTracks" :key="track.id"
            class="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group/track">
          <span class="w-6 text-center text-xs text-gray-400 dark:text-gray-400 shrink-0 font-mono tabular-nums">
            {{ index + 1 }}
          </span>
          <img v-if="track.albumImageUrl" :src="track.albumImageUrl"
               class="w-8 h-8 rounded object-cover shrink-0 shadow-sm" />
          <div v-else class="w-8 h-8 rounded bg-gray-100 dark:bg-white/10 shrink-0"></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate leading-tight">
              {{ track.name }}
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500 truncate leading-tight">
              {{ track.albumName }}
            </p>
          </div>
          <audio v-if="track.previewUrl" :src="track.previewUrl" controls
                 class="h-7 w-28 shrink-0 opacity-0 group-hover/track:opacity-100 transition-opacity duration-200"></audio>
          <a v-if="track.spotifyUrl" :href="track.spotifyUrl" target="_blank"
             rel="noopener noreferrer"
             class="shrink-0 opacity-0 group-hover/track:opacity-100 transition-opacity duration-200 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#1DB954] text-white hover:bg-[#1aa34a] shadow-sm">
            <i class="fa-brands fa-spotify text-xs"></i>
          </a>
          <span class="text-xs text-gray-400 dark:text-gray-300 shrink-0 font-mono tabular-nums w-9 text-right">
            {{ formatDuration(track.durationMs) }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
