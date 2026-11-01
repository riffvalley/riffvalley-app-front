<script setup lang="ts">
import { computed } from "vue";
import type { TopDiscsCardUpdateEvent, TopRankedDisc } from "../../types/topDiscs";
import { separateTopDiscs } from "../separateTopDiscs";
import TopDiscsFeatured from "./TopDiscsFeatured.vue";
import TopDiscsGrid from "./TopDiscsGrid.vue";

const props = defineProps<{ discs: TopRankedDisc[] }>();
const emit = defineEmits<{ "card-updated": [event: TopDiscsCardUpdateEvent] }>();

const sections = computed(() => separateTopDiscs(props.discs));
const hasDiscs = computed(() => props.discs.length > 0);
</script>

<template>
  <div v-if="hasDiscs" class="ranking-sections">
    <TopDiscsFeatured :discs="sections.featured" @card-updated="emit('card-updated', $event)" />
    <TopDiscsGrid :discs="sections.secondary" @card-updated="emit('card-updated', $event)" />
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
