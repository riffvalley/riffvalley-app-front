<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import DiscCard from "@components/DiscCardComponent.vue";
import { getTopRatedOrFeaturedAndStats, type HomeRankedDisc } from "@services/discs/discs";

const props = defineProps<{
  period: "week" | "month";
}>();

const authStore = useAuthStore();
const discs = ref<HomeRankedDisc[]>([]);
const isLoading = ref(true);
const hasError = ref(false);
const retryCount = ref(0);

const isWeek = computed(() => props.period === "week");
const title = computed(() =>
  isWeek.value
    ? "Los discos mejor valorados publicados esta semana"
    : "Los discos mejor valorados publicados este mes"
);
const emptyMessage = computed(() =>
  isWeek.value
    ? "Todavía no hay discos valorados publicados esta semana."
    : "Todavía no hay discos valorados publicados este mes."
);
const periodLabel = computed(() => {
  const today = new Date();
  if (!isWeek.value) {
    return today.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  }

  const [start, end] = getWeekRange(today);
  const formatShort = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  return `${formatShort(start)} – ${formatShort(end)}`;
});

const headerClasses = computed(() =>
  isWeek.value
    ? "bg-gradient-to-r from-rv-pink/8 to-rv-purple/8 dark:from-rv-pink/10 dark:to-rv-purple/10"
    : "bg-gradient-to-r from-rv-purple/8 to-rv-pink/8 dark:from-rv-purple/10 dark:to-rv-pink/10"
);
const iconClasses = computed(() => (isWeek.value ? "text-rv-pink" : "text-rv-purple"));

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekRange(today: Date): [string, string] {
  const offset = (today.getDay() - 5 + 7) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return [formatDate(start), formatDate(end)];
}

function getMonthRange(today: Date): [string, string] {
  return [
    formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  ];
}

function medalClass(index: number): string {
  if (index === 0) return "medal-gold";
  if (index === 1) return "medal-silver";
  return "medal-bronze";
}

function normalizeDisc(disc: HomeRankedDisc): HomeRankedDisc {
  return {
    ...disc,
    artist: { ...disc.artist, country: disc.artist?.country ?? null },
    userRate: disc.userRate
      ? {
          ...disc.userRate,
          rate: disc.userRate.rate == null ? null : Number(disc.userRate.rate),
          cover: disc.userRate.cover == null ? null : Number(disc.userRate.cover),
        }
      : null,
  };
}

watch(
  () =>
    [
      props.period,
      authStore.isAuthenticated,
      authStore.userId,
      authStore.authSessionGeneration,
      retryCount.value,
    ] as const,
  ([period, isAuthenticated, userId], _previous, onCleanup) => {
    const controller = new AbortController();
    let isCurrentRequest = true;
    onCleanup(() => {
      isCurrentRequest = false;
      controller.abort();
    });

    discs.value = [];
    hasError.value = false;
    if (!isAuthenticated || !userId) {
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    const today = new Date();
    const dateRange = period === "week" ? getWeekRange(today) : getMonthRange(today);

    void getTopRatedOrFeaturedAndStats(
      dateRange,
      undefined,
      undefined,
      undefined,
      undefined,
      controller.signal
    )
      .then((response) => {
        if (!isCurrentRequest || controller.signal.aborted) return;
        discs.value = response.discs
          .filter((disc) => disc.voteCount > 0)
          .slice(0, 3)
          .map(normalizeDisc);
      })
      .catch(() => {
        if (isCurrentRequest && !controller.signal.aborted) hasError.value = true;
      })
      .finally(() => {
        if (isCurrentRequest && !controller.signal.aborted) isLoading.value = false;
      });
  },
  { immediate: true }
);

function retry(): void {
  retryCount.value += 1;
}
</script>

<template>
  <section
    class="bg-white dark:bg-rv-darkSurface rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden"
  >
    <header
      class="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 dark:border-white/10"
      :class="headerClasses"
    >
      <div class="min-w-0 text-left">
        <h3 class="flex min-w-0 items-center gap-2 font-bold text-gray-900 dark:text-white">
          <i class="fa-solid fa-fire shrink-0" :class="iconClasses" aria-hidden="true"></i>
          <span class="truncate">{{ isWeek ? "Top 3 · Semana actual" : "Top 3 · Mes actual" }}</span>
        </h3>
        <p class="mt-0.5 pl-6 text-xs text-gray-500 dark:text-gray-400">{{ title }}</p>
      </div>
      <span class="shrink-0 text-xs text-gray-400 dark:text-gray-500 capitalize">{{
        periodLabel
      }}</span>
    </header>

    <div class="p-4 sm:p-6">
      <div
        v-if="isLoading"
        class="grid grid-cols-1 xl:grid-cols-3 gap-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Cargando ranking"
      >
        <div v-for="index in 3" :key="index" class="flex flex-col gap-2" aria-hidden="true">
          <div
            class="h-5 w-10 rounded-full bg-gray-100 dark:bg-white/5 mx-auto animate-pulse"
          ></div>
          <div class="aspect-square rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse"></div>
        </div>
      </div>

      <div v-else-if="hasError" class="py-6 text-center" role="alert">
        <p class="text-sm text-gray-500 dark:text-gray-400">No se pudo cargar este ranking.</p>
        <button
          type="button"
          class="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-rv-purple hover:bg-rv-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          @click="retry"
        >
          Reintentar
        </button>
      </div>

      <div v-else-if="discs.length" class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div v-for="(disc, index) in discs" :key="disc.id" class="flex flex-col items-center gap-2">
          <div class="medal-chip" :class="medalClass(index)">
            <i class="fa-solid fa-trophy text-[10px]" aria-hidden="true"></i> {{ index + 1 }}º
          </div>
          <DiscCard
            :id="disc.id"
            :ep="disc.ep"
            :image="disc.image"
            :name="disc.name"
            :release-date="disc.releaseDate"
            :artist-name="disc.artist?.name"
            :genre-name="disc.genre?.name"
            :genre-color="disc.genre?.color"
            :link="disc.link ?? ''"
            :average-rate="disc.averageRate"
            :average-cover="disc.averageCover"
            :rate="disc.userRate?.rate"
            :cover="disc.userRate?.cover"
            :is-new="!disc.userRate"
            :user-disc-rate="disc.userRate?.id ? String(disc.userRate.id) : undefined"
            :favorite-id="disc.userFavoriteId ?? disc.favoriteId"
            :pending-id="disc.pendingId"
            :comment-count="disc.commentCount"
            :rate-count="disc.voteCount"
            :artist-country="
              disc.artist?.country
                ? {
                    id: disc.artist.country.id,
                    name: disc.artist.country.name,
                    isoCode: disc.artist.country.isoCode ?? '',
                  }
                : null
            "
            :debut="disc.debut"
          />
        </div>
      </div>

      <p
        v-else
        class="text-center text-gray-400 dark:text-gray-500 text-sm py-6"
        role="status"
        aria-live="polite"
      >
        {{ emptyMessage }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.medal-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.medal-gold {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
}
.medal-silver {
  background: linear-gradient(135deg, #c0c0c0, #888);
}
.medal-bronze {
  background: linear-gradient(135deg, #cd7f32, #8b4513);
}
</style>
