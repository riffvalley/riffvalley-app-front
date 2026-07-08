<template>
  <div class="p-4 md:p-6 bg-gray-50 dark:bg-rv-darkBg min-h-screen flex flex-col items-center">
    <div class="max-w-7xl w-full">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          <i class="fa-solid fa-door-closed mr-2"></i>Gestión de Salas
        </h1>
        <button @click="router.push({ name: 'CreateRoom' })"
          class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all duration-200 flex items-center gap-2">
          <i class="fa-solid fa-plus"></i>
          Nueva Sala
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20">
        <i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-500 mb-4"></i>
        <p class="text-gray-500 dark:text-gray-400 text-lg">Cargando salas...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="venues.length === 0"
        class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-sm p-12 text-center border border-gray-100 dark:border-white/10">
        <div class="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fa-solid fa-door-closed text-2xl text-indigo-400"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">No hay salas creadas</h3>
        <button @click="router.push({ name: 'CreateRoom' })"
          class="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">
          Crear sala ahora
        </button>
      </div>

      <!-- Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="venue in venues" :key="venue.id"
          class="bg-white dark:bg-rv-darkCard rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col justify-between h-full">

          <div class="h-28 bg-gray-100 dark:bg-rv-darkSurface flex items-center justify-center overflow-hidden">
            <img v-if="venue.images && venue.images[0]" :src="venue.images[0]" :alt="venue.name" class="w-full h-full object-cover" />
            <i v-else class="fa-solid fa-building text-2xl text-gray-300 dark:text-gray-600"></i>
          </div>

          <div class="p-4 flex-1">
            <h3 class="font-bold text-gray-800 dark:text-gray-100 text-base leading-tight line-clamp-2 mb-1">{{ venue.name }}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
              <i class="fa-solid fa-location-dot mr-1"></i>{{ venue.city }}<span v-if="venue.province"> · {{ venue.province }}</span>
            </p>
            <span v-if="!venue.province" class="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              <i class="fa-solid fa-triangle-exclamation mr-1"></i>Sin ubicar
            </span>
          </div>

          <div class="px-4 pb-4 flex gap-2 mt-auto">
            <button @click="goToEdit(venue.id)"
              class="flex-1 bg-gray-50 dark:bg-rv-darkSurface hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-gray-200 dark:border-white/10 hover:border-indigo-200 dark:hover:border-indigo-900/30 rounded text-sm font-medium py-1.5 transition-colors flex items-center justify-center gap-2">
              <i class="fa-solid fa-pen text-xs"></i>
              <span>Editar</span>
            </button>
            <button @click="deleteItem(venue.id)"
              class="w-8 flex items-center justify-center bg-gray-50 dark:bg-rv-darkSurface hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 border border-gray-200 dark:border-white/10 hover:border-red-200 dark:hover:border-red-900/30 rounded transition-colors"
              title="Eliminar">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getVenues, deleteVenue } from '@services/venues/venues';
import type { Venue } from '@services/venues/venues';
import SwalService from '@services/swal/SwalService';

export default defineComponent({
  name: 'ManageRooms',
  setup() {
    const venues = ref<Venue[]>([]);
    const loading = ref(true);
    const router = useRouter();

    const fetchVenues = async () => {
      loading.value = true;
      try {
        venues.value = await getVenues();
      } catch (error) {
        console.error('Error fetching venues:', error);
        SwalService.error('Error al cargar las salas');
      } finally {
        loading.value = false;
      }
    };

    const goToEdit = (id: string) => {
      router.push({ name: 'EditRoom', params: { id } });
    };

    const deleteItem = async (id: string) => {
      const confirmed = await SwalService.confirm(
        '¿Estás seguro?',
        'Esta acción no se puede deshacer. Se eliminará la sala permanentemente.'
      );
      if (confirmed.isConfirmed) {
        try {
          await deleteVenue(id);
          SwalService.success('Sala eliminada');
          fetchVenues();
        } catch (error) {
          console.error('Error deleting venue:', error);
          SwalService.error('No se pudo eliminar la sala');
        }
      }
    };

    onMounted(fetchVenues);

    return { venues, loading, router, goToEdit, deleteItem };
  },
});
</script>
