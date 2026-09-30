<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, shallowRef } from "vue";
import DiscFilters from "@components/DiscFilters.vue";
import SimpleSelect from "@components/SimpleSelect.vue";
import { MONTHS, getYearOptions } from "@helpers/dateConstants";
import type { Country, Genre } from "../domain/catalog";
import { applyCalendarArtistUpdate as applyArtistUpdateToGroups, filterStandardCalendar, sameLocalCalendarDay, type CalendarDisc, type CalendarGroup } from "../domain/discCalendar";
import { initializeStandardCalendarGroups, type DiscCalendarPort } from "../application/discCalendar";
import { useCalendarPages } from "./composables/useCalendarPages";
import { useCalendarScroll } from "./composables/useCalendarScroll";
import { formatCalendarDate as formatDate } from "./calendarDate";
import { watch } from "vue";

const props = withDefaults(defineProps<{
  calendarPort: DiscCalendarPort; genres: Genre[]; countries: Country[]; optionsReady: boolean;
  embedded?: boolean; initialDate?: string; focusDiscId?: string;
}>(), { embedded: false, initialDate: "", focusDiscId: "" });
const emit = defineEmits<{ 'load-error': [] }>();
defineSlots<{
  disc(props: {
    disc: CalendarDisc;
    removeDisc: (id: string) => void;
    dateChanged: (id: string, date: string) => void;
    applyArtistUpdate: (artistId: string, update: { name?: string; countryId?: string | null }) => void;
  }): unknown;
  'group-tools'(props: { group: CalendarGroup }): unknown;
}>();
const months = MONTHS;
const yearOptions = getYearOptions();
const initial = computed(() => props.initialDate ? new Date(props.initialDate) : null);
const selectedMonth = shallowRef(props.embedded && initial.value ? initial.value.getMonth() : new Date().getMonth());
const selectedYear = shallowRef(props.embedded && initial.value ? initial.value.getFullYear() : new Date().getFullYear());
const searchQuery = shallowRef("");
const selectedGenre = shallowRef("");
const selectedCountry = shallowRef("");
const groupState = reactive<Record<number, boolean>>({});
const closing = reactive<Record<number, boolean>>({});
const { groupedDiscs, loading, selectCalendarMonth, fetchNext, resetAndFetch, removeDisc } = useCalendarPages(
  props.calendarPort,
  () => { initializeStandardCalendarGroups(groupedDiscs.value); groupedDiscs.value.forEach((_, index) => { groupState[index] = false; }); },
  () => emit('load-error'),
);
const { loadMore, scrollSentinel, showScrollTop, scrollToTop } = useCalendarScroll(fetchNext);
const filteredGroupedDiscs = computed(() => filterStandardCalendar(groupedDiscs.value, searchQuery.value, selectedGenre.value));
const genreOptions = computed(() => props.genres.filter((genre) => genre && genre.id).map((genre) => ({
  id: genre.id, name: genre.name?.trim() ? genre.name : "(Sin nombre)", color: genre.color ?? null,
})));
const toggleGroup = (index: number) => { groupState[index] = !groupState[index]; };
// A changed date removes the card until the next fetch, rather than moving it locally.
const handleDateChange = (id: string, _date: string) => removeDisc(id);
function applyArtistUpdate(artistId: string, update: { name?: string; countryId?: string | null }) {
  groupedDiscs.value = applyArtistUpdateToGroups(groupedDiscs.value, artistId, update);
}
let focusGeneration = 0;
onUnmounted(() => { focusGeneration++; });
async function focusInitialGroup(scroll: boolean) {
  if (!props.embedded || !initial.value) return;
  const index = groupedDiscs.value.findIndex((group) => sameLocalCalendarDay(group.releaseDate, initial.value!));
  if (index >= 0) groupState[index] = true;
  await nextTick();
  if (scroll && props.focusDiscId) document.getElementById(`disc-${props.focusDiscId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}
async function selectMonth(month: number) {
  const generation = ++focusGeneration;
  selectedMonth.value = month;
  const result = await selectCalendarMonth({ year: selectedYear.value, month, country: selectedCountry.value || undefined },
    () => focusInitialGroup(true));
  if (result !== "loaded" || generation !== focusGeneration || !props.embedded || !initial.value || !props.focusDiscId) return;
  await focusInitialGroup(false);
  await new Promise((resolve) => setTimeout(resolve, 380));
  if (generation === focusGeneration) document.getElementById(`disc-${props.focusDiscId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}
watch(selectedYear, () => { void selectMonth(0); });
watch(selectedCountry, () => { void selectMonth(selectedMonth.value); });
onMounted(() => { void selectMonth(initial.value ? initial.value.getMonth() : new Date().getMonth()); });
</script>

<template>
  <div class="max-w-7xl mx-auto mt-10 px-4 sm:px-6 lg:px-8">
  <!-- Sentinel scroll-to-top -->
  <div ref="scrollSentinel" class="h-px w-full"></div>
<template v-if="!embedded">
  <h1 class="text-2xl md:text-3xl font-bold mb-2 text-center text-rv-navy dark:text-white">
    <i class="fa-solid fa-calendar-days mr-3"></i>Calendario
  </h1>
  <p class="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">Todos los lanzamientos ordenados por fecha.</p>
</template>

    <!-- FILTROS SUPERIORES -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start mb-6">
      <DiscFilters :externalRow1="true" :searchQuery="searchQuery" :selectedGenre="selectedGenre"
        :selectedCountry="selectedCountry" :genres="genreOptions" :countries="countries" :showWeekPicker="false"
        :showCountryFilter="true" @update:searchQuery="searchQuery = $event"
        @update:selectedGenre="selectedGenre = $event" @update:selectedCountry="selectedCountry = $event"
        selectClass="w-full min-w-0" @reset-and-fetch="resetAndFetch" />

      <SimpleSelect v-model="selectedYear" :options="yearOptions" placeholder="Año" class="w-full min-w-0" />
    </div>


    <div>
      <div class="flex flex-wrap justify-center gap-2 mb-6 mt-6 py-1">
        <button v-for="(month, index) in months" :key="index" @click="selectMonth(index)"
          class="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shadow-md
                 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0
                 focus:outline-none focus:ring-0 focus:ring-offset-0"
          :class="selectedMonth === index
            ? 'bg-rv-navy dark:bg-rv-purple text-white hover:opacity-80 hover:shadow-lg'
            : 'bg-gray-200 dark:bg-rv-darkSurface text-rv-navy dark:text-white hover:bg-rv-navy hover:text-white dark:hover:bg-rv-purple hover:shadow-lg'">
          {{ month }}
        </button>
      </div>

      <!-- Lista de discos agrupados (resto del template) -->
      <div v-for="(group, index) in filteredGroupedDiscs" :key="group.releaseDate" class="mb-8">
        <div class="group flex justify-between items-center px-5 py-3 rounded-2xl cursor-pointer
                    transition-all duration-200 shadow-sm border border-gray-100 dark:border-white/10
                    hover:-translate-y-0.5 hover:shadow-md"
             :class="(groupState[index] || closing[index])
               ? 'bg-rv-navy dark:bg-rv-purple shadow-md -translate-y-0.5'
               : 'bg-white dark:bg-rv-darkSurface hover:bg-rv-navy dark:hover:bg-rv-purple'"
             @click="toggleGroup(index)">

          <!-- Fecha + conteo -->
          <div class="flex items-center gap-3 min-w-0">
            <h3 class="text-base sm:text-lg font-bold transition-colors duration-200 truncate"
                :class="(groupState[index] || closing[index]) ? 'text-white' : 'text-rv-navy dark:text-white group-hover:text-white'">
              {{ formatDate(group.releaseDate) }}
            </h3>
            <span class="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors"
                  :class="(groupState[index] || closing[index])
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 group-hover:bg-white/20 group-hover:text-white'">
              {{ group.discs.length }} disco{{ group.discs.length !== 1 ? 's' : '' }}
            </span>
          </div>

          <button class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                         bg-rv-pink text-white transition-all focus:outline-none focus:ring-0">
            <i class="fas fa-chevron-down text-xs transition-transform duration-200"
               :class="(groupState[index] || closing[index]) ? 'rotate-180' : ''"></i>
          </button>
        </div>

        <!-- Contenido del grupo desplegable -->
        <transition name="fade-slide" @before-leave="() => (closing[index] = true)"
          @after-leave="() => (closing[index] = false)">
          <!-- ÚNICO hijo raíz del transition -->
          <div v-show="groupState[index]" class="mt-4 overflow-x-auto">
            <!-- Contenedor de botones centrado -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-center gap-2 mt-4 w-full">
              <slot name="group-tools" :group="group" />
            </div>

            <div v-if="optionsReady">
              <ul class="w-full mt-3 flex flex-col gap-3">
                <li v-for="disc in group.discs" :key="disc.id">
                  <div :id="`disc-${disc.id}`">
                    <slot name="disc" :disc="disc" :remove-disc="removeDisc" :date-changed="handleDateChange"
                      :apply-artist-update="applyArtistUpdate" />
                  </div>
                </li>
              </ul>
            </div>
            <div v-else class="text-center text-gray-500 dark:text-gray-300 py-6">
              Cargando géneros y países…
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>

  <!-- Cargar más -->
  <div ref="loadMore" class="flex flex-col items-center justify-center gap-3 py-6">
    <i v-if="loading" class="fa-solid fa-compact-disc animate-spin text-rv-pink text-3xl"></i>
    <span v-if="loading" class="text-sm font-medium text-rv-navy dark:text-white">Cargando discos...</span>
  </div>

  <!-- Botón scroll-to-top -->
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

<style scoped>
.scroll-top-fade-enter-active,
.scroll-top-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.scroll-top-fade-enter-from,
.scroll-top-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}


img {
  border-radius: 4px;
  object-fit: cover;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}

.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
