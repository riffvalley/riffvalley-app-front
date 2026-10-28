<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, toRef, useTemplateRef, watch } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import defaultDiscImage from "@/assets/disco.png";
import {
  type RatesArtistLastfmLinkDto,
  type RatesArtistLastfmSimilarArtistDto,
  type RatesArtistSummaryDiscDto,
  type RatesTopArtistDto,
} from "@services/rates/rates";
import DiscDetail from "@components/DiscDetail.vue";
import DashboardSimilarArtistDiscCard from "./DashboardSimilarArtistDiscCard.vue";
import { useFavoriteArtistDetails } from "../composables/useFavoriteArtistDetails";

const props = defineProps<{ artist: RatesTopArtistDto }>();
const emit = defineEmits<{
  close: [];
}>();

const authStore = useAuthStore();
const dialog = useTemplateRef<HTMLElement>("dialog");
const closeButton = useTemplateRef<HTMLButtonElement>("closeButton");
const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
const priorOverflow = document.body.style.overflow;
const isMounted = shallowRef(false);
const selectedDisc = shallowRef<{
  id: string;
  name: string;
  image: string | null;
  artist: { name: string };
} | null>(null);
const expandedSimilarArtist = shallowRef<string | null>(null);
const {
  detail,
  lastfmDetail,
  summaryLoading: initialLoading,
  summaryError: initialError,
  summaryNotFound: initialNotFound,
  lastfmLoading,
  lastfmError,
  moreLoading,
  moreError,
  hasMoreDiscs,
  unavailableDiscCount,
  retrySummary: retryInitial,
  retryLastfm: retryLastfmDetails,
  loadMoreDiscs,
  retryMoreDiscs,
} = useFavoriteArtistDetails(toRef(() => props.artist.id), isMounted);

const hasSession = computed(() => authStore.authStatus === "authenticated" && Boolean(authStore.userId));
const sessionPending = computed(() => authStore.authStatus === "initializing");
const displayedArtist = computed(() => {
  const currentArtist = detail.value?.artist;
  return currentArtist
    ? { ...currentArtist, image: currentArtist.image ?? props.artist.image }
    : props.artist;
});
const lastfmTags = computed(() => uniqueLastfmLinks(lastfmDetail.value?.tags ?? []));
const lastfmSimilarArtists = computed(() => uniqueLastfmLinks(lastfmDetail.value?.similarArtists ?? []));
const lastfmPageUrl = computed(() => safeLastfmUrl(lastfmDetail.value?.lastfmUrl ?? null)
  ?? safeLastfmUrl(lastfmDetail.value?.biography?.url ?? null));
const hasLastfmContent = computed(() => {
  const response = lastfmDetail.value;
  return Boolean(response && (
    response.biography?.summary
    || lastfmTags.value.length
    || lastfmSimilarArtists.value.length
    || response.listeners !== null
    || response.playCount !== null
    || lastfmPageUrl.value
  ));
});

function retryLastfm(): void {
  expandedSimilarArtist.value = null;
  retryLastfmDetails();
}

function formatScore(value: number | null): string {
  return value === null ? "—" : new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value);
}

function formatReleaseYear(value: string | null): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.slice(0, 4) : "Año desconocido";
}

function formatLastfmCount(value: number): string {
  return new Intl.NumberFormat("es-ES").format(value);
}

function safeLastfmUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || !["last.fm", "www.last.fm"].includes(url.hostname.toLowerCase())
      || url.username
      || url.password
      || url.port
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function uniqueLastfmLinks<T extends RatesArtistLastfmLinkDto>(links: T[]): T[] {
  const seen = new Set<string>();
  return links.filter(({ name }) => {
    const key = name.normalize("NFKC").trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}

function validCatalogId(id: string | null): id is string {
  return Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
}

function navigableSimilarDiscs(similar: RatesArtistLastfmSimilarArtistDto) {
  return validCatalogId(similar.catalogArtistId)
    ? similar.catalogDiscs.filter((disc) => validCatalogId(disc.id))
    : [];
}

function similarArtistNavigationMode(similar: RatesArtistLastfmSimilarArtistDto): "expandable" | null {
  const discs = navigableSimilarDiscs(similar);
  if (similar.catalogDiscCount === 1 && discs.length === 1) return "expandable";
  if (similar.catalogDiscCount > 1 && discs.length > 1) return "expandable";
  return null;
}

function toggleSimilarArtist(name: string): void {
  expandedSimilarArtist.value = expandedSimilarArtist.value === name ? null : name;
}

function openDisc(disc: RatesArtistSummaryDiscDto): void {
  selectedDisc.value = {
    id: disc.id,
    name: disc.name,
    image: disc.image,
    artist: { name: displayedArtist.value.name },
  };
}

function useFallbackImage(event: Event): void {
  const image = event.currentTarget;
  const fallbackUrl = new URL(defaultDiscImage, document.baseURI).href;
  if (image instanceof HTMLImageElement && image.src !== fallbackUrl) image.src = fallbackUrl;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
    return;
  }
  if (event.key !== "Tab" || !dialog.value) return;
  const focusable = [...dialog.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.tabIndex >= 0 && !element.hasAttribute("hidden"));
  if (!focusable.length) {
    event.preventDefault();
    dialog.value.focus();
    return;
  }
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (!dialog.value.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

watch(
  () => [props.artist.id, authStore.authStatus, authStore.userId, authStore.authSessionGeneration] as const,
  () => {
    selectedDisc.value = null;
    expandedSimilarArtist.value = null;
  },
);

onMounted(async () => {
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", onKeydown);
  isMounted.value = true;
  await nextTick();
  closeButton.value?.focus();
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = priorOverflow;
  if (opener?.isConnected) void nextTick(() => opener.focus());
});
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-2 sm:p-4">
      <section
        ref="dialog"
        class="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-rv-darkSurface sm:max-h-[92dvh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorite-artist-modal-title"
        tabindex="-1"
        data-test="favorite-artist-dialog"
      >
        <header class="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-4 py-3 dark:border-white/10 sm:px-6">
          <h2 id="favorite-artist-modal-title" class="min-w-0 truncate text-base font-bold text-gray-900 dark:text-white sm:text-lg">
            {{ `Tu historia con ${displayedArtist.name}` }}
          </h2>
          <button
            ref="closeButton"
            type="button"
            class="shrink-0 rounded-lg p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-pink dark:text-gray-200 dark:hover:bg-white/10"
            aria-label="Cerrar historia del artista"
            @click="emit('close')"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>

        <main class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5" :aria-busy="initialLoading || moreLoading">
          <div v-if="initialLoading" class="space-y-5" role="status" aria-live="polite" data-test="artist-summary-loading">
            <span class="sr-only">Cargando tu historia musical con {{ props.artist.name }}</span>
            <div class="flex items-center gap-4">
              <div class="h-16 w-16 animate-pulse rounded-xl bg-gray-100 dark:bg-white/10"></div>
              <div class="flex-1 space-y-2"><div class="h-4 w-2/5 animate-pulse rounded bg-gray-100 dark:bg-white/10"></div><div class="h-3 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-white/10"></div></div>
            </div>
            <div class="flex flex-wrap gap-2"><div v-for="index in 3" :key="index" class="h-7 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-white/5"></div></div>
            <div v-for="index in 3" :key="index" class="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5"></div>
          </div>

          <div v-else-if="initialError" class="grid min-h-64 place-content-center gap-3 text-center" role="alert" data-test="artist-summary-error">
            <p class="text-sm text-gray-700 dark:text-gray-200">No se pudo cargar tu historia con este artista.</p>
            <button type="button" class="justify-self-center rounded-lg border-2 border-rv-navy bg-rv-navy px-4 py-2 text-sm font-semibold text-white transition hover:border-gray-300 hover:bg-transparent hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:hover:border-white/20 dark:hover:text-gray-300" @click="retryInitial">Reintentar</button>
          </div>

          <div v-else-if="initialNotFound" class="grid min-h-64 place-content-center gap-2 text-center" role="alert" data-test="artist-summary-not-found">
            <p class="font-semibold text-gray-900 dark:text-white">Este artista ya no está disponible.</p>
            <p class="text-sm text-gray-600 dark:text-gray-300">Cierra esta ventana y actualiza el ranking para continuar.</p>
          </div>

          <div v-else-if="sessionPending" class="grid min-h-64 place-content-center text-center text-sm text-gray-600 dark:text-gray-300" role="status">
            Comprobando tu sesión…
          </div>
          <div v-else-if="!hasSession" class="grid min-h-64 place-content-center text-center text-sm text-gray-600 dark:text-gray-300" role="status" data-test="artist-summary-session-unavailable">
            Tu sesión ya no está disponible.
          </div>

          <div v-else-if="detail" class="mx-auto max-w-3xl space-y-4">
            <section class="flex min-w-0 items-center gap-3 sm:gap-4" aria-label="Identidad del artista" data-test="artist-header">
              <img
                v-if="displayedArtist.image"
                :src="displayedArtist.image"
                :alt="`Imagen de ${displayedArtist.name}`"
                class="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20"
              />
              <div v-else class="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rv-purple/20 to-rv-pink/20 text-rv-purple dark:text-rv-pink sm:h-20 sm:w-20" aria-hidden="true">
                <i class="fa-solid fa-music text-2xl"></i>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="break-words text-lg font-bold text-gray-900 dark:text-white sm:text-xl">{{ detail.artist.name }}</h3>
                <div v-if="detail.artist.country || detail.artist.genres.length" class="mt-0.5 flex flex-wrap items-center gap-x-1 text-sm text-gray-600 dark:text-gray-300" aria-label="País y géneros del catálogo">
                  <span v-if="detail.artist.country">{{ detail.artist.country.name }}</span>
                  <span v-if="detail.artist.country && detail.artist.genres.length" aria-hidden="true">·</span>
                  <template v-for="(genre, index) in detail.artist.genres" :key="genre.id">
                    <span>{{ genre.name }}<span v-if="index < detail.artist.genres.length - 1" aria-hidden="true">, </span></span>
                  </template>
                </div>
                <dl class="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1" aria-label="Estadísticas musicales personales" data-test="artist-summary-stats">
                  <div class="inline-flex items-baseline gap-1.5 text-xs sm:text-sm">
                    <dt class="text-gray-500 dark:text-gray-400">Discos valorados</dt>
                    <dd class="font-bold tabular-nums text-gray-900 dark:text-white">{{ detail.stats.ratedDiscCount.toLocaleString("es-ES") }}</dd>
                  </div>
                  <div class="inline-flex items-baseline gap-1.5 text-xs sm:text-sm">
                    <dt class="text-gray-500 dark:text-gray-400">Nota media</dt>
                    <dd class="font-bold tabular-nums text-gray-900 dark:text-white">{{ formatScore(detail.stats.averageRate) }}</dd>
                  </div>
                  <div class="inline-flex min-w-0 items-baseline gap-1.5 text-xs sm:text-sm">
                    <dt class="shrink-0 text-gray-500 dark:text-gray-400">Mejor nota</dt>
                    <dd v-if="detail.stats.highestRatedDisc" class="min-w-0 truncate font-bold tabular-nums text-gray-900 dark:text-white" :title="`${formatScore(detail.stats.highestRatedDisc.rate)} · ${detail.stats.highestRatedDisc.name}`">
                      {{ formatScore(detail.stats.highestRatedDisc.rate) }}<span class="font-normal"> · {{ detail.stats.highestRatedDisc.name }}</span>
                    </dd>
                    <dd v-else class="font-bold text-gray-500 dark:text-gray-400">—</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section aria-labelledby="artist-lastfm-title" data-test="artist-lastfm">
              <h3 id="artist-lastfm-title" class="text-sm font-bold text-gray-900 dark:text-white sm:text-base">Sobre el artista</h3>

              <div v-if="lastfmLoading" class="mt-2 space-y-2" role="status" aria-live="polite" data-test="artist-lastfm-loading">
                <span class="sr-only">Cargando información externa del artista…</span>
                <div class="h-3 w-11/12 animate-pulse rounded bg-gray-100 dark:bg-white/10"></div>
                <div class="h-3 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-white/10"></div>
              </div>

              <div v-else-if="lastfmError" class="mt-2 flex flex-wrap items-center gap-2 text-sm text-red-800 dark:text-red-200" role="alert" data-test="artist-lastfm-error">
                <span>No se pudo cargar la información de Last.fm.</span>
                <button type="button" class="font-semibold text-rv-navy underline underline-offset-2 hover:text-rv-pink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:text-white" @click="retryLastfm">Reintentar Last.fm</button>
              </div>

              <div v-else-if="lastfmDetail" class="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-200" data-test="artist-lastfm-content">
                <p v-if="lastfmDetail.status === 'not_found'" class="text-gray-600 dark:text-gray-300" role="status">No encontramos información de este artista en Last.fm.</p>
                <template v-else-if="lastfmDetail.status === 'unavailable'">
                  <p class="text-gray-600 dark:text-gray-300" role="status">Last.fm no está disponible en este momento.</p>
                  <button type="button" class="font-semibold text-rv-navy underline underline-offset-2 hover:text-rv-pink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:text-white" @click="retryLastfm">Reintentar Last.fm</button>
                </template>
                <template v-else-if="lastfmDetail.status === 'not_configured'">
                  <p class="text-gray-600 dark:text-gray-300" role="status">Información externa no disponible.</p>
                </template>
                <template v-else-if="lastfmDetail.status === 'invalid_response'">
                  <p class="text-gray-600 dark:text-gray-300" role="status">No se pudo validar la información recibida.</p>
                  <button type="button" class="font-semibold text-rv-navy underline underline-offset-2 hover:text-rv-pink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:text-white" @click="retryLastfm">Reintentar Last.fm</button>
                </template>
                <template v-else>
                  <p v-if="lastfmDetail.biography?.summary" class="whitespace-pre-line leading-relaxed" data-test="artist-lastfm-biography">{{ lastfmDetail.biography.summary }}</p>

                  <div v-if="lastfmTags.length" class="flex flex-wrap items-center gap-x-2 gap-y-1" aria-label="Etiquetas de Last.fm" data-test="artist-lastfm-tags">
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Etiquetas</span>
                    <template v-for="tag in lastfmTags" :key="tag.name">
                      <a v-if="safeLastfmUrl(tag.url)" :href="safeLastfmUrl(tag.url) ?? undefined" target="_blank" rel="noopener noreferrer" class="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-700 hover:border-rv-pink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:border-white/15 dark:text-gray-200" :aria-label="`Ver etiqueta ${tag.name} en Last.fm`">{{ tag.name }}</a>
                      <span v-else class="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-700 dark:border-white/15 dark:text-gray-200">{{ tag.name }}</span>
                    </template>
                  </div>

                  <div v-if="lastfmSimilarArtists.length" class="space-y-2" aria-label="Artistas similares de Last.fm" data-test="artist-lastfm-similar">
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Artistas similares</span>
                    <ul class="space-y-1.5">
                      <li v-for="(similar, index) in lastfmSimilarArtists" :key="similar.name" class="min-w-0 rounded-lg">
                        <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <button
                            v-if="similarArtistNavigationMode(similar) === 'expandable'"
                            :id="`similar-artist-toggle-${index}`"
                            type="button"
                            class="min-w-0 max-w-full truncate rounded-lg border-2 border-rv-navy bg-rv-navy px-2 py-1 text-left font-medium text-white transition hover:border-gray-300 hover:bg-transparent hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:hover:border-white/20 dark:hover:text-gray-300"
                            :aria-expanded="expandedSimilarArtist === similar.name"
                            :aria-controls="`similar-artist-discs-${index}`"
                            :aria-label="`${expandedSimilarArtist === similar.name ? 'Ocultar' : 'Mostrar'} ${similar.catalogDiscCount === 1 ? 'disco' : 'discos'} de ${similar.name} en Riff Valley`"
                            data-test="similar-artist-toggle"
                            @click="toggleSimilarArtist(similar.name)"
                          >{{ similar.name }} <i class="fa-solid fa-chevron-down ml-1 text-[10px]" aria-hidden="true"></i></button>
                          <a
                            v-else-if="safeLastfmUrl(similar.url)"
                            :href="safeLastfmUrl(similar.url) ?? undefined"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="min-w-0 max-w-full truncate font-medium text-rv-purple underline decoration-rv-purple/30 underline-offset-2 hover:text-rv-pink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:text-rv-pink"
                            :aria-label="`Ver ${similar.name} en Last.fm`"
                          >{{ similar.name }}</a>
                          <span v-else class="min-w-0 max-w-full truncate font-medium">{{ similar.name }}</span>

                          <span v-if="similar.catalogDiscCount > 0" class="text-xs text-gray-600 dark:text-gray-300">
                            {{ similar.catalogDiscCount }} {{ similar.catalogDiscCount === 1 ? 'disco' : 'discos' }} en Riff Valley
                          </span>
                          <a
                            v-if="similar.catalogDiscCount > 0 && safeLastfmUrl(similar.url)"
                            :href="safeLastfmUrl(similar.url) ?? undefined"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="shrink-0 text-xs text-gray-500 underline underline-offset-2 hover:text-rv-pink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:text-gray-400"
                            :aria-label="`Ver ${similar.name} en Last.fm`"
                          ><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
                        </div>
                        <ul
                          v-if="similarArtistNavigationMode(similar) === 'expandable' && expandedSimilarArtist === similar.name"
                          :id="`similar-artist-discs-${index}`"
                          class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
                          :aria-labelledby="`similar-artist-toggle-${index}`"
                          data-test="similar-artist-discs"
                        >
                          <li v-for="disc in navigableSimilarDiscs(similar)" :key="disc.id" class="flex min-w-0 justify-center">
                            <DashboardSimilarArtistDiscCard :disc="disc" :artist-name="similar.name" />
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </div>

                  <p v-if="lastfmDetail.listeners !== null || lastfmDetail.playCount !== null" class="text-xs text-gray-600 dark:text-gray-300" data-test="artist-lastfm-counts">
                    <template v-if="lastfmDetail.listeners !== null">{{ formatLastfmCount(lastfmDetail.listeners) }} oyentes</template>
                    <span v-if="lastfmDetail.listeners !== null && lastfmDetail.playCount !== null" aria-hidden="true"> · </span>
                    <template v-if="lastfmDetail.playCount !== null">{{ formatLastfmCount(lastfmDetail.playCount) }} reproducciones</template>
                  </p>

                  <a v-if="lastfmPageUrl" :href="lastfmPageUrl" target="_blank" rel="noopener noreferrer" class="inline-flex font-semibold text-rv-purple underline decoration-rv-purple/30 underline-offset-2 hover:text-rv-pink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:text-rv-pink" aria-label="Ver perfil del artista en Last.fm">Ver en Last.fm</a>
                  <p v-if="!hasLastfmContent" class="text-gray-600 dark:text-gray-300" role="status">No hay más información disponible en Last.fm.</p>
                </template>
              </div>
            </section>

            <section aria-labelledby="artist-disc-list-title" data-test="artist-disc-list">
              <div class="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 id="artist-disc-list-title" class="text-sm font-bold text-gray-900 dark:text-white sm:text-base">Discos valorados <span class="font-normal text-gray-500 dark:text-gray-400">({{ detail.discs.total.toLocaleString("es-ES") }})</span></h3>
              </div>

              <p v-if="detail.discs.total === 0" class="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-600 dark:border-white/15 dark:text-gray-300" role="status" data-test="artist-no-rates">Todavía no has valorado discos de este artista.</p>

              <div v-else class="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10" :aria-busy="moreLoading">
                <ul class="divide-y divide-gray-200 dark:divide-white/10">
                  <li v-for="disc in detail.discs.data" :key="disc.id" class="flex min-w-0 items-center gap-2.5 p-2.5 sm:gap-3 sm:p-3" data-test="artist-disc-row">
                    <img :src="disc.image || defaultDiscImage" :alt="disc.image ? `Portada de ${disc.name}` : ''" class="h-12 w-12 shrink-0 rounded-md bg-gray-100 object-cover dark:bg-white/5 sm:h-14 sm:w-14" loading="lazy" @error="useFallbackImage" />
                    <div class="min-w-0 flex-1">
                      <button type="button" class="block max-w-full truncate rounded-lg border-2 border-rv-navy bg-rv-navy px-2 py-1 text-left text-sm font-semibold text-white transition hover:border-gray-300 hover:bg-transparent hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:hover:border-white/20 dark:hover:text-gray-300" :aria-label="`Abrir detalle de ${disc.name}`" @click="openDisc(disc)">{{ disc.name }}</button>
                      <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ formatReleaseYear(disc.releaseDate) }}</p>
                    </div>
                    <div class="grid w-[5.5rem] shrink-0 grid-cols-2 gap-1 text-center">
                      <div><span class="block text-[9px] text-gray-500 dark:text-gray-400">Disco</span><span class="text-xs font-bold tabular-nums text-rose-800 dark:text-rose-300">{{ formatScore(disc.rate) }}</span></div>
                      <div><span class="block text-[9px] text-gray-500 dark:text-gray-400">Portada</span><span v-if="disc.cover !== null" class="text-xs font-bold tabular-nums text-blue-800 dark:text-blue-300">{{ formatScore(disc.cover) }}</span><span v-else class="text-xs text-gray-400 dark:text-gray-500" aria-label="Sin nota de portada">—</span></div>
                    </div>
                  </li>
                </ul>
              </div>

              <div v-if="moreError" class="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200" role="alert" data-test="artist-more-error">
                <span>No se pudieron cargar los discos restantes.</span>
                <button type="button" class="shrink-0 font-semibold text-rv-navy underline underline-offset-2 hover:text-rv-pink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:text-white" @click="retryMoreDiscs">Reintentar</button>
              </div>
              <p v-if="moreLoading" class="mt-2 text-center text-xs text-gray-600 dark:text-gray-300" role="status" aria-live="polite">Cargando más discos…</p>
              <button v-if="hasMoreDiscs && !moreError" type="button" class="mt-3 rounded-lg border-2 border-rv-navy bg-rv-navy px-3 py-2 text-sm font-semibold text-white transition hover:border-gray-300 hover:bg-transparent hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink disabled:cursor-not-allowed disabled:opacity-40 dark:hover:border-white/20 dark:hover:text-gray-300" :disabled="moreLoading" data-test="artist-more-button" @click="loadMoreDiscs()">Cargar más discos</button>
              <p v-if="unavailableDiscCount" class="mt-2 text-xs text-gray-600 dark:text-gray-300" role="status">No se pudieron recuperar {{ unavailableDiscCount }} discos indicados por el total.</p>
            </section>
          </div>
        </main>
      </section>
      <DiscDetail v-if="selectedDisc" :disc="selectedDisc" @close="selectedDisc = null" />
    </div>
  </Teleport>
</template>
