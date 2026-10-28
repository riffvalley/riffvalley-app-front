<template>
  <div class="w-full h-[360px] sm:h-96">
    <Bar v-if="loaded"
      :key="`${isMobile}-${isDark}`"
      :data="chartData"
      :options="isMobile ? mobileOptions : desktopOptions" />
    <p v-else class="text-center text-gray-400">
      Cargando gráfico…
    </p>
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
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  type ChartOptions,
} from "chart.js";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

export default defineComponent({
  name: "GenreBarChart",
  components: { Bar },
  props: {
    genreDistribution: {
      type: Array as PropType<{ genre: string; count: number }[]>,
      required: true,
    },
  },
  setup(props) {
    const loaded = ref(false);
    const isMobile = ref(window.innerWidth < 640);
    const isDark = ref(document.documentElement.classList.contains("dark"));

    const palette = [
      "#FF6633", "#FFB399", "#FF33FF", "#FFFF99", "#00B3E6",
      "#E6B333", "#3366E6", "#999966", "#99FF99", "#B34D4D",
      "#80B300", "#809900", "#E6B3B3", "#6680B3", "#66991A",
      "#FF99E6", "#CCFF1A", "#FF1A66", "#E6331A", "#33FFCC",
    ];

    const tickColor = computed(() => isDark.value ? "white" : "#374151");
    const gridColor = computed(() => isDark.value ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)");

    const desktopOptions = computed<ChartOptions<"bar">>(() => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: tickColor.value },
          grid: { color: gridColor.value },
        },
        x: {
          ticks: { autoSkip: false, maxRotation: 90, minRotation: 90, color: tickColor.value },
          grid: { color: gridColor.value },
        },
      },
    }));

    const mobileOptions = computed<ChartOptions<"bar">>(() => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      layout: { padding: { left: 0, right: 0 } },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: tickColor.value, precision: 0 },
          grid: { color: gridColor.value },
        },
        y: {
          ticks: { color: tickColor.value, autoSkip: false, padding: 12 },
          grid: { display: false },
        },
      },
    }));

    const chartData = ref({
      labels: [] as string[],
      datasets: [{ label: "Votos", data: [] as number[], backgroundColor: [] as string[] }],
    });

    const buildChart = () => {
      const data = props.genreDistribution;
      if (!data.length) return;
      const labels = data.map(d => d.genre);
      const datasetData = data.map(d => d.count);
      const backgroundColor = data.map((_, i) => palette[i % palette.length]);
      const extraProps = isMobile.value ? { barThickness: 16, categoryPercentage: 0.6, barPercentage: 0.9 } : {};
      chartData.value = {
        labels,
        datasets: [{ label: "Votos", data: datasetData, backgroundColor, ...extraProps }],
      };
      loaded.value = true;
    };

    watch(() => props.genreDistribution, buildChart, { immediate: true, deep: true });
    watch(isDark, buildChart);

    const onResize = () => { isMobile.value = window.innerWidth < 640; };
    onMounted(() => window.addEventListener("resize", onResize));
    onUnmounted(() => window.removeEventListener("resize", onResize));

    const observer = new MutationObserver(() => {
      isDark.value = document.documentElement.classList.contains("dark");
    });
    onMounted(() => observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }));
    onUnmounted(() => observer.disconnect());

    return { chartData, desktopOptions, mobileOptions, isMobile, isDark, loaded };
  },
});
</script>
