<template>
  <div class="p-6 max-w-4xl mx-auto">

    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold dark:text-white">
        <i class="fa-solid fa-circle-plus mr-2"></i>Añadir Discos
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Completa los campos de abajo. Respeta el formato
        <span class="font-mono text-xs bg-gray-100 dark:bg-rv-darkSurface px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">Artista – Disco</span>
        en cada línea. Todos los campos son obligatorios.
      </p>
    </div>

    <!-- Form card -->
    <div class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-6 mb-6">

      <!-- Date -->
      <div class="mb-5">
        <label for="date" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Fecha de lanzamiento
        </label>
        <input
          id="date"
          type="date"
          v-model="selectedDate"
          class="block w-full sm:w-64 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-rv-darkSurface text-gray-900 dark:text-white shadow-sm focus:outline-none focus:border-rv-pink focus:ring-2 focus:ring-rv-pink/25 transition"
        />
      </div>

      <!-- Genre + Country -->
      <div class="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Género</label>
          <SearchableSelect
            v-model="selectedGenreId"
            :options="genres"
            placeholder="Buscar género..."
            triggerPlaceholder="Selecciona un género"
            allLabel="Sin género"
            title="name"
            trackby="id"
            :max="150"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">País</label>
          <SearchableSelect
            v-model="selectedCountryId"
            :options="countries"
            placeholder="Buscar país..."
            triggerPlaceholder="Selecciona un país"
            allLabel="Sin país"
            title="name"
            trackby="id"
            :max="150"
            class="w-full"
          />
        </div>
      </div>

      <!-- Textarea -->
      <div class="mb-6">
        <label for="albums" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Discos
          <span class="text-gray-400 dark:text-gray-500 font-normal">(uno por línea)</span>
        </label>
        <textarea
          id="albums"
          v-model="albumText"
          placeholder="Lauren Babic – Too Much and Never Enough (EP)
Decrepid – Suffered Existence"
          rows="6"
          class="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-rv-darkSurface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:outline-none focus:border-rv-pink focus:ring-2 focus:ring-rv-pink/25 resize-none transition font-mono text-sm leading-relaxed"
        ></textarea>
      </div>

      <!-- Submit -->
      <div class="flex justify-end">
        <button
          @click="processData"
          :disabled="!selectedDate || !albumText.trim() || !selectedGenreId || !selectedCountryId"
          class="px-6 py-2.5 bg-gradient-to-r from-rv-pink to-rv-purple text-white font-semibold rounded-full shadow-sm hover:opacity-90 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <i class="fa-solid fa-paper-plane mr-2"></i>Enviar
        </button>
      </div>
    </div>

    <!-- Results card -->
    <div v-if="responseData" class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden mb-6">
      <div class="px-6 py-4 border-b border-gray-100 dark:border-white/10">
        <h2 class="text-lg font-bold dark:text-white">Resultados</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Fecha: <span class="font-medium text-gray-700 dark:text-gray-300">{{ displayDate }}</span>
        </p>
      </div>

      <div class="p-6 space-y-6">
        <!-- Imported -->
        <div>
          <h3 class="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <i class="fa-solid fa-circle-check"></i>
            Importados ({{ importedDiscsParsed.length }})
          </h3>
          <div v-if="importedDiscsParsed.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <div
              v-for="(disc, index) in importedDiscsParsed"
              :key="'imported-' + index"
              class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl px-3 py-2.5 min-h-[72px] flex flex-col justify-center"
            >
              <p class="text-xs text-green-600 dark:text-green-400 font-medium truncate">{{ disc.artist }}</p>
              <p class="text-sm font-semibold text-green-800 dark:text-green-200 truncate">{{ disc.disc }}</p>
            </div>
          </div>
          <p v-else class="text-sm text-gray-400 dark:text-gray-500">Ningún disco importado.</p>
        </div>

        <!-- Not imported -->
        <div v-if="nonImportedDiscsParsed.length">
          <h3 class="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <i class="fa-solid fa-circle-xmark"></i>
            No importados ({{ nonImportedDiscsParsed.length }})
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <div
              v-for="(disc, index) in nonImportedDiscsParsed"
              :key="'non-imported-' + index"
              class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-3 py-2.5 min-h-[72px] flex flex-col justify-center"
            >
              <p class="text-xs text-red-500 dark:text-red-400 font-medium truncate">{{ disc.artist }}</p>
              <p class="text-sm font-semibold text-red-700 dark:text-red-300 truncate">{{ disc.disc }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
      <i class="fa-solid fa-triangle-exclamation mr-2"></i>{{ error }}
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { fetchManualData } from '@services/imports/imports';
import { useCatalogStore } from '@stores/catalog/catalog';
import SearchableSelect from '@components/SearchableSelect.vue';

export default defineComponent({
  name: 'DataFetcherWithTextarea',
  components: { SearchableSelect },
  setup() {
    const selectedDate = ref('');
    const albumText = ref('');
    const selectedGenreId = ref('');
    const selectedCountryId = ref('');
    const responseData = ref<any>(null);
    const error = ref('');

    const catalogStore = useCatalogStore();
    const genres = computed(() => catalogStore.genres);
    const countries = computed(() => catalogStore.countries);

    onMounted(() => {
      catalogStore.fetchCatalog();
    });

    const displayDate = computed(() => {
      if (!selectedDate.value) return '';
      const [year, month, day] = selectedDate.value.split('-');
      return `${day}/${month}/${year}`;
    });

    const importedDiscsParsed = computed(() => {
      if (!responseData.value) return [];
      const discs: string[] = responseData.value.data.savedDiscs || [];
      return discs.map((disc: string) => {
        const regex = /Artist\s*"([^"]+)"\s*=>\s*Disc\s*"([^"]+)"/;
        const match = disc.match(regex);
        if (match) return { artist: match[1], disc: match[2] };
        return { artist: disc, disc: '' };
      });
    });

    const nonImportedDiscsParsed = computed(() => {
      if (!responseData.value) return [];
      const discs: string[] = responseData.value.data.existingDiscs || [];
      return discs.map((disc: string) => {
        const regex = /Artist\s*"([^"]+)"\s*=>\s*Disc\s*"([^"]+)"/;
        const match = disc.match(regex);
        if (match) return { artist: match[1], disc: match[2] };
        return { artist: disc, disc: '' };
      });
    });

    const processData = async () => {
      error.value = '';
      responseData.value = null;
      try {
        const [year, month, day] = selectedDate.value.split('-');
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const formattedDate = `${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
        const albums = albumText.value
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean);
        const response = await fetchManualData(
          formattedDate,
          albums,
          selectedGenreId.value,
          selectedCountryId.value
        );
        responseData.value = response;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
      }
    };

    return {
      selectedDate,
      albumText,
      selectedGenreId,
      selectedCountryId,
      genres,
      countries,
      processData,
      responseData,
      error,
      displayDate,
      importedDiscsParsed,
      nonImportedDiscsParsed,
    };
  },
});
</script>
