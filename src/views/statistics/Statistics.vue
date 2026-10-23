<template>
  <div class="max-w-7xl mx-auto mt-10 px-4 sm:px-6 lg:px-8 pb-10">
    <h1 class="text-2xl md:text-3xl font-bold mb-2 text-center text-rv-navy dark:text-white">
      <i class="fa-solid fa-chart-area mr-3"></i>Estadísticas
    </h1>
    <p class="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">Tus votos en cifras: géneros, notas y tendencias.</p>

    <!-- Year Filter -->
    <div class="flex justify-center mb-6">
      <SimpleSelect
        v-model="selectedYear"
        :options="yearOptions"
        placeholder="Selecciona un año"
        class="w-full max-w-[320px] sm:max-w-[380px]"
      />
    </div>

    <div class="grid grid-cols-1 gap-6">

      <!-- Resumen + disco destacado -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Resumen de votos -->
        <div class="lg:col-span-2 bg-white dark:bg-rv-navy p-6 rounded-2xl shadow-md dark:shadow-lg border border-gray-100 dark:border-white/10
                    grid grid-cols-2 sm:grid-cols-4 gap-5">
          <div v-for="tile in summaryTiles" :key="tile.label" class="flex flex-col items-center text-center gap-2">
            <span class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm shadow-sm" :class="tile.color">
              <i :class="tile.icon"></i>
            </span>
            <h2 class="text-xs font-semibold text-gray-500 dark:text-white/60 uppercase tracking-wide">{{ tile.label }}</h2>
            <p class="text-3xl font-bold text-rv-navy dark:text-white leading-none">
              {{ tile.value }}<span v-if="tile.suffix" class="text-base font-normal text-gray-400 dark:text-white/50">{{ tile.suffix }}</span>
            </p>
          </div>

          <!-- Comparativa con el año anterior (ritmo real de voto, no depende del filtro de año) -->
          <p v-if="yearOverYear" class="col-span-2 sm:col-span-4 text-center text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-white/10">
            En {{ yearOverYear.current.year }} llevas <span class="font-semibold text-rv-navy dark:text-white">{{ yearOverYear.current.votes }} votos</span>
            (a día de hoy el {{ yearOverYear.previous.year }} llevabas {{ yearOverYear.previous.votes }})
            <span v-if="yoyChange" :class="yoyChange.up ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'" class="font-semibold ml-1">
              <i :class="yoyChange.up ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'"></i>
              {{ Math.abs(yoyChange.pct).toFixed(0) }}%
            </span>
          </p>
        </div>

        <!-- Disco destacado del periodo -->
        <div v-if="topDiscOverall"
          class="bg-white dark:bg-rv-navy p-5 rounded-2xl shadow-md dark:shadow-lg border border-gray-100 dark:border-white/10
                 flex items-center gap-4">
          <img :src="topDiscOverall.image ?? undefined" :alt="topDiscOverall.name"
            class="w-16 h-16 rounded-xl object-cover ring-2 ring-white dark:ring-white/10 shadow-sm flex-shrink-0" />
          <div class="min-w-0">
            <h2 class="text-xs font-semibold text-gray-500 dark:text-white/60 uppercase tracking-wide mb-1">
              <i class="fa-solid fa-star text-amber-400 mr-1"></i>Tu disco del año
            </h2>
            <p class="font-bold text-rv-navy dark:text-white truncate">{{ topDiscOverall.name }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ topDiscOverall.artist.name }}</p>
            <p class="text-sm font-semibold text-rv-pink mt-0.5">Tu nota: {{ topDiscOverall.rate }}</p>
          </div>
        </div>
      </div>

      <!-- Monthly Chart Card -->
      <div class="bg-white dark:bg-rv-navy p-6 rounded-2xl shadow-md dark:shadow-lg border border-gray-100 dark:border-white/10">
        <h2 class="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Mis votos por mes</h2>
        <MonthlyVotesChart :monthly-votes="votesByMonth" />
      </div>

      <!-- Calendario de actividad -->
      <div v-if="votesByDay.length" class="bg-white dark:bg-rv-navy p-6 rounded-2xl shadow-md dark:shadow-lg border border-gray-100 dark:border-white/10">
        <h2 class="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Calendario de actividad {{ calendarYear }}</h2>
        <ActivityCalendar :votes-by-day="votesByDay" :year="calendarYear" />
      </div>

      <!-- Genre Chart Card -->
      <div class="bg-white dark:bg-rv-navy p-6 rounded-2xl shadow-md dark:shadow-lg border border-gray-100 dark:border-white/10">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white">Mis votos por género</h2>
          <div class="flex items-center gap-2">
            <span v-if="votesByGenre.length"
              class="text-xs font-semibold px-2.5 py-1 rounded-full bg-rv-purple/10 text-rv-purple dark:bg-rv-purple/20 dark:text-rv-purple">
              <i class="fa-solid fa-shuffle mr-1"></i>{{ votesByGenre.length }} género{{ votesByGenre.length !== 1 ? 's' : '' }} distinto{{ votesByGenre.length !== 1 ? 's' : '' }}
            </span>
            <button v-if="votesByGenre.length" @click="showGalaxy = true"
              class="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-400 text-amber-900
                     hover:bg-amber-300 transition-colors flex items-center gap-1">
              <i class="fa-solid fa-star"></i>{{ isMobile ? 'Explorar géneros' : 'Ver galaxia musical' }}
            </button>
          </div>
        </div>
        <GenreBarChart :genre-distribution="votesByGenre" />
      </div>

      <GenreGalaxyModal v-if="showGalaxy" :year="calendarYear" @close="showGalaxy = false" />

      <!-- Score Chart Card -->
      <div class="bg-white dark:bg-rv-navy p-6 rounded-2xl shadow-md dark:shadow-lg border border-gray-100 dark:border-white/10">
        <h2 class="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Distribución de notas</h2>
        <ScoreDistributionChart :score-distribution="votesByScore" />
      </div>

      <!-- Discos polémicos -->
      <div v-if="mostControversial.length" class="bg-white dark:bg-rv-navy p-6 rounded-2xl shadow-md dark:shadow-lg border border-gray-100 dark:border-white/10">
        <h2 class="text-lg font-semibold mb-1 text-gray-800 dark:text-white">Discos polémicos</h2>
        <p class="text-xs text-gray-400 dark:text-gray-500 mb-4">Donde más te alejas de la media de la comunidad</p>
        <ControversialDiscsList :discs="mostControversial" />
      </div>

      <!-- Loading -->
      <div v-if="loading"
        class="bg-white dark:bg-rv-navy p-6 rounded-2xl border border-gray-100 dark:border-white/10 text-gray-500 dark:text-white/80">
        Cargando estadísticas…
      </div>

      <!-- Error -->
      <div v-else-if="errorMsg"
        class="bg-white dark:bg-rv-navy p-6 rounded-2xl border border-gray-100 dark:border-white/10 text-rv-pink">
        {{ errorMsg }}
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { getRatesStats, type RatesStatsResponse, type TopDisc, type ControversialDisc, type YearOverYear } from '@services/rates/rates';
import GenreBarChart from './components/GenreBarChart.vue';
import ScoreDistributionChart from './components/ScoreDistributionChart.vue';
import MonthlyVotesChart from './components/MonthlyVotesChart.vue';
import ActivityCalendar from './components/ActivityCalendar.vue';
import ControversialDiscsList from './components/ControversialDiscsList.vue';
import GenreGalaxyModal from './components/GenreGalaxyModal.vue';
import SimpleSelect from '@components/SimpleSelect.vue';
import { getYearOptions } from '@helpers/dateConstants';
import { useIsMobileViewport } from '@/composables/useIsMobileViewport';

