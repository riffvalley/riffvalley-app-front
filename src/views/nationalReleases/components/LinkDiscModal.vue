<template>
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">

      <!-- Cabecera -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold dark:text-white">Vincular disco</h2>
        <button @click="$emit('close')" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
        <span class="font-semibold text-gray-700 dark:text-gray-200">{{ release.artistName }} — {{ release.discName }}</span>
      </p>

      <!-- Ya vinculado -->
      <template v-if="release.disc && !overriding">
        <div class="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-900/40 mb-5">
          <img v-if="release.disc.image" :src="release.disc.image" class="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          <div class="flex-none w-12 h-12 rounded-lg bg-gray-100 dark:bg-rv-darkSurface flex items-center justify-center" v-else>
            <i class="fas fa-compact-disc text-gray-300 dark:text-gray-500 text-xl"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{{ release.disc.name }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ release.disc.artist.name }}</p>
            <p class="text-xs font-medium" :style="{ color: release.disc.genre.color }">{{ release.disc.genre.name }}</p>
          </div>
          <span class="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1 flex-shrink-0">
            <i class="fas fa-check-circle"></i> Vinculado
          </span>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="$emit('close')" class="px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-rv-darkSurface transition-colors">
            Cerrar
          </button>
          <button @click="overriding = true" class="px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-white/20 text-gray-500 dark:text-gray-400 hover:border-rv-pink hover:text-rv-pink transition-colors">
            Cambiar disco
          </button>
        </div>
      </template>

      <!-- Sugerencia disponible (o modo override desde linked) -->
      <template v-else-if="(release.suggestedDisc && !useCreateForm) || (overriding && release.suggestedDisc && !useCreateForm)">
        <p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Disco sugerido</p>
        <SuggestedDiscCard :disc="release.suggestedDisc!" :saving="saving" @confirm="confirmSuggested" />
        <div class="flex justify-between items-center mt-5">
          <button
            type="button"
            @click="useCreateForm = true"
            class="text-sm text-gray-400 dark:text-gray-500 hover:text-rv-pink underline transition-colors"
          >
            Crear nuevo disco en su lugar
          </button>
          <button @click="$emit('close')" class="px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-rv-darkSurface transition-colors">
            Cancelar
          </button>
        </div>
      </template>

      <!-- Formulario de creación -->
      <template v-else>
        <CreateDiscForm
          :release="release"
          :saving="saving"
          :cancel-label="release.suggestedDisc ? 'Volver a la sugerencia' : 'Cancelar'"
          @submit="handleCreate"
          @cancel="release.suggestedDisc ? (useCreateForm = false) : $emit('close')"
        />
      </template>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, type PropType } from 'vue';
import { linkDisc, type NationalRelease } from '@services/national-releases/nationalReleases';
import { createDiscWithArtist, type CreateDiscWithArtistDto } from '@services/discs/discs';
import SwalService from '@services/swal/SwalService';
import SuggestedDiscCard from './SuggestedDiscCard.vue';
import CreateDiscForm from './CreateDiscForm.vue';

export default defineComponent({
  name: 'LinkDiscModal',
  components: { SuggestedDiscCard, CreateDiscForm },
  props: {
    release: {
      type: Object as PropType<NationalRelease>,
      required: true,
    },
  },
  emits: ['close', 'linked'],
  setup(props, { emit }) {
    const saving = ref(false);
    const useCreateForm = ref(!props.release.suggestedDisc && !props.release.disc);
    const overriding = ref(false);

    const confirmSuggested = async () => {
      if (!props.release.suggestedDisc) return;
      saving.value = true;
      try {
        const updated = await linkDisc(props.release.id, { discId: props.release.suggestedDisc.id });
        SwalService.success('Disco vinculado correctamente');
        emit('linked', updated);
      } catch (error: any) {
        SwalService.error(error.response?.data?.message || 'Error al vincular');
      } finally {
        saving.value = false;
      }
    };

    const handleCreate = async (formData: CreateDiscWithArtistDto) => {
      saving.value = true;
      try {
        const newDisc = await createDiscWithArtist(formData);
        const updated = await linkDisc(props.release.id, { discId: newDisc.id });
        SwalService.success('Disco creado y vinculado correctamente');
        emit('linked', updated);
      } catch (error: any) {
        SwalService.error(error.response?.data?.message || 'Error al crear el disco');
      } finally {
        saving.value = false;
      }
    };

    return {
      saving,
      useCreateForm,
      overriding,
      confirmSuggested,
      handleCreate,
    };
  },
});
</script>
