<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import DashboardCommunityStatsModal from "./DashboardCommunityStatsModal.vue";
import { prefetchCommunityDashboardStats } from "@/app/communityDashboardStats";
import { useAuthStore } from "@/modules/identity/auth";
import {
  getCommunityDashboardRankings,
  type CommunityDashboardRankingsResponse,
} from "@services/community/dashboard";
import { getAvailableYears } from "@helpers/dateConstants";

const splitIntoColumns = <T,>(list: T[]): Array<Array<{ user: T; index: number }>> => {
  const indexed = list.map((user, index) => ({ user, index }));
  const mid = Math.ceil(indexed.length / 2);
  return [indexed.slice(0, mid), indexed.slice(mid)];
};

const rankings = shallowRef<CommunityDashboardRankingsResponse | null>(null);
const isLoading = shallowRef(false);
const hasError = shallowRef(false);
const retryVersion = shallowRef(0);
const showCommunityStatsModal = shallowRef(false);
const selectedStatsYear = shallowRef<number>(new Date().getFullYear());
const topUsersTab = shallowRef<"rates" | "cover">("rates");
const communityStatsButton = useTemplateRef<HTMLButtonElement>("communityStatsButton");
const queryClient = useQueryClient();
const authStore = useAuthStore();

const availableYears = computed(() => [...getAvailableYears()].reverse());
const availableStatsYears = computed(() =>
  availableYears.value.map((year) => ({
    value: year,
    label: `${year}`,
  })),
);
const topUsersByRates = computed(() => rankings.value?.topUsersByRates ?? []);
const topUsersByCover = computed(() => rankings.value?.topUsersByCover ?? []);
const topUsersByRatesColumns = computed(() => splitIntoColumns(topUsersByRates.value));
const topUsersByCoverColumns = computed(() => splitIntoColumns(topUsersByCover.value));

const trophyClasses = ["text-yellow-500", "text-gray-400", "text-yellow-700"];

// Comunidad: tres bloques iguales (columna con título, contexto y sus dos enlaces).
// El color del botón indica el tipo de destino: canal de Telegram, grupo, web o agenda.
const TELEGRAM_CHANNEL = "bg-[#0077cc] hover:bg-[#0066b3]";
const TELEGRAM_GROUP = "bg-rv-pink hover:bg-rv-pink/80";
const communityGroups = [
  {
    title: "App",
    hint: "Novedades y charla",
    links: [
      { label: "Canal", icon: "fa-brands fa-telegram", href: "https://t.me/RiffValleyAppUpdates", aria: "Canal de Telegram de la app", tone: TELEGRAM_CHANNEL },
      { label: "Grupo", icon: "fa-solid fa-comments", href: "https://t.me/RiffValleyApp", aria: "Grupo de Telegram de la app", tone: TELEGRAM_GROUP },
    ],
  },
  {
    title: "Web",
    hint: "riffvalley.es",
    links: [
      { label: "Inicio", icon: "fa-solid fa-globe", href: "https://riffvalley.es", aria: "Web de Riff Valley", tone: "bg-rv-navy hover:bg-rv-navy/80 dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-gray-300" },
      { label: "Agenda", icon: "fa-solid fa-calendar-days", href: "https://www.riffvalley.es/agenda-conciertos", aria: "Agenda de conciertos en la web", tone: "bg-rv-purple hover:bg-rv-purple/80" },
    ],
  },
  {
    title: "Conciertos",
    hint: "Avisos y charla",
    links: [
      { label: "Canal", icon: "fa-brands fa-telegram", href: "https://t.me/conciertosrockmetal", aria: "Canal de Telegram de conciertos", tone: TELEGRAM_CHANNEL },
      { label: "Grupo", icon: "fa-solid fa-comments", href: "https://t.me/riffvalley", aria: "Grupo de Telegram de conciertos", tone: TELEGRAM_GROUP },
    ],
  },
] as const;

