<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useArtistDirectory } from "../../application/useArtistDirectory";
import { ARTIST_DIRECTORY_LETTERS } from "../../types/artistDirectory";
import { artistGenrePillBackground } from "../artistGenreColor";
import ArtistDetailsModal from "./ArtistDetailsModal.vue";
import SearchableSelect from "@components/SearchableSelect.vue";

const {
  activeLetter,
  searchText,
  selectedGenreId,
  genres,
  isLoadingGenres,
  isGenreError,
  isDebouncing,
  isSearchingGlobally,
  artists,
  totalItems,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  isError,
  isFetchNextPageError,
  selectLetter,
  selectGenre,
  loadMore,
  retry,
} = useArtistDirectory();
const selectedArtistId = ref<string | null>(null);
const loadMoreSentinel = useTemplateRef<HTMLDivElement>("loadMoreSentinel");
let observer: IntersectionObserver | null = null;
let stopSentinelWatch: (() => void) | null = null;

function requestNextPage(): void {
  if (!hasNextPage.value || isFetchingNextPage.value || isFetchNextPageError.value) return;
  void loadMore();
}

function onScrollFallback(): void {
  const sentinel = loadMoreSentinel.value;
  if (!sentinel) return;
  if (sentinel.getBoundingClientRect().top <= window.innerHeight + 400) requestNextPage();
}

watch(isFetchingNextPage, (isFetching, wasFetching) => {
  const sentinel = loadMoreSentinel.value;
  if (
    wasFetching &&
    !isFetching &&
    hasNextPage.value &&
    !isFetchNextPageError.value
  ) {
    if (observer && sentinel) {
      observer.unobserve(sentinel);
      observer.observe(sentinel);
    } else {
      onScrollFallback();
    }
  }
});

onMounted(() => {
  if (typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) requestNextPage();
      },
      { rootMargin: "0px 0px 400px 0px" }
    );
    stopSentinelWatch = watch(
      loadMoreSentinel,
      (sentinel, _previous, onCleanup) => {
        if (!sentinel) return;
        observer?.observe(sentinel);
        onCleanup(() => observer?.unobserve(sentinel));
      },
      { immediate: true }
    );
    return;
  }
  window.addEventListener("scroll", onScrollFallback, { passive: true });
  onScrollFallback();
});

onBeforeUnmount(() => {
  stopSentinelWatch?.();
  observer?.disconnect();
  window.removeEventListener("scroll", onScrollFallback);
});
</script>

