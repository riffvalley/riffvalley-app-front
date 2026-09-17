<template>
  <div class="p-6 max-w-4xl mx-auto">

    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold dark:text-white">
        <i class="fa-solid fa-circle-plus mr-2"></i>Añadir Discos
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Añade discos uno a uno. Formato obligatorio:
        <span class="font-mono text-xs bg-gray-100 dark:bg-rv-darkSurface px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">Artista – Disco</span>
        (guión largo). Género, país, EP y debut son opcionales por disco.
      </p>
    </div>

    <!-- Form card -->
    <div class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-6 mb-6">

      <!-- Date -->
      <div class="mb-6">
        <label for="date" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Fecha de lanzamiento <span class="text-rv-pink">*</span>
        </label>
        <input
          id="date"
          type="date"
          v-model="selectedDate"
          class="block w-full sm:w-64 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-rv-darkSurface text-gray-900 dark:text-white shadow-sm focus:outline-none focus:border-rv-pink focus:ring-2 focus:ring-rv-pink/25 transition"
        />
      </div>

      <!-- Add album row -->
      <div class="border border-gray-200 dark:border-white/10 rounded-xl p-4 mb-4 bg-gray-50 dark:bg-rv-darkSurface/50">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Nuevo disco</p>

        <!-- Line input -->
        <div class="flex gap-2 mb-3">
          <input
            v-model="newLine"
            @keydown.enter.prevent="addAlbum"
            type="text"
            placeholder="Artista – Nombre del disco"
            class="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-rv-darkSurface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:outline-none focus:border-rv-pink focus:ring-2 focus:ring-rv-pink/25 transition font-mono text-sm"
          />
          <button
            @click="addAlbum"
            :disabled="!newLine.trim()"
            class="px-4 py-2 bg-rv-pink text-white font-semibold rounded-xl shadow-sm hover:bg-rv-pink/80 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shrink-0"
          >
            <i class="fa-solid fa-plus text-xs"></i>
            Añadir
          </button>
        </div>

        <!-- Optional fields -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Género <span class="font-normal">(opcional)</span></label>
            <SearchableSelect
              v-model="newGenreId"
              :options="genres"
              placeholder="Buscar género..."
              triggerPlaceholder="Sin género"
              allLabel="Sin género"
              title="name"
              trackby="id"
              :max="150"
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">País <span class="font-normal">(opcional)</span></label>
            <SearchableSelect
              v-model="newCountryId"
              :options="countries"
              placeholder="Buscar país..."
              triggerPlaceholder="Sin país"
              allLabel="Sin país"
              title="name"
              trackby="id"
              :max="150"
              class="w-full"
            />
          </div>
        </div>

        <div class="flex gap-5">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" v-model="newEp" class="rounded accent-rv-pink w-4 h-4" />
            <span class="text-sm text-gray-700 dark:text-gray-300">EP</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" v-model="newDebut" class="rounded accent-rv-pink w-4 h-4" />
            <span class="text-sm text-gray-700 dark:text-gray-300">Debut</span>
          </label>
        </div>
      </div>

      <!-- Album list -->
      <div v-if="albums.length" class="mb-6 space-y-2">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Discos añadidos ({{ albums.length }})
        </p>
        <div
          v-for="(album, index) in albums"
          :key="index"
          class="flex items-start gap-3 bg-white dark:bg-rv-darkSurface border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5"
        >
          <div class="flex-1 min-w-0">
            <p class="font-mono text-sm text-gray-900 dark:text-white truncate">{{ album.line }}</p>
            <div class="flex flex-wrap gap-1.5 mt-1">
              <span v-if="album.genreId" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rv-purple/10 text-rv-purple dark:text-purple-300">
                <i class="fa-solid fa-music text-[8px]"></i>{{ genreLabel(album.genreId) }}
              </span>
              <span v-if="album.countryId" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rv-blue/10 text-rv-blue dark:text-blue-300">
                <i class="fa-solid fa-flag text-[8px]"></i>{{ countryLabel(album.countryId) }}
              </span>
              <span v-if="album.ep" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">EP</span>
              <span v-if="album.debut" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Debut</span>
            </div>
          </div>
          <button
            @click="removeAlbum(index)"
            class="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition focus:outline-none"
          >
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
      </div>

      <div v-else class="mb-6 text-sm text-gray-400 dark:text-gray-500 italic">
        Aún no hay discos añadidos.
      </div>

      <!-- Submit -->
      <div class="flex justify-end">
        <button
          @click="processData"
          :disabled="!selectedDate || albums.length === 0"
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
          <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 class="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-circle-check"></i>
              Importados ({{ importedDiscsParsed.length }})
            </h3>
            <button
              v-if="importedDiscsParsed.length"
              @click="buscarEnlacesSpotify"
              :disabled="searchingSpotify"
              class="inline-flex items-center gap-2 bg-[#1DB954] text-white px-3 py-1.5 rounded-full text-xs font-semibold
                     hover:bg-[#1aa34a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i class="fa-brands fa-spotify"></i>
              {{ searchingSpotify ? 'Buscando...' : 'Buscar en Spotify' }}
            </button>
          </div>
          <div v-if="importedDiscsParsed.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <div
              v-for="(disc, index) in importedDiscsParsed"
              :key="'imported-' + index"
              class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl px-3 py-2.5 min-h-[72px] flex flex-col justify-center"
            >
              <div class="flex items-center gap-1.5">
                <p class="text-xs text-green-600 dark:text-green-400 font-medium truncate">{{ disc.artist }}</p>
                <i v-if="spotifyFound[disc.discId] === true" class="fa-brands fa-spotify text-[#1DB954] text-xs" title="Encontrado en Spotify"></i>
                <i v-else-if="spotifyFound[disc.discId] === false" class="fa-solid fa-circle-exclamation text-gray-400 text-xs" title="No encontrado en Spotify"></i>
              </div>
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
import axios from 'axios';
import { fetchManualData } from '@services/imports/imports';
import type { AlbumEntry, ManualImportResponse, DiscImportResultItem } from '@services/imports/imports';
import { updateDisc } from '@services/discs/discs';
import { obtenerTokenSpotify } from '@helpers/SpotifyFunctions.ts';
import { useCatalogStore } from '@stores/catalog/catalog';
import SearchableSelect from '@components/SearchableSelect.vue';
import SwalService from '@services/swal/SwalService';

export default defineComponent({
  name: 'ImportPage',
  components: { SearchableSelect },
  setup() {
    const selectedDate = ref('');
    const responseData = ref<ManualImportResponse | null>(null);
    const error = ref('');
    const searchingSpotify = ref(false);
    const spotifyFound = ref<Record<string, boolean>>({});

    // New album form state
    const newLine      = ref('');
    const newGenreId   = ref('');
    const newCountryId = ref('');
    const newEp        = ref(false);
    const newDebut     = ref(false);

    const albums = ref<AlbumEntry[]>([]);

    const catalogStore = useCatalogStore();
    const genres   = computed(() => catalogStore.genres);
    const countries = computed(() => catalogStore.countries);

    onMounted(() => { catalogStore.fetchCatalog(); });

    const displayDate = computed(() => {
      if (!selectedDate.value) return '';
      const [year, month, day] = selectedDate.value.split('-');
      return `${day}/${month}/${year}`;
    });

    function genreLabel(id: string) {
      return genres.value.find((g: any) => g.id === id)?.name ?? id;
    }

    function countryLabel(id: string) {
      return countries.value.find((c: any) => c.id === id)?.name ?? id;
    }

    function addAlbum() {
      const line = newLine.value.trim();
      if (!line) return;

      const entry: AlbumEntry = { line };
      if (newGenreId.value)   entry.genreId   = newGenreId.value;
      if (newCountryId.value) entry.countryId = newCountryId.value;
      if (newEp.value)        entry.ep        = true;
      if (newDebut.value)     entry.debut     = true;

      albums.value.push(entry);

      newLine.value      = '';
      newGenreId.value   = '';
      newCountryId.value = '';
      newEp.value        = false;
      newDebut.value     = false;
    }

    function removeAlbum(index: number) {
      albums.value.splice(index, 1);
    }

    const parseResultItem = (item: DiscImportResultItem) => {
      const match = item.message.match(/Artist\s*"([^"]+)"\s*=>\s*Disc\s*"([^"]+)"/);
      return {
        discId: item.discId,
        artistId: item.artistId,
        artist: match ? match[1] : item.message,
        disc: match ? match[2] : '',
      };
    };

    const importedDiscsParsed = computed(() => {
      const discs = responseData.value?.data?.savedDiscs ?? [];
      return discs.map(parseResultItem);
    });

    const nonImportedDiscsParsed = computed(() => {
      const discs = responseData.value?.data?.existingDiscs ?? [];
      return discs.map(parseResultItem);
    });

    const buscarEnlacesSpotify = async () => {
      if (!importedDiscsParsed.value.length) return;
      searchingSpotify.value = true;
      spotifyFound.value = {};
      try {
        const token = await obtenerTokenSpotify();
        if (!token) {
          SwalService.error('No se pudo obtener el token de Spotify.');
          return;
        }

        let foundCount = 0;
        for (const item of importedDiscsParsed.value) {
          try {
            const query = encodeURIComponent(`album:${item.disc} artist:${item.artist}`);
            const response = await axios.get(
              `https://api.spotify.com/v1/search?q=${query}&type=album&limit=1`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const album = response.data.albums.items[0];
            if (album) {
              await updateDisc(item.discId, {
                link: album.external_urls.spotify,
                image: album.images?.[0]?.url,
                verified: true,
              });
              spotifyFound.value[item.discId] = true;
              foundCount++;
            } else {
              spotifyFound.value[item.discId] = false;
            }
          } catch {
            spotifyFound.value[item.discId] = false;
          }
        }
        SwalService.success(`${foundCount} de ${importedDiscsParsed.value.length} discos actualizados con datos de Spotify`);
      } finally {
        searchingSpotify.value = false;
      }
    };

    const processData = async () => {
      error.value = '';
      responseData.value = null;
      spotifyFound.value = {};
      try {
        const [year, month, day] = selectedDate.value.split('-');
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December',
        ];
        const formattedDate = `${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
        responseData.value = await fetchManualData(formattedDate, albums.value);
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
      }
    };

    return {
      selectedDate,
      albums,
      newLine, newGenreId, newCountryId, newEp, newDebut,
      genres, countries,
      addAlbum, removeAlbum,
      genreLabel, countryLabel,
      processData,
      responseData,
      error,
      displayDate,
      importedDiscsParsed,
      nonImportedDiscsParsed,
      buscarEnlacesSpotify,
      searchingSpotify,
      spotifyFound,
    };
  },
});
</script>
