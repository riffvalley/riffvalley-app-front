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
    <p
      v-if="createdDiscNotice"
      class="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-800/50 dark:bg-green-900/20 dark:text-green-100"
      role="status"
    >
      {{ createdDiscNotice }}
    </p>

    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <form class="disc-list-search min-w-0 w-full" role="search" @submit.prevent>
        <DiscListAutocomplete
          :model-value="searchQuery"
          :selected-artist="selectedArtist"
          :can-create-disc="canCreateDisc"
          @update:model-value="setSearchQuery"
          @select-artist="setSelectedArtist"
          @clear-artist="setSelectedArtist(null)"
          @select-disc="selectSuggestedDisc"
          @create-disc="showCreateDisc = true"
          @request-disc="showRequestDisc = true"
        />
      </form>
      <SavedDiscFilterSelector
        :filters="savedFilters"
        :selected-id="selectedSavedFilterId"
        :applied-id="appliedSavedFilterId"
        :disabled="savedFiltersLoading || savedFiltersError || savedFilters.length === 0 || savedFilterPending"
        @update:selected-id="selectedSavedFilterId = $event"
        @apply="applySelectedSavedFilter"
      />
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" aria-live="polite">
      <p v-if="savedFiltersLoading" class="text-gray-600 dark:text-gray-300" role="status">Cargando filtros guardados…</p>
      <p v-else-if="savedFiltersError" class="text-red-700 dark:text-red-300" role="alert">
        No se pudieron cargar tus filtros guardados.
        <button type="button" class="font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-pink" @click="retrySavedFilters">Reintentar</button>
      </p>
      <p v-else-if="savedFilters.length === 0" class="text-gray-600 dark:text-gray-300">Aún no tienes filtros guardados.</p>
      <template v-if="selectedSavedFilter">
        <span class="text-gray-600 dark:text-gray-300">{{ savedFilters.length }} de 20 filtros</span>
        <span v-if="savedFilters.length >= 20" class="text-amber-800 dark:text-amber-200">Has alcanzado el límite de 20.</span>
        <button type="button" class="font-medium text-rv-navy underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-pink dark:text-white" :disabled="savedFilterPending" @click="beginRenameSavedFilter">Renombrar</button>
        <button type="button" class="font-medium text-red-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-pink dark:text-red-300" :disabled="savedFilterPending" @click="deleteSelectedSavedFilter">Eliminar</button>
      </template>
      <span v-else-if="savedFilters.length >= 20" class="text-amber-800 dark:text-amber-200">Has alcanzado el límite de 20 filtros.</span>
    </div>

    <p v-if="savedFilterNotice" class="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800/50 dark:bg-green-900/20 dark:text-green-100" role="status">
      {{ savedFilterNotice }}
    </p>
    <p v-if="savedFilterErrorNotice" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-100" role="alert">
      {{ savedFilterErrorNotice }}
    </p>
    <p v-if="staleSavedFilterWarning" class="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100" role="alert">
      {{ staleSavedFilterWarning }} Puedes ajustar los filtros de género y país actuales; el filtro guardado no se ha modificado.
    </p>

    <DiscListExplorationFilters
      class="mb-6 w-full"
      :selectedWeek="selectedWeek"
      :selectedCountry="selectedCountry"
      :selectedGenres="selectedGenres"
      :noRatesOnly="noRatesOnly"
      :showNoRatesFilter="viewMode === 'all'"
      :countries="options.countries"
      :genres="options.genres"
      :optionsLoading="optionsLoading"
      :optionsError="Boolean(optionsError)"
      :searchQuery="searchQuery"
      @update:week="setSelectedWeek"
      @update:country="setCountry"
      @update:genres="setGenres"
      @update:no-rates="setNoRatesOnly"
      @update:search="setSearchQuery"
      @retry-options="retryOptions"
    >
      <template #savedActions>
        <span class="text-sm text-gray-700 dark:text-gray-200" role="status">{{ savedCriteriaStatus }}</span>
        <template v-if="modifiedAppliedFilter">
          <button type="button" class="min-h-9 rounded-lg bg-rv-navy px-3 text-sm font-semibold text-white hover:bg-rv-navy/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:opacity-50 dark:bg-gray-200 dark:text-rv-navy" :disabled="savedFilterPending" @click="updateAppliedFilter">Actualizar</button>
          <button v-if="!matchingSavedFilter" type="button" class="min-h-9 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-rv-navy hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:opacity-50 dark:border-white/20 dark:text-white dark:hover:bg-rv-darkSurface" :disabled="savedFilterPending || currentCriteriaEmpty || savedFilters.length >= 20" @click="openSaveFilterModal">Guardar como nuevo</button>
        </template>
        <button v-else-if="!matchingSavedFilter" type="button" class="min-h-9 rounded-lg bg-rv-navy px-3 text-sm font-semibold text-white hover:bg-rv-navy/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-200 dark:text-rv-navy" :disabled="savedFilterPending || currentCriteriaEmpty || savedFilters.length >= 20" @click="openSaveFilterModal">Guardar</button>
      </template>
    </DiscListExplorationFilters>

    <div class="filters-wrap mb-6">
      <label
        for="disc-mode-all"
        class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-lg font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0"
        :class="
          viewMode === 'all'
            ? 'bg-rv-navy text-white dark:bg-gray-200 dark:text-rv-navy'
            : 'bg-gray-200 dark:bg-rv-darkCard text-rv-navy dark:text-white hover:bg-gray-300 dark:hover:bg-rv-darkSurface'
        "
      >
        <input id="disc-mode-all" type="radio" v-model="modeSelection" value="all" class="peer sr-only" />
        Todos los discos <span v-if="totalDisc !== ''">({{ totalDisc }})</span>
      </label>

      <label
        for="disc-mode-rates"
        class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-md font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0"
        :class="
          viewMode === 'rates'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 dark:bg-rv-darkCard text-rv-navy dark:text-white hover:bg-gray-300 dark:hover:bg-rv-darkSurface'
        "
      >
        <input id="disc-mode-rates" type="radio" v-model="modeSelection" value="rates" class="peer sr-only" />
        Mis votos <span v-if="totalRates !== ''">({{ totalRates }})</span>
      </label>

      <label
        for="disc-mode-covers"
        class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-md font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0"
        :class="
          viewMode === 'covers'
            ? 'bg-green-500 text-white'
            : 'bg-gray-200 dark:bg-rv-darkCard text-rv-navy dark:text-white hover:bg-gray-300 dark:hover:bg-rv-darkSurface'
        "
      >
        <input id="disc-mode-covers" type="radio" v-model="modeSelection" value="covers" class="peer sr-only" />
        Mis portadas <span v-if="totalCovers !== ''">({{ totalCovers }})</span>
      </label>

      <label
        for="disc-mode-comments"
        class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-md font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0"
        :class="
          viewMode === 'comments'
            ? 'bg-rv-purple text-white'
            : 'bg-gray-200 dark:bg-rv-darkCard text-rv-navy dark:text-white hover:bg-gray-300 dark:hover:bg-rv-darkSurface'
        "
      >
        <input id="disc-mode-comments" type="radio" v-model="modeSelection" value="comments" class="peer sr-only" />
        Mis comentarios
        <span v-if="totalComments !== ''">({{ totalComments }})</span>
      </label>

      <label
        for="disc-mode-favorites"
        class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-md font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0"
        :class="
          viewMode === 'favorites'
            ? 'bg-red-500 text-white'
            : 'bg-gray-200 dark:bg-rv-darkCard text-rv-navy dark:text-white hover:bg-gray-300 dark:hover:bg-rv-darkSurface'
        "
      >
        <input id="disc-mode-favorites" type="radio" v-model="modeSelection" value="favorites" class="peer sr-only" />
        Favoritos
        <span v-if="totalFavorites !== ''">({{ totalFavorites }})</span>
      </label>

      <label
        for="disc-mode-pendientes"
        class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-md font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0"
        :class="
          viewMode === 'pendientes'
            ? 'bg-yellow-500 text-white'
            : 'bg-gray-200 dark:bg-rv-darkCard text-rv-navy dark:text-white hover:bg-gray-300 dark:hover:bg-rv-darkSurface'
        "
      >
        <input id="disc-mode-pendientes" type="radio" v-model="modeSelection" value="pendientes" class="peer sr-only" />
        Pendientes
        <span v-if="totalPendings !== ''">({{ totalPendings }})</span>
      </label>
    </div>
    <!-- donde hoy tienes el select de orden -->
    <div
      v-if="
        viewMode === 'all' ||
        viewMode === 'rates' ||
        viewMode === 'covers' ||
        viewMode === 'favorites'
      "
      class="mb-6 flex justify-start"
    >
      <SimpleSelect
        class="select-pill w-full md:w-64"
        v-model="orderBy"
        :options="orderOptionsForTab"
        :placeholder="'Ordenar por'"
      />
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
              {{ comment.disc?.artist?.name || "Desconocido" }}
            </span>

            <span class="text-gray-400">–</span>

            <span class="italic text-gray-800 dark:text-gray-200 break-words min-w-0">
              {{ comment.disc?.name }}
            </span>
          </div>

          <div
            class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-300 mb-3"
          >
            <!-- Bandera del país del artista -->
            <div v-if="comment.disc?.artist?.country?.isoCode" class="relative group">
              <template v-if="comment.disc.artist.country.isoCode === 'int'">
                <img
                  src="/int.svg"
                  alt="Internacional"
                  class="rounded-full cursor-help object-cover"
                  style="width: 20px; height: 20px"
                />
              </template>
              <template v-else-if="comment.disc.artist.country.isoCode.length >= 2">
                <CircleFlags
                  :country="comment.disc.artist.country.isoCode.slice(0, 2).toLowerCase()"
                  :show-flag-name="false"
                  class="cursor-help"
                  style="width: 20px; height: 20px"
                />
              </template>
              <span
                class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-[9px] font-semibold text-white bg-rv-navy rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10"
              >
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

          <p
            class="text-sm text-gray-700 dark:text-gray-100 bg-gray-50 dark:bg-rv-darkSurface rounded-xl px-3 py-2 break-all line-clamp-4 sm:line-clamp-none"
          >
            “{{ comment.comment }}”
          </p>

          <p class="mt-2 text-xs text-gray-400">Comentado el {{ formatDate(comment.createdAt) }}</p>
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
        v-for="disc in discs.filter((d) => d.image)"
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
        @card-updated="handleCardUpdated"
      />
    </div>

    <!-- Elemento para disparar la carga adicional -->
    <div ref="loadMore" class="mt-10 flex flex-col items-center justify-center gap-3">
      <i v-if="loading" class="fa-solid fa-compact-disc animate-spin text-rv-pink text-3xl"></i>

      <span v-if="loading" class="text-sm font-medium text-rv-navy dark:text-white">
        Cargando discos...
      </span>
    </div>
    <p v-if="error" class="mt-4 text-center text-sm text-red-700 dark:text-red-300" role="alert">
      No se pudo cargar el listado de discos.
      <button
        type="button"
        class="ml-1 font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-pink"
        @click="refresh"
      >
        Reintentar
      </button>
    </p>
  </div>

  <CreateDiscModal v-if="showCreateDisc" @close="onCreateDiscModalClose" />
  <RequestDiscModal v-if="showRequestDisc" @close="showRequestDisc = false" />
  <SavedDiscFilterModal
    v-if="savedFilterModalMode"
    :mode="savedFilterModalMode"
    :initial-name="savedFilterModalMode === 'rename' ? selectedSavedFilter?.name ?? '' : ''"
    :criteria="currentSavedCriteria"
    :genres="options.genres"
    :countries="options.countries"
    :pending="savedFilterPending"
    :error-message="savedFilterMutationError"
    @close="savedFilterModalMode = null"
    @submit="submitSavedFilterModal"
  />
  <SavedDiscFilterConfirmModal
    v-if="savedFilterConfirmAction"
    :title="savedFilterConfirmTitle"
    :message="savedFilterConfirmMessage"
    :confirm-label="savedFilterConfirmLabel"
    :dangerous="savedFilterConfirmAction === 'delete'"
    :pending="savedFilterPending"
    @close="closeSavedFilterConfirmation"
    @confirm="confirmSavedFilterAction"
  />

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
import { useQueryClient } from "@tanstack/vue-query";
import DiscCard from "@components/DiscCardComponent.vue";
import CreateDiscModal from "../components/CreateDiscModal.vue";
import RequestDiscModal from "../components/RequestDiscModal.vue";
import SimpleSelect from "@components/SimpleSelect.vue";
import DiscListExplorationFilters from "../components/DiscListExplorationFilters.vue";
import DiscListAutocomplete from "../components/DiscListAutocomplete.vue";
import SavedDiscFilterSelector from "../components/SavedDiscFilterSelector.vue";
import SavedDiscFilterModal from "../components/SavedDiscFilterModal.vue";
import SavedDiscFilterConfirmModal from "../components/SavedDiscFilterConfirmModal.vue";
import { useDiscListCoordinator } from "../../application/useDiscListCoordinator";
import { discListSuggestionsQueryKey } from "../../application/useDiscListSuggestions";
import { useSavedDiscFilters } from "../../application/useSavedDiscFilters";
import { getDiscListDateSelection } from "../../application/discListDateFilters";
import { areSavedDiscFilterCriteriaEqual, isEmptySavedDiscFilterCriteria } from "../../application/savedDiscFilterCriteria";
import type { SavedDiscFilterCriteria } from "../../types/savedDiscFilter";
import type { DiscListMode } from "../../types/discList";
import { useAuthStore } from "@/modules/identity/auth";
import { hasMinimumRole } from "@/modules/identity/shared";