export default defineComponent({
  name: 'Statistics',
  components: {
    GenreBarChart,
    ScoreDistributionChart,
    MonthlyVotesChart,
    ActivityCalendar,
    ControversialDiscsList,
    GenreGalaxyModal,
    SimpleSelect,
  },
  setup() {
    const totalVotes = ref(0);
    const mean = ref("0");
    const median = ref(0);
    const votesByGenre = ref<RatesStatsResponse['votesByGenre']>([]);
    const votesByMonth = ref<RatesStatsResponse['votesByMonth']>([]);
    const votesByScore = ref<RatesStatsResponse['votesByScore']>([]);
    const votesByDay = ref<RatesStatsResponse['votesByDay']>([]);
    const topDiscOverall = ref<TopDisc | null>(null);
    const mostControversial = ref<ControversialDisc[]>([]);
    const yearOverYear = ref<YearOverYear | null>(null);
    const rank = ref(0);
    const totalUsers = ref(0);

    const loading = ref(true);
    const errorMsg = ref("");

    const selectedYear = ref<number | null>(new Date().getFullYear());
    const showGalaxy = ref(false);
    const isMobile = useIsMobileViewport();
    const yearOptions = getYearOptions();

    const calendarYear = computed(() => selectedYear.value ?? new Date().getFullYear());

    const yoyChange = computed(() => {
      if (!yearOverYear.value) return null;
      const { current, previous } = yearOverYear.value;
      if (previous.votes === 0) return null;
      const pct = ((current.votes - previous.votes) / previous.votes) * 100;
      return { pct, up: pct >= 0 };
    });

    const summaryTiles = computed(() => [
      { label: 'Total de votos', icon: 'fa-solid fa-check-to-slot', value: totalVotes.value, color: 'bg-rv-pink' },
      { label: 'Media', icon: 'fa-solid fa-scale-balanced', value: mean.value, color: 'bg-rv-purple' },
      { label: 'Mediana', icon: 'fa-solid fa-chart-simple', value: median.value, color: 'bg-rv-blue' },
      { label: 'Ranking', icon: 'fa-solid fa-trophy', value: rank.value, suffix: ` / ${totalUsers.value}`, color: 'bg-amber-400' },
    ]);

    const fetchData = async () => {
      loading.value = true;
      errorMsg.value = "";
      try {
        const data = await getRatesStats(selectedYear.value || undefined);
        totalVotes.value = data.totalVotes;
        mean.value = data.mean;
        median.value = data.median;
        rank.value = data.rank;
        totalUsers.value = data.totalUsers;
        votesByGenre.value = data.votesByGenre;
        votesByMonth.value = data.votesByMonth;
        votesByScore.value = data.votesByScore;
        votesByDay.value = data.votesByDay;
        topDiscOverall.value = data.topDiscOverall;
        mostControversial.value = data.mostControversial;
        yearOverYear.value = data.yearOverYear;
      } catch (error) {
        console.error("Error fetching statistics:", error);
        errorMsg.value = "No se pudieron cargar las estadísticas.";
      } finally {
        loading.value = false;
      }
    };

    watch(selectedYear, () => {
      fetchData();
    });

    onMounted(() => {
      fetchData();
    });

    return {
      totalVotes,
      mean,
      median,
      votesByGenre,
      votesByMonth,
      votesByScore,
      votesByDay,
      topDiscOverall,
      mostControversial,
      yearOverYear,
      yoyChange,
      calendarYear,
      isMobile,
      showGalaxy,
      rank,
      totalUsers,
      loading,
      errorMsg,
      selectedYear,
      yearOptions,
      summaryTiles,
    };
  },
});
</script>
