<template>
  <div class="min-h-screen bg-gray-100 dark:bg-rv-darkBg py-8 px-4">
    <div class="max-w-3xl mx-auto">

      <button @click="router.push({ name: 'RoomsByProvince', params: { province } })"
        class="mb-4 px-4 py-2 bg-white dark:bg-rv-darkCard text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-rv-darkSurface border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-2 transition-colors">
        <i class="fa-solid fa-arrow-left"></i>
        Volver a salas de {{ displayName }}
      </button>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20">
        <i class="fa-solid fa-spinner fa-spin text-4xl text-rv-pink mb-4"></i>
        <p class="text-gray-500 dark:text-gray-400 text-lg">Cargando sala...</p>
      </div>

      <!-- Not found -->
      <div v-else-if="!venue"
        class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-sm p-12 text-center border border-gray-100 dark:border-white/10">
        <i class="fa-solid fa-building-circle-xmark text-3xl text-gray-300 dark:text-gray-600 mb-3"></i>
        <p class="text-gray-500 dark:text-gray-400">No se ha encontrado esta sala.</p>
      </div>

      <!-- Detalle -->
      <div v-else class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-md overflow-hidden">
        <div v-if="venue.images && venue.images[0]" class="h-64 w-full overflow-hidden">
          <img :src="venue.images[0]" :alt="venue.name" class="w-full h-full object-cover" />
        </div>
        <div v-else class="h-40 w-full bg-gray-100 dark:bg-rv-darkSurface flex items-center justify-center">
          <i class="fa-solid fa-building text-4xl text-gray-300 dark:text-gray-600"></i>
        </div>

        <div class="p-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">{{ venue.name }}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            <i class="fa-solid fa-location-dot mr-1"></i>
            {{ venue.address ? venue.address + ', ' : '' }}{{ venue.city }}<span v-if="venue.province"> ({{ venue.province }})</span>
            <span v-if="venue.country"> · {{ venue.country.name }}</span>
          </p>

          <div v-if="venue.description" class="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 mb-4"
            v-html="venue.description"></div>

          <div v-if="venue.images && venue.images.length > 1" class="flex gap-2 overflow-x-auto">
            <img v-for="(img, idx) in venue.images.slice(1)" :key="idx" :src="img" class="h-20 w-20 object-cover rounded-md shrink-0" />
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getVenues, getVenueStatsByProvince } from '@services/venues/venues';
import type { Venue, VenueProvinceStat } from '@services/venues/venues';
import { slugify } from '@helpers/slug';
import { resolveProvinceSlug } from '@helpers/provinceMatch';
import SwalService from '@services/swal/SwalService';

export default defineComponent({
  name: 'RoomDetail',
  props: {
    province: { type: String, required: true },
    room: { type: String, required: true },
  },
  setup(props) {
    const router = useRouter();
    const loading = ref(true);
    const stats = ref<VenueProvinceStat[]>([]);
    const venue = ref<Venue | null>(null);

    const resolved = computed(() => resolveProvinceSlug(props.province, stats.value));
    const displayName = computed(() => resolved.value.displayName);

    const fetchData = async () => {
      loading.value = true;
      venue.value = null;
      try {
        stats.value = await getVenueStatsByProvince();
        let candidates: Venue[];
        if (resolved.value.isUnlocated) {
          const all = await getVenues();
          candidates = all.filter((v) => !v.province);
        } else if (resolved.value.backendProvince) {
          candidates = await getVenues(resolved.value.backendProvince);
        } else {
          candidates = [];
        }
        venue.value = candidates.find((v) => slugify(v.name) === props.room) ?? null;
      } catch (error) {
        console.error('Error fetching venue detail:', error);
        SwalService.error('No se pudo cargar la sala');
      } finally {
        loading.value = false;
      }
    };

    watch(() => [props.province, props.room], fetchData);
    onMounted(fetchData);

    return { router, loading, venue, displayName };
  },
});
</script>
