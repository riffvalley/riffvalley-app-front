<script setup lang="ts">
import { computed } from "vue";
import type { Disc } from "@services/discs/discs";
import TopDiscsFeatured from "./TopDiscsFeatured.vue";
import TopDiscsGrid from "./TopDiscsGrid.vue";

interface RatingSavedEvent {
  discId: string;
  action: "created" | "updated";
  musicalRateChanged: boolean;
  hasMusicalRate: boolean;
  coverChanged: boolean;
}

const props = defineProps<{ discs: Disc[] }>();
const emit = defineEmits<{ "rating-saved": [event: RatingSavedEvent] }>();

const rankedDiscs = computed(() => props.discs.slice(0, 11));
const featuredDiscs = computed(() => rankedDiscs.value.slice(0, 3));
const remainingDiscs = computed(() => rankedDiscs.value.slice(3, 11));
</script>

<template>
  <div v-if="rankedDiscs.length" class="ranking-sections">
    <TopDiscsFeatured :discs="featuredDiscs" @rating-saved="emit('rating-saved', $event)" />
    <TopDiscsGrid :discs="remainingDiscs" @rating-saved="emit('rating-saved', $event)" />
  </div>
  <p v-else role="status" class="py-8 text-center text-gray-600 dark:text-gray-300">
    No hay discos para este periodo y estos filtros.
  </p>
</template>

<style scoped>
.ranking-sections {
  display: grid;
  gap: 2.5rem;
}
</style>
