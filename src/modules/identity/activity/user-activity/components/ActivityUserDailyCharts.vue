<script setup lang="ts">
import { computed } from "vue";
import { Line } from "vue-chartjs";
import {
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import type { ActivityUserDetailResponse } from "@/modules/identity/activity/types/activity";

const props = defineProps<{ activity: ActivityUserDetailResponse }>();

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip);

function dateLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatValue(value: number | null): string {
  return value === null ? "Sin cobertura" : new Intl.NumberFormat("es-ES").format(value);
}

const dates = computed(() => props.activity.presenceByDay.map(({ date }) => date));
const labels = computed(() => dates.value.map(dateLabel));
const presenceData = computed(
  () => new Map(props.activity.presenceByDay.map(({ date, present }) => [date, present]))
);
const newVotesData = computed(
  () => new Map(props.activity.newVotesByDay.map(({ date, count }) => [date, count]))
);
const changedVotesData = computed(
  () => new Map(props.activity.changedVotesByDay.map(({ date, count }) => [date, count]))
);

const hasPresenceValues = computed(() =>
  [...presenceData.value.values()].some((value) => value !== null)
);
const hasVoteValues = computed(() =>
  [...newVotesData.value.values(), ...changedVotesData.value.values()].some(
    (value) => value !== null
  )
);

const presenceChart = computed<ChartData<"line", (number | null)[], string>>(() => ({
  labels: labels.value,
  datasets: [
    {
      label: "Presencia App",
      data: dates.value.map((date) => {
        const present = presenceData.value.get(date);
        return present === null || present === undefined ? null : Number(present);
      }),
      borderColor: "#228b68",
      backgroundColor: "rgba(34, 139, 104, 0.12)",
      borderWidth: 2,
      pointRadius: 2.5,
      pointHoverRadius: 5,
      stepped: true,
      spanGaps: false,
    },
  ],
}));

const voteChart = computed<ChartData<"line", (number | null)[], string>>(() => ({
  labels: labels.value,
  datasets: [
    {
      label: "Votos nuevos (set)",
      data: dates.value.map((date) => newVotesData.value.get(date) ?? null),
      borderColor: "#e46e8a",
      backgroundColor: "rgba(228, 110, 138, 0.12)",
      borderWidth: 2.5,
      pointRadius: 2.5,
      pointHoverRadius: 5,
      tension: 0.2,
      spanGaps: false,
    },
    {
      label: "Modificaciones (change)",
      data: dates.value.map((date) => changedVotesData.value.get(date) ?? null),
      borderColor: "#8263a6",
      backgroundColor: "rgba(130, 99, 166, 0.08)",
      borderWidth: 2,
      borderDash: [5, 4],
      pointRadius: 2,
      pointHoverRadius: 4,
      tension: 0.2,
      spanGaps: false,
    },
  ],
}));

const commonOptions = computed<ChartOptions<"line">>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" },
  plugins: {
    legend: {
      position: "bottom",
      labels: { color: "#64748b", usePointStyle: true, boxWidth: 8, padding: 16 },
    },
    tooltip: {
      callbacks: {
        label: (context) => ` ${context.dataset.label}: ${formatValue(context.parsed.y)}`,
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: "#64748b", maxTicksLimit: 10, maxRotation: 0 } },
    y: {
      beginAtZero: true,
      grid: { color: "rgba(148, 163, 184, 0.2)" },
      ticks: {
        color: "#64748b",
        precision: 0,
        callback: (tick) =>
          new Intl.NumberFormat("es-ES", { notation: "compact" }).format(Number(tick)),
      },
    },
  },
}));

const presenceOptions = computed<ChartOptions<"line">>(() => ({
  ...commonOptions.value,
  plugins: {
    ...commonOptions.value.plugins,
    tooltip: {
      callbacks: {
        label: (context) =>
          ` Presencia App: ${context.parsed.y === null ? "sin cobertura" : context.parsed.y === 1 ? "presente" : "sin presencia"}`,
      },
    },
  },
  scales: {
    ...commonOptions.value.scales,
    y: {
      min: 0,
      max: 1,
      grid: { color: "rgba(148, 163, 184, 0.2)" },
      ticks: {
        stepSize: 1,
        color: "#64748b",
        callback: (tick) => (Number(tick) === 1 ? "Presente" : "Sin presencia"),
      },
    },
  },
}));
</script>

<template>
  <section class="daily-charts" aria-labelledby="daily-activity-heading">
    <div class="mb-3">
      <h3 id="daily-activity-heading" class="text-lg font-semibold">Evolución diaria</h3>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
        Presencia registrada en App y eventos de valoración del rango seleccionado.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <article
        class="chart-panel rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-rv-darkCard sm:p-5"
      >
        <h4 class="font-semibold text-gray-800 dark:text-gray-100">Presencia diaria en App</h4>
        <div v-if="hasPresenceValues" class="chart-canvas mt-3">
          <Line
            :data="presenceChart"
            :options="presenceOptions"
            role="img"
            aria-label="Presencia diaria en la aplicación. Un valor vacío indica falta de cobertura."
          />
        </div>
        <p
          v-else
          class="chart-empty mt-3 flex h-64 items-center justify-center rounded-lg bg-gray-50 px-4 text-center text-sm text-gray-600 dark:bg-rv-darkSurface dark:text-gray-300"
        >
          No hay días cubiertos de presencia para este rango.
        </p>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Presente = actividad diaria registrada; no representa sesiones ni duración.
        </p>
      </article>

      <article
        class="chart-panel rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-rv-darkCard sm:p-5"
      >
        <h4 class="font-semibold text-gray-800 dark:text-gray-100">
          Eventos de valoración por día
        </h4>
        <div v-if="hasVoteValues" class="chart-canvas mt-3">
          <Line
            :data="voteChart"
            :options="commonOptions"
            role="img"
            aria-label="Eventos diarios separados entre votos nuevos set y modificaciones change. Los días sin cobertura no se muestran como cero."
          />
        </div>
        <p
          v-else
          class="chart-empty mt-3 flex h-64 items-center justify-center rounded-lg bg-gray-50 px-4 text-center text-sm text-gray-600 dark:bg-rv-darkSurface dark:text-gray-300"
        >
          No hay días cubiertos de eventos de voto para este rango.
        </p>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Los huecos sin cobertura se mantienen separados de los ceros.
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.chart-canvas {
  position: relative;
  height: 17rem;
  min-width: 0;
}
</style>
