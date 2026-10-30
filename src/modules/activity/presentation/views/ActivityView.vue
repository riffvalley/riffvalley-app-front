<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from "vue";
import ActivityDateFilter from "../components/ActivityDateFilter.vue";
import ActivityTimeline from "../components/ActivityTimeline.vue";
import {
  getBrowserIanaTimeZone,
  isValidActivityDateFilter,
  type ActivityDateFilter as ActivityDateFilterValue,
} from "../../application/activityDateFilter";

const dateFilter = shallowRef<ActivityDateFilterValue>({ mode: "all" });
const timeZone = shallowRef<string | null>(getBrowserIanaTimeZone());
const queryRange = computed(() => {
  if (dateFilter.value.mode === "day") {
    return { from: dateFilter.value.date, to: dateFilter.value.date };
  }
  if (dateFilter.value.mode === "range") {
    return { from: dateFilter.value.from, to: dateFilter.value.to };
  }
  return {};
});
const timelineKey = computed(() => JSON.stringify([
  dateFilter.value,
  timeZone.value,
]));

function refreshTimeZone(): void {
  timeZone.value = getBrowserIanaTimeZone();
}

function updateDateFilter(filter: ActivityDateFilterValue): void {
  if (isValidActivityDateFilter(filter)) dateFilter.value = filter;
}

function onVisibilityChange(): void {
  if (document.visibilityState === "visible") refreshTimeZone();
}

onMounted(() => {
  window.addEventListener("focus", refreshTimeZone);
  document.addEventListener("visibilitychange", onVisibilityChange);
});
onBeforeUnmount(() => {
  window.removeEventListener("focus", refreshTimeZone);
  document.removeEventListener("visibilitychange", onVisibilityChange);
});
</script>

<template>
  <main class="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 dark:bg-rv-darkBg dark:text-white sm:px-6 lg:px-8">
    <div class="mx-auto max-w-5xl">
      <header class="mb-8 text-center">
        <h1 class="inline-flex items-center justify-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
          <i class="fa-solid fa-clock-rotate-left text-rv-purple dark:text-rv-pink" aria-hidden="true"></i>
          Actividad
        </h1>
        <p class="mx-auto mt-3 max-w-2xl text-base text-gray-600 dark:text-gray-300">
          Consulta el historial de tus valoraciones y los cambios que has hecho en ellas.
        </p>
        <ActivityDateFilter
          class="mt-5"
          :model-value="dateFilter"
          :time-zone="timeZone"
          @update:model-value="updateDateFilter"
        />
      </header>

      <ActivityTimeline
        :key="timelineKey"
        :from="queryRange.from"
        :to="queryRange.to"
        :time-zone="timeZone"
        :is-date-filtered="dateFilter.mode !== 'all'"
        :is-date-range="dateFilter.mode === 'range'"
        @clear-filter="updateDateFilter({ mode: 'all' })"
      />
    </div>
  </main>
</template>
