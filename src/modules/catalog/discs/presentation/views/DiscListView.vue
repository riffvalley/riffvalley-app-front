<template>
  <div :class="{ 'menu-open': menuVisible }" class="max-w-[100rem] mx-auto mt-10 px-4">
<!-- Sentinel: cuando sale del viewport → mostrar botón scroll-top -->
<div ref="scrollSentinel" class="h-px w-full"></div>
<h1 class="text-2xl md:text-3xl font-bold mb-2 text-center text-rv-navy dark:text-white">
  <i class="fa-solid fa-compact-disc mr-3"></i>Discos
</h1>
<p class="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">
  Vota, guarda y descubre lanzamientos desde 2025 en adelante.
</p>

    <DiscFilters :searchQuery="searchQuery" :selectedGenre="selectedGenre" :selectedWeek="selectedWeek" :genres="genres"
      :selectedCountry="selectedCountry" :countries="countries" @update:searchQuery="searchQuery = $event"
      @update:selectedGenre="selectedGenre = $event" @update:selectedWeek="selectedWeek = $event"
      @update:selectedCountry="selectedCountry = $event" selectClass="w-full" wrapperClass=""
      />

    <div class="filters-wrap mb-6">
      <label class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-lg font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0"
:class="viewMode === 'all'
  ? 'bg-rv-navy text-white dark:bg-gray-200 dark:text-rv-navy'
  : 'bg-gray-200 dark:bg-rv-darkCard text-rv-navy dark:text-white hover:bg-gray-300 dark:hover:bg-rv-darkSurface'
">
        <input type="radio" v-model="modeSelection" value="all" class="hidden" />
        Todos los discos <span v-if="totalDisc !== ''">({{ totalDisc }})</span>
      </label>

      <label class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-md font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0"
        :class="viewMode === 'rates'
          ? 'bg-blue-500 text-white'
          : 'bg-gray-200 dark:bg-rv-darkCard text-rv-navy dark:text-white hover:bg-gray-300 dark:hover:bg-rv-darkSurface'
          ">
        <input type="radio" v-model="modeSelection" value="rates" class="hidden" />
        Mis votos <span v-if="totalRates !== ''">({{ totalRates }})</span>
      </label>

      <label class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-md font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0"
        :class="viewMode === 'covers'
          ? 'bg-green-500 text-white'
          : 'bg-gray-200 dark:bg-rv-darkCard text-rv-navy dark:text-white hover:bg-gray-300 dark:hover:bg-rv-darkSurface'
          ">
        <input type="radio" v-model="modeSelection" value="covers" class="hidden" />
        Mis portadas <span v-if="totalCovers !== ''">({{ totalCovers }})</span>
      </label>

      <label
  class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-md font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0"
  :class="viewMode === 'comments'
    ? 'bg-rv-purple text-white'
    : 'bg-gray-200 dark:bg-rv-darkCard text-rv-navy dark:text-white hover:bg-gray-300 dark:hover:bg-rv-darkSurface'
  "
>
  <input type="radio" v-model="modeSelection" value="comments" class="hidden" />
  Mis comentarios
  <span v-if="totalComments !== ''">({{ totalComments }})</span>
</label>

      <label class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-md font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0"
        :class="viewMode === 'favorites'
          ? 'bg-red-500 text-white'
          : 'bg-gray-200 dark:bg-rv-darkCard text-rv-navy dark:text-white hover:bg-gray-300 dark:hover:bg-rv-darkSurface'
          ">
        <input type="radio" v-model="modeSelection" value="favorites" class="hidden" />
        Favoritos
        <span v-if="totalFavorites !== ''">({{ totalFavorites }})</span>
      </label>

      <label class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-md font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0"
        :class="viewMode === 'pendientes'
          ? 'bg-yellow-500 text-white'
          : 'bg-gray-200 dark:bg-rv-darkCard text-rv-navy dark:text-white hover:bg-gray-300 dark:hover:bg-rv-darkSurface'
          ">
        <input type="radio" v-model="modeSelection" value="pendientes" class="hidden" />
        Pendientes
        <span v-if="totalPendings !== ''">({{ totalPendings }})</span>
      </label>
    </div>
    <!-- donde hoy tienes el select de orden -->
<div
  v-if="viewMode === 'all' || viewMode === 'rates' || viewMode === 'covers' || viewMode === 'favorites'"
  class="mb-6 flex justify-start"
>
      <SimpleSelect class="select-pill w-full md:w-64" v-model="orderBy" :options="orderOptionsForTab"
        :placeholder="'Ordenar por'" />
    </div>

    <!-- Contenedor de cuadrícula para las tarjetas -->
