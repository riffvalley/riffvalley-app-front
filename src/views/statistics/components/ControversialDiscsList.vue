<template>
  <ul class="space-y-3">
    <li v-for="disc in discs" :key="disc.id" class="flex items-center gap-3">
      <img :src="disc.image ?? undefined" :alt="disc.name"
        class="w-12 h-12 rounded-lg object-cover ring-2 ring-white dark:ring-white/10 shadow-sm flex-shrink-0" />
      <div class="min-w-0 flex-1">
        <p class="font-semibold text-gray-800 dark:text-white text-sm truncate">{{ disc.name }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ disc.artist.name }}</p>
      </div>
      <div class="text-right flex-shrink-0">
        <p class="text-sm font-bold" :class="disc.diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'">
          {{ disc.diff >= 0 ? '+' : '' }}{{ disc.diff.toFixed(1) }}
        </p>
        <p class="text-[11px] text-gray-400 dark:text-gray-500">
          tú: {{ disc.userRate }} · media: {{ disc.communityAverage.toFixed(1) }}
        </p>
      </div>
    </li>
  </ul>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { ControversialDisc } from "@services/rates/rates";

export default defineComponent({
  name: "ControversialDiscsList",
  props: {
    discs: {
      type: Array as PropType<ControversialDisc[]>,
      required: true,
    },
  },
});
</script>
