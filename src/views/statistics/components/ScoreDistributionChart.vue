<template>
  <div class="w-full h-96 flex justify-center min-w-0">
    <Pie v-if="loaded"
      :key="`score-${isDark}`"
      :data="chartData"
      :options="chartOptions" />
    <p v-else class="text-center text-gray-400">Cargando gráfico...</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from "vue";
import type { PropType } from "vue";
import { Pie } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  type ChartOptions,
} from "chart.js";

ChartJS.register(Title, Tooltip, Legend, ArcElement);

export default defineComponent({
  name: "ScoreDistributionChart",
  components: { Pie },
  props: {
    scoreDistribution: {
      type: Array as PropType<{ score: number; count: number }[]>,
      required: true,
    },
  },
  setup(props) {
    const loaded = ref(false);
    const isDark = ref(document.documentElement.classList.contains("dark"));

    const palette = [
      "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
      "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080",
    ];

    const legendColor = computed(() => isDark.value ? "white" : "#374151");
    const isMobileNow = () => window.matchMedia("(max-width: 640px)").matches;

    const chartOptions = computed<ChartOptions<"pie">>(() => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: isMobileNow() ? "bottom" : "right",
          labels: {
            color: legendColor.value,
            boxWidth: 10,
            boxHeight: 10,
            padding: 10,
            font: { size: isMobileNow() ? 10 : 12 },
          },
        },
      },
    }));

    const chartData = ref({
      labels: [] as string[],
      datasets: [{
        label: "Votos",
        backgroundColor: [] as string[],
        data: [] as number[],
        borderWidth: 0,
      }],
    });

    const buildChart = (newData: { score: number; count: number }[]) => {
      if (!newData.length) return;
      const sorted = [...newData].sort((a, b) => a.score - b.score);
      chartData.value = {
        labels: sorted.map(item => item.score.toString()),
        datasets: [{
          label: "Votos",
          backgroundColor: sorted.map(item => palette[item.score] || "#cccccc"),
          data: sorted.map(item => item.count),
          borderWidth: 0,
        }],
      };
      loaded.value = true;
    };

    watch(() => props.scoreDistribution, buildChart, { immediate: true, deep: true });

    const observer = new MutationObserver(() => {
      isDark.value = document.documentElement.classList.contains("dark");
    });
    onMounted(() => observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }));
    onUnmounted(() => observer.disconnect());

    return { chartData, chartOptions, isDark, loaded };
  },
});
</script>