const {
  viewMode,
  setMode,
  searchQuery,
  selectedWeek,
  selectedGenres,
  setGenres,
  selectedCountry,
  setCountry,
  noRatesOnly,
  setNoRatesOnly,
  selectedArtist,
  setSelectedArtist,
  setSearchQuery,
  setSelectedWeek,
  applySavedCriteria,
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
  error,
  hasMore,
  loadNextPage,
  options,
  optionsLoading,
  optionsError,
  retryOptions,
  refresh,
  updateDisc,
  removeDisc,
} = useDiscListCoordinator();

const savedFilterState = useSavedDiscFilters();
const savedFilters = savedFilterState.filters;
const savedFiltersLoading = savedFilterState.isLoading;
const savedFiltersError = savedFilterState.isError;
const retrySavedFilters = savedFilterState.retry;
const createSavedFilterMutation = savedFilterState.create;
const updateSavedFilterMutation = savedFilterState.update;
const deleteSavedFilterMutation = savedFilterState.remove;
const savedFilterPending = computed(() =>
  createSavedFilterMutation.isPending.value || updateSavedFilterMutation.isPending.value || deleteSavedFilterMutation.isPending.value
);
const selectedSavedFilterId = ref("");
const appliedSavedFilterId = ref("");
const savedFilterModalMode = ref<"save" | "rename" | null>(null);
const savedFilterConfirmAction = ref<"update" | "delete" | null>(null);
const savedFilterNotice = ref("");
const savedFilterErrorNotice = ref("");
const staleSavedFilterWarning = ref("");
const savedFilterMutationError = ref("");
const selectedSavedFilter = computed(() => savedFilters.value.find((filter) => filter.id === selectedSavedFilterId.value));
const currentSavedCriteria = computed<SavedDiscFilterCriteria>(() => {
  const selection = getDiscListDateSelection(selectedWeek.value);
  const endYear = selectedWeek.value ? new Date(selectedWeek.value[1]).getUTCFullYear() : 0;
  const startYear = selectedWeek.value ? new Date(selectedWeek.value[0]).getUTCFullYear() : 0;
  return {
    genreIds: [...selectedGenres.value],
    countryId: selectedCountry.value || null,
    yearFrom: startYear === 1 ? null : selection.year || null,
    yearTo: endYear === 9999 ? null : endYear || null,
  };
});
const currentCriteriaEmpty = computed(() => isEmptySavedDiscFilterCriteria(currentSavedCriteria.value));
const matchingSavedFilter = computed(() =>
  savedFilters.value.find((filter) => areSavedDiscFilterCriteriaEqual(filter.filters, currentSavedCriteria.value))
);
const appliedSavedFilter = computed(() => savedFilters.value.find((filter) => filter.id === appliedSavedFilterId.value));
const savedFilterConfirmTitle = computed(() => savedFilterConfirmAction.value === "delete" ? "Eliminar filtro guardado" : "Actualizar filtro guardado");
const savedFilterConfirmTarget = computed(() => savedFilterConfirmAction.value === "update"
  ? appliedSavedFilter.value
  : selectedSavedFilter.value);
