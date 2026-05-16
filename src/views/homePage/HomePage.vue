<template>
  <div class="max-w-[100rem] mx-auto mt-10 px-4">

    <!-- Título + subtítulo + botón -->
    <div class="flex flex-col items-center justify-center py-8 gap-2">
      <h2 class="text-2xl md:text-3xl font-bold text-rv-navy dark:text-white text-center">
        <i class="fa-solid fa-compact-disc mr-2"></i>Mejores discos
      </h2>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <p class="text-sm md:text-base text-gray-600 dark:text-gray-300">
          Solo top 20 discos mejor valorados
        </p>

        <router-link :to="{ name: 'DiscList' }" class="group inline-flex items-center gap-2
             px-4 py-1.5 rounded-full shadow-md text-sm font-medium transition-all duration-200
             bg-gray-200 dark:bg-rv-darkSurface text-rv-navy dark:text-white
             hover:bg-rv-navy hover:text-white dark:hover:bg-rv-purple hover:-translate-y-0.5 hover:shadow-lg
             active:scale-[0.97] active:translate-y-0
             border-0 outline-none focus:outline-none focus-visible:outline-none
             ring-0 focus:ring-0 focus-visible:ring-0">
          <i class="fa-solid fa-arrow-up rotate-45 transition-colors duration-200 group-hover:text-white"></i>
          <span>Ver todos los Discos</span>
        </router-link>
      </div>
    </div>

    <!-- Filtros -->
    <div>
      <DiscFilters :selectedGenre="selectedGenre" :selectedCountry="selectedCountry" :selectedWeek="null"
        :genres="genres" :countries="countries" :showWeekPicker="false" :showSearchQuery="false" selectClass="w-full"
        wrapperClass="w-full" @update:selectedGenre="selectedGenre = $event"
        @update:selectedCountry="selectedCountry = $event" @resetAndFetch="fetchDiscs" />
    </div>

    <!-- Botones de periodo + selector de rango -->
    <div class="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-5 mt-6 mb-8">

      <button @click="selectedPeriod = 'week'"
        :class="selectedPeriod === 'week'
          ? 'bg-rv-navy dark:bg-rv-purple text-white font-semibold hover:opacity-80 hover:shadow-lg'
          : 'bg-gray-200 dark:bg-rv-darkSurface text-rv-navy dark:text-white hover:bg-rv-navy hover:text-white dark:hover:bg-rv-purple hover:shadow-lg'"
        class="px-4 py-1.5 rounded-full shadow-md text-sm font-medium
               transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0
               border-0 outline-none focus:outline-none focus-visible:outline-none
               ring-0 focus:ring-0 focus-visible:ring-0">
        Semana
      </button>

      <button @click="selectedPeriod = 'month'"
        :class="selectedPeriod === 'month'
          ? 'bg-rv-navy dark:bg-rv-purple text-white font-semibold hover:opacity-80 hover:shadow-lg'
          : 'bg-gray-200 dark:bg-rv-darkSurface text-rv-navy dark:text-white hover:bg-rv-navy hover:text-white dark:hover:bg-rv-purple hover:shadow-lg'"
        class="px-4 py-1.5 rounded-full shadow-md text-sm font-medium
               transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0
               border-0 outline-none focus:outline-none focus-visible:outline-none
               ring-0 focus:ring-0 focus-visible:ring-0">
        Mes
      </button>

      <button @click="selectedPeriod = 'year'"
        :class="selectedPeriod === 'year'
          ? 'bg-rv-navy dark:bg-rv-purple text-white font-semibold hover:opacity-80 hover:shadow-lg'
          : 'bg-gray-200 dark:bg-rv-darkSurface text-rv-navy dark:text-white hover:bg-rv-navy hover:text-white dark:hover:bg-rv-purple hover:shadow-lg'"
        class="px-4 py-1.5 rounded-full shadow-md text-sm font-medium
               transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0
               border-0 outline-none focus:outline-none focus-visible:outline-none
               ring-0 focus:ring-0 focus-visible:ring-0">
        Año
      </button>

      <button @click="{ selectedPeriod = 'all'; fetchDiscs(); }"
        :class="selectedPeriod === 'all'
          ? 'bg-rv-navy dark:bg-rv-purple text-white font-semibold hover:opacity-80 hover:shadow-lg'
          : 'bg-gray-200 dark:bg-rv-darkSurface text-rv-navy dark:text-white hover:bg-rv-navy hover:text-white dark:hover:bg-rv-purple hover:shadow-lg'"
        class="px-4 py-1.5 rounded-full shadow-md text-sm font-medium
               transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0
               border-0 outline-none focus:outline-none focus-visible:outline-none
               ring-0 focus:ring-0 focus-visible:ring-0">
        Todos
      </button>

      <div v-if="selectedPeriod !== 'all'" class="relative flex gap-4">
        <div class="relative">
          <select v-model="selectedOption" @change="fetchDiscs" class="min-w-[12rem] px-4 pr-9 py-1.5 rounded-full shadow-md text-sm font-semibold
         bg-rv-navy dark:bg-rv-purple text-white appearance-none cursor-pointer
         border border-transparent dark:border-white/10
         transition-all duration-200 hover:-translate-y-0.5 hover:opacity-80 hover:shadow-lg
         focus:outline-none">
            <option v-for="option in optionsForSelect" :key="option.label" :value="option">
              {{ option.label }}
            </option>
          </select>
          <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <div v-if="selectedPeriod === 'week' || selectedPeriod === 'month'" class="relative">
          <select v-model="selectedYear" class="min-w-[6rem] px-4 pr-9 py-1.5 rounded-full shadow-md text-sm font-semibold
         bg-rv-navy dark:bg-rv-purple text-white appearance-none cursor-pointer
         border border-transparent dark:border-white/10
         transition-all duration-200 hover:-translate-y-0.5 hover:opacity-80 hover:shadow-lg
         focus:outline-none">
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
          <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Scroll to top (solo móvil) -->
    <Transition name="scroll-top-fade">
      <button
        v-if="showScrollTop"
        @click="scrollToTop"
        class="sm:hidden fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-rv-pink hover:opacity-80 text-white shadow-lg flex items-center justify-center"
        title="Volver arriba"
      >
        <i class="fa-solid fa-chevron-up text-sm"></i>
      </button>
    </Transition>

    <!-- Grid de Discos -->
    <div class="disc-grid gap-6">
      <DiscCard v-for="disc in discs" :key="disc.id" :id="disc.id" :ep="disc.ep" :image="disc.image" :name="disc.name"
        :releaseDate="disc.releaseDate" :artistName="disc.artist?.name" :genreName="disc.genre?.name"
        :genreColor="disc.genre?.color" :link="disc.link" :averageRate="disc.averageRate"
        :averageCover="disc.averageCover" :rate="disc.userRate?.rate" :cover="disc.userRate?.cover"
        :isNew="!disc.userRate" :userDiscRate="disc.userRate?.id" :favoriteId="disc.userFavoriteId"
        :pendingId="disc.pendingId" :comment-count="disc.commentCount" :rateCount="disc.voteCount"
        :artistCountry="disc.artist?.country" :debut="disc.debut" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, computed, watch } from "vue";
