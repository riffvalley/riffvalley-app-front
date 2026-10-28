<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { faChartLine, faClockRotateLeft, faImage, faMusic } from "@fortawesome/free-solid-svg-icons";
import { useAuthStore } from "@/modules/identity/auth";
import DiscDetail from "@components/DiscDetail.vue";
import defaultDiscImage from "@/assets/disco.png";
import {
  getRatesDashboardSummary,
  type RatesDashboardSummaryDto,
} from "@services/rates/rates";

const MADRID_TIMEZONE = "Europe/Madrid";
const DISC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const authStore = useAuthStore();
const summary = ref<RatesDashboardSummaryDto | null>(null);
const isLoading = ref(true);
const hasError = ref(false);
const retryVersion = ref(0);
const isMounted = ref(false);
const selectedDisc = ref<{
  id: string;
  name: string;
  image: string | null;
  artist: { name: string };
} | null>(null);

const recentRates = computed(() => summary.value?.recentRates.slice(0, 5) ?? []);

const periodLabel = computed(() => {
  const period = summary.value?.period;
  if (!period) return "";

  const start = new Date(period.start);
  const end = new Date(new Date(period.endExclusive).getTime() - 1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  return `${formatPeriodDate(start, period.timezone)} – ${formatPeriodDate(end, period.timezone)}`;
});

watch(
  () => [
    isMounted.value,
    authStore.authStatus,
    authStore.userId,
    authStore.authSessionGeneration,
    retryVersion.value,
  ] as const,
  ([mounted, authStatus, userId], _previous, onCleanup) => {
    const controller = new AbortController();
    let isCurrentRequest = true;
    onCleanup(() => {
      isCurrentRequest = false;
      controller.abort();
    });

    summary.value = null;
    hasError.value = false;
    selectedDisc.value = null;

    if (!mounted) return;
    if (authStatus === "initializing") {
      isLoading.value = true;
      return;
    }
    if (authStatus !== "authenticated" || !userId) {
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    void getRatesDashboardSummary(controller.signal)
      .then((response) => {
        if (!isCurrentRequest || controller.signal.aborted) return;
        summary.value = response;
      })
      .catch(() => {
        if (isCurrentRequest && !controller.signal.aborted) hasError.value = true;
      })
      .finally(() => {
        if (isCurrentRequest && !controller.signal.aborted) isLoading.value = false;
      });
  },
  { immediate: true },
);

onMounted(() => {
  isMounted.value = true;
});

function formatPeriodDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).formatToParts(date);
  const day = parts.find(({ type }) => type === "day")?.value;
  const month = parts.find(({ type }) => type === "month")?.value.replace(/\.$/, "");
  return `${day ?? ""} ${month ?? ""}`.trim();
}

function formatActivityDate(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MADRID_TIMEZONE,
  }).format(date);
}

function formatScore(score: number): string {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(score);
}

function formatDifference(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}

function formatPercentage(value: number): string {
  const formatted = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(Math.abs(value));
  if (value > 0) return `+${formatted} %`;
  if (value < 0) return `−${formatted} %`;
  return "0 %";
}

function canOpenDisc(disc: {
  discId: string;
  discName: string;
  artist: { name: string } | null;
}): boolean {
  return DISC_ID_PATTERN.test(disc.discId) && Boolean(disc.discName.trim()) && Boolean(disc.artist?.name.trim());
}

function openDisc(disc: {
  discId: string;
  discName: string;
  coverImage: string | null;
  artist: { name: string } | null;
}): void {
  if (!canOpenDisc(disc) || !disc.artist) return;
  selectedDisc.value = {
    id: disc.discId,
    name: disc.discName,
    image: disc.coverImage,
    artist: disc.artist,
  };
}

function useFallbackImage(event: Event): void {
  const image = event.currentTarget;
  const fallbackUrl = new URL(defaultDiscImage, document.baseURI).href;
  if (image instanceof HTMLImageElement && image.src !== fallbackUrl) image.src = fallbackUrl;
}

function retry(): void {
  retryVersion.value += 1;
}
</script>