const savedFilterConfirmMessage = computed(() => {
  const target = savedFilterConfirmTarget.value;
  if (!target) return "El filtro seleccionado ya no está disponible.";
  return savedFilterConfirmAction.value === "delete"
    ? `¿Eliminar el filtro «${target.name}»? Esta acción no se puede deshacer.`
    : `¿Actualizar «${target.name}» con los criterios actuales?`;
});
const savedFilterConfirmLabel = computed(() => savedFilterConfirmAction.value === "delete" ? "Eliminar filtro" : "Actualizar filtro");
const modifiedAppliedFilter = computed(() =>
  Boolean(appliedSavedFilter.value && !areSavedDiscFilterCriteriaEqual(appliedSavedFilter.value.filters, currentSavedCriteria.value) && !currentCriteriaEmpty.value)
);
const savedCriteriaStatus = computed(() => {
  if (matchingSavedFilter.value) return "Guardado";
  return "Sin guardar";
});

function showSavedFilterNotice(message: string) {
  savedFilterErrorNotice.value = "";
  savedFilterNotice.value = message;
  window.setTimeout(() => {
    if (savedFilterNotice.value === message) savedFilterNotice.value = "";
  }, 4000);
}

function getSavedFilterError(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { code?: string; message?: string | string[] } } })?.response;
  if (response?.data?.code === "SAVED_DISC_FILTER_LIMIT_REACHED" || response?.status === 409)
    return "Has alcanzado el límite de 20 filtros guardados.";
  const message = response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string") return message;
  return "No se pudo guardar el filtro. Revisa los datos e inténtalo de nuevo.";
}

