<script setup lang="ts">
import type { DashboardSummary } from "@/app/dashboardSummary";

const props = defineProps<{
  username: string;
  todayFormatted: string;
  hasSession: boolean;
  summary: DashboardSummary | undefined;
  loading: boolean;
  error: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const groupSeparator = new Intl.NumberFormat("es-ES")
  .formatToParts(1_000_000)
  .find((part) => part.type === "group")?.value ?? ".";

function formatNumber(value: number): string {
  return Math.trunc(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
}

function formatValue(value: number | null | undefined): string {
  if (props.loading) return "…";
  return value == null ? "—" : formatNumber(value);
}

function formatCount(value: number | null | undefined, singular: string, plural: string): string {
  if (props.loading) return "…";
  return value == null ? "—" : `${formatNumber(value)} ${value === 1 ? singular : plural}`;
}

function countLabel(value: number | null | undefined, singular: string, plural: string): string {
  return !props.loading && value === 1 ? singular : plural;
}

function streakMessage(streak: number | null | undefined): string {
  if (props.loading) return "Consultando tu racha";
  if (streak == null) return "Racha no disponible";
  if (streak === 0) return "¡Vota un disco y empieza tu racha!";
  if (streak === 1) return "¡Has empezado una racha!";
  return `¡Llevas ${formatNumber(streak)} días en racha!`;
}

const periods = [
  {
    id: "month",
    label: "Este mes",
    rated: (summary: DashboardSummary) => summary.personal.month.ratedDiscs,
    genres: (summary: DashboardSummary) => summary.personal.month.exploredGenres,
    activeDays: (summary: DashboardSummary) => summary.personal.month.activeDays,
    catalog: (summary: DashboardSummary) => summary.catalog.discsThisMonth,
  },
  {
    id: "year",
    label: "Este año",
    rated: (summary: DashboardSummary) => summary.personal.year.ratedDiscs,
    genres: (summary: DashboardSummary) => summary.personal.year.exploredGenres,
    activeDays: (summary: DashboardSummary) => summary.personal.year.activeDays,
    catalog: (summary: DashboardSummary) => summary.catalog.discsThisYear,
  },
  {
    id: "history",
    label: "Histórico",
    rated: (summary: DashboardSummary) => summary.personal.totalRatedDiscs,
    genres: (summary: DashboardSummary) => summary.personal.totalExploredGenres,
    activeDays: (summary: DashboardSummary) => summary.personal.totalActiveDays,
    catalog: (summary: DashboardSummary) => summary.catalog.totalDiscs,
  },
] as const;
</script>

<template>
  <section
    data-test="welcome-banner"
    class="relative mb-8 overflow-hidden rounded-2xl border border-rv-pink/20 bg-gradient-to-br from-rv-pink/10 via-rv-purple/5 to-transparent p-6 dark:border-white/10 dark:from-rv-pink/10 dark:via-rv-purple/5 dark:to-transparent md:p-8"
  >
    <div class="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-rv-pink/10 blur-2xl" />
    <div class="pointer-events-none absolute -bottom-8 right-20 h-64 w-64 rounded-full bg-rv-purple/10 blur-2xl" />

    <div data-test="banner-content" class="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0 lg:max-w-[25rem]">
        <p class="mb-1 text-sm capitalize text-gray-400 dark:text-gray-500">{{ todayFormatted }}</p>
        <h1 class="text-3xl font-bold leading-tight text-gray-900 dark:text-white md:text-4xl">
          Hola, <span class="text-rv-pink">{{ username }}</span>
        </h1>
        <p class="mt-1.5 text-gray-500 dark:text-gray-400">Bienvenid@ a Riff Valley App</p>
      </div>

      <div v-if="hasSession" data-test="banner-stats" class="min-w-0 flex-1">
        <div class="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 xl:grid-cols-4">
          <section
            v-for="period in periods"
            :key="period.id"
            :data-test="`banner-period-${period.id}`"
            class="min-w-0 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <h2 class="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">{{ period.label }}</h2>
            <p class="truncate text-2xl font-bold tabular-nums text-rv-pink" :aria-label="`${formatValue(props.summary ? period.rated(props.summary) : null)} discos votados`">
              {{ formatValue(props.summary ? period.rated(props.summary) : null) }}
            </p>
            <p class="mb-2 text-[11px] text-gray-500 dark:text-gray-400">{{ countLabel(props.summary ? period.rated(props.summary) : null, 'disco votado', 'discos votados') }}</p>
            <dl class="space-y-1 border-t border-gray-200/80 pt-2 text-xs dark:border-white/10">
              <div class="flex min-w-0 justify-between gap-2">
                <dt class="truncate text-gray-500 dark:text-gray-400">Géneros explorados</dt>
                <dd class="shrink-0 font-semibold tabular-nums text-gray-800 dark:text-gray-100">{{ formatCount(props.summary ? period.genres(props.summary) : null, 'género', 'géneros') }}</dd>
              </div>
              <div class="flex min-w-0 justify-between gap-2">
                <dt class="truncate text-gray-500 dark:text-gray-400">Días activos</dt>
                <dd class="shrink-0 font-semibold tabular-nums text-gray-800 dark:text-gray-100">{{ formatCount(props.summary ? period.activeDays(props.summary) : null, 'día', 'días') }}</dd>
              </div>
              <div class="flex min-w-0 justify-between gap-2" :title="period.id === 'history' ? 'Catálogo completo' : 'Lanzamientos musicales según su fecha de lanzamiento'">
                <dt class="truncate text-gray-500 dark:text-gray-400">Discos del catálogo</dt>
                <dd class="shrink-0 font-semibold tabular-nums text-gray-800 dark:text-gray-100">{{ formatCount(props.summary ? period.catalog(props.summary) : null, 'disco', 'discos') }}</dd>
              </div>
            </dl>
          </section>

          <section data-test="banner-streak" class="flex min-w-0 flex-col justify-center rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
            <h2 class="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">Racha</h2>
            <i class="fa-solid fa-fire mb-1 text-lg text-amber-500" aria-hidden="true" />
            <p class="text-3xl font-bold tabular-nums text-amber-500">{{ formatValue(props.summary?.personal.currentStreak) }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatCount(props.summary?.personal.currentStreak, 'día', 'días') }}</p>
            <p class="mt-2 text-xs text-gray-600 dark:text-gray-300">{{ streakMessage(props.summary?.personal.currentStreak) }}</p>
          </section>
        </div>

        <div v-if="error && !summary" role="status" class="mt-2 flex flex-wrap items-center justify-end gap-2 text-xs text-gray-600 dark:text-gray-300">
          <span>No se pudieron cargar las estadísticas.</span>
          <button type="button" class="rounded-md px-2 py-1 font-semibold text-rv-purple underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" @click="emit('retry')">
            Reintentar
          </button>
        </div>
        <p v-else-if="error" role="status" class="mt-2 text-right text-xs text-gray-600 dark:text-gray-300">
          No se pudieron actualizar las estadísticas.
        </p>
      </div>
    </div>
  </section>
</template>