<template>
  <section
    id="artists-directory-panel"
    aria-labelledby="artist-directory-title"
    class="artist-directory"
  >
    <header class="mb-6">
      <h1 id="artist-directory-title" class="text-2xl md:text-3xl font-bold m-0">
        <i class="fa-solid fa-microphone mr-2" aria-hidden="true"></i>Artistas
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Explora el catálogo por nombre.</p>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
        {{ totalItems }} artistas
        <span
          v-if="isSearchingGlobally"
          class="ml-2 inline-flex items-center rounded-full bg-rv-pink/10 px-2 py-0.5 font-semibold text-rv-pink"
        >
          Búsqueda global
        </span>
      </p>
    </header>

    <div class="mb-5 flex flex-col gap-3 sm:flex-row">
      <div class="relative min-w-0 flex-1">
        <i
          class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        ></i>
        <input
          id="artist-directory-search"
          aria-label="Buscar artistas"
          v-model="searchText"
          type="search"
          autocomplete="off"
          placeholder="Buscar por nombre..."
          class="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-rv-navy shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/10 dark:bg-rv-darkCard dark:text-white"
        />
      </div>
      <div class="artist-directory-genre w-full min-w-0 sm:w-56" data-test="artist-directory-genre">
        <SearchableSelect
          :model-value="selectedGenreId"
          :options="genres"
          :loading="isLoadingGenres"
          placeholder="Buscar géneros..."
          trigger-placeholder="Todos los géneros"
          all-label="Todos los géneros"
          title="name"
          trackby="id"
          :max="0"
          @update:model-value="selectGenre(String($event))"
        />
      </div>
    </div>
    <p v-if="isGenreError" class="-mt-3 mb-4 text-xs text-gray-500 dark:text-gray-400" role="status">
      No se pudo cargar el catálogo de géneros.
    </p>

    <nav aria-label="Filtrar artistas por letra" class="mb-6">
      <div class="flex flex-wrap gap-1.5" role="group">
        <button
          v-for="letter in ARTIST_DIRECTORY_LETTERS"
          :key="letter"
          type="button"
          :aria-pressed="activeLetter === letter"
          @click="selectLetter(letter)"
          class="directory-letter rounded-lg border px-2.5 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink focus-visible:ring-offset-2 dark:focus-visible:ring-offset-rv-darkSurface"
          :class="
            activeLetter === letter
              ? 'border-rv-navy bg-rv-navy text-white dark:border-gray-200 dark:bg-gray-200 dark:text-rv-navy'
              : 'border-gray-200 bg-white text-rv-navy hover:border-rv-pink hover:text-rv-pink dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-100 dark:hover:border-rv-pink dark:hover:text-rv-pink'
          "
        >
          {{ letter }}
        </button>
      </div>
    </nav>

    <p
      v-if="isDebouncing"
      class="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
      role="status"
    >
      Actualizando búsqueda…
    </p>

    <div
      v-else-if="isError && artists.length === 0"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center dark:border-red-400/30 dark:bg-red-950/20"
    >
      <p class="mb-3 text-sm text-red-700 dark:text-red-300">No se pudo cargar el directorio.</p>
      <button
        type="button"
        @click="retry()"
        class="rounded-full bg-rv-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:bg-gray-200 dark:text-rv-navy"
      >
        Reintentar
      </button>
    </div>

    <div
      v-else-if="isLoading && artists.length === 0"
      class="flex flex-col items-center justify-center gap-3 py-12"
      role="status"
    >
      <i class="fa-solid fa-compact-disc animate-spin text-3xl text-rv-pink" aria-hidden="true"></i>
      <span class="text-sm font-medium text-rv-navy dark:text-white">Cargando artistas…</span>
    </div>

    <p v-else-if="artists.length === 0" class="py-12 text-center text-gray-500 dark:text-gray-400">
      No se encontraron artistas.
    </p>

    <ul
      v-else
      class="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-label="Artistas"
    >
      <li v-for="artist in artists" :key="artist.id" class="min-w-0">
        <button
          type="button"
          :aria-label="artist.name"
          :aria-pressed="selectedArtistId === artist.id"
          aria-haspopup="dialog"
          :title="artist.name"
          @click="selectedArtistId = artist.id"
          class="artist-pill w-full truncate rounded-full border border-transparent px-3 py-2.5 text-left text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:brightness-110 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-rv-darkSurface"
          :class="
            selectedArtistId === artist.id
              ? 'artist-pill-selected ring-2 ring-rv-pink'
              : ''
          "
          :style="{ backgroundColor: artistGenrePillBackground(artist.genreColor, artist.genre) }"
        >
          <span class="block truncate">{{ artist.name }}</span>
          <span v-if="artist.genre" class="sr-only">Género: {{ artist.genre }}</span>
        </button>
      </li>
    </ul>

    <div v-if="isFetchNextPageError" class="mt-5 text-center" role="alert">
      <p class="mb-2 text-sm text-red-700 dark:text-red-300">
        No se pudo cargar la página siguiente.
      </p>
      <button
        type="button"
        @click="loadMore()"
        class="text-sm font-semibold text-rv-pink underline underline-offset-2"
      >
        Reintentar carga
      </button>
    </div>

    <div
      v-else-if="hasNextPage"
      ref="loadMoreSentinel"
      class="mt-6 flex min-h-12 justify-center"
      role="status"
      aria-live="polite"
      data-test="artist-directory-load-more-sentinel"
    >
      <span v-if="isFetchingNextPage" class="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <i class="fa-solid fa-compact-disc animate-spin text-rv-pink" aria-hidden="true"></i>
        Cargando más artistas…
      </span>
      <span v-else class="sr-only">Se cargarán más artistas al llegar al final de la lista.</span>
    </div>
    <ArtistDetailsModal
      v-if="selectedArtistId"
      :artist-id="selectedArtistId"
      @close="selectedArtistId = null"
      @open-related-artist="selectedArtistId = $event"
    />
  </section>
</template>

<style scoped>
.artist-directory-genre :deep(.search_input_trigger) {
  height: 3rem;
  line-height: 1.25rem;
}
</style>
