<template>
  <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div class="bg-white rounded-3xl shadow-xl max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto p-6 relative">
      <button @click="$emit('close')"
        class="absolute top-2 right-2 text-white bg-rv-navy hover:bg-[#e46e8a]
       rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all
       border-0 outline-none focus:outline-none focus-visible:outline-none
       ring-0 focus:ring-0 focus-visible:ring-0">
        <i class="fas fa-times"></i>
      </button>
      <h2 class="text-xl font-bold mb-6 text-center text-gray-800">Estadísticas detalladas</h2>

      <!-- Estadísticas de discos -->
      <div class="text-center text-sm sm:text-base md:text-lg">
        <h3 class="text-2xl md:text-3xl font-bold text-rv-navy mb-4">
          Estadísticas de discos
        </h3>
        <p class="text-lg md:text-xl text-rv-navy">
          Total de discos:
          <span class="font-semibold text-rv-navy">{{ stats.totalDiscs }}</span>
        </p>
        <p class="text-lg mt-2">
          Total de votos:
          <span class="font-semibold text-rv-navy">{{ stats.totalVotes }}</span>
        </p>
        <div class="mt-4 w-full max-w-[320px] mx-auto overflow-hidden">
          <RatingBarChart :rating-distribution="ratingDistribution" />
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
import RatingBarChart from '@views/homePage/components/RatingBarChar.vue';

interface Props {
  stats: { totalDiscs: number; totalVotes: number };
  ratingDistribution: Array<{ rate: number; count: number }>;
}

defineProps<Props>();
defineEmits<{ close: [] }>();
</script>
