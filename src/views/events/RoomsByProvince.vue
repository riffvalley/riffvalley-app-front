<template>
  <div class="min-h-screen bg-gray-100 dark:bg-rv-darkBg py-8 px-4">
    <div class="max-w-5xl mx-auto">

      <button @click="router.push({ name: 'EventsRooms' })"
        class="mb-4 px-4 py-2 bg-white dark:bg-rv-darkCard text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-rv-darkSurface border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-2 transition-colors">
        <i class="fa-solid fa-arrow-left"></i>
        Volver al mapa
      </button>

      <div class="text-center mb-6">
        <h1 class="text-2xl md:text-3xl font-bold text-rv-navy dark:text-white mb-2">
          <i class="fa-solid fa-location-dot mr-3"></i>Salas en {{ displayName }}
        </h1>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20">
        <i class="fa-solid fa-spinner fa-spin text-4xl text-rv-pink mb-4"></i>
        <p class="text-gray-500 dark:text-gray-400 text-lg">Cargando salas...</p>
      </div>

      <!-- Empty state -->
      <div v-else-if="venues.length === 0"
        class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-sm p-12 text-center border border-gray-100 dark:border-white/10">
        <i class="fa-solid fa-building text-3xl text-gray-300 dark:text-gray-600 mb-3"></i>
        <p class="text-gray-500 dark:text-gray-400">No hay salas en esta categoría todavía.</p>
      </div>

      <!-- Grid de salas -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <button v-for="venue in venues" :key="venue.id" @click="goToVenue(venue)"
          class="text-left bg-white dark:bg-rv-darkCard rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col">
          <div class="h-32 bg-gray-100 dark:bg-rv-darkSurface flex items-center justify-center overflow-hidden">
            <img v-if="venue.images && venue.images[0]" :src="venue.images[0]" :alt="venue.name" class="w-full h-full object-cover" />
            <i v-else class="fa-solid fa-building text-3xl text-gray-300 dark:text-gray-600"></i>
          </div>
          <div class="p-4">
            <h3 class="font-bold text-gray-800 dark:text-gray-100 text-base leading-tight line-clamp-2 mb-1">{{ venue.name }}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              <i class="fa-solid fa-location-dot mr-1"></i>{{ venue.city }}
            </p>
          </div>
        </button>
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
  name: 'RoomsByProvince',
  props: {
    province: { type: String, required: true },
  },
  setup(props) {
    const router = useRouter();
    const loading = ref(true);
    const stats = ref<VenueProvinceStat[]>([]);
    const venues = ref<Venue[]>([]);

    const resolved = computed(() => resolveProvinceSlug(props.province, stats.value));
    const displayName = computed(() => resolved.value.displayName);

    const fetchData = async () => {
      loading.value = true;
      try {
        stats.value = await getVenueStatsByProvince();
        if (resolved.value.isUnlocated) {
          const all = await getVenues();
          venues.value = all.filter((v) => !v.province);
        } else if (resolved.value.backendProvince) {
          venues.value = await getVenues(resolved.value.backendProvince);
        } else {
          venues.value = [];
        }
      } catch (error) {
        console.error('Error fetching venues by province:', error);
        SwalService.error('No se pudieron cargar las salas');
      } finally {
        loading.value = false;
      }
    };

    const goToVenue = (venue: Venue) => {
      router.push({ name: 'RoomDetail', params: { province: props.province, room: slugify(venue.name) } });
    };

    watch(() => props.province, fetchData);
    onMounted(fetchData);

    return { router, loading, venues, displayName, goToVenue };
  },
});
</script>
