<template>
  <div class="p-4 md:p-6 bg-gray-100 dark:bg-rv-darkBg min-h-screen">
    <div class="max-w-3xl mx-auto">

      <button @click="router.push({ name: 'ManageRooms' })"
        class="mb-4 px-4 py-2 bg-white dark:bg-rv-darkCard text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-rv-darkSurface border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-2 transition-colors">
        <i class="fa-solid fa-arrow-left"></i>
        Volver a Gestión de Salas
      </button>

      <div v-if="loading" class="text-center py-20">
        <i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-500 mb-4"></i>
        <p class="text-gray-500 dark:text-gray-400 text-lg">Cargando sala...</p>
      </div>

      <template v-else-if="venue">
        <div class="bg-white dark:bg-rv-darkCard p-4 md:p-6 rounded-2xl shadow-md mb-6">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 class="text-lg font-bold dark:text-white">Editar Sala</h3>

            <div class="flex items-center gap-2">
              <span v-if="venue.province"
                class="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                <i class="fa-solid fa-location-dot mr-1"></i>{{ venue.province }}
              </span>
              <span v-else
                class="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                <i class="fa-solid fa-triangle-exclamation mr-1"></i>Sin ubicar
              </span>
              <button @click="handleGeocode" :disabled="geocoding"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-rv-darkBg transition-colors flex items-center gap-1.5 disabled:opacity-50">
                <i :class="['fa-solid fa-arrows-rotate', { 'fa-spin': geocoding }]"></i>
                Reintentar geocode
              </button>
              <button @click="handleDelete"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-1.5">
                <i class="fa-solid fa-trash"></i>
                Eliminar
              </button>
            </div>
          </div>

          <RoomForm :initial="venue" :submitting="submitting" submit-label="Guardar cambios" @submit="handleSubmit" @cancel="router.push({ name: 'ManageRooms' })" />
        </div>
      </template>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RoomForm from './components/RoomForm.vue';
import { getVenue, updateVenue, deleteVenue, geocodeVenue } from '@services/venues/venues';
import type { Venue, UpdateVenueDto } from '@services/venues/venues';
import SwalService from '@services/swal/SwalService';

export default defineComponent({
  name: 'EditRoom',
  components: { RoomForm },
  props: {
    id: { type: String, required: true },
  },
  setup(props) {
    const route = useRoute();
    const router = useRouter();
    const id = props.id || (route.params.id as string);

    const venue = ref<Venue | null>(null);
    const loading = ref(true);
    const submitting = ref(false);
    const geocoding = ref(false);

    const fetchVenue = async () => {
      loading.value = true;
      try {
        venue.value = await getVenue(id);
      } catch (error) {
        console.error('Error fetching venue:', error);
        SwalService.error('No se pudo cargar la sala');
        router.push({ name: 'ManageRooms' });
      } finally {
        loading.value = false;
      }
    };

    const handleSubmit = async (dto: UpdateVenueDto) => {
      submitting.value = true;
      try {
        venue.value = await updateVenue(id, dto);
        SwalService.success('Sala actualizada correctamente');
      } catch (error) {
        console.error('Error updating venue:', error);
        SwalService.error('No se pudo actualizar la sala');
      } finally {
        submitting.value = false;
      }
    };

    const handleGeocode = async () => {
      geocoding.value = true;
      try {
        venue.value = await geocodeVenue(id);
        if (venue.value.province) {
          SwalService.success('Ubicación encontrada correctamente');
        } else {
          SwalService.error('No se encontró ninguna ubicación para esta sala');
        }
      } catch (error) {
        console.error('Error geocoding venue:', error);
        SwalService.error('No se encontró ninguna ubicación para esta sala');
      } finally {
        geocoding.value = false;
      }
    };

    const handleDelete = async () => {
      const confirmed = await SwalService.confirm(
        '¿Estás seguro?',
        'Esta acción no se puede deshacer. Se eliminará la sala permanentemente.'
      );
      if (confirmed.isConfirmed) {
        try {
          await deleteVenue(id);
          SwalService.success('Sala eliminada');
          router.push({ name: 'ManageRooms' });
        } catch (error) {
          console.error('Error deleting venue:', error);
          SwalService.error('No se pudo eliminar la sala');
        }
      }
    };

    onMounted(fetchVenue);

    return { router, venue, loading, submitting, geocoding, handleSubmit, handleGeocode, handleDelete };
  },
});
</script>
