<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/50 z-50"
      @click.self="$emit('close')"
    >
      <div
        class="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-[93%] sm:w-full sm:max-w-3xl relative max-h-[80vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <!-- Close button -->
        <button
          @click="$emit('close')"
          class="absolute top-3 right-3 text-white bg-rv-navy hover:bg-[#e46e8a]
                 rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all
                 border-0 outline-none focus:outline-none focus-visible:outline-none
                 ring-0 focus:ring-0 focus-visible:ring-0"
          aria-label="Cerrar"
          title="Cerrar"
        >
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>

        <!-- Title -->
        <h2 class="text-xl font-bold text-rv-navy mb-4">
          Estadísticas detalladas
        </h2>

        <!-- Estadísticas -->
        <div class="text-center">
          <h3 class="text-lg sm:text-xl font-bold text-rv-navy mb-3">
            Estadísticas de discos
          </h3>

          <p class="text-sm sm:text-base text-gray-700">
            Total de discos:
            <span class="font-semibold text-rv-navy">{{ stats.totalDiscs }}</span>
          </p>

          <p class="text-sm sm:text-base text-gray-700 mt-1.5">
            Total de votos:
            <span class="font-semibold text-rv-navy">{{ stats.totalVotes }}</span>
          </p>

          <div class="mt-5 w-full max-w-[380px] mx-auto overflow-hidden">
            <RatingBarChart :rating-distribution="ratingDistribution" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import RatingBarChart from '@views/homePage/components/RatingBarChar.vue';

interface Props {
  stats: { totalDiscs: number; totalVotes: number };
  ratingDistribution: Array<{ rate: number; count: number }>;
}

defineProps<Props>();
defineEmits<{ close: [] }>();
</script>
