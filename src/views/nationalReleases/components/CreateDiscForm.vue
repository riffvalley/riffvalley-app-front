<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">

    <!-- Nombre del disco -->
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Nombre del disco <span class="text-rv-pink">*</span>
      </label>
      <input
        v-model="form.name"
        type="text"
        required
        class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink"
      />
    </div>

    <!-- Artista (búsqueda) -->
    <div class="relative">
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Artista <span class="text-rv-pink">*</span>
      </label>
      <div v-if="selectedArtist" class="flex items-center gap-2 px-3 py-2 border border-rv-navy rounded-xl bg-rv-navy/5">
        <span class="text-sm font-semibold text-rv-navy flex-1">{{ selectedArtist.name }}</span>
        <button type="button" @click="clearArtist" class="text-gray-400 hover:text-gray-600 text-xs">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
      <div v-else>
        <input
          v-model="artistQuery"
          type="text"
          placeholder="Buscar artista..."
          @input="onArtistInput"
          autocomplete="off"
          class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink"
        />
        <div v-if="artistResults.length > 0" class="absolute left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          <button
            v-for="artist in artistResults"
            :key="artist.id"
            type="button"
            @click="selectArtist(artist)"
            class="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
          >
            {{ artist.name }}
          </button>
        </div>
        <p v-if="artistSearching" class="text-xs text-gray-400 mt-1">
          <i class="fas fa-spinner fa-spin mr-1"></i>Buscando...
        </p>
        <p v-if="artistNoResults" class="text-xs text-red-400 mt-1">
          No se encontró ningún artista con ese nombre.
        </p>
      </div>
    </div>

    <!-- Género -->
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Género <span class="text-rv-pink">*</span>
      </label>
      <SearchableSelect
        v-model="form.genreId"
        :options="genres"
        title="name"
        trackby="id"
        placeholder="Buscar género..."
        triggerPlaceholder="Selecciona un género"
        :max="150"
      />
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
import { searchArtists, type ArtistResult } from '@services/artist/artist';
import SearchableSelect from '@components/SearchableSelect.vue';

export default defineComponent({
  name: 'CreateDiscForm',
  components: { SearchableSelect },
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
      name: props.release.discName,
      genreId: '',
      releaseDate: props.release.releaseDay,
      ep: props.release.discType === 'ep',
      debut: false,
      link: props.release.link ?? '',
      image: '',
    });

    const artistQuery = ref('');
    const artistResults = ref<ArtistResult[]>([]);
    const selectedArtist = ref<ArtistResult | null>(null);
    const artistSearching = ref(false);
    const artistNoResults = ref(false);
    const validationError = ref('');

    let searchTimeout: ReturnType<typeof setTimeout> | null = null;

    const onArtistInput = () => {
      artistNoResults.value = false;
      artistResults.value = [];
      if (searchTimeout) clearTimeout(searchTimeout);
      const query = artistQuery.value.trim();
      if (query.length < 2) return;
      searchTimeout = setTimeout(async () => {
        artistSearching.value = true;
        try {
          const results = await searchArtists(query);
          artistResults.value = results;
          artistNoResults.value = results.length === 0;
        } catch {
          artistResults.value = [];
        } finally {
          artistSearching.value = false;
        }
      }, 350);
    };

    const selectArtist = (artist: ArtistResult) => {
      selectedArtist.value = artist;
      artistResults.value = [];
      artistQuery.value = '';
      artistNoResults.value = false;
    };

    const clearArtist = () => {
      selectedArtist.value = null;
      artistQuery.value = props.release.artistName;
    };

    const handleSubmit = () => {
      validationError.value = '';
      if (!form.name.trim()) { validationError.value = 'El nombre es obligatorio.'; return; }
      if (!selectedArtist.value) { validationError.value = 'Debes seleccionar un artista.'; return; }
      if (!form.genreId) { validationError.value = 'Debes seleccionar un género.'; return; }
      if (!form.releaseDate) { validationError.value = 'La fecha es obligatoria.'; return; }
      if (!form.link.trim()) { validationError.value = 'El enlace es obligatorio.'; return; }

      emit('submit', {
        name: form.name.trim(),
        artistId: selectedArtist.value.id,
        genreId: form.genreId,
        releaseDate: form.releaseDate,
        ep: form.ep,
        debut: form.debut,
        link: form.link.trim(),
        image: form.image.trim(),
      });
    };

    // Pre-fill artist query with the release artist name for convenience
    artistQuery.value = props.release.artistName;

    return {
      genres,
      form,
      artistQuery,
      artistResults,
      selectedArtist,
      artistSearching,
      artistNoResults,
      validationError,
      onArtistInput,
      selectArtist,
      clearArtist,
      handleSubmit,
    };
  },
});
</script>
