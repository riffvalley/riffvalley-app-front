<template>
  <div class="w-full h-[300px]">
    <Bar v-if="loaded" :data="chartData" :options="chartOptions" />
    <p v-else class="text-center text-white/60 pt-10">Cargando gráfico…</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
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
import type { UsersPerDay } from "@services/auth/auth";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

export default defineComponent({
  name: "LastVotePerDayChart",
  components: { Bar },
  props: {
    lastVotePerDay: {
      type: Array as PropType<UsersPerDay[]>,
      required: true,
    },
  },
  setup(props) {
    const loaded = ref(false);

    const chartData = ref<any>({ labels: [], datasets: [] });

    const chartOptions = ref<ChartOptions<"bar">>({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y} usuario${ctx.parsed.y !== 1 ? "s" : ""}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: "rgba(255,255,255,0.7)", stepSize: 1 },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        x: {
          ticks: { color: "rgba(255,255,255,0.7)", maxRotation: 45, minRotation: 45 },
          grid: { display: false },
        },
      },
    });

    watch(
      () => props.lastVotePerDay,
      (data) => {
        loaded.value = false;
        if (!data.length) return;
        // Viene DESC del backend, invertimos para pintar cronológicamente
        const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
        chartData.value = {
          labels: sorted.map((d) => d.date),
          datasets: [
            {
              label: "Usuarios con último voto ese mes",
              data: sorted.map((d) => d.count),
              backgroundColor: "rgba(0, 100, 214, 0.6)",
              borderColor: "#0064d6",
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        };
        loaded.value = true;
      },
      { immediate: true, deep: true }
    );

    return { loaded, chartData, chartOptions, Bar };
  },
});
</script>
