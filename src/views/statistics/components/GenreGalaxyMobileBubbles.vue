<template>
  <div class="h-full flex flex-col">
    <!-- Nube de burbujas, una por género, tamaño = nº de discos -->
    <div class="flex-1 overflow-y-auto flex flex-wrap items-center justify-center content-start gap-3 p-4">
      <button
        v-for="group in groups" :key="group.genre"
        @click="toggle(group.genre)"
        class="rounded-full flex flex-col items-center justify-center text-center transition-transform active:scale-95 flex-shrink-0 shadow-lg"
        :style="bubbleStyle(group)"
      >
        <span class="font-extrabold leading-tight" :style="{ fontSize: `${countFontSize(group)}px` }">{{ group.discs.length }}</span>
        <span class="opacity-85 leading-tight px-1" :style="{ fontSize: `${labelFontSize(group)}px` }">{{ group.genre }}</span>
      </button>
    </div>

    <!-- Detalle del género seleccionado -->
    <div v-if="activeGroup" class="border-t border-white/10 bg-white/5 flex-shrink-0 max-h-[38%] overflow-y-auto">
      <div class="flex items-center gap-2 px-4 py-2.5 sticky top-0 bg-rv-navy border-b border-white/10">
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: activeGroup.color }"></span>
        <span class="font-semibold text-white text-sm flex-1 truncate">{{ activeGroup.genre }}</span>
        <button @click="activeGenre = null" class="text-white/50 hover:text-white text-xs px-1">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <ul class="px-4 py-1.5 space-y-1.5">
        <li v-for="disc in activeGroup.discs" :key="disc.id" class="flex items-center justify-between gap-2 py-1 text-sm">
          <div class="min-w-0">
            <p class="text-white truncate">{{ disc.name }}</p>
            <p class="text-white/50 text-xs truncate">{{ disc.artist.name }}</p>
          </div>
          <span class="text-xs font-semibold flex-shrink-0" :style="{ color: activeGroup.color }">{{ disc.rate }}</span>
        </li>
      </ul>
    </div>
    <p v-else class="text-center text-white/40 text-xs py-2 flex-shrink-0">Toca un género para ver sus discos</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from "vue";
import type { RatedDiscItem } from "@services/rates/rates";
import { groupByGenre, textColorFor, type GenreGroup } from "../utils/galaxyLayout";

const MIN_SIZE = 56;
const MAX_SIZE = 132;

export default defineComponent({
  name: "GenreGalaxyMobileBubbles",
  props: {
    discs: {
      type: Array as PropType<RatedDiscItem[]>,
      required: true,
    },
  },
  setup(props) {
    const groups = computed(() => groupByGenre(props.discs));
    const maxCount = computed(() => Math.max(...groups.value.map((g) => g.discs.length), 1));
    const activeGenre = ref<string | null>(null);
    const activeGroup = computed(() => groups.value.find((g) => g.genre === activeGenre.value) ?? null);

    const sizeOf = (group: GenreGroup) => {
      const ratio = Math.sqrt(group.discs.length / maxCount.value);
      return MIN_SIZE + ratio * (MAX_SIZE - MIN_SIZE);
    };

    const bubbleStyle = (group: GenreGroup) => {
      const size = sizeOf(group);
      return {
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: group.color,
        color: textColorFor(group.color),
        outline: activeGenre.value === group.genre ? "2px solid white" : "none",
        outlineOffset: "2px",
      };
    };

    const labelFontSize = (group: GenreGroup) => Math.max(9, Math.min(13, sizeOf(group) * 0.11));
    const countFontSize = (group: GenreGroup) => Math.max(18, Math.min(34, sizeOf(group) * 0.3));

    const toggle = (genre: string) => {
      activeGenre.value = activeGenre.value === genre ? null : genre;
    };

    return { groups, activeGenre, activeGroup, bubbleStyle, labelFontSize, countFontSize, toggle };
  },
});
</script>
