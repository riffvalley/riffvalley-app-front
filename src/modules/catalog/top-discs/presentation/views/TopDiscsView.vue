<template>
  <div class="max-w-[100rem] mx-auto mt-10 px-4">
    <!-- Sentinel scroll-to-top -->
    <div ref="scrollSentinel" class="h-px w-full"></div>

    <!-- Título + subtítulo + botón -->
    <div class="flex flex-col items-center justify-center pb-8 gap-2">
      <h2 class="text-2xl md:text-3xl font-bold text-rv-navy dark:text-white text-center">
        <i class="fa-solid fa-star mr-2"></i>Top Discos
      </h2>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <p class="text-sm md:text-base text-gray-600 dark:text-gray-300">
        Los discos mejor valorados
        </p>

        <router-link
          :to="{ name: 'DiscList' }"
          class="group inline-flex items-center gap-2 px-4 py-1.5 rounded-full shadow-md text-sm font-medium transition-all duration-200 bg-gray-200 dark:bg-rv-darkSurface text-rv-navy dark:text-white hover:bg-rv-navy hover:text-white dark:hover:bg-rv-purple hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] active:translate-y-0 border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0"
        >
          <i
            class="fa-solid fa-arrow-up rotate-45 transition-colors duration-200 group-hover:text-white"
          ></i>
          <span>Ver todos los Discos</span>
        </router-link>
      </div>
    </div>

    <TopDiscsHeader
      :selected-period="selectedPeriod"
      :selected-range-key="selectedRangeKey"
      :selected-year="selectedYear"
      :selected-country="selectedCountry"
      :selected-genre="selectedGenre"
      :available-years="availableYears"
      :options-for-select="optionsForSelect"
      :countries="countries"
      :genres="genres"
      :options-loading="optionsLoading"
      :options-error="optionsError"
      :options-empty="optionsEmpty"
      @period-change="changePeriod"
      @year-change="changeYearValue"
      @range-change="changeRangeKey"
      @country-change="setCountry"
      @genre-change="setGenre"
      @retry-options="retryOptions"
    />

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

    <p
      v-if="rankingLoading"
      role="status"
      class="mb-4 text-center text-gray-600 dark:text-gray-300"
    >
      Cargando ranking…
    </p>
    <div
      v-else-if="rankingError"
      role="alert"
      class="mb-4 text-center text-red-700 dark:text-red-300"
    >
      <span>No se pudo cargar el ranking.</span>
      <button type="button" class="ml-2 underline" @click="retryRanking">Reintentar</button>
    </div>

    <TopDiscsRanking v-else :discs="discs" @rating-saved="onRatingSaved" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, computed } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import type { TopRankedDisc } from "@/modules/catalog/top-discs/types/topDiscs";
import TopDiscsHeader from "@/modules/catalog/top-discs/presentation/components/TopDiscsHeader.vue";
import TopDiscsRanking from "@/modules/catalog/top-discs/presentation/components/TopDiscsRanking.vue";
import { getAvailableYears } from "@helpers/dateConstants";
import { topDiscsQueryKey, useTopDiscsQuery } from "@/modules/catalog/top-discs/composables/useTopDiscsQueries";
import {
  useTopDiscsFilterCoordinator,
  type TopDiscsDateRange,
  type TopDiscsPeriod,
} from "@/modules/catalog/top-discs/composables/useTopDiscsFilterCoordinator";