<template>
  <section class="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-rv-darkSurface" aria-labelledby="latest-votes-title">
    <header class="shrink-0 border-b border-gray-100 bg-gradient-to-r from-rv-purple/8 to-rv-pink/8 px-4 py-2.5 dark:border-white/10 dark:from-rv-purple/10 dark:to-rv-pink/10 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-5">
      <div class="flex items-center gap-2">
        <font-awesome-icon :icon="faClockRotateLeft" class="text-purple-800 dark:text-purple-300" aria-hidden="true" />
        <h3 id="latest-votes-title" class="text-sm font-bold text-gray-900 dark:text-white">Tu semana musical</h3>
        <span v-if="periodLabel" class="hidden text-xs text-gray-500 dark:text-gray-400 sm:inline">· {{ periodLabel }}</span>
      </div>
      <p v-if="periodLabel" class="pl-6 text-[11px] capitalize text-gray-500 dark:text-gray-400 sm:hidden">{{ periodLabel }}</p>
      <div v-else-if="isLoading" class="ml-6 mt-1 h-2.5 w-24 animate-pulse rounded bg-gray-200 dark:bg-white/10 sm:ml-0 sm:mt-0" aria-hidden="true"></div>
    </header>

    <div v-if="isLoading" class="space-y-2.5 p-3 sm:p-4" role="status" aria-live="polite">
      <span class="sr-only">Cargando tu semana musical</span>
      <div class="grid grid-cols-3 gap-2" aria-hidden="true">
        <div v-for="index in 3" :key="index" class="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5"></div>
      </div>
      <div class="h-8 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" aria-hidden="true"></div>
      <div class="space-y-1" aria-hidden="true">
        <div v-for="index in 5" :key="index" class="h-11 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5"></div>
      </div>
    </div>

    <div v-else-if="hasError" class="p-4 text-center" role="alert">
      <p class="text-sm text-red-600 dark:text-red-400">No se pudo cargar tu semana musical.</p>
      <button type="button" class="mt-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-purple-800 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700 dark:text-purple-300 dark:focus-visible:outline-purple-300" @click="retry">
        Reintentar
      </button>
    </div>

    <div v-else-if="authStore.authStatus !== 'authenticated' || !authStore.userId" class="p-4 text-center text-sm text-gray-500 dark:text-gray-400" role="status">
      Inicia sesión para ver tu semana musical.
    </div>

    <div v-else-if="summary" class="space-y-2.5 p-3 sm:p-4">
      <div class="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-center text-[11px] leading-tight text-gray-700 dark:text-gray-300" aria-label="Indicadores de la semana">
        <span class="whitespace-nowrap"><strong class="text-base font-bold tabular-nums text-purple-800 dark:text-purple-300">{{ summary.metrics.activeRates }}</strong> Rates activos <span class="text-gray-400 dark:text-gray-500" aria-hidden="true">·</span></span>
        <span class="whitespace-nowrap"><strong class="text-base font-bold tabular-nums text-rose-800 dark:text-rose-300">{{ summary.metrics.averageMusicalRate === null ? "—" : formatScore(summary.metrics.averageMusicalRate) }}</strong> Media musical <span class="text-gray-400 dark:text-gray-500" aria-hidden="true">·</span></span>
        <span class="whitespace-nowrap"><strong class="text-base font-bold tabular-nums text-blue-800 dark:text-blue-300">{{ summary.metrics.distinctGenres }}</strong> Géneros</span>
      </div>

      <p v-if="summary.metrics.activeRates === 0 && recentRates.length" class="text-center text-xs text-gray-500 dark:text-gray-400">
        Sin actividad esta semana; aquí tienes tus Rates recientes.
      </p>

      <p class="text-[11px] leading-tight text-gray-600 dark:text-gray-400" aria-live="polite">
        <font-awesome-icon :icon="faChartLine" class="mr-1 text-purple-800 dark:text-purple-300" aria-hidden="true" />
        <template v-if="summary.metrics.weekOverWeek.difference === 0">Sin cambios respecto a la semana pasada</template>
        <template v-else>{{ formatDifference(summary.metrics.weekOverWeek.difference) }} respecto a la semana pasada</template>
        <span v-if="summary.metrics.weekOverWeek.percentageChange !== null && Number.isFinite(summary.metrics.weekOverWeek.percentageChange)" class="ml-1 text-gray-500 dark:text-gray-400">
          ({{ formatPercentage(summary.metrics.weekOverWeek.percentageChange) }})
        </span>
      </p>

      <div class="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 min-[420px]:gap-4">
        <div class="min-w-0 text-center">
          <p class="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Mejor nota musical</p>
          <template v-if="summary.metrics.bestRatedDisc">
            <div class="mt-0.5 flex min-w-0 flex-wrap items-baseline justify-center gap-x-1.5 text-xs leading-snug">
              <button
                v-if="canOpenDisc(summary.metrics.bestRatedDisc)"
                type="button"
                class="!inline !appearance-none !rounded-none !border-0 !bg-transparent !p-0 !text-xs !font-semibold !text-purple-800 !shadow-none underline decoration-purple-200 underline-offset-2 hover:!text-purple-900 hover:decoration-current focus-visible:!outline-none focus-visible:underline focus-visible:decoration-2 dark:!text-purple-300 dark:hover:!text-purple-200 dark:decoration-purple-800"
                @click="openDisc(summary.metrics.bestRatedDisc)"
              >
                {{ summary.metrics.bestRatedDisc.discName }}
              </button>
              <span v-else class="font-semibold text-purple-800 dark:text-purple-300">
                {{ summary.metrics.bestRatedDisc.discName }}
              </span>
              <span v-if="summary.metrics.bestRatedDisc.artist" class="text-gray-700 dark:text-gray-300">
                — {{ summary.metrics.bestRatedDisc.artist.name }}
              </span>
              <span class="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 text-xs font-bold tabular-nums text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                {{ formatScore(summary.metrics.bestRatedDisc.rate) }}
              </span>
            </div>
          </template>
          <p v-else class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Sin notas musicales esta semana</p>
        </div>

        <div class="min-w-0 text-center">
          <p class="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Género dominante</p>
          <p class="mt-0.5 break-words text-xs font-bold text-gray-900 dark:text-gray-100">
            <template v-if="summary.metrics.dominantGenre">
              {{ summary.metrics.dominantGenre.name }} · {{ summary.metrics.dominantGenre.activeRates }} votos
            </template>
            <template v-else>Sin datos</template>
          </p>
        </div>
      </div>

      <section aria-labelledby="recent-rates-title">
        <div class="mb-1 flex items-center justify-between gap-2 border-b border-gray-100 pb-1 dark:border-white/10">
          <h4 id="recent-rates-title" class="text-xs font-bold text-gray-900 dark:text-white">Tus últimos 5 votos</h4>
        </div>

        <p v-if="recentRates.length === 0 && summary.metrics.activeRates === 0" class="rounded-lg bg-gray-50 px-3 py-3 text-center text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
          Aún no tienes Rates guardados.
        </p>
        <p v-else-if="recentRates.length === 0" class="rounded-lg bg-gray-50 px-3 py-3 text-center text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
          No hay discos disponibles para mostrar.
        </p>
        <ul v-else class="divide-y divide-gray-100 dark:divide-white/5">
          <li v-for="rate in recentRates" :key="rate.id" class="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_4.25rem] items-center gap-2 py-1.5">
            <img
              :src="rate.coverImage || defaultDiscImage"
              :alt="rate.coverImage ? `Portada de ${rate.discName}` : ''"
              class="h-9 w-9 shrink-0 rounded-md bg-gray-100 object-cover dark:bg-white/5"
              loading="lazy"
              @error="useFallbackImage"
            />
            <p class="min-w-0 break-words text-center text-xs leading-snug">
              <button
                v-if="canOpenDisc(rate)"
                type="button"
                class="!inline !appearance-none !rounded-none !border-0 !bg-transparent !p-0 !text-xs !font-semibold !text-purple-800 !shadow-none underline decoration-purple-200 underline-offset-2 hover:!text-purple-900 hover:decoration-current focus-visible:!outline-none focus-visible:underline focus-visible:decoration-2 dark:!text-purple-300 dark:hover:!text-purple-200 dark:decoration-purple-800"
                :aria-label="`Ver detalles de ${rate.discName}, ${rate.artist?.name}`"
                @click="openDisc(rate)"
              >
                {{ rate.discName }}
              </button>
              <span v-else class="font-semibold text-purple-800 dark:text-purple-300">{{ rate.discName || "Disco no disponible" }}</span>
              <span class="text-gray-700 dark:text-gray-300"> — {{ rate.artist?.name ?? "Artista no disponible" }}</span>
              <time class="text-gray-500 dark:text-gray-400" :datetime="rate.lastActivityAt">
                ({{ formatActivityDate(rate.lastActivityAt) }})
              </time>
            </p>
            <div class="grid w-[4.75rem] shrink-0 grid-cols-[2.25rem_2.25rem] items-center gap-1">
              <span v-if="rate.rate !== null" class="inline-flex w-full items-center justify-center whitespace-nowrap text-[10px] font-bold tabular-nums text-rose-800 dark:text-rose-300" :aria-label="`Nota musical ${formatScore(rate.rate)} sobre 10`">
                <font-awesome-icon :icon="faMusic" class="mr-0.5 h-2 w-2 shrink-0" aria-hidden="true" />
                {{ formatScore(rate.rate) }}
              </span>
              <span v-else aria-hidden="true" class="w-full"></span>
              <span v-if="rate.cover !== null" class="inline-flex w-full items-center justify-center whitespace-nowrap text-[10px] font-bold tabular-nums text-blue-800 dark:text-blue-300" :aria-label="`Nota de portada ${formatScore(rate.cover)} sobre 10`">
                <font-awesome-icon :icon="faImage" class="mr-0.5 h-2 w-2 shrink-0" aria-hidden="true" />
                {{ formatScore(rate.cover) }}
              </span>
              <span v-else-if="rate.rate !== null" aria-hidden="true" class="w-full"></span>
              <span v-if="rate.rate === null && rate.cover === null" class="col-span-2 justify-self-end text-[10px] text-gray-600 dark:text-gray-400">Sin nota</span>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <DiscDetail v-if="selectedDisc" :disc="selectedDisc" @close="selectedDisc = null" />
  </section>
</template>
