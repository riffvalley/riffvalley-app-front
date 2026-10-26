<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import {
  ActivityDashboardContractError,
  useActivityDashboardQuery,
} from "@/modules/identity/activity/composables/useActivityStatisticsQueries";
import ActivityMetricCard from "./components/ActivityMetricCard.vue";
import ActivityComparisonChart from "./components/ActivityComparisonChart.vue";
import ActivityPeriodFilters from "../components/ActivityPeriodFilters.vue";

type PeriodSelection = 7 | 30 | 90 | "custom";

const authStore = useAuthStore();
const hasActivityAccess = computed(
  () => authStore.authStatus === "authenticated" && authStore.hasRole("superadmin")
);

const selectedPeriod = shallowRef<PeriodSelection>(30);
const from = shallowRef("");
const to = shallowRef("");

const hasBothDates = computed(() => Boolean(from.value && to.value));
const customRangeReversed = computed(() => hasBothDates.value && from.value > to.value);
const customRangeReady = computed(() => hasBothDates.value && !customRangeReversed.value);
const queryParams = computed(() => {
  if (selectedPeriod.value !== "custom") return { period: selectedPeriod.value };
  if (customRangeReady.value) return { from: from.value, to: to.value };
  return null;
});

const statsQuery = useActivityDashboardQuery(() => queryParams.value);
const dashboard = computed(() => statsQuery.data.value);
const queryError = computed(() => statsQuery.error.value);
const isContractError = computed(() => queryError.value instanceof ActivityDashboardContractError);
const showCustomPrompt = computed(
  () => selectedPeriod.value === "custom" && !customRangeReady.value
);
const metricCards = computed(() => {
  const data = dashboard.value;
  if (!data) return [];

  return [
    {
      id: "activeUsers",
      label: "Usuarios activos",
      definition:
        "Personas únicas con al menos un registro de presencia diaria en la aplicación durante el período. No cuenta sesiones ni accesos.",
      metric: data.activeUsers,
      format: "count" as const,
    },
    {
      id: "newVotes",
      label: "Votos nuevos",
      definition:
        "Eventos de valoración de tipo set registrados en el período. Los cambios posteriores (change) no cuentan como votos nuevos.",
      metric: data.newVotes,
      format: "count" as const,
    },
    {
      id: "votingUsers",
      label: "Usuarios que votaron",
      definition: "Personas únicas que emitieron al menos un voto nuevo (set) durante el período.",
      metric: data.votingUsers,
      format: "count" as const,
    },
    {
      id: "participationRate",
      label: "Participación",
      definition:
        "Porcentaje de usuarios activos que emitieron al menos un voto nuevo: usuarios que votaron ÷ usuarios activos.",
      metric: data.participationRate,
      format: "percentage" as const,
    },
    {
      id: "votesPerActiveUser",
      label: "Votos por usuario activo",
      definition:
        "Promedio de votos nuevos (set) por usuario activo del período. El valor lo calcula el backend.",
      metric: data.votesPerActiveUser,
      format: "ratio" as const,
    },
    {
      id: "returningUsers",
      label: "Usuarios recurrentes",
      definition:
        "Usuarios activos tanto en el período actual como en el anterior. La comparación previa mide el período anterior frente al período base.",
      metric: data.returningUsers,
      format: "count" as const,
      previousLabel: "Anterior vs. base",
    },
    {
      id: "retentionRate",
      label: "Retención",
      definition:
        "Porcentaje de usuarios activos del período anterior que también estuvieron activos en el actual. La comparación previa mide anterior frente a base.",
      metric: data.retentionRate,
      format: "percentage" as const,
      previousLabel: "Anterior vs. base",
    },
    {
      id: "currentRatings",
      label: "Valoraciones actuales",
      definition:
        "Número de valoraciones actuales (filas Rate), no de eventos de voto del período. No hay un snapshot histórico para comparar.",
      metric: data.currentRatings,
      format: "count" as const,
      currentOnly: true,
    },
  ];
});

const hasChartCoverage = computed(() => {
  const series = dashboard.value?.series;
  if (!series) return false;
  return [...series.current, ...series.previous].some(
    (day) => day.activeUsers !== null || day.newVotes !== null
  );
});

const periodCaption = computed(() => {
  const data = dashboard.value;
  if (!data) return "";
  const date = (value: string) =>
    new Date(`${value}T12:00:00Z`).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  const range = (value: { from: string; to: string }) => `${date(value.from)} – ${date(value.to)}`;
  const updated = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: data.timezone,
  }).format(new Date(data.asOf));
  return `Actual: ${range(data.periods.current)} · Anterior: ${range(data.periods.previous)} · ${data.timezone} · Actualizado ${updated}`;
});

function retryQuery() {
  void statsQuery.refetch();
}

function errorMessage(error: unknown): string {
  if (error instanceof ActivityDashboardContractError) {
    return "El backend no ha enviado el bloque obligatorio de estadísticas «dashboard». Actualiza el backend para poder consultar este panel.";
  }
  return "No se pudieron cargar las estadísticas. Comprueba la conexión y vuelve a intentarlo.";
}

const queryErrorMessage = computed(() => errorMessage(queryError.value));
</script>

