<template>
  <div class="w-full h-[300px]">
    <Line v-if="loaded" :data="chartData" :options="chartOptions" />
    <p v-else class="text-center text-white/60 pt-10">Cargando gráfico…</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import type { PropType } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  type ChartOptions,
} from "chart.js";
import type { InactiveVotersPerDay } from "@services/auth/auth";

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler);

export default defineComponent({
  name: "InactiveVotersChart",
  components: { Line },
  props: {
    inactiveVotersPerDay: {
      type: Array as PropType<InactiveVotersPerDay[]>,
      required: true,
    },
  },
  setup(props) {
    const loaded = ref(false);

    const chartData = ref<any>({ labels: [], datasets: [] });

    const chartOptions = ref<ChartOptions<"line">>({
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
      () => props.inactiveVotersPerDay,
      (data) => {
        loaded.value = false;
        if (!data.length) return;
        chartData.value = {
          labels: data.map((d) => d.date),
          datasets: [
            {
              label: "Usuarios inactivos",
              data: data.map((d) => d.count),
              borderColor: "#e46e8a",
              backgroundColor: "rgba(228, 110, 138, 0.1)",
              borderWidth: 2,
              pointRadius: 2,
              fill: false,
              tension: 0.3,
            },
          ],
        };
        loaded.value = true;
      },
      { immediate: true, deep: true }
    );

    return { loaded, chartData, chartOptions, Line };
  },
});
</script>