function applySelectedSavedFilter(filterId: string) {
  selectedSavedFilterId.value = filterId;
  if (!filterId) {
    applySavedCriteria({ genreIds: [], countryId: null, yearFrom: null, yearTo: null });
    appliedSavedFilterId.value = "";
    staleSavedFilterWarning.value = "";
    return;
  }
  const filter = savedFilters.value.find(({ id }) => id === filterId);
  if (!filter) return;
  applySavedCriteria(filter.filters);
  appliedSavedFilterId.value = filter.id;
  staleSavedFilterWarning.value = filter.missingGenreIds.length || filter.countryMissing
    ? `Este filtro contiene ${filter.missingGenreIds.length ? `${filter.missingGenreIds.length} género(s) que ya no existen` : "un país que ya no existe"}${filter.missingGenreIds.length && filter.countryMissing ? " y un país que ya no existe" : ""}.`
    : "";
}

function openSaveFilterModal() {
  if (currentCriteriaEmpty.value || savedFilters.value.length >= 20) return;
  savedFilterMutationError.value = "";
  savedFilterErrorNotice.value = "";
  savedFilterModalMode.value = "save";
}

function beginRenameSavedFilter() {
  if (!selectedSavedFilter.value) return;
  savedFilterMutationError.value = "";
  savedFilterErrorNotice.value = "";
  savedFilterModalMode.value = "rename";
}

