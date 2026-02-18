<template>
  <div class="max-w-[100rem] mx-auto mt-10 px-4">
  <div class="max-w-[100rem] mx-auto mt-10 px-4">
    <div class="bg-white shadow-lg rounded-lg p-4 sm:p-6 mb-4 max-w-[90vw] md:max-w-[100rem] mx-auto relative">
      <h3 class="text-2xl md:text-3xl font-bold text-rv-navy mb-4 text-center">
        Novedades Riff Valley
      </h3>

      <div class="grid grid-cols-1 lg:grid-cols-[65%_1fr] gap-4 sm:gap-6 lg:gap-8 items-start">
        <!-- Novedades -->
        <div class="lg:border-r border-gray-200 pb-4 lg:pb-0 lg:pr-4 min-w-0">
          <NewsFeed />
        </div>

        <!-- Columna derecha -->
<div class="space-y-5 flex flex-col gap-5 justify-start min-w-0">
<!-- Riff Valley -->
<div class="text-center min-w-0">
  <h3 class="text-lg font-bold text-rv-navy mb-3"> Info Riff Valley</h3>

  <div class="inline-flex flex-col gap-2.5 w-full max-w-[26rem] mx-auto min-w-0">

    <!-- App -->
    <div class="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-5 min-w-0">
      <span class="text-sm font-semibold text-rv-navy shrink-0 xl:w-24 xl:text-right
                   lg:w-full lg:text-center">
        App
      </span>

      <div class="flex flex-wrap items-center justify-center xl:justify-start gap-2 min-w-0
                  lg:grid lg:grid-cols-2 lg:gap-2 lg:justify-items-center
                  xl:flex xl:flex-wrap">
        <a
          href="https://t.me/RiffValleyAppUpdates"
          target="_blank"
          rel="noopener noreferrer"
