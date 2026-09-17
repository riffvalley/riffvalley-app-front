<template>
  <div
    class="absolute z-10 -translate-x-1/2 -translate-y-full pointer-events-none
           bg-white dark:bg-rv-darkSurface border border-gray-200 dark:border-white/10
           rounded-xl shadow-lg px-3 py-2 text-xs whitespace-nowrap"
    :style="{ left: `${x}px`, top: `${y - 12}px` }"
  >
    <p class="font-semibold text-gray-800 dark:text-white">{{ disc.name }}</p>
    <p class="text-gray-500 dark:text-gray-400">{{ disc.artist.name }}</p>
    <p class="text-rv-pink font-semibold mt-0.5">Tu nota: {{ disc.rate }}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { TopDisc } from "@services/rates/rates";

export default defineComponent({
  name: "DiscHoverTooltip",
  props: {
    disc: { type: Object as PropType<TopDisc>, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
});
</script>
