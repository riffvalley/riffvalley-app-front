<script setup lang="ts">
import ActivityEventCard from "./ActivityEventCard.vue";
import type { ActivityDayGroup as ActivityDayGroupModel } from "../../application/groupActivityEvents";

defineProps<{
  group: ActivityDayGroupModel;
  dailySetCount?: number;
}>();
</script>

<template>
  <section :aria-labelledby="`activity-day-${group.dateKey}`" class="mb-7 last:mb-0">
    <h2
      :id="`activity-day-${group.dateKey}`"
      class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-200 pb-2 text-left text-base font-bold text-rv-navy dark:border-white/10 dark:text-white"
    >
      <time v-if="group.dateKey !== 'unknown-date'" :datetime="group.dateKey">{{ group.dateLabel }}</time>
      <span v-else>{{ group.dateLabel }}</span>
      <span
        v-if="dailySetCount !== undefined"
        class="shrink-0 text-sm font-normal text-gray-500 dark:text-gray-400"
      >
        {{ dailySetCount }} {{ dailySetCount === 1 ? "voto" : "votos" }}
      </span>
    </h2>
    <div class="w-full">
      <ActivityEventCard v-for="event in group.events" :key="event.id" :event="event" />
    </div>
  </section>
</template>
