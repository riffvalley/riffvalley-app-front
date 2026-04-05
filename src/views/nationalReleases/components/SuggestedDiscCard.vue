<template>
  <div class="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
    <img v-if="disc.image" :src="disc.image" class="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
    <div class="flex-none w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center" v-else>
      <i class="fas fa-compact-disc text-gray-300 text-xl"></i>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold text-gray-800 truncate">{{ disc.name }}</p>
      <p class="text-xs text-gray-500">{{ disc.artist.name }}</p>
      <p class="text-xs font-medium" :style="{ color: disc.genre.color }">{{ disc.genre.name }}</p>
    </div>
    <button
      @click="$emit('confirm')"
      :disabled="saving"
      class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rv-navy text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      <i class="fas fa-link text-[10px]"></i>
      {{ saving ? 'Vinculando...' : 'Confirmar' }}
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { LinkedDisc } from '@services/national-releases/nationalReleases';

export default defineComponent({
  name: 'SuggestedDiscCard',
  props: {
    disc: {
      type: Object as PropType<LinkedDisc>,
      required: true,
    },
    saving: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['confirm'],
});
</script>