export default defineComponent({
  name: "RankingsPage",
  components: { TopDiscsHeader, TopDiscsRanking },
  setup() {
    const queryClient = useQueryClient();
    const onRatingSaved = (event: { musicalRateChanged: boolean }) => {
      if (event.musicalRateChanged) {
        void queryClient.invalidateQueries({ queryKey: topDiscsQueryKey });
      }
    };
    const filters = useTopDiscsFilterCoordinator();
    const {
      period: selectedPeriod,
      year: selectedYear,
      dateRange,
      genreId: selectedGenre,
      countryId: selectedCountry,
    } = filters;
    const availableYears = computed(() => [...getAvailableYears()].reverse());

    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const createWeekOptions = (year: number) => {
      const options: Array<{ key: string; start: string; end: string; label: string }> = [];
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

      const monthNames = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
      ];
      const current = new Date(firstFriday);
      while (current <= endLimitDate) {
        if (current.getFullYear() > year) break;
        const startDate = new Date(current);
        const endDate = new Date(current);
        endDate.setDate(current.getDate() + 6);
        options.push({
          key: `W-${formatLocalDate(startDate)}`,
          start: formatLocalDate(startDate),
          end: formatLocalDate(endDate),
          label: `${startDate.getDate()}-${endDate.getDate()} ${monthNames[startDate.getMonth()]}`,
        });
        current.setDate(current.getDate() + 7);
      }
      return options;
    };
    const weekOptions = computed(() => createWeekOptions(selectedYear.value));

    const createMonthOptions = (year: number) => {
      const options: Array<{ key: string; start: string; end: string; label: string }> = [];
      const today = new Date();
      const currentYear = today.getFullYear();
      const monthNames = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
      ];

      if (year === currentYear) {
        const naturalStart = new Date(today);
        naturalStart.setDate(today.getDate() - 29);
        options.push({
          key: `M-${formatLocalDate(naturalStart)}`,
          start: formatLocalDate(naturalStart),
          end: formatLocalDate(today),
          label: "30 días naturales",
        });
      }

      const lastMonthIndex = year === currentYear ? today.getMonth() : 11;
      for (let month = 0; month <= lastMonthIndex; month++) {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        options.push({
          key: `M-${formatLocalDate(startDate)}`,
          start: formatLocalDate(startDate),
          end: formatLocalDate(endDate),
          label: `${monthNames[month]} (${startDate.getDate()}-${endDate.getDate()})`,
        });
      }
      return options;
    };
    const monthOptions = computed(() => createMonthOptions(selectedYear.value));

    const yearOptions = computed(() => {
      const options: Array<{ key: string; start: string; end: string; label: string }> = [];
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const endYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      for (let year = endYear; year >= 2025; year--) {
        options.push({
          key: `Y-${year}`,
          start: formatLocalDate(new Date(year, 0, 1)),
          end: formatLocalDate(new Date(year, 11, 31)),
          label: `${year}`,
        });
      }
      return options;
    });

    const optionsForSelect = computed(() => {
      if (selectedPeriod.value === "week") return weekOptions.value;
      if (selectedPeriod.value === "month") return monthOptions.value;
      if (selectedPeriod.value === "year") return yearOptions.value;
      return [];
    });
    const selectedOption = computed(() =>
      dateRange.value
        ? (optionsForSelect.value.find(
            (option) => option.start === dateRange.value?.[0] && option.end === dateRange.value?.[1]
          ) ?? null)
        : null
    );
    const selectedRangeKey = computed(() => selectedOption.value?.key ?? "");

    const defaultRangeFor = (
      period: TopDiscsPeriod,
      year = selectedYear.value
    ): TopDiscsDateRange => {
      if (period === "all") return null;
      const options =
        period === "week"
          ? createWeekOptions(year)
          : period === "month"
            ? createMonthOptions(year)
            : yearOptions.value;
      const option = period === "week" ? options[options.length - 1] : options[0];
      return option ? [option.start, option.end] : null;
    };
    filters.setInitialDateRange(defaultRangeFor("week"));

    const changePeriod = (period: TopDiscsPeriod) => {
      void filters.setPeriod(period, defaultRangeFor(period));
    };
    const changeYearValue = (year: number) => {
      void filters.setYear(year, defaultRangeFor(selectedPeriod.value, year));
    };
    const changeRangeKey = (key: string) => {
      const option = optionsForSelect.value.find((item) => item.key === key);
      if (option) void filters.setDateRange([option.start, option.end]);
    };

    const rankingParams = computed(() => ({
      ...(dateRange.value
        ? { dateRange: [dateRange.value[0], dateRange.value[1]] as [string, string] }
        : {}),
      ...(selectedCountry.value ? { countryId: selectedCountry.value } : {}),
      ...(selectedGenre.value ? { genreId: selectedGenre.value } : {}),
    }));
    const rankingQuery = useTopDiscsQuery(rankingParams, filters.canLoadRanking);
    const discs = computed<TopRankedDisc[]>(() => {
      if (!filters.canLoadRanking.value) return [];
      return (rankingQuery.data.value?.discs ?? []).map((disc) => ({
        ...disc,
        artist: { ...disc.artist, country: disc.artist?.country ?? null },
        userRate: disc.userRate
          ? {
              ...disc.userRate,
              rate: disc.userRate.rate != null ? parseFloat(String(disc.userRate.rate)) : null,
              cover: disc.userRate.cover != null ? parseFloat(String(disc.userRate.cover)) : null,
            }
          : null,
      }));
    });
    const rankingLoading = computed(
      () =>
        filters.optionsLoading.value ||
        rankingQuery.isPending.value ||
        rankingQuery.isFetching.value
    );
    const rankingError = computed(() => filters.canLoadRanking.value && rankingQuery.isError.value);
    const setCountry = (countryId: string) => void filters.setCountry(countryId);
    const setGenre = (genreId: string) => void filters.setGenre(genreId);
    const retryOptions = () => void filters.retryOptions();
    const retryRanking = () => rankingQuery.refetch();
    const showScrollTop = ref(false);
    const scrollSentinel = ref<HTMLElement | null>(null);
    let sentinelObserver: IntersectionObserver | null = null;

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

    onMounted(() => {
      sentinelObserver = new IntersectionObserver(
        ([entry]) => {
          showScrollTop.value = !entry.isIntersecting;
        },
        { threshold: 0 }
      );
      if (scrollSentinel.value) sentinelObserver.observe(scrollSentinel.value);
    });

    onUnmounted(() => {
      sentinelObserver?.disconnect();
    });

    return {
      onRatingSaved,
      discs,
      selectedPeriod,
      selectedRangeKey,
      selectedYear,
      availableYears,
      optionsForSelect,
      changePeriod,
      changeYearValue,
      changeRangeKey,
      selectedGenre,
      selectedCountry,
      setGenre,
      setCountry,
      genres: filters.genres,
      countries: filters.countries,
      optionsLoading: filters.optionsLoading,
      optionsError: filters.optionsError,
      optionsEmpty: filters.optionsEmpty,
      retryOptions,
      rankingLoading,
      rankingError,
      retryRanking,
      showScrollTop,
      scrollToTop,
      scrollSentinel,
    };
  },
});
</script>

<style scoped>
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
