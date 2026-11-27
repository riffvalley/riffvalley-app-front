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
  <div class="mx-auto mt-10 max-w-5xl px-4 text-gray-900 dark:text-white sm:px-6 lg:px-8">
    <div>
      <header class="mb-8 text-center">
        <h1 class="mb-2 text-center text-2xl font-extrabold tracking-tight text-rv-navy dark:text-white sm:text-3xl">
          <i class="fa-solid fa-clock-rotate-left mr-3" aria-hidden="true"></i>Actividad
        </h1>
        <p class="text-center text-sm text-gray-500 dark:text-gray-400">
          Consulta el historial de tus valoraciones y los cambios que has hecho en ellas.
        </p>
        <ActivityDateFilter
          class="mt-6"
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
  </div>
</template>
