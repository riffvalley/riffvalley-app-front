<template>
  <div class="w-full h-[320px] sm:h-96">
    <component v-if="loaded"
      :is="isMobile ? Bar : Line"
      :key="`${isMobile}-${isDark}`"
      :data="chartData"
      :options="isMobile ? barOptions : lineOptions" />
    <p v-else class="text-center text-gray-400">
      Cargando gráfico…
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from "vue";
import type { PropType } from "vue";
import { Line, Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  BarElement,
  CategoryScale,
  LinearScale,
  type ChartOptions,
} from "chart.js";

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, BarElement, CategoryScale, LinearScale);

export default defineComponent({
  name: "MonthlyVotesChart",
  components: { Line, Bar },
  props: {
    monthlyVotes: {
      type: Array as PropType<{ month: string; count: number; weeks: { week: string; count: number }[] }[]>,
      required: true,
    },
  },
  setup(props) {
    const loaded = ref(false);
    const isMobile = ref(window.innerWidth < 640);
    const isDark = ref(document.documentElement.classList.contains("dark"));

    const tickColor = computed(() => isDark.value ? "white" : "#374151");
    const gridColor = computed(() => isDark.value ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)");
    const legendColor = computed(() => isDark.value ? "white" : "#374151");

    const lineOptions = computed<ChartOptions<"line">>(() => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: legendColor.value },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: tickColor.value },
          grid: { color: gridColor.value },
        },
        x: {
          ticks: { color: tickColor.value, maxRotation: 45, minRotation: 45 },
          grid: { color: gridColor.value },
        },
      },
    }));

    const barOptions = computed<ChartOptions<"bar">>(() => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: tickColor.value },
          grid: { color: gridColor.value },
        },
        y: {
          ticks: { color: tickColor.value },
          grid: { display: false },
        },
      },
    }));

    const chartData = ref<any>({
      labels: [],
      datasets: [{ label: "Votos", data: [], backgroundColor: "#36A2EB", borderColor: "#36A2EB", borderWidth: 2 }],
    });

    const buildChart = () => {
      if (!props.monthlyVotes.length) return;

      if (isMobile.value) {
        chartData.value = {
          labels: props.monthlyVotes.map(m => m.month),
          datasets: [{ label: "Votos", data: props.monthlyVotes.map(m => m.count), backgroundColor: "#36A2EB", borderColor: "#36A2EB", borderWidth: 2 }],
        };
      } else {
        const labels: string[] = [];
        const data: number[] = [];
        props.monthlyVotes.forEach(monthData => {
          const sortedWeeks = [...monthData.weeks].sort((a, b) => Number(a.week) - Number(b.week));
          sortedWeeks.forEach((weekData, index) => {
            labels.push(index === 0 ? monthData.month : "");
            data.push(weekData.count);
          });
        });
        chartData.value = {
          labels,
          datasets: [{ label: "Votos", data, backgroundColor: "#36A2EB", borderColor: "#36A2EB", borderWidth: 2 }],
        };
      }
      loaded.value = true;
    };

    watch(() => [props.monthlyVotes, isMobile.value], buildChart, { immediate: true, deep: true });
    watch(isDark, buildChart);

    const updateSize = () => { isMobile.value = window.innerWidth < 640; };
    onMounted(() => window.addEventListener("resize", updateSize));
    onUnmounted(() => window.removeEventListener("resize", updateSize));

    const observer = new MutationObserver(() => {
      isDark.value = document.documentElement.classList.contains("dark");
    });
    onMounted(() => observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }));
    onUnmounted(() => observer.disconnect());

    return { loaded, isMobile, isDark, chartData, lineOptions, barOptions, Line, Bar };
  },
});
</script>