import { getTopRatedOrFeaturedAndStats } from "@services/discs/discs";
import type { Disc } from "@services/discs/disc";
import DiscCard from "@components/DiscCardComponent.vue";
import DiscFilters from "@components/DiscFilters.vue";
import { useCatalogStore } from "@stores/catalog/catalog";
import { getAvailableYears } from "@helpers/dateConstants";

export default defineComponent({
  name: "RankingsPage",
  components: { DiscCard, DiscFilters },
  setup() {
    const discs = ref<Disc[]>([]);
    const selectedPeriod = ref("week");
    const selectedYear = ref(new Date().getFullYear());
    const selectedOption = ref<{ start: string; end: string; label: string } | null>(null);
    const catalogStore = useCatalogStore();
    const selectedGenre = ref("");
    const selectedCountry = ref("");

    const availableYears = computed(() => [...getAvailableYears()].reverse());

    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const weekOptions = computed(() => {
      const options: Array<{ start: string; end: string; label: string }> = [];
      const year = selectedYear.value;
      const currentYear = new Date().getFullYear();
      const isCurrentYear = year === currentYear;

      let firstFriday = new Date(year, 0, 1);
      while (firstFriday.getDay() !== 5) firstFriday.setDate(firstFriday.getDate() + 1);

      let endLimitDate: Date;
      if (isCurrentYear) {
        const today = new Date();
        const offset = (today.getDay() - 5 + 7) % 7;
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - offset);
        endLimitDate = currentWeekStart;
      } else {
        endLimitDate = new Date(year, 11, 31);
      }

      const monthNames = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
      let current = new Date(firstFriday);
      while (current <= endLimitDate) {
        if (current.getFullYear() > year) break;
        const startDate = new Date(current);
        const endDate = new Date(current);
        endDate.setDate(current.getDate() + 6);
        options.push({
          start: formatLocalDate(startDate),
          end: formatLocalDate(endDate),
          label: `${startDate.getDate()}-${endDate.getDate()} ${monthNames[startDate.getMonth()]}`,
        });
        current.setDate(current.getDate() + 7);
      }
      return options;
    });

    const monthOptions = computed(() => {
      const options: Array<{ start: string; end: string; label: string }> = [];
      const today = new Date();
      const currentYear = today.getFullYear();
      const year = selectedYear.value;
      const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

      if (year === currentYear) {
        const naturalStart = new Date(today);
        naturalStart.setDate(today.getDate() - 29);
        options.push({ start: formatLocalDate(naturalStart), end: formatLocalDate(today), label: "30 días naturales" });
      }

      const lastMonthIndex = year === currentYear ? today.getMonth() : 11;
      for (let month = 0; month <= lastMonthIndex; month++) {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        options.push({
          start: formatLocalDate(startDate),
          end: formatLocalDate(endDate),
          label: `${monthNames[month]} (${startDate.getDate()}-${endDate.getDate()})`,
        });
      }
      return options;
    });

    const yearOptions = computed(() => {
      const options: Array<{ start: string; end: string; label: string }> = [];
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const endYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      for (let i = endYear; i >= 2025; i--) {
        options.push({
          start: formatLocalDate(new Date(i, 0, 1)),
          end: formatLocalDate(new Date(i, 11, 31)),
          label: `${i}`,
        });
      }
      return options;
    });

    const optionsForSelect = computed(() => {
      if (selectedPeriod.value === "week")  return weekOptions.value;
      if (selectedPeriod.value === "month") return monthOptions.value;
      if (selectedPeriod.value === "year")  return yearOptions.value;
      return [];
    });

    const fetchDiscs = async () => {
      try {
        let dateRange: [string, string] | undefined;
        if (selectedPeriod.value !== "all" && selectedOption.value) {
          dateRange = [selectedOption.value.start, selectedOption.value.end];
        }
        const response = await getTopRatedOrFeaturedAndStats(
          dateRange,
          selectedGenre.value || undefined,
          selectedCountry.value || undefined,
          undefined,
          undefined
        );
        discs.value = response.discs
          .filter(disc => disc.averageRate != null)
          .map(disc => ({
            ...disc,
            artist: { ...disc.artist, country: disc.artist?.country ?? null },
            userRate: disc.userRate
              ? {
                  ...disc.userRate,
                  rate:  disc.userRate.rate  != null ? parseFloat(disc.userRate.rate)  : null,
                  cover: disc.userRate.cover != null ? parseFloat(disc.userRate.cover) : null,
                }
              : null,
          }));
      } catch (error) {
        console.error("Error fetching discs:", error);
      }
    };

    watch([selectedPeriod, selectedGenre, selectedCountry, selectedYear], () => {
      if (selectedPeriod.value === "week")       selectedOption.value = weekOptions.value[weekOptions.value.length - 1];
      else if (selectedPeriod.value === "month") selectedOption.value = monthOptions.value[0];
      else if (selectedPeriod.value === "year")  selectedOption.value = yearOptions.value[0];
      fetchDiscs();
    });

    const showScrollTop = ref(false);
    const handleScroll = () => { showScrollTop.value = window.scrollY > 300; };
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

    onMounted(async () => {
      if (selectedPeriod.value === "week" && weekOptions.value.length) {
        selectedOption.value = weekOptions.value[weekOptions.value.length - 1];
      }
      window.addEventListener("scroll", handleScroll, { passive: true });
      await fetchDiscs();
    });

    onUnmounted(() => window.removeEventListener("scroll", handleScroll));

    return {
      discs,
      selectedPeriod,
      selectedOption,
      selectedYear,
      availableYears,
      optionsForSelect,
      fetchDiscs,
      selectedGenre,
      selectedCountry,
      genres: computed(() => catalogStore.genres),
      countries: computed(() => catalogStore.countries),
      showScrollTop,
      scrollToTop,
    };
  },
});
</script>

<style scoped>
.disc-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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
