<template>
  <div class="relative w-full" :style="{ height: `${chartHeight}px` }">
    <Bar v-if="loaded"
      :key="`${isDark}`"
      :data="chartData"
      :options="chartOptions"
      :plugins="[positionsPlugin]" />
    <p v-else class="text-center text-gray-400">
      Cargando gráfico…
    </p>

    <img v-for="pos in coverPositions" :key="pos.index"
      v-show="rows[pos.index]?.topDisc?.image"
      :src="rows[pos.index]?.topDisc?.image ?? undefined"
      :alt="rows[pos.index]?.topDisc?.name"
      class="absolute rounded-lg object-cover ring-2 ring-white dark:ring-rv-navy
             hover:ring-rv-pink hover:scale-110 hover:z-10 transition-all duration-150 cursor-pointer"
      :style="{ left: `${pos.x - COVER_SIZE / 2}px`, top: `${pos.y - COVER_SIZE / 2}px`, width: `${COVER_SIZE}px`, height: `${COVER_SIZE}px` }"
      @mouseenter="onEnter(pos)"
      @mouseleave="hoveredDisc = null"
    />

    <DiscHoverTooltip v-if="hoveredDisc" :disc="hoveredDisc.disc" :x="hoveredDisc.x" :y="hoveredDisc.y" />
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
import type { TopDisc } from "@services/rates/rates";
import { createDiscCoverPositionsPlugin, type DiscCoverPosition } from "../utils/discCoverPositionsPlugin";
import { externalTooltipHandler } from "../utils/externalTooltip";
import DiscHoverTooltip from "./DiscHoverTooltip.vue";

ChartJS.register(Title, Tooltip, BarElement, CategoryScale, LinearScale);

const FALLBACK_COLOR = "#6b7280"; // gray-500: género sin color asignado
const TOP_GENRES = 5;
const COVER_SIZE = 60;
const COVER_GAP = COVER_SIZE / 2 + 10;

type GenreVotes = { genre: string; count: number; topDisc: TopDisc | null };

export default defineComponent({
  name: "GenreBarChart",
  components: { Bar, DiscHoverTooltip },
  props: {
    genreDistribution: {
      type: Array as PropType<GenreVotes[]>,
      required: true,
    },
  },
  setup(props) {
    const loaded = ref(false);
    const isDark = ref(document.documentElement.classList.contains("dark"));
    const rows = ref<GenreVotes[]>([]);
    const coverPositions = ref<DiscCoverPosition[]>([]);
    const hoveredDisc = ref<{ x: number; y: number; disc: TopDisc } | null>(null);

    const tickColor = computed(() => isDark.value ? "white" : "#374151");
    const gridColor = computed(() => isDark.value ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)");

    // Filas de ~70px (hueco suficiente para la portada de 60px): la altura crece
    // con el nº de barras en vez de comprimirlas.
    const chartHeight = computed(() => Math.max(220, rows.value.length * 70 + 40));

    const positionsPlugin = createDiscCoverPositionsPlugin("end", COVER_GAP, (positions) => {
      coverPositions.value = positions.filter(p => rows.value[p.index]?.topDisc?.image);
    });

    const onEnter = (pos: DiscCoverPosition) => {
      const disc = rows.value[pos.index]?.topDisc;
      if (disc) hoveredDisc.value = { x: pos.x, y: pos.y - COVER_SIZE / 2, disc };
    };

    const chartOptions = computed<ChartOptions<"bar">>(() => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      layout: { padding: { right: 80 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: externalTooltipHandler,
          callbacks: {
            label: (item) => `${item.formattedValue} voto${item.formattedValue === '1' ? '' : 's'}`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: tickColor.value, precision: 0 },
          grid: { color: gridColor.value },
        },
        y: {
          ticks: { color: tickColor.value, autoSkip: false },
          grid: { display: false },
        },
      },
    }));

    const chartData = ref({
      labels: [] as string[],
      datasets: [{ label: "Votos", data: [] as number[], backgroundColor: [] as string[], borderRadius: 4, borderSkipped: false as const, maxBarThickness: 24 }],
    });

    const buildChart = () => {
      const sorted = [...props.genreDistribution].sort((a, b) => b.count - a.count).slice(0, TOP_GENRES);
      if (!sorted.length) return;

      rows.value = sorted;
      chartData.value = {
        labels: sorted.map(d => d.genre),
        datasets: [{
          label: "Votos",
          data: sorted.map(d => d.count),
          backgroundColor: sorted.map(d => d.topDisc?.genre?.color || FALLBACK_COLOR),
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 24,
        }],
      };
      loaded.value = true;
    };

    watch(() => props.genreDistribution, buildChart, { immediate: true, deep: true });
    watch(isDark, buildChart);

    const observer = new MutationObserver(() => {
      isDark.value = document.documentElement.classList.contains("dark");
    });
    onMounted(() => observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }));
    onUnmounted(() => observer.disconnect());

    return { chartData, chartOptions, isDark, loaded, chartHeight, positionsPlugin, coverPositions, rows, hoveredDisc, onEnter, COVER_SIZE };
  },
});
</script>
