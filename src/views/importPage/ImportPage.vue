<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl md:text-3xl font-bold mb-2"><i class="fa-solid fa-circle-plus mr-2"></i>Añadir Discos</h1>
    <p class="text-left font-serif text-gray-500 text-md mb-4">
      Puedes añadir nuevos discos completando los campos de abajo. Recuerda respetar los espacios entre banda, guion y
      título de disco. Todos los campos son obligatorios.
    </p>


    <!-- Input de fecha -->
    <div class="mb-4 md:mb-6">
      <label for="date" class="block text-sm font-medium text-gray-700 mb-1">
        Selecciona fecha:
      </label>
      <input id="date" type="date" v-model="selectedDate"
        class="block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50" />
    </div>

    <!-- Género y País -->
    <div class="mb-4 md:mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Género
        </label>
        <SearchableSelect
          v-model="selectedGenreId"
          :options="genres"
          placeholder="Buscar género..."
          triggerPlaceholder="Selecciona un género"
          allLabel="Sin género"
          title="name"
          trackby="id"
          :max="150"
          class="select-pill w-full"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          País
        </label>
        <SearchableSelect
          v-model="selectedCountryId"
          :options="countries"
          placeholder="Buscar país..."
          triggerPlaceholder="Selecciona un país"
          allLabel="Sin país"
          title="name"
          trackby="id"
          :max="150"
          class="select-pill w-full"
        />
      </div>
    </div>

    <!-- Textarea para los discos -->
    <div class="mb-4 md:mb-6">
      <label for="albums" class="block text-sm font-medium text-gray-700 mb-1">
        Introduce los discos:
      </label>
      <textarea id="albums" v-model="albumText" placeholder="Lauren Babic – Too Much and Never Enough (EP)
Decrepid – Suffered Existence" rows="6"
        class="block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"></textarea>
    </div>

    <!-- Botón para enviar -->
    <div class="mb-6 md:mb-8 flex justify-center">
      <button @click="processData" :disabled="!selectedDate || !albumText.trim() || !selectedGenreId || !selectedCountryId"
        class="px-5 py-2 md:px-6 md:py-3 bg-gradient-to-r from-rv-pink to-rv-pink/90 text-white font-bold py-2 rounded-full
         hover:from-rv-pink/90 hover:to-rv-pink/80 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto">
        Enviar
      </button>
    </div>

    <!-- Card de resultados -->
    <div v-if="responseData" class="mb-6 md:mb-8">
      <div class="bg-white shadow rounded-lg p-4">
        <div class="mb-4 border-b pb-2">
          <h2 class="text-lg md:text-2xl font-bold text-gray-800">Resultados</h2>
          <p class="text-gray-600">
            Fecha: <span class="font-medium">{{ displayDate }}</span>
          </p>
        </div>

        <!-- Fila de discos importados -->
        <div class="mb-4">
          <h3 class="text-md md:text-lg font-semibold text-gray-700 mb-2">
            Discos Importados
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <template v-if="importedDiscsParsed.length">
              <div v-for="(disc, index) in importedDiscsParsed" :key="'imported-' + index"
                class="bg-green-100 text-green-800 px-3 py-2 rounded min-h-[80px] flex flex-col justify-center">
                <p class="font-semibold truncate">Artista: {{ disc.artist }}</p>
                <p class="truncate">Disco: {{ disc.disc }}</p>
              </div>
            </template>
            <template v-else>
              <div class="col-span-full bg-green-100 text-green-800 px-3 py-2 rounded text-center">
                No hay discos importados.
              </div>
            </template>
          </div>
        </div>
        <!-- Fila de discos no importados -->
        <div>
          <h3 class="text-md md:text-lg font-semibold text-gray-700 mb-2">
            Discos No Importados
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <template v-if="nonImportedDiscsParsed.length">
              <div v-for="(disc, index) in nonImportedDiscsParsed" :key="'non-imported-' + index"
                class="bg-red-100 text-red-800 px-3 py-2 rounded min-h-[80px] flex flex-col justify-center">
                <p class="font-semibold truncate">Artista: {{ disc.artist }}</p>
                <p class="truncate">Disco: {{ disc.disc }}</p>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Mensaje de error -->
    <div v-if="error" class="mt-4 md:mt-6">
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error: {{ error }}
      </div>
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

    // Fecha en formato español (dd/mm/yyyy)
    const displayDate = computed(() => {
      if (!selectedDate.value) return '';
      const [year, month, day] = selectedDate.value.split('-');
      return `${day}/${month}/${year}`;
    });

    // Procesamos los discos importados
    const importedDiscsParsed = computed(() => {
      if (!responseData.value) return [];
      const discs: string[] = responseData.value.data.savedDiscs || [];
      return discs.map((disc: string) => {
        // Se espera el formato: Artist "Nombre Artista" => Disc "Nombre Disco"
        const regex = /Artist\s*"([^"]+)"\s*=>\s*Disc\s*"([^"]+)"/;
        const match = disc.match(regex);
        if (match) {
          return { artist: match[1], disc: match[2] };
        }
        return { artist: disc, disc: '' };
      });
    });

    // Procesamos los discos no importados
    const nonImportedDiscsParsed = computed(() => {
      if (!responseData.value) return [];
      const discs: string[] = responseData.value.data.existingDiscs || [];
      return discs.map((disc: string) => {
        const regex = /Artist\s*"([^"]+)"\s*=>\s*Disc\s*"([^"]+)"/;
        const match = disc.match(regex);
        if (match) {
          return { artist: match[1], disc: match[2] };
        }
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
        // Formateamos la fecha para enviar a la API (por ejemplo: "February 7, 2025")
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
        error.value =
          err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
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

<style scoped>
/* Ajustes responsivos */
@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