async function submitSavedFilterModal(name: string) {
  savedFilterMutationError.value = "";
  try {
    if (savedFilterModalMode.value === "save") {
      if (currentCriteriaEmpty.value) return;
      const created = (await createSavedFilterMutation.mutateAsync({ name, filters: currentSavedCriteria.value })).result;
      selectedSavedFilterId.value = created.id;
      appliedSavedFilterId.value = "";
      showSavedFilterNotice(`Filtro «${created.name}» guardado.`);
    } else {
      const target = selectedSavedFilter.value;
      if (!target) return;
      const updated = await updateSavedFilterMutation.mutateAsync({ id: target.id, payload: { name } });
      showSavedFilterNotice(`Filtro renombrado a «${updated.result.name}».`);
    }
    savedFilterModalMode.value = null;
  } catch (error) {
    savedFilterMutationError.value = getSavedFilterError(error);
    savedFilterErrorNotice.value = "";
  }
}

function updateAppliedFilter() {
  const target = savedFilters.value.find((filter) => filter.id === appliedSavedFilterId.value);
  if (!target || currentCriteriaEmpty.value) return;
  savedFilterConfirmAction.value = "update";
}

function deleteSelectedSavedFilter() {
  if (!selectedSavedFilter.value) return;
  savedFilterConfirmAction.value = "delete";
}

function closeSavedFilterConfirmation() {
  if (!savedFilterPending.value) savedFilterConfirmAction.value = null;
}

