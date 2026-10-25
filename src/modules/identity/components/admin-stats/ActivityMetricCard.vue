<script setup lang="ts">
import { computed } from "vue";
import type { ActivityCurrentRatings, ActivityMetricComparison } from "@/modules/identity/types/activity";

type Metric = ActivityMetricComparison | ActivityCurrentRatings;
type MetricFormat = "count" | "percentage" | "ratio";

const props = withDefaults(defineProps<{
  label: string;
  definition: string;
  metric: Metric;
  format: MetricFormat;
  currentOnly?: boolean;
  previousLabel?: string;
}>(), { currentOnly: false, previousLabel: "Período anterior" });

function number(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits }).format(value);
}

function valueLabel(value: number | null): string {
  if (value === null) return "No disponible";
  if (props.format === "percentage") return `${number(value, 1)} %`;
  if (props.format === "ratio") return number(value, 2);
  return number(value);
}

function signed(value: number, suffix = ""): string {
  const sign = value > 0 ? "+" : "";
  const precision = props.format === "ratio" || props.format === "percentage" ? 2 : 0;
  return `${sign}${number(value, precision)}${suffix}`;
}

const deltaLabel = computed(() => {
  if (props.metric.delta === null) return null;
  return signed(props.metric.delta, props.format === "percentage" ? " pp" : "");
});

const relativeChangeLabel = computed(() => {
  if (props.metric.changePercent === null) return null;
  return signed(props.metric.changePercent, " %");
});

const coverageLabel = computed(() => {
  const { coverage } = props.metric;
  const checks = [{ label: "actual", value: coverage.current }];
  if (!props.currentOnly) checks.push({ label: "anterior", value: coverage.previous });
  if (!props.currentOnly && "baseline" in coverage && coverage.baseline) {
    checks.push({ label: "base", value: coverage.baseline });
  }

  return checks.map(({ label, value }) => {
    if (value.status === "complete") return `${label}: completa`;
    if (value.status === "incomplete") {
      return `${label}: parcial${value.dataSince ? ` desde ${value.dataSince}` : ""}`;
    }
    return `${label}: sin cobertura`;
  }).join(" · ");
});

const unavailableReason = computed(() => {
  if (props.metric.reason === "zero_denominator") return "No hay valor anterior para calcular una variación.";
  if (props.metric.reason === "unavailable") return "No disponible con la cobertura histórica disponible.";
  if (props.metric.current === null) return "No hay cobertura suficiente para este período.";
  if (!props.currentOnly && props.metric.previous === null) return "El período anterior no tiene datos suficientes para comparar.";
  return null;
});
</script>

<template>
  <article class="metric-card rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-rv-darkCard" :aria-label="label">
    <div class="metric-heading">
      <h3 class="min-h-10 text-sm font-semibold leading-5 text-gray-700 dark:text-gray-200">{{ label }}</h3>
      <details class="metric-help">
        <summary :aria-label="`Qué significa ${label}`" :title="`Qué significa ${label}`">
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <circle cx="10" cy="10" r="8.25" />
            <path d="M10 9v5m0-8h.01" />
          </svg>
        </summary>
        <div class="metric-help-panel" role="note">
          <h4>Qué significa {{ label.toLowerCase() }}</h4>
          <p>{{ definition }}</p>
        </div>
      </details>
    </div>
    <p class="mt-2 text-2xl font-bold tabular-nums tracking-tight text-rv-navy dark:text-white" :aria-label="`${label}: ${valueLabel(metric.current)}`">
      {{ valueLabel(metric.current) }}
    </p>

    <template v-if="currentOnly">
      <p class="mt-2 text-xs text-gray-600 dark:text-gray-300">Sin snapshot histórico para comparar.</p>
    </template>
    <template v-else>
      <div class="comparison-detail mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-2 text-xs dark:border-white/10">
        <span class="text-gray-600 dark:text-gray-300">{{ previousLabel }}</span>
        <strong class="tabular-nums text-gray-800 dark:text-gray-100">{{ valueLabel(metric.previous) }}</strong>
      </div>
      <div class="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
        <span class="text-gray-600 dark:text-gray-300">{{ format === "percentage" ? "Diferencia" : "Cambio absoluto" }}</span>
        <strong v-if="deltaLabel" class="tabular-nums text-gray-800 dark:text-gray-100">{{ deltaLabel }}</strong>
        <span v-else class="font-medium text-gray-600 dark:text-gray-300">No disponible</span>
      </div>
      <div class="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
        <span class="text-gray-600 dark:text-gray-300">Variación relativa</span>
        <strong v-if="relativeChangeLabel" class="tabular-nums text-gray-800 dark:text-gray-100">{{ relativeChangeLabel }}</strong>
        <span v-else class="font-medium text-gray-600 dark:text-gray-300">No disponible</span>
      </div>
    </template>

    <p v-if="unavailableReason" class="mt-2 text-xs leading-4 text-gray-600 dark:text-gray-300">{{ unavailableReason }}</p>
    <p class="mt-3 border-t border-gray-100 pt-2 text-[0.68rem] leading-4 text-gray-500 dark:border-white/10 dark:text-gray-300">
      Cobertura: {{ coverageLabel }}
    </p>
  </article>
</template>

<style scoped>
.metric-card { min-width: 0; position: relative; }
.metric-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; }
.metric-heading h3 { margin: 0; flex: 1; }
.metric-help { position: relative; flex: none; }
.metric-help[open] { z-index: 30; }
.metric-help summary {
  display: grid;
  width: 1.45rem;
  height: 1.45rem;
  place-items: center;
  border-radius: 9999px;
  color: #7d3d70;
  cursor: pointer;
  list-style: none;
}
.metric-help summary::-webkit-details-marker { display: none; }
.metric-help summary:hover { background: rgb(176 102 159 / 12%); }
.metric-help summary:focus-visible { outline: 2px solid #b0669f; outline-offset: 2px; }
.metric-help summary svg { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.5; }
.metric-help-panel {
  position: absolute;
  top: calc(100% + 0.45rem);
  right: 0;
  z-index: 40;
  width: min(17rem, calc(100vw - 3.5rem));
  padding: 0.8rem 0.9rem;
  border: 1px solid #d8c7d5;
  border-radius: 0.65rem;
  background: #fff;
  color: #263244;
  box-shadow: 0 8px 24px rgb(15 23 42 / 18%);
}
.metric-help-panel h4 { margin: 0; font-size: 0.78rem; font-weight: 700; }
.metric-help-panel p { margin: 0.35rem 0 0; font-size: 0.75rem; line-height: 1.45; }
:global(.dark) .metric-help summary { color: #f2aac0; }
:global(.dark) .metric-help summary:hover { background: rgb(228 110 138 / 14%); }
:global(.dark) .metric-help-panel { border-color: rgb(255 255 255 / 16%); background: #242536; color: #f1f5f9; }
</style>
