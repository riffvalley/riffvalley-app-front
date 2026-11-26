<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, toRef, useTemplateRef, watch } from "vue";
import defaultDiscImage from "@/assets/disco.png";
import DiscDetail from "@components/DiscDetail.vue";
import { useAuthStore } from "@/modules/identity/auth";
import { useArtistDetailInsights } from "../../application/useArtistDetailInsights";
import type { RatesTopArtistDto } from "@services/rates/rates";
import { useArtistDetails } from "../../application/useArtistDetails";
import { artistGenrePillBackground } from "../artistGenreColor";

const props = defineProps<{ artistId: string; favoriteArtist?: RatesTopArtistDto | null }>();
const emit = defineEmits<{ close: []; "open-related-artist": [artistId: string] }>();
const dialog = useTemplateRef<HTMLElement>("dialog");
const closeButton = useTemplateRef<HTMLButtonElement>("closeButton");
const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
const priorOverflow = document.body.style.overflow;
const isMounted = shallowRef(false);
const authStore = useAuthStore();
const personalEnabled = computed(() => isMounted.value && Boolean(props.favoriteArtist));
const artistId = toRef(() => props.artistId);
const { detail: catalogDetail, loading: catalogLoading, error: catalogError, notFound, load: retryCatalog } = useArtistDetails(artistId, isMounted);
const {
  detail: personalDetail,
  lastfmDetail,
  summaryLoading,
  summaryError,
  summaryNotFound,
  lastfmLoading,
  lastfmError,
  moreLoading,
  moreError,
  hasMoreDiscs,
  retrySummary,
  retryLastfm,
  loadMoreDiscs,
  retryMoreDiscs,
} = useArtistDetailInsights(artistId, isMounted, personalEnabled);

const selectedDisc = shallowRef<{ id: string; name: string; image: string | null; artist: { name: string } } | null>(null);
const expandedSimilar = shallowRef<string | null>(null);
const artist = computed(() => catalogDetail.value);
const artistName = computed(() => artist.value?.name ?? props.favoriteArtist?.name ?? "Artista");
const biography = computed(() => lastfmDetail.value?.biography?.summary || artist.value?.description || null);
const artistGenres = computed(() => {
  const genresById = new Map(
    (artist.value?.discs ?? [])
      .filter((disc) => disc.genre)
      .map((disc) => [disc.genre!.id, disc.genre!] as const),
  );
  if (artist.value?.genres?.length) {
    return artist.value.genres.map((genre) => ({
      ...genre,
      color: genresById.get(genre.id)?.color ?? null,
    }));
  }
  const seen = new Set<string>();
  return (artist.value?.discs ?? []).flatMap(({ genre }) => {
    if (!genre || seen.has(genre.id)) return [];
    seen.add(genre.id);
    return [{ id: genre.id, name: genre.name, color: genre.color }];
  });
});
const tags = computed(() => uniqueByName(lastfmDetail.value?.tags ?? []));
const relatedArtists = computed(() => uniqueByName(lastfmDetail.value?.similarArtists ?? []));
const personalDiscs = computed(() => personalDetail.value?.discs.data ?? []);
const hasSession = computed(() => authStore.authStatus === "authenticated" && Boolean(authStore.userId));

// Estilos compartidos para que todas las secciones del modal tengan la misma jerarquía visual.
const sectionTitle = "flex items-center gap-2 text-base font-bold text-rv-navy dark:text-white";
const sectionIcon = "text-sm text-rv-pink";
const pillBase = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold";
const tagPill = `${pillBase} bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200`;
const tagPillLink = `${tagPill} transition-colors hover:bg-rv-pink hover:text-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-pink dark:hover:bg-rv-pink dark:hover:text-white`;
const relatedPill = `${pillBase} border border-gray-300 bg-transparent text-rv-navy dark:border-white/20 dark:text-white`;
const relatedPillAction = `${relatedPill} transition-colors hover:border-rv-pink hover:bg-rv-pink hover:text-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-pink dark:hover:border-rv-pink`;
const statTile = "min-w-0 rounded-lg bg-white/80 px-3 py-2 shadow-sm dark:bg-white/5 dark:shadow-none";
const statLabel = "text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";
const statValue = "mt-0.5 text-lg font-extrabold tabular-nums text-rv-navy dark:text-white";
const sessionPending = computed(() => authStore.authStatus === "initializing");

