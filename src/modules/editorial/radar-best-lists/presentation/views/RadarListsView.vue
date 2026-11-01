<template>
  <div class="min-h-screen bg-gray-50 dark:bg-rv-darkBg p-4 md:p-6">
    <div class="max-w-7xl mx-auto">
      <!-- Cabecera -->
      <div class="flex items-center justify-between mb-6">
        <h1
          class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
        >
          <i class="fa-solid fa-compact-disc text-rv-purple"></i>
          Radares
        </h1>
      </div>

      <!-- Actuales: las aún abiertas, el próximo viernes y el siguiente -->
      <section class="mb-8">
        <div class="flex items-center gap-2 mb-4">
          <div
            class="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0"
          >
            <i class="fa-solid fa-bolt text-amber-500 dark:text-amber-400 text-sm"></i>
          </div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Actuales</h2>
          <span
            v-if="currentLists.length > 0"
            class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
          >
            {{ currentLists.length }}
          </span>
        </div>

        <ListQueryStatus
          :loading="currentLoading"
          :retrying="currentRetrying"
          :error="currentError"
          @retry="currentQuery.refetch()"
        />

        <div v-if="currentHasResults" :class="gridClass">
          <RadarListCard
            v-for="list in currentLists"
            :key="list.id"
            :list="list"
            @open="goToListDetail"
          />
        </div>

        <div
          v-else-if="currentEmpty"
          class="bg-white dark:bg-rv-darkCard rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-10 text-center"
        >
          <div
            class="w-12 h-12 bg-gray-50 dark:bg-rv-darkSurface rounded-2xl flex items-center justify-center mx-auto mb-3"
          >
            <i class="fa-solid fa-compact-disc text-gray-300 dark:text-gray-600 text-xl"></i>
          </div>
          <p class="font-semibold text-gray-900 dark:text-white mb-1">No hay radares activos</p>
          <p class="text-sm text-gray-400 dark:text-gray-500">
            Las nuevas listas de radar aparecerán aquí.
          </p>
        </div>
      </section>

      <!-- Futuras: más allá de las dos próximas semanas -->
      <CollapsibleSection
        v-if="futureLists.length > 0"
        v-model:open="showFuture"
        class="mb-8"
        title="Futuras"
        icon="fa-solid fa-forward"
        :count="futureLists.length"
        icon-wrap-class="bg-blue-100 dark:bg-blue-900/30"
        icon-class="text-blue-500 dark:text-blue-400"
      >
        <div :class="gridClass">
          <RadarListCard
            v-for="list in futureLists"
            :key="list.id"
            :list="list"
            @open="goToListDetail"
          />
        </div>
      </CollapsibleSection>

      <!-- Anteriores -->
      <CollapsibleSection
        v-model:open="showPast"
        title="Anteriores"
        icon="fa-solid fa-clock-rotate-left"
      >
        <ListQueryStatus
          :loading="pastLoading"
          :retrying="pastRetrying"
          :error="pastError"
          @retry="pastQuery.refetch()"
        />
        <div class="flex gap-2 mb-4">
          <select
            v-model.number="selectedYear"
            aria-label="Año de los radares anteriores"
            class="bg-white dark:bg-rv-darkCard border-0 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 font-medium shadow-sm focus:ring-2 focus:ring-rv-purple/30 cursor-pointer"
          >
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
          <select
            v-model.number="selectedMonth"
            aria-label="Mes de los radares anteriores"
            class="bg-white dark:bg-rv-darkCard border-0 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 font-medium shadow-sm focus:ring-2 focus:ring-rv-purple/30 cursor-pointer min-w-[120px]"
          >
            <option v-for="(monthName, index) in monthNames" :key="index" :value="index + 1">
              {{ monthName }}
            </option>
          </select>
        </div>

        <div v-if="pastHasResults" :class="gridClass">
          <RadarListCard
            v-for="list in pastLists"
            :key="list.id"
            :list="list"
            closed
            @open="goToListDetail"
          />
        </div>

        <div
          v-else-if="pastEmpty"
          class="bg-white dark:bg-rv-darkCard rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-10 text-center"
        >
          <div
            class="w-12 h-12 bg-gray-50 dark:bg-rv-darkSurface rounded-2xl flex items-center justify-center mx-auto mb-3"
          >
            <i class="fa-regular fa-folder-open text-gray-300 dark:text-gray-600 text-xl"></i>
          </div>
          <p class="font-semibold text-gray-900 dark:text-white mb-1">Sin radares este mes</p>
          <p class="text-sm text-gray-400 dark:text-gray-500">
            No hay listas para {{ monthNames[selectedMonth - 1] }} de {{ selectedYear }}.
          </p>
        </div>
      </CollapsibleSection>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { MONTHS } from "@helpers/dateConstants";
import RadarListCard from "../components/RadarListCard.vue";
import CollapsibleSection from "../components/CollapsibleSection.vue";
import ListQueryStatus from "../components/ListQueryStatus.vue";
import {
  useRadarCurrentListsQuery,
  useRadarPastListsQuery,
} from "../../application/useRadarBestListsQueries";
import { classifyRadarLists } from "../../application/radarListClassification";
import { useRadarListFilters } from "../composables/useRadarListFilters";

const router = useRouter();
const gridClass =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4";

const showFuture = ref(false);
const showPast = ref(false);

const { selectedYear, selectedMonth, availableYears } = useRadarListFilters();
const currentQuery = useRadarCurrentListsQuery();
const pastQuery = useRadarPastListsQuery(selectedYear, selectedMonth);
const openLists = computed(() => currentQuery.data.value ?? []);
const classifiedLists = computed(() => classifyRadarLists(openLists.value));
const currentLists = computed(() => classifiedLists.value.current);
const futureLists = computed(() => classifiedLists.value.future);
const pastLists = computed(() => pastQuery.data.value ?? []);
const currentLoading = computed(
  () =>
    currentQuery.isPending.value &&
    currentQuery.isFetching.value &&
    currentQuery.failureCount.value === 0
);
const currentRetrying = computed(
  () => currentQuery.isFetching.value && currentQuery.failureCount.value > 0
);
const currentError = computed(() => currentQuery.isError.value && !currentQuery.isFetching.value);
const currentHasResults = computed(() => (currentQuery.data.value?.length ?? 0) > 0);
const currentEmpty = computed(
  () => currentQuery.isSuccess.value && currentLists.value.length === 0
);
const pastLoading = computed(
  () =>
    pastQuery.isPending.value && pastQuery.isFetching.value && pastQuery.failureCount.value === 0
);
const pastRetrying = computed(() => pastQuery.isFetching.value && pastQuery.failureCount.value > 0);
const pastError = computed(() => pastQuery.isError.value && !pastQuery.isFetching.value);
const pastHasResults = computed(() => (pastQuery.data.value?.length ?? 0) > 0);
const pastEmpty = computed(() => pastQuery.isSuccess.value && pastLists.value.length === 0);

const monthNames = MONTHS;

function goToListDetail(id: string) {
  router.push(`/discos/radar/${id}`);
}
</script>