class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
       bg-[#229ED9] text-white hover:bg-[#1a8bc2] hover:text-white
       transition-colors shadow-sm
       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy/30"
        >
          <i class="fa-brands fa-telegram"></i>
          Canal
        </a>

        <a
          href="https://t.me/RiffValleyApp"
          target="_blank"
          rel="noopener noreferrer"
class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
       bg-rv-pink text-white hover:bg-rv-pink/80 hover:text-white
       transition-colors shadow-sm
       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy/30"
        >
          <i class="fa-solid fa-comments"></i>
          Grupo
        </a>
      </div>
    </div>

    <!-- Web -->
    <div class="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-5 min-w-0">
      <span class="text-sm font-semibold text-rv-navy shrink-0 xl:w-24 xl:text-right
                   lg:w-full lg:text-center">
        Web
      </span>

      <div class="flex flex-wrap items-center justify-center xl:justify-start gap-2 min-w-0
                  lg:grid lg:grid-cols-2 lg:gap-2 lg:justify-items-center
                  xl:flex xl:flex-wrap">
        <a
          href="https://riffvalley.es"
          target="_blank"
          rel="noopener noreferrer"
class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
       bg-rv-navy text-white hover:bg-rv-navy/70 hover:text-white
       transition-colors shadow-sm
       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy/30"

        >
          <i class="fa-solid fa-globe"></i>
          Web
        </a>

        <a
          href="https://www.riffvalley.es/agenda-conciertos"
          target="_blank"
          rel="noopener noreferrer"
class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
       bg-rv-purple text-white hover:bg-rv-purple/80 hover:text-white
       transition-colors shadow-sm
       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy/30"
        >
          <i class="fa-solid fa-calendar-days"></i>
          Conciertos
        </a>
      </div>
    </div>

    <!-- Conciertos -->
    <div class="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-5 min-w-0">
      <span class="text-sm font-semibold text-rv-navy shrink-0 xl:w-24 xl:text-right
                   lg:w-full lg:text-center">
        Conciertos
      </span>

      <div class="flex flex-wrap items-center justify-center xl:justify-start gap-2 min-w-0
                  lg:grid lg:grid-cols-2 lg:gap-2 lg:justify-items-center
                  xl:flex xl:flex-wrap">
        <a
          href="https://t.me/conciertosrockmetal"
          target="_blank"
          rel="noopener noreferrer"
class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
       bg-[#229ED9] text-white hover:bg-[#1a8bc2] hover:text-white
       transition-colors shadow-sm
       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy/30"
        >
          <i class="fa-brands fa-telegram"></i>
          Canal
        </a>

        <a
          href="https://t.me/riffvalley"
          target="_blank"
          rel="noopener noreferrer"
class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
       bg-rv-pink text-white hover:bg-rv-pink/80 hover:text-white
       transition-colors shadow-sm
       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy/30"
        >
          <i class="fa-solid fa-comments"></i>
          Grupo
        </a>
      </div>
    </div>

  </div>
</div>

  <!-- Top Usuarios -->
  <div class="text-center border-t border-gray-100 pt-4 min-w-0">
    <h3 class="text-lg font-bold text-rv-navy mb-2">Top usuarios</h3>

    <div class="flex justify-center mb-3">
      <div class="relative inline-flex">
        <select
          v-model="selectedStatsYear"
          @change="fetchDiscs"
          class="px-4 pr-8 py-1 rounded-full shadow-sm text-sm font-semibold
                 bg-rv-navy text-white appearance-none cursor-pointer
                 focus:outline-none border-none ring-0"
        >
          <option v-for="option in availableStatsYears" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <svg
          class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
      <!-- Más discos votados -->
      <div>
        <h4 class="font-semibold text-rv-navy mb-1.5 text-xs">Más discos votados</h4>

        <ul v-if="topUsersByRates.length > 0" class="list-none space-y-1">
          <li
            v-for="(user, index) in topUsersByRates"
            :key="user.user.id"
            class="flex items-center justify-between gap-2 min-w-0"
          >
  <span class="text-xs shrink-0" v-html="getTrophyIcon(index)"></span>
  <span class="font-medium truncate min-w-0">{{ user.user.username }}</span>
  <span class="text-rv-navy shrink-0">{{ user.rateCount }}</span>
          </li>
        </ul>

        <p v-else class="text-gray-400 italic text-xs">No hay datos</p>
      </div>

      <!-- Más portadas votadas -->
      <div>
        <h4 class="font-semibold text-rv-navy mb-1.5 text-xs">Más portadas votadas</h4>

        <ul v-if="topUsersByCover.length > 0" class="list-none space-y-1">
          <li
            v-for="(user, index) in topUsersByCover"
            :key="user.user.id"
            class="flex items-center justify-center"
          >
            <span class="mr-1.5 text-xs" v-html="getTrophyIcon(index)"></span>
            <span class="font-medium">{{ user.user.username }}</span>
            <span class="ml-1.5 text-rv-navy">{{ user.totalCover }}</span>
          </li>
        </ul>

        <p v-else class="text-gray-400 italic text-xs">No hay datos</p>
      </div>
    </div>

    <!-- Botón estadísticas detalladas -->
    <div class="mt-6">
      <button
        @click="showDetailedStats = true"
        class="group inline-flex items-center
               px-3 py-1.5 rounded-full shadow text-xs
               font-semibold text-rv-navy bg-gray-100
               transition-all duration-200
               hover:bg-rv-navy hover:text-white
               active:bg-rv-navy active:text-white
               border-0 outline-none focus:outline-none focus-visible:outline-none
               ring-0 focus:ring-0 focus-visible:ring-0"
      >
        <i class="fa-solid fa-chart-bar mr-1.5 group-hover:text-white"></i>
        Estadísticas detalladas
      </button>

      <StatsModal
        v-if="showDetailedStats"
        :stats="stats"
        :rating-distribution="ratingDistribution"
        @close="showDetailedStats = false"
      />
    </div>
  </div>
</div>

      </div>
    </div>

    <!-- Título + subtítulo + botón -->
    <div class="flex flex-col items-center justify-center py-8 gap-2">
      <h2 class="text-2xl md:text-3xl font-bold text-rv-navy text-center">
        Mejores discos
      </h2>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <p class="text-sm md:text-base text-gray-600">
          Solo top 20 discos mejor valorados
        </p>

        <router-link :to="{ name: 'DiscList' }" class="group inline-flex items-center gap-2
             px-4 py-1.5 rounded-full shadow-md text-md transition-all duration-200
             bg-gray-200 text-rv-navy hover:bg-rv-navy hover:text-white
             border-0 outline-none focus:outline-none focus-visible:outline-none
             ring-0 focus:ring-0 focus-visible:ring-0">
          <i class="fa-solid fa-arrow-up rotate-45
               transition-colors duration-200
               group-hover:text-white"></i>
          <span>Ver todos los Discos</span>
        </router-link>
      </div>
    </div>


    <!-- Columna 1: Selector de género -->

    <div>
      <DiscFilters :selectedGenre="selectedGenre" :selectedCountry="selectedCountry" :selectedWeek="null"
        :genres="genres" :countries="countries" :showWeekPicker="false" :showSearchQuery="false" selectClass="w-full"
        wrapperClass="w-full" @update:selectedGenre="selectedGenre = $event"
        @update:selectedCountry="selectedCountry = $event" @resetAndFetch="fetchDiscs" />
    </div>


    <!-- Columna 2: Botones de periodo + selector de rango como pill -->
    <div class="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-5 mt-6 mb-8">

      <button @click="selectedPeriod = 'week'" :class="selectedPeriod === 'week'
        ? 'bg-rv-navy text-white font-semibold'
        : 'bg-gray-200 text-rv-navy hover:bg-rv-navy hover:text-white'" class="px-4 py-1.5 rounded-full shadow-md text-md transition-all duration-200
       border-0 outline-none focus:outline-none focus-visible:outline-none
       ring-0 focus:ring-0 focus-visible:ring-0">
        Semana
      </button>

      <button @click="selectedPeriod = 'month'" :class="selectedPeriod === 'month'
        ? 'bg-rv-navy text-white font-semibold'
        : 'bg-gray-200 text-rv-navy hover:bg-rv-navy hover:text-white'" class="px-4 py-1.5 rounded-full shadow-md text-md transition-all duration-200
       border-0 outline-none focus:outline-none focus-visible:outline-none
       ring-0 focus:ring-0 focus-visible:ring-0">
        Mes
      </button>

      <button @click="selectedPeriod = 'year'" :class="selectedPeriod === 'year'
        ? 'bg-rv-navy text-white font-semibold'
        : 'bg-gray-200 text-rv-navy hover:bg-rv-navy hover:text-white'" class="px-4 py-1.5 rounded-full shadow-md text-md transition-all duration-200
       border-0 outline-none focus:outline-none focus-visible:outline-none
       ring-0 focus:ring-0 focus-visible:ring-0">
        Año
      </button>

      <button @click="{ selectedPeriod = 'all'; fetchDiscs(); }" :class="selectedPeriod === 'all'
        ? 'bg-rv-navy text-white font-semibold'
        : 'bg-gray-200 text-rv-navy hover:bg-rv-navy hover:text-white'" class="px-4 py-1.5 rounded-full shadow-md text-md transition-all duration-200
       border-0 outline-none focus:outline-none focus-visible:outline-none
       ring-0 focus:ring-0 focus-visible:ring-0">
        Todos
      </button>


      <div v-if="selectedPeriod !== 'all'" class="relative flex gap-4">
        <div class="relative">
          <select v-model="selectedOption" @change="fetchDiscs" class="min-w-[12rem] px-4 pr-9 py-1.5 rounded-full shadow-md text-md font-semibold
                   bg-rv-navy text-white appearance-none cursor-pointer
                   focus:outline-none">
            <option v-for="option in optionsForSelect" :key="option.label" :value="option">
              {{ option.label }}
            </option>
          </select>

          <!-- chevron -->
          <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <!-- Selector de Año (solo visible si es Semana o Mes) -->
        <div v-if="selectedPeriod === 'week' || selectedPeriod === 'month'" class="relative">
          <select v-model="selectedYear" class="min-w-[6rem] px-4 pr-9 py-1.5 rounded-full shadow-md text-md font-semibold
                   bg-rv-navy text-white appearance-none cursor-pointer
                   focus:outline-none">
            <option v-for="year in availableYears" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
          <!-- chevron -->
          <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>


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
import { defineComponent, ref, onMounted, computed, watch } from "vue";
import { getTopRatedOrFeaturedAndStats } from "@services/discs/discs";
import type { Disc, DiscsStatsResponse } from "@services/discs/disc";
import { getGenres } from "@services/genres/genres";
import DiscCard from "@components/DiscCardComponent.vue";
import StatsModal from "@components/StatsModal.vue";
import DiscFilters from "@components/DiscFilters.vue";
import NewsFeed from "./components/NewsFeed.vue";
import { getCountries } from "@services/countries/countries";

export default defineComponent({
  components: {
    DiscCard,
    StatsModal,
    DiscFilters,
    NewsFeed,
  },
  setup() {
    const discs = ref<Disc[]>([]);
    const stats = ref<{ totalDiscs: number; totalVotes: number }>({
      totalDiscs: 0,
      totalVotes: 0,
    });
    const topUsersByRates = ref<any[]>([]);
    const topUsersByCover = ref<any[]>([]);
    const ratingDistribution = ref<Array<{ rate: number; count: number }>>([]);
    const showDetailedStats = ref(false);

    // Período seleccionado: 'week' (por defecto), 'month', 'year' o 'all'
    const selectedPeriod = ref("week");

    // Año seleccionado para filtros de semana y mes
    const selectedYear = ref(new Date().getFullYear());

    // Año seleccionado para las estadísticas (parte superior)
    const selectedStatsYear = ref<number | string>(new Date().getFullYear());

    // Almacena el rango seleccionado mediante el <select>
    const selectedOption = ref<{ start: string; end: string; label: string } | null>(null);

    const availableYears = computed(() => {
      const years: number[] = [];
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const startYear = 2025;
      const endYear = (currentMonth === 11 ? currentYear + 1 : currentYear);
      for (let i = endYear; i >= startYear; i--) {
        years.push(i);
      }
      return years;
    });

    const availableStatsYears = computed(() => {
      const options: { value: number | string; label: string }[] = availableYears.value.map(year => ({
        value: year,
        label: `${year}`
      }));
      // Agregar opción "Todos" al principio
      options.unshift({ value: 'all', label: 'Todos' });
      return options;
    });

    // Filtros
    const searchQuery = ref("");
    const selectedGenre = ref("");
    const genres = ref<any[]>([]);
    const countries = ref<any[]>([]);
    const selectedCountry = ref("");

    // Función para obtener los géneros
    const fetchGenres = async () => {
      try {
        const response = await getGenres(150, 0);
        genres.value = response.data.sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };

    const fetchCountries = async () => {
      const countriesResponse = await getCountries(250, 0);
      countries.value = countriesResponse.data.sort((a, b) => a.name.localeCompare(b.name));
    };

    // Función auxiliar para formatear la fecha en formato local (YYYY-MM-DD)
    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // -------------------------
    // Opciones para el <select>
    // -------------------------

    // Opciones para "Semana": generar semanas (de viernes a jueves) desde el primer viernes del año hasta la semana actual
    // Opciones para "Semana": generar semanas (de viernes a jueves) desde el primer viernes del año seleccionado hasta la semana actual o fin de año
    const weekOptions = computed(() => {
      const options: Array<{ start: string; end: string; label: string }> = [];
      const year = selectedYear.value;
      const currentYear = new Date().getFullYear();
      const isCurrentYear = year === currentYear;

      // Buscar el primer viernes del año seleccionado
      let firstFriday = new Date(year, 0, 1);
      while (firstFriday.getDay() !== 5) {
        firstFriday.setDate(firstFriday.getDate() + 1);
      }

      // Calcular límite final
      let endLimitDate: Date;
      if (isCurrentYear) {
        // Calcular el inicio de la semana actual (último viernes)
        const today = new Date();
        const offset = (today.getDay() - 5 + 7) % 7;
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - offset);
        endLimitDate = currentWeekStart;
      } else {
        // Fin del año seleccionado
        endLimitDate = new Date(year, 11, 31);
      }

      const monthNames = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];

      let current = new Date(firstFriday);
      while (current <= endLimitDate) {
        // Si nos pasamos el año (puede pasar al final de diciembre), paramos si el año de incio de semana es mayor
        if (current.getFullYear() > year) break;

        const startDate = new Date(current);
        const endDate = new Date(current);
        endDate.setDate(current.getDate() + 6);
        const startStr = formatLocalDate(startDate);
        const endStr = formatLocalDate(endDate);
        // Etiqueta: "díaInicio-díaFin mes" (por ejemplo, "3-9 enero")
        const label = `${startDate.getDate()}-${endDate.getDate()} ${monthNames[startDate.getMonth()]}`;
        options.push({ start: startStr, end: endStr, label });
        current.setDate(current.getDate() + 7);
      }
      return options;
    });

    // Opciones para "Mes": se agrega una opción por defecto de "30 días naturales"
    // y a continuación se incluyen las opciones de meses calendario
    // Opciones para "Mes": se agrega una opción por defecto de "30 días naturales"
    // y a continuación se incluyen las opciones de meses calendario del año seleccionado
    const monthOptions = computed(() => {
      const options: Array<{ start: string; end: string; label: string }> = [];
      const today = new Date();
      const currentYear = today.getFullYear();
      const year = selectedYear.value;

      // Opción "30 días naturales": últimos 30 días (incluyendo hoy)
      // Mostrar solo si estamos viendo el año actual, o tal vez siempre? 
      // Por simplicidad y consistencia, la dejamos si el año seleccionado es el actual.
      if (year === currentYear) {
        const naturalStart = new Date(today);
        naturalStart.setDate(today.getDate() - 29);
        options.push({
          start: formatLocalDate(naturalStart),
          end: formatLocalDate(today),
          label: "30 días naturales",
        });
      }

      // Opciones para cada mes calendario hasta el mes actual (si es año actual) o todo el año
      const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
      ];

      const lastMonthIndex = (year === currentYear) ? today.getMonth() : 11;

      for (let month = 0; month <= lastMonthIndex; month++) {
        // Evitar generar meses futuros si por alguna razón year > currentYear y month > hoy (aunque está controlado por lógica de availableYears)
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        const startStr = formatLocalDate(startDate);
        const endStr = formatLocalDate(endDate);
        const label = `${monthNames[month]} (${startDate.getDate()}-${endDate.getDate()})`;
        options.push({ start: startStr, end: endStr, label });
      }
      return options;
    });

    // Opciones para "Año" comienza en el 2025 y termina en el año actual + 1 si es diciembre
    const yearOptions = computed(() => {
      const options: Array<{ start: string; end: string; label: string }> = [];
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const startYear = 2025;
      const endYear = (currentMonth === 11 ? currentYear + 1 : currentYear);
      for (let i = endYear; i >= startYear; i--) {
        const startDate = new Date(i, 0, 1);
        const endDate = new Date(i, 11, 31);
        const startStr = formatLocalDate(startDate);
        const endStr = formatLocalDate(endDate);
        options.push({ start: startStr, end: endStr, label: `${i}` });
      }
      return options;
    });

    // Computed que devuelve las opciones según el período seleccionado
    const optionsForSelect = computed(() => {
      if (selectedPeriod.value === "week") return weekOptions.value;
      if (selectedPeriod.value === "month") return monthOptions.value;
      if (selectedPeriod.value === "year") return yearOptions.value;
      return [];
    });

    // ---------------------------------
    // Función para obtener los discos y stats
    // ---------------------------------
    const fetchDiscs = async () => {
      try {
        let dateRange;
        if (selectedPeriod.value === "all") {
          dateRange = undefined;
        } else if (selectedOption.value) {
          dateRange = [selectedOption.value.start, selectedOption.value.end];
        } else {
          dateRange = undefined;
        }

        console.log('Fetching discs with genre:', selectedGenre.value);

        // Rango para stats y distribution basado en selectedStatsYear
        let statsRange: [string, string] | undefined = undefined;

        if (selectedStatsYear.value !== 'all') {
          const statsStart = `${selectedStatsYear.value}-01-01`;
          const statsEnd = `${selectedStatsYear.value}-12-31`;
          statsRange = [statsStart, statsEnd];
        }

        const response: DiscsStatsResponse = await getTopRatedOrFeaturedAndStats(
          dateRange,
          selectedGenre.value ? selectedGenre.value : undefined,
          selectedCountry.value ? selectedCountry.value : undefined,
          statsRange,
          statsRange
        );
        discs.value = response.discs.map((disc) => ({
          ...disc,
          artist: {
            ...disc.artist,
            country: disc.artist?.country ?? null,
          },
        }));
        stats.value.totalDiscs = response.totalDiscs;
        stats.value.totalVotes = response.totalVotes;
        topUsersByRates.value = response.topUsersByRates;
        topUsersByCover.value = response.topUsersByCover;
        ratingDistribution.value = response.ratingDistribution;
      } catch (error) {
        console.error("Error fetching discs and stats:", error);
      }
    };

    // ---------------------------------
    // Actualiza la opción seleccionada cuando cambia el período
    // ---------------------------------
    // ---------------------------------
    // Actualiza la opción seleccionada cuando cambia el período, género, país o año
    // ---------------------------------
    watch([selectedPeriod, selectedGenre, selectedCountry, selectedYear, selectedStatsYear], () => {
      console.log('Period, Genre, Country or Year changed:', { period: selectedPeriod.value, genre: selectedGenre.value, country: selectedCountry.value, year: selectedYear.value });
      if (selectedPeriod.value === "week") {
        selectedOption.value = weekOptions.value[weekOptions.value.length - 1];
      } else if (selectedPeriod.value === "month") {
        // Si hay opciones, seleccionar la primera (o la ultima? para meses suele ser mejor ver el ultimo o 30 dias).
        // Originalmente seleccionaba index 0 que era "30 dias" o Enero. 
        // Si no hay "30 dias" (año pasado), index 0 es Enero.
        // Tal vez para meses pasados queramos ver Diciembre?
        // El codigo original: selectedOption.value = monthOptions.value[0];
        // Mantendremos esa logica por ahora.
        selectedOption.value = monthOptions.value[0];
      } else if (selectedPeriod.value === "year") {
        selectedOption.value = yearOptions.value[0];
      }
      fetchDiscs();
    });

    // ---------------------------------
    // Función para devolver el icono de trofeo según posición
    // ---------------------------------
    const getTrophyIcon = (index: number) => {
      if (index === 0) {
        return `<i class="fas fa-trophy text-yellow-500"></i>`;
      } else if (index === 1) {
        return `<i class="fas fa-trophy text-gray-400"></i>`;
      } else if (index === 2) {
        return `<i class="fas fa-trophy text-yellow-700"></i>`;
      } else {
        return "";
      }
    };

    onMounted(async () => {
      console.log('HomePage mounting...');
      await fetchGenres();
      await fetchCountries();

      if (selectedPeriod.value === "week" && weekOptions.value.length) {
        selectedOption.value = weekOptions.value[weekOptions.value.length - 1];
      }

      await fetchDiscs();
    });

    return {
      discs,
      stats,
      topUsersByRates,
      topUsersByCover,
      ratingDistribution,
      selectedPeriod,
      selectedOption,
      selectedYear,
      selectedStatsYear,
      availableYears,
      availableStatsYears,
      optionsForSelect,
      fetchDiscs,
      getTrophyIcon,
      showDetailedStats,
      // Filter related
      searchQuery,
      selectedGenre,
      selectedCountry,
      genres,
      countries
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

@media (max-width: 393px) {
  .max-w-\[100rem\] {
    max-width: 393px !important;
    margin: 0 auto;
  }

  .bg-white {
    padding: 1rem !important;
  }
}
</style>