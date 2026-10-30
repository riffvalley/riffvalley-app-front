<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import ActivityDiscCardDialog from "./ActivityDiscCardDialog.vue";
import type { ActivityHistoryEvent } from "../../types/activity";
import { getActivityScoreColorClasses } from "../utils/activityScoreColor";
import {
  activityDiscCardQueryKey,
  activityDiscCardStaleTime,
  fetchActivityDiscCard,
} from "../../application/activityDiscCardQuery";

const props = defineProps<{ event: ActivityHistoryEvent }>();
const isDiscCardOpen = shallowRef(false);
const authStore = useAuthStore();
const queryClient = useQueryClient();

const discTitle = computed(() => props.event.disc?.title?.trim() || "Disco no disponible");
const artistName = computed(() => props.event.disc?.artist?.name?.trim() || null);
const discArtistTitle = computed(() => artistName.value
  ? `${artistName.value} — ${discTitle.value}`
  : discTitle.value);
const canOpenDiscCard = computed(() => Boolean(props.event.disc?.id));

function prefetchDiscCard(): void {
  const discId = props.event.disc?.id;
  const userId = authStore.userId;
  const sessionGeneration = authStore.authSessionGeneration;
  if (
    !discId ||
    !userId ||
    authStore.authStatus !== "authenticated" ||
    !authStore.isAuthenticated
  ) return;

  const queryKey = activityDiscCardQueryKey(discId, userId, sessionGeneration);
  void queryClient.prefetchQuery({
    queryKey,
    queryFn: ({ queryKey: requestedKey, signal }) =>
      fetchActivityDiscCard(
        requestedKey[2],
        requestedKey[3],
        requestedKey[4],
        authStore,
        signal,
      ),
    staleTime: activityDiscCardStaleTime,
  });
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Hora no disponible";
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatScore(value: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 20 }).format(value);
}

const actionLabel = computed(() => props.event.type === "set" ? "Voto" : "Cambio");
const scoreChipBaseClasses =
  "inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-sm font-semibold tabular-nums";
</script>

<template>
  <article class="grid w-full min-w-0 grid-cols-[4rem_minmax(0,1fr)] grid-rows-[auto_auto] items-center gap-x-3 gap-y-2 border-b border-gray-200 py-4 last:border-b-0 dark:border-white/10 sm:grid-cols-[6rem_minmax(0,1fr)_7.5rem] sm:grid-rows-1 sm:gap-4">
    <div class="row-span-2 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-200 text-gray-600 dark:bg-rv-darkSurface dark:text-gray-300 sm:row-span-1 sm:h-24 sm:w-24">
      <img
        v-if="event.disc?.coverUrl"
        :src="event.disc.coverUrl"
        :alt="`Portada de ${discTitle}`"
        class="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <i v-else class="fa-solid fa-compact-disc text-xl" aria-hidden="true"></i>
    </div>

    <div class="col-start-2 row-start-1 min-w-0 sm:col-start-2 sm:row-start-1">
      <header class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          class="rounded-full px-2 py-0.5 text-xs font-semibold"
          :class="event.type === 'set'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
            : 'bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200'"
        >
          {{ actionLabel }}
        </span>
        <time class="text-xs text-gray-600 dark:text-gray-300" :datetime="event.occurredAt">
          {{ formatTime(event.occurredAt) }}
        </time>
      </header>

      <h3 class="mt-1 max-w-full whitespace-normal break-words text-left text-base font-semibold text-gray-900 dark:text-white">
        {{ discArtistTitle }}
      </h3>

      <div class="mt-3 flex flex-wrap items-center">
        <div
          v-if="event.type === 'set'"
          :class="[scoreChipBaseClasses, getActivityScoreColorClasses(event.newValue)]"
        >
          {{ event.newValue === null ? "Nota no disponible" : `${formatScore(event.newValue)}/10` }}
        </div>

        <div v-else class="flex flex-wrap items-center gap-2" role="group" aria-label="Cambio de nota">
          <span
            :class="[scoreChipBaseClasses, getActivityScoreColorClasses(event.previousValue)]"
          >
            {{ event.previousValue === null ? "Anterior no disponible" : `${formatScore(event.previousValue)}/10` }}
          </span>
          <i class="fa-solid fa-arrow-right text-xs text-gray-500 dark:text-gray-400" aria-hidden="true"></i>
          <span
            :class="[scoreChipBaseClasses, getActivityScoreColorClasses(event.newValue)]"
          >
            {{ event.newValue === null ? "Nueva no disponible" : `${formatScore(event.newValue)}/10` }}
          </span>
        </div>

      </div>
    </div>

    <button
      v-if="canOpenDiscCard"
      type="button"
      class="col-start-2 row-start-2 inline-flex shrink-0 items-center justify-self-start rounded-full bg-rv-navy px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-rv-navy/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-gray-300 dark:focus-visible:outline-rv-pink sm:col-start-3 sm:row-start-1 sm:justify-self-center"
      :aria-label="`Abrir tarjeta de ${discTitle}`"
      @mouseenter="prefetchDiscCard"
      @focus="prefetchDiscCard"
      @click="isDiscCardOpen = true"
    >
      Ver disco
    </button>

    <ActivityDiscCardDialog
      v-if="isDiscCardOpen"
      :disc-id="event.disc!.id"
      @close="isDiscCardOpen = false"
    />
  </article>
</template>
