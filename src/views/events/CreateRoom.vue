<template>
  <div class="p-4 md:p-6 bg-gray-100 dark:bg-rv-darkBg min-h-screen">
    <div class="max-w-3xl mx-auto">

      <button @click="router.push({ name: 'ManageRooms' })"
        class="mb-4 px-4 py-2 bg-white dark:bg-rv-darkCard text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-rv-darkSurface border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-2 transition-colors">
        <i class="fa-solid fa-arrow-left"></i>
        Volver a Gestión de Salas
      </button>

      <div class="bg-white dark:bg-rv-darkCard p-4 md:p-6 rounded-2xl shadow-md">
        <h3 class="text-lg font-bold mb-4 dark:text-white">Nueva Sala</h3>
        <RoomForm :submitting="submitting" submit-label="Crear sala" @submit="handleSubmit" @cancel="router.push({ name: 'ManageRooms' })" />
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import RoomForm from './components/RoomForm.vue';
import { createVenue } from '@services/venues/venues';
import type { CreateVenueDto } from '@services/venues/venues';
import SwalService from '@services/swal/SwalService';

export default defineComponent({
  name: 'CreateRoom',
  components: { RoomForm },
  setup() {
    const router = useRouter();
    const submitting = ref(false);

    const handleSubmit = async (dto: CreateVenueDto) => {
      submitting.value = true;
      try {
        await createVenue(dto);
        SwalService.success('Sala creada correctamente');
        router.push({ name: 'ManageRooms' });
      } catch (error) {
        console.error('Error creating venue:', error);
        SwalService.error('No se pudo crear la sala');
      } finally {
        submitting.value = false;
      }
    };

    return { router, submitting, handleSubmit };
  },
});
</script>