<!-- Listado de comentarios -->
<div v-if="viewMode === 'comments'" class="space-y-4 overflow-x-hidden">
  <div
    v-for="comment in userComments"
    :key="comment.id"
    class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-md border border-gray-100 dark:border-white/20 p-4 flex flex-col sm:flex-row gap-4"
  >
    <img
      :src="comment.disc?.image"
      :alt="comment.disc?.name"
      class="w-full h-44 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 bg-gray-100 dark:bg-rv-darkSurface"
    />

    <div class="flex-1 min-w-0">
      <div class="flex flex-wrap items-center gap-2 mb-1">
        <span class="font-bold text-rv-navy dark:text-white break-words min-w-0">
          {{ comment.disc?.artist?.name || 'Desconocido' }}
        </span>

        <span class="text-gray-400">–</span>

        <span class="italic text-gray-800 dark:text-gray-200 break-words min-w-0">
          {{ comment.disc?.name }}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-300 mb-3">
        <!-- Bandera del país del artista -->
        <div v-if="comment.disc?.artist?.country?.isoCode" class="relative group">
          <template v-if="comment.disc.artist.country.isoCode === 'int'">
            <img src="/int.svg" alt="Internacional" class="rounded-full cursor-help object-cover"
              style="width: 20px; height: 20px;" />
          </template>
          <template v-else-if="comment.disc.artist.country.isoCode.length >= 2">
            <CircleFlags :country="comment.disc.artist.country.isoCode.slice(0, 2).toLowerCase()"
              :show-flag-name="false" class="cursor-help" style="width: 20px; height: 20px;" />
          </template>
          <span class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-[9px] font-semibold
            text-white bg-rv-navy rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300
            whitespace-nowrap z-10">
            {{ comment.disc.artist.country.name }}
          </span>
        </div>

        <span
          v-if="comment.disc?.genre?.name"
          class="px-2 py-0.5 rounded-full text-white"
          :style="{ backgroundColor: comment.disc?.genre?.color || '#1f2937' }"
        >
          {{ comment.disc.genre.name }}
        </span>

        <span v-if="comment.disc?.releaseDate">
          {{ formatDate(comment.disc.releaseDate) }}
        </span>
      </div>

      <p class="text-sm text-gray-700 dark:text-gray-100 bg-gray-50 dark:bg-rv-darkSurface rounded-xl px-3 py-2 break-all line-clamp-4 sm:line-clamp-none">
        “{{ comment.comment }}”
      </p>

      <p class="mt-2 text-xs text-gray-400">
        Comentado el {{ formatDate(comment.createdAt) }}
      </p>
    </div>
  </div>

  <p
    v-if="!loading && userComments.length === 0"
    class="text-center text-gray-500 dark:text-gray-300 text-sm mt-8"
  >
    Todavía no has escrito comentarios.
  </p>
</div>

<!-- Contenedor de cuadrícula para las tarjetas -->
<div v-else class="cards-grid">
  <DiscCard
    v-for="disc in discs.filter(d => d.image)"
    :key="disc.id"
    :id="disc.id"
    :ep="disc.ep"
    :artistCountry="disc.artist?.country"
    :image="disc.image"
    :name="disc.name"
    :releaseDate="disc.releaseDate"
    :artistName="disc.artist?.name || 'Desconocido'"
    :genreName="disc.genre?.name"
    :genreColor="disc.genre?.color"
    :link="disc.link"
    :averageRate="disc.averageRate"
    :averageCover="disc.averageCover"
    :rate="disc.userRate?.rate"
    :cover="disc.userRate?.cover"
    :isNew="!disc.userRate"
    :userDiscRate="disc.userRate?.id"
    :favoriteId="disc.favoriteId"
    :pendingId="disc.pendingId"
    :comment-count="disc.commentCount"
    :rateCount="disc.voteCount"
    :debut="disc.debut"
  />
</div>

    <!-- Elemento para disparar la carga adicional -->
<div
  ref="loadMore"
  class="mt-10 flex flex-col items-center justify-center gap-3"
>
  <i
    v-if="loading"
    class="fa-solid fa-compact-disc animate-spin text-rv-pink text-3xl"
  ></i>

  <span
    v-if="loading"
    class="text-sm font-medium text-rv-navy dark:text-white"
  >
    Cargando discos...
  </span>
</div>
  </div>

  <!-- Botón volver arriba -->
  <Transition name="scroll-top-fade">
    <button
      v-if="showScrollTop"
      @click="scrollToTop"
      class="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-rv-pink hover:opacity-80 text-white shadow-lg flex items-center justify-center"
      title="Volver arriba"
    >
      <i class="fa-solid fa-chevron-up text-sm"></i>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import DiscCard from "@components/DiscCardComponent.vue";
import { useCatalogStore } from "@stores/catalog/catalog";
import DiscFilters from "@components/DiscFilters.vue";
import SimpleSelect from "@components/SimpleSelect.vue";
import { useDiscListCoordinator } from "../../application/useDiscListCoordinator";
import type { DiscListMode } from "../../types/discList";

