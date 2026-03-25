<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">

    <!-- Nombre del disco -->
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Nombre del disco <span class="text-rv-pink">*</span>
      </label>
      <input
        v-model="form.discName"
        type="text"
        required
        class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink"
      />
    </div>

    <!-- Artista -->
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Artista <span class="text-rv-pink">*</span>
      </label>
      <input
        v-model="form.artistName"
        type="text"
        required
        class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink"
      />
    </div>

    <!-- Género -->
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Género <span class="text-rv-pink">*</span>
      </label>
      <select
        v-model="form.genreId"
        required
        class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink bg-white"
      >
        <option value="" disabled>Selecciona un género</option>
        <option v-for="genre in genres" :key="genre.id" :value="genre.id">{{ genre.name }}</option>
      </select>
      <p class="text-xs text-gray-400 mt-1">
        <i class="fas fa-tag mr-1"></i>Género del lanzamiento: <span class="font-medium text-gray-500">{{ release.genre }}</span>
      </p>
    </div>

    <!-- Fecha de lanzamiento -->
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Fecha de lanzamiento <span class="text-rv-pink">*</span>
      </label>
      <input
        v-model="form.releaseDate"
        type="date"
        required
        class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink"
      />
    </div>

    <!-- Enlace -->
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Enlace <span class="text-rv-pink">*</span>
      </label>
      <input
        v-model="form.link"
        type="url"
        required
        placeholder="https://..."
        class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink"
      />
    </div>

    <!-- Imagen -->
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Imagen (URL)
      </label>
      <input
        v-model="form.image"
        type="url"
        placeholder="https://..."
        class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink"
      />
      <div v-if="form.image" class="mt-2">
        <img :src="form.image" class="w-16 h-16 rounded-lg object-cover border border-gray-200" @error="form.image = ''" />
      </div>
    </div>

    <!-- EP y Debut -->
    <div class="flex gap-6">
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input v-model="form.ep" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-rv-pink focus:ring-rv-pink" />
        <span class="text-sm font-medium text-gray-700">EP</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input v-model="form.debut" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-rv-pink focus:ring-rv-pink" />
        <span class="text-sm font-medium text-gray-700">Debut</span>
      </label>
    </div>

    <!-- Error de validación -->
    <p v-if="validationError" class="text-xs text-red-500">{{ validationError }}</p>

    <!-- Acciones -->
    <div class="flex justify-end gap-2 pt-2">
      <button
        type="button"
        @click="$emit('cancel')"
        class="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors"
      >
        {{ cancelLabel }}
      </button>
      <button
        type="submit"
        :disabled="saving"
        class="px-5 py-2 rounded-xl text-sm font-bold bg-rv-navy text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        <span v-if="saving">Guardando...</span>
        <span v-else>Crear y vincular</span>
      </button>
    </div>

  </form>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, onMounted, type PropType } from 'vue';
import { getAllGenres, type Genre } from '@services/genres/genres';
import type { NationalRelease } from '@services/national-releases/nationalReleases';

export default defineComponent({
  name: 'CreateDiscForm',
  props: {
    release: {
      type: Object as PropType<NationalRelease>,
      required: true,
    },
    saving: {
      type: Boolean,
      default: false,
    },
    cancelLabel: {
      type: String,
      default: 'Cancelar',
    },
  },
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    const genres = ref<Genre[]>([]);

    onMounted(async () => {
      try {
        genres.value = await getAllGenres();
      } catch {
        // El select quedará vacío pero el formulario es usable
      }
    });

    const form = reactive({
      discName: props.release.discName,
      artistName: props.release.artistName,
      genreId: '',
      releaseDate: props.release.releaseDay,
      ep: props.release.discType === 'ep',
      debut: false,
      link: props.release.link ?? '',
      image: '',
    });

    const validationError = ref('');

    const handleSubmit = () => {
      validationError.value = '';
      if (!form.discName.trim()) { validationError.value = 'El nombre es obligatorio.'; return; }
      if (!form.artistName.trim()) { validationError.value = 'El artista es obligatorio.'; return; }
      if (!form.genreId) { validationError.value = 'Debes seleccionar un género.'; return; }
      if (!form.releaseDate) { validationError.value = 'La fecha es obligatoria.'; return; }
      if (!form.link.trim()) { validationError.value = 'El enlace es obligatorio.'; return; }

      emit('submit', {
        discName: form.discName.trim(),
        artistName: form.artistName.trim(),
        genreId: form.genreId,
        releaseDate: form.releaseDate,
        ep: form.ep,
        debut: form.debut,
        link: form.link.trim(),
        ...(form.image.trim() && { image: form.image.trim() }),
      });
    };

    return {
      genres,
      form,
      validationError,
      handleSubmit,
    };
  },
});
</script>
