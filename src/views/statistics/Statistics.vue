<template>
  <div class="max-w-7xl mx-auto mt-10 px-4 sm:px-6 lg:px-8">
    <h1 class="text-4xl font-bold mb-8 text-center text-rv-navy">
      Estadísticas
    </h1>

    <!-- Year Filter -->
<div class="flex justify-center mb-6">
  <SimpleSelect
    v-model="selectedYear"
    :options="yearOptions"
    placeholder="Selecciona un año"
    class="w-full max-w-[320px] sm:max-w-[380px]"
  />
</div>

    <div class="grid grid-cols-1 gap-6 text-white">
      <!--  -->
      <div
        class="bg-rv-navy p-6 rounded-2xl shadow-lg text-center grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border border-white/10">
        <div>
          <h2 class="text-xl font-semibold mb-2">Total de Votos</h2>
          <p class="text-4xl font-bold text-rv-pink brightness-125">{{ totalVotes }}</p>
        </div>
        <div>
          <h2 class="text-xl font-semibold mb-2">Media</h2>
          <p class="text-4xl font-bold text-rv-pink brightness-125">{{ mean }}</p>
        </div>
        <div>
          <h2 class="text-xl font-semibold mb-2">Mediana</h2>
          <p class="text-4xl font-bold text-rv-pink brightness-125">{{ median }}</p>
        </div>
        <div>
          <h2 class="text-xl font-semibold mb-2"> Ranking</h2>
          <p class="text-4xl font-bold text-rv-pink brightness-125">{{ rank }} de {{ totalUsers }}</p>
        </div>
      </div>

      <!-- Monthly Chart Card -->
<div class="bg-rv-navy p-6 rounded-2xl shadow-lg border border-white/10">
  <h2 class="text-xl font-semibold mb-4">Votos por mes</h2>
  <MonthlyVotesChart :monthly-votes="votesByMonth" />
</div>


      <!-- Genre Chart Card -->
      <div class="bg-rv-navy p-6 rounded-2xl shadow-lg border border-white/10">
        <h2 class="text-xl font-semibold mb-4">Votos por género</h2>
        <div class="w-full overflow-x-auto">
          <div class="min-w-[520px] sm:min-w-[600px] w-full">
            <GenreBarChart :genre-distribution="votesByGenre" />
          </div>
        </div>
      </div>

      <!-- Score Chart Card -->
<div class="bg-rv-navy p-6 rounded-2xl shadow-lg border border-white/10">
  <h2 class="text-xl font-semibold mb-4">Distribución de notas</h2>
  <div class="w-full">
    <div class="w-full max-w-[420px] mx-auto">
      <ScoreDistributionChart :score-distribution="votesByScore" />
    </div>
  </div>
</div>


      <div v-if="loading" class="bg-rv-navy p-6 rounded-2xl border border-white/10 text-white/80">
        Cargando estadísticas…
      </div>

      <div v-else-if="errorMsg" class="bg-rv-navy p-6 rounded-2xl border border-white/10 text-rv-pink">
        {{ errorMsg }}
      </div>

      <div v-else class="grid grid-cols-1 gap-6 text-white">
        ...
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed, watch } from 'vue';
import { getRatesStats } from '@services/rates/rates';
import GenreBarChart from './components/GenreBarChart.vue';
import ScoreDistributionChart from './components/ScoreDistributionChart.vue';
import MonthlyVotesChart from './components/MonthlyVotesChart.vue';
import SimpleSelect from '@components/SimpleSelect.vue';
import { getYearOptions } from '@helpers/dateConstants';

export default defineComponent({
  name: 'Statistics',
  components: {
    GenreBarChart,
    ScoreDistributionChart,
    MonthlyVotesChart,
    SimpleSelect,
  },
  setup() {
    const totalVotes = ref(0);
    const mean = ref("0");
    const median = ref(0);
    const votesByGenre = ref<{ genre: string; count: number }[]>([]);
    const votesByMonth = ref<{ month: string; count: number; weeks: any[] }[]>([]);
    const votesByScore = ref<{ score: number; count: number }[]>([]);
    const rank = ref(0);
    const totalUsers = ref(0);

    const loading = ref(true);
    const errorMsg = ref("");

    // Year filter
    const selectedYear = ref<number | null>(null);

    const yearOptions = getYearOptions();

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
      } catch (error) {
        console.error("Error fetching statistics:", error);
        errorMsg.value = "No se pudieron cargar las estadísticas.";
      } finally {
        loading.value = false;
      }
    };

    // Watch for year changes
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
      rank,
      totalUsers,
      loading,
      errorMsg,
      selectedYear,
      yearOptions,
    };
  },
});
</script>

