<template>
  <div
    class="absolute z-10 -translate-x-1/2 -translate-y-full pointer-events-none
           bg-white dark:bg-rv-darkSurface border border-gray-200 dark:border-white/10
           rounded-xl shadow-lg px-3 py-2 text-xs whitespace-nowrap"
    :style="{ left: `${x}px`, top: `${y - 12}px` }"
  >
    <p class="font-semibold text-gray-800 dark:text-white">{{ disc.name }}</p>
    <p class="text-gray-500 dark:text-gray-400">{{ disc.artist.name }}</p>
    <div class="flex items-center gap-1.5 mt-1">
      <span v-if="disc.genre"
        class="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
        :style="{ backgroundColor: disc.genre.color, color: textColorFor(disc.genre.color) }">
        {{ disc.genre.name }}
      </span>
      <span class="text-rv-pink font-semibold">Tu nota: {{ disc.rate }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { textColorFor } from "../utils/galaxyLayout";

// Forma mínima que necesita el tooltip: la cumplen tanto TopDisc como
// RatedDiscItem (que no tiene `image`), así se reutiliza en ambos casos.
export interface DiscTooltipInfo {
  name: string;
  rate: number;
  artist: { name: string };
  genre?: { name: string; color: string } | null;
}

export default defineComponent({
  name: "DiscHoverTooltip",
  props: {
    disc: { type: Object as PropType<DiscTooltipInfo>, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  setup() {
    return { textColorFor };
  },
});
</script>