const catalogStore = useCatalogStore();
const {
  viewMode,
  setMode,
  searchQuery,
  selectedWeek,
  selectedGenre,
  selectedCountry,
  orderBy,
  discs,
  userComments,
  totalDisc,
  totalRates,
  totalCovers,
  totalFavorites,
  totalPendings,
  totalComments,
  loading,
  hasMore,
  loadNextPage,
} = useDiscListCoordinator();

const showScrollTop = ref(false);
const loadMore = ref<HTMLElement | null>(null);
const scrollSentinel = ref<HTMLElement | null>(null);
const menuVisible = ref(false);
let sentinelObserver: IntersectionObserver | null = null;
let loadMoreObserver: IntersectionObserver | null = null;

const modeSelection = computed({
  get: () => viewMode.value,
  set: (mode: DiscListMode) => setMode(mode),
});
const genres = computed(() => catalogStore.genres);
const countries = computed(() => catalogStore.countries);

const ORDER = {
  NEWS_DESC: { label: "Más recientes", value: "disc.releaseDate:DESC,artist.name:ASC" },
  DATE_ASC: { label: "Más antiguos", value: "disc.releaseDate:ASC,artist.name:ASC" },
  RATE_DESC: { label: "Nota", value: "rate.rate:DESC,disc.releaseDate:DESC", icon: "up" },
  RATE_ASC: { label: "Nota", value: "rate.rate:ASC,disc.releaseDate:DESC", icon: "down" },
  AVG_RATE_DESC: {
    label: "Nota",
    value: "disc.averageRate:DESC,disc.releaseDate:DESC",
    icon: "up",
  },
  AVG_RATE_ASC: {
    label: "Nota",
    value: "disc.averageRate:ASC,disc.releaseDate:DESC",
    icon: "down",
  },
  COVER_DESC: { label: "Portada", value: "rate.cover:DESC,artist.name:ASC", icon: "up" },
  COVER_ASC: { label: "Portada", value: "rate.cover:ASC,artist.name:ASC", icon: "down" },
  UNVOTED_RATE: { label: "Discos sin votar", value: "UNVOTED:rate" },
  UNVOTED_COVER: { label: "Portadas sin votar", value: "UNVOTED:cover" },
};

const orderOptionsForTab = computed(() => {
  switch (viewMode.value) {
    case "rates":
      return [ORDER.NEWS_DESC, ORDER.DATE_ASC, ORDER.RATE_DESC, ORDER.RATE_ASC];
    case "covers":
      return [ORDER.NEWS_DESC, ORDER.DATE_ASC, ORDER.COVER_DESC, ORDER.COVER_ASC];
    case "favorites":
      return [
        ORDER.NEWS_DESC,
        ORDER.DATE_ASC,
        ORDER.RATE_DESC,
        ORDER.RATE_ASC,
        ORDER.COVER_DESC,
        ORDER.COVER_ASC,
      ];
    default:
      return [
        ORDER.NEWS_DESC,
        ORDER.DATE_ASC,
        ORDER.AVG_RATE_DESC,
        ORDER.AVG_RATE_ASC,
        ORDER.UNVOTED_RATE,
        ORDER.UNVOTED_COVER,
      ];
  }
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const checkIfNeedsMore = () => {
  if (!hasMore.value || loading.value || !loadMore.value) return;
  if (loadMore.value.getBoundingClientRect().top < window.innerHeight) {
    void loadNextPage();
  }
};

const scrollToTop = () => {
  let el: Element | null = scrollSentinel.value?.parentElement ?? null;
  while (el) {
    if (el.scrollTop > 0) {
      el.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (el === document.documentElement) break;
    el = el.parentElement;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
};

watch(loading, async (isLoading) => {
  if (isLoading) return;
  await nextTick();
  checkIfNeedsMore();
});

onMounted(() => {
  loadMoreObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) void loadNextPage();
  });
  if (loadMore.value) loadMoreObserver.observe(loadMore.value);

  sentinelObserver = new IntersectionObserver(
    ([entry]) => {
      showScrollTop.value = !entry.isIntersecting;
    },
    { threshold: 0 }
  );
  if (scrollSentinel.value) sentinelObserver.observe(scrollSentinel.value);
});

onUnmounted(() => {
  loadMoreObserver?.disconnect();
  sentinelObserver?.disconnect();
});
</script>

<style scoped>
/* Evita el salto de layout al aparecer/desaparecer la scrollbar */
:global(html) {
  scrollbar-gutter: stable;
}

.cards-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  align-items: start;
}

.filters-wrap {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.filters-wrap label {
  text-align: center;
  justify-content: center;
}

@media (min-width: 640px) {
  .filters-wrap {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
}

input[type="checkbox"] {
  margin-right: 0.5rem;
}

.custom-height-select .search_input_trigger {
  height: 26px;
  padding: 0.6rem 0.75rem;
  font-size: 1rem;
  font-weight: 500;
}

.search__input::placeholder {
  color: #9ca3af;
}

.scroll-top-fade-enter-active,
.scroll-top-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.scroll-top-fade-enter-from,
.scroll-top-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