<template>
  <main
    v-if="hasActivityAccess"
    class="stats-page min-h-full bg-gray-50 px-4 py-6 text-rv-navy dark:bg-rv-darkBg dark:text-white sm:px-6 lg:px-8"
  >
    <div class="stats-shell mx-auto max-w-7xl">
      <header
        class="stats-header mb-6 flex flex-col gap-5 border-b border-gray-200 pb-6 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Estadísticas de actividad</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
            Usuarios activos y votos nuevos registrados en la aplicación.
          </p>
        </div>
        <ActivityPeriodFilters
          v-model="selectedPeriod"
          v-model:from="from"
          v-model:to="to"
          :range-reversed="customRangeReversed"
        />
      </header>

      <p
        v-if="showCustomPrompt"
        class="mb-5 rounded-lg border border-rv-purple/30 bg-rv-purple/5 px-4 py-3 text-sm text-gray-700 dark:bg-rv-purple/10 dark:text-gray-200"
        role="status"
      >
        {{
          customRangeReversed
            ? "Corrige el orden de las fechas para consultar este rango."
            : "Selecciona las dos fechas para consultar el rango personalizado."
        }}
      </p>

      <section
        v-if="showCustomPrompt"
        class="stats-waiting rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-white/10 dark:bg-rv-darkCard"
        aria-label="Rango personalizado pendiente"
      >
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Las estadísticas aparecerán cuando el rango sea válido.
        </p>
      </section>

      <section
        v-else-if="statsQuery.isPending.value"
        class="stats-loading"
        aria-label="Cargando estadísticas"
        aria-busy="true"
      >
        <div class="loading-heading" />
        <div class="loading-kpis">
          <div v-for="index in 8" :key="index" class="loading-kpi" />
        </div>
        <div class="loading-charts">
          <div />
          <div />
        </div>
      </section>

      <section
        v-else-if="statsQuery.isError.value"
        class="stats-error rounded-xl border border-red-200 bg-white p-6 dark:border-red-300/30 dark:bg-rv-darkCard"
        role="alert"
      >
        <h2 class="text-lg font-semibold text-red-800 dark:text-red-200">
          {{ isContractError ? "Backend incompatible" : "Error al cargar las estadísticas" }}
        </h2>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-700 dark:text-gray-200">
          {{ queryErrorMessage }}
        </p>
        <button
          class="mt-4 rounded-lg bg-rv-pink px-4 py-2 text-sm font-semibold text-rv-navy transition-colors hover:bg-rv-pink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          type="button"
          @click="retryQuery"
        >
          Reintentar
        </button>
      </section>

      <template v-else-if="dashboard">
        <div
          class="period-caption mb-5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300"
        >
          <p>{{ periodCaption }}</p>
          <span
            v-if="statsQuery.isFetching.value"
            role="status"
            class="inline-flex items-center gap-2 text-rv-purple dark:text-rv-pink"
          >
            <span class="refresh-dot" aria-hidden="true" /> Actualizando
          </span>
        </div>

        <section class="mb-8" aria-labelledby="kpi-heading">
          <div class="mb-3 flex items-end justify-between gap-3">
            <h2 id="kpi-heading" class="text-lg font-semibold">Resumen del período</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Los valores sin cobertura se muestran como no disponibles.
            </p>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ActivityMetricCard
              v-for="item in metricCards"
              :key="item.id"
              :label="item.label"
              :definition="item.definition"
              :metric="item.metric"
              :format="item.format"
              :current-only="item.currentOnly"
              :previous-label="item.previousLabel"
            />
          </div>
        </section>

        <section class="charts-section" aria-labelledby="charts-heading">
          <div class="mb-3">
            <h2 id="charts-heading" class="text-lg font-semibold">Actividad diaria</h2>
            <p class="mt-1 text-xs text-gray-600 dark:text-gray-300">
              Cada línea compara el día equivalente del período actual y el anterior.
            </p>
          </div>
          <div v-if="hasChartCoverage" class="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ActivityComparisonChart
              title="Usuarios activos por día"
              metric="activeUsers"
              :current="dashboard.series.current"
              :previous="dashboard.series.previous"
              :current-range="dashboard.periods.current"
              :previous-range="dashboard.periods.previous"
            />
            <ActivityComparisonChart
              title="Votos nuevos por día"
              metric="newVotes"
              :current="dashboard.series.current"
              :previous="dashboard.series.previous"
              :current-range="dashboard.periods.current"
              :previous-range="dashboard.periods.previous"
            />
          </div>
          <div
            v-else
            class="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center dark:border-white/15 dark:bg-rv-darkCard"
          >
            <p class="font-medium">No hay días cubiertos para graficar</p>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Los valores desconocidos se conservan como tales y no se convierten en cero.
            </p>
          </div>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
.loading-heading,
.loading-kpi,
.loading-charts > div {
  background: linear-gradient(
    90deg,
    rgb(148 163 184 / 12%),
    rgb(148 163 184 / 22%),
    rgb(148 163 184 / 12%)
  );
  background-size: 200% 100%;
  animation: stats-loading 1.4s ease-in-out infinite;
}

.loading-heading {
  width: min(28rem, 80%);
  height: 1.5rem;
  margin-bottom: 1.25rem;
  border-radius: 0.4rem;
}

.loading-kpis,
.loading-charts {
  display: grid;
  gap: 0.75rem;
}

.loading-kpis {
  grid-template-columns: repeat(1, minmax(0, 1fr));
  margin-bottom: 1rem;
}

.loading-kpi {
  height: 8.5rem;
  border: 1px solid rgb(148 163 184 / 18%);
  border-radius: 0.75rem;
}

.loading-charts {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.loading-charts > div {
  height: 18rem;
  border-radius: 0.75rem;
}

.refresh-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 9999px;
  background: currentColor;
  animation: refresh-pulse 1s ease-in-out infinite alternate;
}

@keyframes stats-loading {
  to {
    background-position: -200% 0;
  }
}

@keyframes refresh-pulse {
  to {
    opacity: 0.35;
  }
}

@media (min-width: 640px) {
  .loading-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .loading-kpis,
  .loading-charts {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .loading-charts > div {
    grid-column: span 2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-heading,
  .loading-kpi,
  .loading-charts > div,
  .refresh-dot {
    animation: none;
  }
}
</style>
