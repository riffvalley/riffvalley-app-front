<script setup lang="ts">
import { computed } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import type { ActivityDashboardDay, ActivityDateRangeParams } from "@/modules/identity/types/activity";

type SeriesMetric = "activeUsers" | "newVotes";

const props = defineProps<{
  title: string;
  metric: SeriesMetric;
  current: ActivityDashboardDay[];
  previous: ActivityDashboardDay[];
  currentRange: Required<ActivityDateRangeParams>;
  previousRange: Required<ActivityDateRangeParams>;
}>();

ChartJS.register(CategoryScale, Filler, LineElement, LinearScale, PointElement, Tooltip);

function shortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function fullDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const alignedSeries = computed(() => {
  const current = [...props.current].sort((left, right) => left.dayIndex - right.dayIndex);
  const previousByIndex = new Map(props.previous.map((day) => [day.dayIndex, day]));
  return {
    current,
    previousByIndex,
    labels: current.map((day) => shortDate(day.date)),
    currentValues: current.map((day) => day[props.metric]),
    previousValues: current.map((day) => previousByIndex.get(day.dayIndex)?.[props.metric] ?? null),
  };
});

const hasValues = computed(() => [...alignedSeries.value.currentValues, ...alignedSeries.value.previousValues]
  .some((value) => value !== null));

const chartData = computed<ChartData<"line", (number | null)[], string>>(() => ({
  labels: alignedSeries.value.labels,
  datasets: [
    {
      label: "Período actual",
      data: alignedSeries.value.currentValues,
      borderColor: "#e46e8a",
      backgroundColor: "rgba(228, 110, 138, 0.12)",
      borderWidth: 2.5,
      pointRadius: 2.5,
      pointHoverRadius: 5,
      tension: 0.25,
      spanGaps: false,
    },
    {
      label: "Período anterior",
      data: alignedSeries.value.previousValues,
      borderColor: "#b0669f",
      backgroundColor: "rgba(176, 102, 159, 0.08)",
      borderWidth: 2,
      borderDash: [5, 4],
      pointRadius: 2,
      pointHoverRadius: 4,
      tension: 0.25,
      spanGaps: false,
    },
  ],
}));

const options = computed<ChartOptions<"line">>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" },
  plugins: {
    legend: {
      position: "bottom",
      labels: { color: "#64748b", usePointStyle: true, boxWidth: 8, padding: 18 },
    },
    tooltip: {
      callbacks: {
        title: (items) => {
          const index = items[0]?.dataIndex;
          const current = alignedSeries.value.current[index];
          const previous = current ? alignedSeries.value.previousByIndex.get(current.dayIndex) : undefined;
          return current && previous
            ? `Actual ${fullDate(current.date)} · Anterior ${fullDate(previous.date)}`
            : current ? fullDate(current.date) : "";
        },
        label: (context) => {
          const value = context.parsed.y;
          if (value === null) return ` ${context.dataset.label}: sin cobertura`;
          return ` ${context.dataset.label}: ${new Intl.NumberFormat("es-ES").format(value)}`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: "#64748b", maxTicksLimit: 10, maxRotation: 0, autoSkip: true },
    },
    y: {
      beginAtZero: true,
      grid: { color: "rgba(148, 163, 184, 0.2)" },
      ticks: {
        color: "#64748b",
        precision: 0,
        callback: (value) => new Intl.NumberFormat("es-ES", { notation: "compact" }).format(Number(value)),
      },
    },
  },
}));

const accessibleRange = computed(() =>
  `Actual ${fullDate(props.currentRange.from)} a ${fullDate(props.currentRange.to)}. Anterior ${fullDate(props.previousRange.from)} a ${fullDate(props.previousRange.to)}.`,
);
</script>

<template>
  <article class="chart-panel rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-rv-darkCard sm:p-5">
    <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 class="font-semibold text-gray-800 dark:text-gray-100">{{ title }}</h3>
        <p class="mt-1 text-xs text-gray-600 dark:text-gray-300">{{ accessibleRange }}</p>
      </div>
    </div>
    <div v-if="hasValues" class="chart-canvas">
      <Line :data="chartData" :options="options" role="img" :aria-label="`${title}. ${accessibleRange}`" />
      <p class="sr-only">La línea continua representa el período actual; la línea discontinua, el período anterior. Los días sin cobertura no se conectan ni se muestran como cero.</p>
    </div>
    <p v-else class="chart-empty flex h-64 items-center justify-center rounded-lg bg-gray-50 px-4 text-center text-sm text-gray-600 dark:bg-rv-darkSurface dark:text-gray-300">
      No hay valores cubiertos para este indicador en los períodos seleccionados.
    </p>
  </article>
</template>

<style scoped>
.chart-canvas { position: relative; height: 17rem; min-width: 0; }
</style>