function validCatalogId(id: string | null): id is string {
  return Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
}
function uniqueByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(({ name }) => {
    const key = name.normalize("NFKC").trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}
function safeLastfmUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["last.fm", "www.last.fm"].includes(url.hostname.toLowerCase()) && !url.username && !url.password && !url.port ? url.toString() : null;
  } catch { return null; }
}
function formatDate(value: string | null): string {
  if (!value) return "Fecha desconocida";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "Fecha desconocida" : new Intl.DateTimeFormat("es-ES", { year: "numeric", month: "long", day: "numeric" }).format(date);
}
function formatRate(value: number | null): string {
  return value === null ? "—" : new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value);
}
function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
    return;
  }
  if (event.key !== "Tab" || !dialog.value || selectedDisc.value) return;
  const focusable = [...dialog.value.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')].filter((element) => element.tabIndex >= 0 && !element.hasAttribute("hidden"));
  if (!focusable.length) { event.preventDefault(); dialog.value.focus(); return; }
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (!dialog.value.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
  else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
function useFallbackImage(event: Event): void {
  const image = event.currentTarget;
  const fallbackUrl = new URL(defaultDiscImage, document.baseURI).href;
  if (image instanceof HTMLImageElement && image.src !== fallbackUrl) image.src = fallbackUrl;
}
function openDisc(disc: { id: string; name: string; image: string | null }): void {
  selectedDisc.value = { ...disc, artist: { name: artistName.value } };
}
function navigateRelated(id: string | null): void {
  if (!validCatalogId(id) || id === props.artistId) return;
  expandedSimilar.value = null;
  emit("open-related-artist", id);
}

watch(() => props.artistId, () => { selectedDisc.value = null; expandedSimilar.value = null; });
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
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-4" data-test="artist-details-overlay" @click.self="emit('close')">
      <section ref="dialog" class="relative flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-rv-darkSurface sm:max-h-[92dvh]" role="dialog" aria-modal="true" aria-labelledby="artist-details-title" tabindex="-1" data-test="artist-details-dialog">
        <h2 id="artist-details-title" class="sr-only">{{ artistName }}</h2>
        <button ref="closeButton" type="button" class="absolute right-3 top-3 z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-rv-navy p-0 text-white shadow-md transition hover:bg-rv-pink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink" aria-label="Cerrar ficha del artista" @click="emit('close')"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        <main class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <!-- Cabecera tipo portada: foto a todo el ancho y degradado para que el texto blanco sea legible. -->
          <section v-if="artist" class="relative isolate flex min-h-44 items-end overflow-hidden bg-gradient-to-br from-rv-navy via-rv-purple to-rv-pink sm:min-h-64" aria-label="Identidad del artista" data-test="artist-catalog-header">
            <img v-if="artist.image || favoriteArtist?.image" :src="artist.image || favoriteArtist?.image || undefined" :alt="`Imagen de ${artist.name}`" class="absolute inset-0 -z-10 h-full w-full object-cover object-[center_25%]" />
            <div v-else class="absolute inset-0 -z-10 grid place-items-center text-white/15" aria-hidden="true"><i class="fa-solid fa-music text-8xl"></i></div>
            <div class="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/40 to-black/10" aria-hidden="true"></div>
            <div class="w-full min-w-0 px-4 pb-4 pr-14 pt-16 sm:px-6 sm:pb-5">
              <h3 class="break-words text-xl font-extrabold tracking-tight text-white drop-shadow sm:text-2xl">{{ artist.name }}</h3>
              <p v-if="artist.country" class="mt-1 text-sm font-medium text-white/85 drop-shadow"><i class="fa-solid fa-location-dot mr-1.5 text-rv-pink" aria-hidden="true"></i>{{ artist.country.name }}</p>
              <ul v-if="artistGenres.length" aria-label="Géneros del artista" class="mt-2 flex list-none flex-wrap gap-1.5 p-0">
                <li v-for="genre in artistGenres" :key="genre.id" class="rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm" :style="{ backgroundColor: artistGenrePillBackground(genre.color, genre.name) }" data-test="artist-genre-pill">{{ genre.name }}</li>
              </ul>
            </div>
          </section>
          <div class="p-3 sm:p-5">
          <section v-if="catalogLoading && !artist" class="py-12 text-center text-sm text-gray-600 dark:text-gray-300" role="status">Cargando datos del catálogo…</section>
          <section v-else-if="catalogError || notFound" class="grid min-h-40 place-content-center gap-3 text-center" role="alert">
            <p>{{ notFound ? "Este artista ya no está disponible en Catalog." : "No se pudieron cargar los datos del catálogo." }}</p>
            <button v-if="catalogError" type="button" class="justify-self-center font-semibold text-rv-pink underline" @click="retryCatalog">Reintentar Catalog</button>
          </section>
          <div v-if="artist" class="mx-auto max-w-3xl space-y-5">

            <section v-if="favoriteArtist" class="rounded-xl border border-rv-pink/20 bg-gradient-to-r from-rv-pink/10 to-rv-purple/10 p-4 dark:border-white/10 dark:from-rv-pink/15 dark:to-rv-purple/15" aria-labelledby="artist-personal-title" data-test="artist-personal-summary">
              <h3 id="artist-personal-title" :class="sectionTitle"><i class="fa-solid fa-heart" :class="sectionIcon" aria-hidden="true"></i><span class="min-w-0 break-words">Tu historia con {{ artist.name }}</span></h3>
              <p v-if="summaryLoading" class="mt-2 text-sm text-gray-600 dark:text-gray-300" role="status">Cargando tus valoraciones…</p>
              <div v-else-if="summaryError || summaryNotFound" class="mt-2 text-sm text-red-700 dark:text-red-300" role="alert"><span>{{ summaryNotFound ? "No hay resumen personal disponible para este artista." : "No se pudo cargar tu resumen personal." }}</span><button v-if="summaryError" type="button" class="ml-2 font-semibold underline" @click="retrySummary">Reintentar</button></div>
              <p v-else-if="sessionPending" class="mt-2 text-sm text-gray-600 dark:text-gray-300" role="status">Comprobando tu sesión…</p>
              <p v-else-if="!hasSession" class="mt-2 text-sm text-gray-600 dark:text-gray-300" role="status">Tu sesión ya no está disponible.</p>
              <dl v-else-if="personalDetail" class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Estadísticas musicales personales">
                <div :class="statTile"><dt :class="statLabel">Discos valorados</dt><dd :class="statValue">{{ personalDetail.stats.ratedDiscCount.toLocaleString("es-ES") }}</dd></div>
                <div :class="statTile"><dt :class="statLabel">Nota media</dt><dd :class="statValue">{{ formatRate(personalDetail.stats.averageRate) }}</dd></div>
                <div :class="statTile"><dt :class="statLabel">Mejor nota</dt><dd :class="statValue">{{ personalDetail.stats.highestRatedDisc ? formatRate(personalDetail.stats.highestRatedDisc.rate) : "—" }}<span v-if="personalDetail.stats.highestRatedDisc" class="block truncate text-xs font-medium text-gray-600 dark:text-gray-300" :title="personalDetail.stats.highestRatedDisc.name">{{ personalDetail.stats.highestRatedDisc.name }}</span></dd></div>
                <div :class="statTile"><dt :class="statLabel">Nota más baja</dt><dd :class="statValue">{{ personalDetail.stats.lowestRatedDisc ? formatRate(personalDetail.stats.lowestRatedDisc.rate) : "—" }}<span v-if="personalDetail.stats.lowestRatedDisc" class="block truncate text-xs font-medium text-gray-600 dark:text-gray-300" :title="personalDetail.stats.lowestRatedDisc.name">{{ personalDetail.stats.lowestRatedDisc.name }}</span></dd></div>
              </dl>
            </section>

            <section aria-labelledby="artist-lastfm-title" data-test="artist-lastfm">
              <h3 id="artist-lastfm-title" :class="sectionTitle"><i class="fa-solid fa-microphone-lines" :class="sectionIcon" aria-hidden="true"></i>Sobre el artista</h3>
              <p v-if="lastfmLoading" class="mt-2 text-sm text-gray-500 dark:text-gray-400" role="status">Cargando información externa…</p>
              <div v-else-if="lastfmError" class="mt-2 text-sm text-red-800 dark:text-red-200" role="alert">No se pudo cargar la información de Last.fm. <button type="button" class="font-semibold underline" @click="retryLastfm">Reintentar Last.fm</button></div>
              <div v-else-if="lastfmDetail" class="mt-2 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                <p v-if="lastfmDetail.status === 'not_found'" role="status">No encontramos información de este artista en Last.fm.</p>
                <p v-else-if="lastfmDetail.status === 'unavailable' || lastfmDetail.status === 'invalid_response'" role="status">Last.fm no está disponible en este momento. <button type="button" class="font-semibold underline" @click="retryLastfm">Reintentar Last.fm</button></p>
                <p v-else-if="lastfmDetail.status === 'not_configured'" role="status">Información externa no disponible.</p>
                <template v-else><p v-if="biography" class="whitespace-pre-line leading-relaxed" data-test="artist-biography">{{ biography }}</p>
                  <ul v-if="tags.length" class="flex list-none flex-wrap gap-2 p-0" aria-label="Etiquetas de Last.fm"><li v-for="tag in tags" :key="tag.name"><a v-if="safeLastfmUrl(tag.url)" :href="safeLastfmUrl(tag.url) ?? undefined" target="_blank" rel="noopener noreferrer" :class="tagPillLink">{{ tag.name }}</a><span v-else :class="tagPill">{{ tag.name }}</span></li></ul>
                  <div v-if="lastfmDetail.listeners !== null || lastfmDetail.playCount !== null || safeLastfmUrl(lastfmDetail.lastfmUrl) || safeLastfmUrl(lastfmDetail.biography?.url ?? null)" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
                    <p v-if="lastfmDetail.listeners !== null || lastfmDetail.playCount !== null" class="flex flex-wrap gap-x-4 gap-y-1">
                      <span><i class="fa-solid fa-headphones mr-1.5 text-rv-purple dark:text-rv-pink" aria-hidden="true"></i><strong class="font-bold tabular-nums text-rv-navy dark:text-white">{{ lastfmDetail.listeners?.toLocaleString("es-ES") ?? "—" }}</strong> oyentes</span>
                      <span><i class="fa-solid fa-play mr-1.5 text-rv-purple dark:text-rv-pink" aria-hidden="true"></i><strong class="font-bold tabular-nums text-rv-navy dark:text-white">{{ lastfmDetail.playCount?.toLocaleString("es-ES") ?? "—" }}</strong> reproducciones</span>
                    </p>
                    <a v-if="safeLastfmUrl(lastfmDetail.lastfmUrl) || safeLastfmUrl(lastfmDetail.biography?.url ?? null)" :href="safeLastfmUrl(lastfmDetail.lastfmUrl) ?? safeLastfmUrl(lastfmDetail.biography?.url ?? null) ?? undefined" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-sm font-semibold text-rv-pink hover:underline focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink"><i class="fa-brands fa-lastfm" aria-hidden="true"></i>Ver en Last.fm<i class="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden="true"></i></a>
                  </div>
                </template>
              </div>
              <p v-if="!lastfmLoading && !lastfmError && lastfmDetail && lastfmDetail.status === 'available' && !biography && !tags.length" class="mt-2 text-sm text-gray-600 dark:text-gray-300" role="status">No hay más información disponible en Last.fm.</p>
              <p v-if="artist.description" class="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-200" data-test="artist-catalog-description">{{ artist.description }}</p>
            </section>

            <section v-if="relatedArtists.length" aria-labelledby="artist-related-title" data-test="related-artists">
              <h3 id="artist-related-title" :class="sectionTitle"><i class="fa-solid fa-users" :class="sectionIcon" aria-hidden="true"></i>Artistas relacionados</h3>
              <ul class="mt-2 flex list-none flex-wrap items-center gap-2 p-0"><li v-for="related in relatedArtists" :key="related.name"><button v-if="validCatalogId(related.catalogArtistId) && related.catalogArtistId !== artistId" type="button" :class="relatedPillAction" @click="navigateRelated(related.catalogArtistId)">{{ related.name }}</button><a v-else-if="safeLastfmUrl(related.url)" :href="safeLastfmUrl(related.url) ?? undefined" target="_blank" rel="noopener noreferrer" :class="relatedPillAction">{{ related.name }}<i class="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-70" aria-hidden="true"></i></a><span v-else :class="relatedPill">{{ related.name }}</span></li></ul>
            </section>

            <section aria-labelledby="artist-discography-title" data-test="artist-catalog-discography">
              <h3 id="artist-discography-title" class="mb-2" :class="sectionTitle"><i class="fa-solid fa-compact-disc" :class="sectionIcon" aria-hidden="true"></i>Discos en la app <span class="font-normal text-gray-500 dark:text-gray-400">({{ artist.discs.length.toLocaleString("es-ES") }})</span></h3>
              <p v-if="!artist.discs.length" class="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-600 dark:border-white/15 dark:text-gray-300" role="status">Este artista todavía no tiene discos en el catálogo.</p>
              <ul v-else class="overflow-hidden rounded-xl border border-gray-200 divide-y divide-gray-200 dark:border-white/10 dark:divide-white/10">
                <li v-for="disc in artist.discs" :key="disc.id" class="flex min-w-0 items-center gap-3 p-2.5 sm:p-3" data-test="artist-catalog-disc">
                  <img :src="disc.image || defaultDiscImage" :alt="disc.image ? `Portada de ${disc.name}` : ''" class="h-12 w-12 shrink-0 rounded-md bg-gray-100 object-cover dark:bg-white/5 sm:h-14 sm:w-14" loading="lazy" @error="useFallbackImage" />
                  <div class="min-w-0 flex-1"><button type="button" class="block max-w-full truncate rounded-lg border-2 border-rv-navy bg-rv-navy px-2 py-1 text-left text-sm font-semibold text-white transition hover:border-rv-pink hover:bg-rv-pink hover:text-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:border-gray-200 dark:bg-gray-200 dark:text-rv-navy dark:hover:border-rv-pink dark:hover:bg-rv-pink dark:hover:text-white" :aria-label="`Abrir detalle de ${disc.name}`" @click="openDisc(disc)">{{ disc.name }}</button><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ formatDate(disc.releaseDate) }}<span v-if="disc.genre"> · {{ disc.genre.name }}</span></p></div>
                  <div class="ml-auto flex shrink-0 items-center justify-end gap-1.5" :aria-label="`Datos de comunidad para ${disc.name}`" data-test="artist-disc-community-stats">
                    <div class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200" :title="`${disc.rateCount.toLocaleString('es-ES')} ${disc.rateCount === 1 ? 'valoración' : 'valoraciones'}`">
                      <i class="fa-solid fa-users text-[10px] text-gray-400 dark:text-gray-500" aria-hidden="true"></i>
                      <span class="text-sm font-bold tabular-nums">{{ disc.rateCount.toLocaleString("es-ES") }}</span>
                      <span class="text-[9px] font-semibold uppercase tracking-wide">votos</span>
                    </div>
                    <div v-if="disc.averageRate !== null" class="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200" :aria-label="`Nota media ${formatRate(disc.averageRate)}`">
                      <i class="fa-solid fa-star text-[10px] text-amber-500 dark:text-amber-300" aria-hidden="true"></i>
                      <span class="text-[9px] font-semibold uppercase tracking-wide">media</span>
                      <span class="text-sm font-extrabold tabular-nums">{{ formatRate(disc.averageRate) }}</span>
                    </div>
                  </div>
                </li>
              </ul>
              <p v-if="catalogLoading" class="mt-2 text-xs text-gray-500" role="status">Actualizando discografía…</p>
            </section>

            <section v-if="favoriteArtist" aria-labelledby="artist-rated-discs-title" data-test="artist-rated-discs">
              <h3 id="artist-rated-discs-title" class="mb-2" :class="sectionTitle"><i class="fa-solid fa-star" :class="sectionIcon" aria-hidden="true"></i>Discos valorados <span class="font-normal text-gray-500 dark:text-gray-400">({{ personalDetail?.discs.total ?? 0 }})</span></h3>
              <p v-if="personalDetail && !personalDetail.discs.total" class="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-600 dark:border-white/15 dark:text-gray-300" role="status">Todavía no has valorado discos de este artista.</p>
              <ul v-else-if="personalDetail" class="overflow-hidden rounded-xl border border-gray-200 divide-y divide-gray-200 dark:border-white/10 dark:divide-white/10"><li v-for="disc in personalDiscs" :key="disc.id" class="flex min-w-0 items-center gap-3 p-2.5 sm:p-3"><img :src="disc.image || defaultDiscImage" :alt="disc.image ? `Portada de ${disc.name}` : ''" class="h-12 w-12 shrink-0 rounded-md bg-gray-100 object-cover dark:bg-white/5 sm:h-14 sm:w-14" loading="lazy" @error="useFallbackImage"/><div class="min-w-0 flex-1"><button type="button" class="block max-w-full truncate rounded-lg border-2 border-rv-navy bg-rv-navy px-2 py-1 text-left text-sm font-semibold text-white transition hover:border-rv-pink hover:bg-rv-pink hover:text-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:border-gray-200 dark:bg-gray-200 dark:text-rv-navy dark:hover:border-rv-pink dark:hover:bg-rv-pink dark:hover:text-white" :aria-label="`Abrir detalle de ${disc.name}`" @click="openDisc(disc)">{{ disc.name }}</button><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ formatDate(disc.releaseDate) }}</p></div><div class="ml-auto flex shrink-0 items-center justify-end gap-1.5" :aria-label="`Tus notas para ${disc.name}`" data-test="artist-rated-disc-rates">
                    <div class="flex items-center gap-1.5 rounded-lg border border-rv-pink/30 bg-rv-pink/10 px-2 py-1.5 text-rv-navy dark:border-rv-pink/30 dark:bg-rv-pink/15 dark:text-white">
                      <i class="fa-solid fa-compact-disc text-[10px] text-rv-pink" aria-hidden="true"></i>
                      <span class="text-[9px] font-semibold uppercase tracking-wide">disco</span>
                      <span class="text-sm font-extrabold tabular-nums">{{ formatRate(disc.rate) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 rounded-lg border border-rv-purple/30 bg-rv-purple/10 px-2 py-1.5 text-rv-navy dark:border-rv-purple/40 dark:bg-rv-purple/20 dark:text-white">
                      <i class="fa-solid fa-image text-[10px] text-rv-purple dark:text-rv-pink" aria-hidden="true"></i>
                      <span class="text-[9px] font-semibold uppercase tracking-wide">portada</span>
                      <span class="text-sm font-extrabold tabular-nums">{{ formatRate(disc.cover) }}</span>
                    </div>
                  </div></li></ul>
              <p v-if="moreError" class="mt-2 text-sm text-red-700" role="alert">No se pudieron cargar más discos. <button type="button" class="underline" @click="retryMoreDiscs">Reintentar</button></p>
              <button v-if="hasMoreDiscs && !moreError" type="button" class="mt-2 rounded-lg bg-rv-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-gray-200 dark:text-rv-navy" :disabled="moreLoading" @click="loadMoreDiscs()">{{ moreLoading ? "Cargando…" : "Cargar más discos valorados" }}</button>
            </section>
          </div>
          </div>
        </main>
      </section>
      <DiscDetail v-if="selectedDisc" :disc="selectedDisc" @close="selectedDisc = null" />
    </div>
  </Teleport>
</template>
