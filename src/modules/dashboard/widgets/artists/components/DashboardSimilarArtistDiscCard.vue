<script setup lang="ts">
import { computed } from "vue";
import defaultDiscImage from "@/assets/disco.png";
import type { RatesArtistLastfmCatalogDiscDto } from "@services/rates/rates";

const props = defineProps<{
  disc: RatesArtistLastfmCatalogDiscDto;
  artistName: string;
}>();

const platformLink = computed(() => {
  if (!props.disc.link) return null;
  try {
    const url = new URL(props.disc.link);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (["spotify.com", "www.spotify.com", "open.spotify.com"].includes(host)) {
      return { href: url.toString(), label: "Escuchar en Spotify", icon: "fa-brands fa-spotify", color: "bg-green-500" };
    }
    if (host === "bandcamp.com" || host.endsWith(".bandcamp.com")) {
      return { href: url.toString(), label: "Escuchar en Bandcamp", icon: "fa-brands fa-bandcamp", color: "bg-[#1da0c3]" };
    }
    return null;
  } catch {
    return null;
  }
});

function formatDate(): string {
  if (props.disc.releaseDate) {
    const date = new Date(props.disc.releaseDate);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    }
  }
  return props.disc.releaseYear === null ? "Fecha desconocida" : String(props.disc.releaseYear);
}

function formatScore(score: number | null): string {
  return score === null ? "—" : score.toFixed(2);
}

function useFallbackImage(event: Event): void {
  const image = event.currentTarget;
  const fallbackUrl = new URL(defaultDiscImage, document.baseURI).href;
  if (image instanceof HTMLImageElement && image.src !== fallbackUrl) image.src = fallbackUrl;
}
</script>

<template>
  <article
    class="group flex h-full w-full max-w-[20rem] min-w-0 flex-col rounded-xl border-2 border-gray-100 bg-white p-2 text-left shadow-md dark:border-white/15 dark:bg-rv-darkCard"
    data-test="similar-artist-disc"
  >
    <span class="flex min-w-0 items-start gap-3">
      <span class="flex shrink-0 flex-col items-center gap-1">
        <img :src="disc.image || defaultDiscImage" :alt="disc.image ? `Portada de ${disc.name}` : ''" class="h-20 w-20 rounded-lg bg-gray-100 object-cover shadow-md dark:bg-white/5" loading="lazy" @error="useFallbackImage" />
        <span class="grid w-20 grid-cols-2 gap-1 text-center">
          <span class="rounded-md border border-gray-200 bg-gray-100 px-1 py-1 dark:border-white/10 dark:bg-rv-darkSurface">
            <span class="block text-xs font-bold tabular-nums text-blue-700 dark:text-blue-300" data-test="similar-artist-disc-average-rate">{{ formatScore(disc.averageRate) }}</span>
            <span class="block text-[9px] text-gray-600 dark:text-gray-300">Disco</span>
          </span>
          <span class="rounded-md border border-gray-200 bg-gray-100 px-1 py-1 dark:border-white/10 dark:bg-rv-darkSurface">
            <span class="block text-xs font-bold tabular-nums text-green-700 dark:text-green-300" data-test="similar-artist-disc-average-cover">{{ formatScore(disc.averageCover) }}</span>
            <span class="block text-[9px] text-gray-600 dark:text-gray-300">Portada</span>
          </span>
        </span>
      </span>
      <span class="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
        <span class="line-clamp-2 break-words text-sm font-semibold italic leading-snug text-rv-navy group-hover:text-rv-purple dark:text-white dark:group-hover:text-rv-pink" data-test="similar-artist-disc-name">{{ disc.name }}</span>
        <span class="flex min-w-0 items-center justify-between gap-2">
          <span class="truncate text-xs font-semibold text-gray-500 dark:text-gray-300" data-test="similar-artist-disc-artist">{{ artistName }}</span>
          <a
            v-if="platformLink"
            :href="platformLink.href"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="platformLink.label + ': ' + disc.name"
            :title="platformLink.label"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink"
            :class="platformLink.color"
            data-test="similar-artist-platform-link"
          ><i :class="platformLink.icon" aria-hidden="true"></i></a>
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-400" data-test="similar-artist-disc-year">{{ formatDate() }}</span>
        <span class="flex flex-wrap items-center gap-1.5">
          <span v-if="disc.ep" class="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white">EP</span>
          <span v-if="disc.debut" class="rounded-full border border-rv-purple px-2 py-0.5 text-[10px] font-semibold text-rv-purple dark:border-purple-300 dark:text-purple-300">Álbum debut</span>
          <span v-if="disc.genre" class="max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-medium text-white" :style="{ backgroundColor: disc.genre.color || 'grey' }">{{ disc.genre.name }}</span>
        </span>
      </span>
    </span>
    <span class="mt-2 flex w-full items-center justify-between gap-2 border-t border-gray-100 px-1 pt-2 text-[10px] text-gray-500 dark:border-white/10 dark:text-gray-400">
      <span class="truncate" data-test="similar-artist-disc-vote-count">{{ disc.voteCount }} {{ disc.voteCount === 1 ? 'voto' : 'votos' }}</span>
      <span class="truncate" data-test="similar-artist-disc-comment-count">{{ disc.commentCount }} {{ disc.commentCount === 1 ? 'comentario' : 'comentarios' }}</span>
      <span v-if="disc.userRate?.rate !== null && disc.userRate?.rate !== undefined" class="shrink-0 font-semibold text-rv-pink" data-test="similar-artist-disc-user-rate">Tu nota: {{ formatScore(disc.userRate.rate) }}</span>
    </span>
  </article>
</template>