watch(
  [selectedStatsYear, retryVersion],
  async ([year], _previous, onCleanup) => {
    const controller = new AbortController();
    onCleanup(() => controller.abort());
    rankings.value = null;
    hasError.value = false;
    isLoading.value = true;

    try {
      const response = await getCommunityDashboardRankings(year, controller.signal);
      if (controller.signal.aborted) return;
      if (response.year !== year) throw new Error("The rankings response year does not match the request.");
      rankings.value = response;
    } catch {
      if (!controller.signal.aborted) hasError.value = true;
    } finally {
      if (!controller.signal.aborted) isLoading.value = false;
    }
  },
  { immediate: true, flush: "sync" },
);

function retryRankings(): void {
  retryVersion.value += 1;
}

function prefetchCommunityStats(): void {
  if (authStore.authStatus !== "authenticated" || !authStore.userId || !authStore.role) return;
  void prefetchCommunityDashboardStats(queryClient, selectedStatsYear.value, {
    userId: authStore.userId,
    role: authStore.role,
    generation: authStore.authSessionGeneration,
  });
}

async function closeCommunityStatsModal(): Promise<void> {
  showCommunityStatsModal.value = false;
  await nextTick();
  communityStatsButton.value?.focus();
}
</script>

<template>
      <div class="bg-white dark:bg-rv-darkCard shadow-sm rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex-1">

        <!-- Comunidad -->
        <div class="px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <h3 class="text-sm font-bold text-rv-navy dark:text-white mb-3 flex items-center gap-2">
            <img src="/LOGO-RIFF-VALLEY.svg" alt="Riff Valley" class="w-4 h-4 brightness-0 dark:brightness-100" />
            Comunidad
          </h3>
          <div role="list" class="grid grid-cols-3 gap-2" data-test="community-groups">
            <div role="listitem"
              v-for="group in communityGroups"
              :key="group.title"
              class="flex min-w-0 flex-col items-center rounded-xl border border-gray-100 bg-gray-50 px-2 py-2.5 text-center dark:border-white/10 dark:bg-rv-darkSurface"
            >
              <h4 class="text-[11px] font-bold uppercase tracking-wide text-rv-navy dark:text-white">{{ group.title }}</h4>
              <p class="mb-2 text-[10px] leading-tight text-gray-500 dark:text-gray-300">{{ group.hint }}</p>
              <div class="mt-auto flex w-full flex-col gap-1.5">
                <a
                  v-for="link in group.links"
                  :key="link.href"
                  :href="link.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-label="`${link.aria} (se abre en una pestaña nueva)`"
                  class="community-pill text-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink"
                  :class="link.tone"
                ><i :class="link.icon" aria-hidden="true"></i>{{ link.label }}</a>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Usuarios -->
        <div class="px-5 py-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-rv-navy dark:text-white flex items-center gap-2">
              <i class="fa-solid fa-user-group"></i>Top usuarios
            </h3>
            <div class="relative inline-flex">
              <select v-model.number="selectedStatsYear" aria-label="Año de estadísticas"
                class="pl-3 pr-7 py-1 rounded-full text-xs font-semibold bg-rv-navy text-white appearance-none cursor-pointer border-none ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink">
                <option v-for="option in availableStatsYears" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <svg class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex gap-1 mb-3 p-1 bg-gray-100 dark:bg-rv-darkSurface rounded-lg">
            <button type="button" @click="topUsersTab = 'rates'" :aria-pressed="topUsersTab === 'rates'"
              :class="topUsersTab === 'rates' ? 'bg-rv-purple text-white shadow' : 'bg-gray-200 dark:bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/10'"
              class="flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple">
              <i class="fa-solid fa-compact-disc mr-1 text-[10px]"></i>Discos
            </button>
            <button type="button" @click="topUsersTab = 'cover'" :aria-pressed="topUsersTab === 'cover'"
              :class="topUsersTab === 'cover' ? 'bg-rv-purple text-white shadow' : 'bg-gray-200 dark:bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/10'"
              class="flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple">
              <i class="fa-solid fa-image mr-1 text-[10px]"></i>Portadas
            </button>
          </div>

          <!-- Ranking: en móvil una sola columna (1-20); desde sm, dos columnas: izquierda 1-10, derecha 11-20 -->
          <p v-if="isLoading" class="text-gray-500 text-xs text-center py-3" role="status" aria-live="polite">Cargando rankings…</p>
          <div v-else-if="hasError" class="text-center py-3" role="alert">
            <p class="text-red-600 dark:text-red-400 text-xs mb-2">No se pudieron cargar los rankings.</p>
            <button type="button" class="text-xs font-semibold underline" @click="retryRankings">Reintentar</button>
          </div>
          <template v-else-if="topUsersTab === 'rates'">
            <p v-if="topUsersByRates.length === 0" class="text-gray-400 dark:text-gray-300 italic text-xs text-center py-3">No hay datos</p>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-x-2">
              <ul v-for="(col, colIdx) in topUsersByRatesColumns" :key="colIdx">
                <li v-for="entry in col" :key="entry.user.user.id"
                  class="flex items-center gap-1.5 py-1 px-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors min-w-0">
                  <span class="text-xs w-4 text-center shrink-0" :aria-label="`Posición ${entry.index + 1}`">
                    <i v-if="entry.index < 3" class="fas fa-trophy" :class="trophyClasses[entry.index]" aria-hidden="true"></i>
                    <span v-else class="text-gray-400 dark:text-gray-300 text-xs">{{ entry.index + 1 }}</span>
                  </span>
                  <span class="text-left text-xs font-medium text-gray-800 dark:text-gray-200 truncate min-w-0 flex-1">{{ entry.user.user.username }}</span>
                  <span class="text-[10px] font-bold tabular-nums shrink-0 bg-gray-100 dark:bg-rv-darkSurface text-rv-navy dark:text-white px-1.5 py-0.5 rounded-full">{{ entry.user.rateCount }}</span>
                </li>
              </ul>
            </div>
          </template>
          <template v-else-if="!isLoading && !hasError">
            <p v-if="topUsersByCover.length === 0" class="text-gray-400 dark:text-gray-300 italic text-xs text-center py-3">No hay datos</p>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-x-2">
              <ul v-for="(col, colIdx) in topUsersByCoverColumns" :key="colIdx">
                <li v-for="entry in col" :key="entry.user.user.id"
                  class="flex items-center gap-1.5 py-1 px-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors min-w-0">
                  <span class="text-xs w-4 text-center shrink-0" :aria-label="`Posición ${entry.index + 1}`">
                    <i v-if="entry.index < 3" class="fas fa-trophy" :class="trophyClasses[entry.index]" aria-hidden="true"></i>
                    <span v-else class="text-gray-400 dark:text-gray-300 text-xs">{{ entry.index + 1 }}</span>
                  </span>
                  <span class="text-left text-xs font-medium text-gray-800 dark:text-gray-200 truncate min-w-0 flex-1">{{ entry.user.user.username }}</span>
                  <span class="text-[10px] font-bold tabular-nums shrink-0 bg-gray-100 dark:bg-rv-darkSurface text-rv-navy dark:text-white px-1.5 py-0.5 rounded-full">{{ entry.user.totalCover }}</span>
                </li>
              </ul>
            </div>
          </template>

          <div class="mt-3 pt-3 border-t border-gray-100 dark:border-white/10 flex justify-center">
            <button
              ref="communityStatsButton"
              type="button"
              aria-haspopup="dialog"
              @mouseenter="prefetchCommunityStats"
              @focus="prefetchCommunityStats"
              @click="showCommunityStatsModal = true"
              class="group inline-flex items-center justify-center px-3 py-1.5 rounded-full shadow text-xs font-semibold text-white bg-rv-purple transition-all duration-200 hover:bg-rv-navy hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] border border-transparent outline-none focus-visible:ring-2 focus-visible:ring-rv-pink focus-visible:ring-offset-2"
            >
              <i class="fa-solid fa-chart-pie mr-1.5" aria-hidden="true"></i>Estadísticas
            </button>
            <DashboardCommunityStatsModal
              v-if="showCommunityStatsModal"
              :year="selectedStatsYear"
              @close="closeCommunityStatsModal"
            />
          </div>
        </div>
      </div>
</template>

<style scoped>
.community-pill {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.3rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,.1);
}
.community-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
}
</style>
