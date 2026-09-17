<template>
  <div class="w-full h-72 sm:h-80">
    <Bar v-if="loaded"
      :key="`score-${isDark}`"
      :data="chartData"
      :options="chartOptions" />
    <p v-else class="text-center text-gray-400">Cargando gráfico...</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from "vue";
import type { PropType } from "vue";
import { Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  BarElement,
  CategoryScale,
  LinearScale,
  type ChartOptions,
} from "chart.js";

ChartJS.register(Title, Tooltip, BarElement, CategoryScale, LinearScale);

// Degradado de marca (rv-pink -> rv-purple -> rv-blue) aplicado a la escala de notas 0-10.
const GRADIENT_STOPS: [number, [number, number, number]][] = [
  [0, [228, 110, 138]],   // #e46e8a
  [0.45, [176, 102, 159]], // #b0669f
  [1, [0, 100, 214]],      // #0064d6
];

function gradientColor(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < GRADIENT_STOPS.length - 2 && clamped > GRADIENT_STOPS[i + 1][0]) i++;
  const [t0, c0] = GRADIENT_STOPS[i];
  const [t1, c1] = GRADIENT_STOPS[i + 1];
  const localT = t1 === t0 ? 0 : (clamped - t0) / (t1 - t0);
  const [r, g, b] = c0.map((channel, idx) => Math.round(channel + (c1[idx] - channel) * localT));
  return `rgb(${r}, ${g}, ${b})`;
}

export default defineComponent({
  name: "ScoreDistributionChart",
  components: { Bar },
  props: {
    scoreDistribution: {
      type: Array as PropType<{ score: number; count: number }[]>,
      required: true,
    },
  },
  setup(props) {
    const loaded = ref(false);
    const isDark = ref(document.documentElement.classList.contains("dark"));

    const tickColor = computed(() => isDark.value ? "white" : "#374151");
    const gridColor = computed(() => isDark.value ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)");

    const chartOptions = computed<ChartOptions<"bar">>(() => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `Nota ${items[0].label}`,
            label: (item) => `${item.formattedValue} voto${item.formattedValue === '1' ? '' : 's'}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: tickColor.value, precision: 0 },
          grid: { color: gridColor.value },
        },
        x: {
          ticks: { color: tickColor.value },
          grid: { display: false },
        },
      },
    }));

    const chartData = ref({
      labels: [] as string[],
      datasets: [{
        label: "Votos",
        backgroundColor: [] as string[],
        data: [] as number[],
        borderRadius: 4,
        borderSkipped: false as const,
        maxBarThickness: 32,
      }],
    });

    const buildChart = (newData: { score: number; count: number }[]) => {
      if (!newData.length) return;
      const sorted = [...newData].sort((a, b) => a.score - b.score);
      const maxScore = Math.max(10, ...sorted.map(item => item.score));
      chartData.value = {
        labels: sorted.map(item => item.score.toString()),
        datasets: [{
          label: "Votos",
          backgroundColor: sorted.map(item => gradientColor(item.score / maxScore)),
          data: sorted.map(item => item.count),
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 32,
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
