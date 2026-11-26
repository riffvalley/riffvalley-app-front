<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/modules/identity/auth";
import { useSavedDiscFilters } from "../../../application/useSavedDiscFilters";
import { savedDiscFilterDateRange } from "../../../application/savedDiscFilterCriteria";
import {
  readDiscListSessionFilters,
  writeDiscListSessionFilters,
} from "../../../application/discListSessionFilters";
import type { SavedDiscFilter } from "../../../types/savedDiscFilter";
import SavedDiscFiltersManagerDialog from "./SavedDiscFiltersManagerDialog.vue";

/** Máximo de filtros guardados que admite el backend por usuario. */
const MAX_SAVED_FILTERS = 20;

const router = useRouter();
const authStore = useAuthStore();
const { filters, isLoading: filtersLoading, isError: filtersError } = useSavedDiscFilters();
const open = ref(false);
const counterLabel = computed(() => `${filters.value.length} / ${MAX_SAVED_FILTERS}`);

/** Deja el filtro como filtros activos de Discos y abre la sección. */
function openInDiscs(filter: SavedDiscFilter) {
  const userId = authStore.userId;
  writeDiscListSessionFilters(userId, {
    week: savedDiscFilterDateRange(filter.filters),
    genreIds: filter.filters.genreIds.map((id) => id.toLowerCase()),
    countryId: filter.filters.countryId ?? "",
    noRatesOnly: readDiscListSessionFilters(userId)?.noRatesOnly ?? false,
  });
  void router.push({ name: "DiscList" });
}
</script>

<template>
  <section
    class="bg-white dark:bg-rv-darkCard rounded-xl shadow p-5 md:p-6"
    data-testid="saved-filters-profile-card"
  >
    <div class="text-center mb-5">
      <span class="bg-rv-navy text-white px-4 py-1 rounded-full text-sm font-bold">Mis filtros</span>
    </div>
    <p class="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed mb-2">
      Revisa, edita, crea o elimina los filtros que usas en Discos.
    </p>
    <p
      class="text-center text-sm font-semibold text-rv-navy dark:text-white mb-4"
      data-testid="saved-filters-counter"
    >
      <template v-if="filtersLoading">Cargando filtros…</template>
      <template v-else-if="filtersError">No se pudieron cargar tus filtros.</template>
      <template v-else>{{ counterLabel }} filtros guardados</template>
    </p>
    <div class="text-center">
      <button
        type="button"
        data-testid="saved-filters-manage"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-rv-pink text-white hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] transition-all duration-200 border-0 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink focus-visible:ring-offset-2"
        @click="open = true"
      >
        <i class="fa-solid fa-filter" aria-hidden="true"></i>
        Gestionar
      </button>
    </div>
  </section>

  <SavedDiscFiltersManagerDialog v-model:open="open" @apply="openInDiscs" />
</template>