async function confirmSavedFilterAction() {
  const action = savedFilterConfirmAction.value;
  const target = savedFilterConfirmTarget.value;
  if (!action || !target || savedFilterPending.value) return;
  try {
    if (action === "update") {
      if (currentCriteriaEmpty.value) return;
      const updated = await updateSavedFilterMutation.mutateAsync({
        id: target.id,
        payload: { filters: currentSavedCriteria.value },
      });
      showSavedFilterNotice(`Filtro «${updated.result.name}» actualizado.`);
    } else {
      await deleteSavedFilterMutation.mutateAsync(target.id);
      if (appliedSavedFilterId.value === target.id) appliedSavedFilterId.value = "";
      selectedSavedFilterId.value = "";
      showSavedFilterNotice(`Filtro «${target.name}» eliminado.`);
    }
    savedFilterConfirmAction.value = null;
  } catch (error) {
    savedFilterConfirmAction.value = null;
    savedFilterErrorNotice.value = getSavedFilterError(error);
  }
}

const showScrollTop = ref(false);
const showCreateDisc = ref(false);
const showRequestDisc = ref(false);
const authStore = useAuthStore();
const canCreateDisc = computed(() => hasMinimumRole(authStore.role, "riffvalley"));
const createdDiscNotice = ref("");
const queryClient = useQueryClient();
const loadMore = ref<HTMLElement | null>(null);
const scrollSentinel = ref<HTMLElement | null>(null);
const menuVisible = ref(false);
let sentinelObserver: IntersectionObserver | null = null;
let loadMoreObserver: IntersectionObserver | null = null;

const modeSelection = computed({
  get: () => viewMode.value,
  set: (mode: DiscListMode) => setMode(mode),
});

function selectSuggestedDisc(disc: { title: string }) {
  setSelectedArtist(null);
  setSearchQuery(disc.title);
}

type DiscCardUpdateEvent =
  | {
      type: "rating";
      discId: string;
      rateId: string | null;
      rate: number | null;
      cover: number | null;
      hasMusicalRate: boolean;
      hasCover: boolean;
      averageRate: number | null;
      averageCover: number | null;
      voteCount: number;
    }
  | {
      type: "community";
      discId: string;
      favoriteId: string | null;
      pendingId: string | null;
    };

function handleCardUpdated(event: DiscCardUpdateEvent) {
  const disc = discs.value.find(({ id }) => id === event.discId);
  if (!disc) return;

  if (event.type === "rating") {
    const previouslyHadRate = (disc.userRate?.rate ?? 0) > 0;
    const previouslyHadCover = (disc.userRate?.cover ?? 0) > 0;
    const noLongerMatchesUnvotedMode =
      viewMode.value === "all" &&
      ((orderBy.value === "UNVOTED:rate" && event.hasMusicalRate && !previouslyHadRate) ||
        (orderBy.value === "UNVOTED:cover" && event.hasCover && !previouslyHadCover));

    updateDisc(event.discId, {
      averageRate: event.averageRate,
      averageCover: event.averageCover,
      voteCount: event.voteCount,
      userRate: event.rateId
        ? { id: event.rateId, rate: event.rate, cover: event.cover }
        : disc.userRate,
    });
    if (noLongerMatchesUnvotedMode) removeDisc(event.discId);
    return;
  }

  const noLongerMatchesCommunityMode =
    (viewMode.value === "favorites" && !event.favoriteId) ||
    (viewMode.value === "pendientes" && !event.pendingId);
  updateDisc(event.discId, {
    favoriteId: event.favoriteId,
    pendingId: event.pendingId,
  });
  if (noLongerMatchesCommunityMode) removeDisc(event.discId);
}

function onCreateDiscModalClose(result: { createdDisc: { id: string } | null }) {
  showCreateDisc.value = false;
  if (!result.createdDisc) return;

  refresh();
  void queryClient.invalidateQueries({ queryKey: discListSuggestionsQueryKey });
  createdDiscNotice.value =
    "El disco se ha creado y el listado se ha actualizado con los criterios actuales. Si no aparece, revisa el texto y los filtros activos; no se han cambiado.";
}

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

@media (min-width: 1280px) {
}

.search__input::placeholder {
  color: #9ca3af;
}

.scroll-top-fade-enter-active,
.scroll-top-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.scroll-top-fade-enter-from,
.scroll-top-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
