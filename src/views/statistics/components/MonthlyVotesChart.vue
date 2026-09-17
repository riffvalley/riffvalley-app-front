<template>
  <div class="relative w-full h-72 sm:h-80">
    <Bar v-if="loaded"
      :key="`${isDark}`"
      :data="chartData"
      :options="chartOptions"
      :plugins="[positionsPlugin]" />
    <p v-else class="text-center text-gray-400">
      Cargando gráfico…
    </p>

    <img v-for="pos in coverPositions" :key="pos.index"
      v-show="months[pos.index]?.topDisc?.image"
      :src="months[pos.index]?.topDisc?.image ?? undefined"
      :alt="months[pos.index]?.topDisc?.name"
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

const BRAND_BLUE = "#0064d6";
const COVER_SIZE = 60;
const COVER_GAP = COVER_SIZE / 2 + 10;

type MonthlyVotes = { month: string; count: number; weeks: { week: string; count: number }[]; topDisc: TopDisc | null };

export default defineComponent({
  name: "MonthlyVotesChart",
  components: { Bar, DiscHoverTooltip },
  props: {
    monthlyVotes: {
      type: Array as PropType<MonthlyVotes[]>,
      required: true,
    },
  },
  setup(props) {
    const loaded = ref(false);
    const isDark = ref(document.documentElement.classList.contains("dark"));
    const coverPositions = ref<DiscCoverPosition[]>([]);
    const hoveredDisc = ref<{ x: number; y: number; disc: TopDisc } | null>(null);

    const tickColor = computed(() => isDark.value ? "white" : "#374151");
    const gridColor = computed(() => isDark.value ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)");

    const positionsPlugin = createDiscCoverPositionsPlugin("top", COVER_GAP, (positions) => {
      coverPositions.value = positions.filter(p => props.monthlyVotes[p.index]?.topDisc?.image);
    });

    const onEnter = (pos: DiscCoverPosition) => {
      const disc = props.monthlyVotes[pos.index]?.topDisc;
      if (disc) hoveredDisc.value = { x: pos.x, y: pos.y - COVER_SIZE / 2, disc };
    };

    const chartOptions = computed<ChartOptions<"bar">>(() => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 70 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: externalTooltipHandler,
          callbacks: {
            title: (items) => items[0].label,
            label: (item) => `${item.formattedValue} voto${item.formattedValue === '1' ? '' : 's'}`,
            afterBody: (items) => {
              const month = props.monthlyVotes[items[0].dataIndex];
              const weeksWithVotes = month?.weeks.filter(w => w.count > 0) ?? [];
              if (!weeksWithVotes.length) return [];
              return ["", "Por semana:", ...weeksWithVotes.map(w => `  Semana ${w.week}: ${w.count}`)];
            },
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

    const months = ref<MonthlyVotes[]>([]);

    const chartData = ref<any>({
      labels: [],
      datasets: [{ label: "Votos", data: [], backgroundColor: BRAND_BLUE, borderRadius: 4, borderSkipped: false, maxBarThickness: 40 }],
    });

    const buildChart = () => {
      if (!props.monthlyVotes.length) return;
      months.value = props.monthlyVotes;
      chartData.value = {
        labels: props.monthlyVotes.map(m => m.month),
        datasets: [{
          label: "Votos",
          data: props.monthlyVotes.map(m => m.count),
          backgroundColor: BRAND_BLUE,
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 40,
        }],
      };
      loaded.value = true;
    };

    watch(() => props.monthlyVotes, buildChart, { immediate: true, deep: true });
    watch(isDark, buildChart);

    const observer = new MutationObserver(() => {
      isDark.value = document.documentElement.classList.contains("dark");
    });
    onMounted(() => observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }));
    onUnmounted(() => observer.disconnect());

    return { loaded, isDark, chartData, chartOptions, positionsPlugin, coverPositions, months, hoveredDisc, onEnter, COVER_SIZE };
  },
});
</script>
