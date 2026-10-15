<template>
  <div class="p-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold dark:text-white">
        <i class="fa-solid fa-circle-plus mr-2"></i>Añadir Discos
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Añade discos uno a uno. Formato obligatorio:
        <span
          class="font-mono text-xs bg-gray-100 dark:bg-rv-darkSurface px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300"
          >Artista – Disco</span
        >
        (guión largo). Género, país, EP y debut son opcionales por disco.
      </p>
    </div>

    <!-- Form card -->
    <div
      class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-6 mb-6"
    >
      <!-- Date -->
      <div class="mb-6">
        <label
          for="date"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
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
      <div
        class="border border-gray-200 dark:border-white/10 rounded-xl p-4 mb-4 bg-gray-50 dark:bg-rv-darkSurface/50"
      >
        <p
          class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3"
        >
          Nuevo disco
        </p>

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
            <label
              class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
              >Género <span class="font-normal">(opcional)</span></label
            >
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
            <label
              class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
              >País <span class="font-normal">(opcional)</span></label
            >
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
            <input
              type="checkbox"
              v-model="newEp"
              class="rounded accent-rv-pink w-4 h-4"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">EP</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              v-model="newDebut"
              class="rounded accent-rv-pink w-4 h-4"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Debut</span>
          </label>
        </div>
      </div>

      <!-- Album list -->
      <div v-if="albums.length" class="mb-6 space-y-2">
        <p
          class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2"
        >
          Discos añadidos ({{ albums.length }})
        </p>
        <div
          v-for="(album, index) in albums"
          :key="index"
          class="flex items-start gap-3 bg-white dark:bg-rv-darkSurface border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5"
        >
          <div class="flex-1 min-w-0">
            <p class="font-mono text-sm text-gray-900 dark:text-white truncate">
              {{ album.line }}
            </p>
            <div class="flex flex-wrap gap-1.5 mt-1">
              <span
                v-if="album.genreId"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rv-purple/10 text-rv-purple dark:text-purple-300"
              >
                <i class="fa-solid fa-music text-[8px]"></i
                >{{ genreLabel(album.genreId) }}
              </span>
              <span
                v-if="album.countryId"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rv-blue/10 text-rv-blue dark:text-blue-300"
              >
                <i class="fa-solid fa-flag text-[8px]"></i
                >{{ countryLabel(album.countryId) }}
              </span>
              <span
                v-if="album.ep"
                class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                >EP</span
              >
              <span
                v-if="album.debut"
                class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                >Debut</span
              >
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
    <div
      v-if="responseData"
      class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden mb-6"
    >
      <div class="px-6 py-4 border-b border-gray-100 dark:border-white/10">
        <h2 class="text-lg font-bold dark:text-white">Resultados</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Fecha:
          <span class="font-medium text-gray-700 dark:text-gray-300">{{
            displayDate
          }}</span>
        </p>
      </div>

      <div class="p-6 space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="rounded-xl bg-green-50 dark:bg-green-900/20 px-4 py-3">
            <p
              class="text-xs font-semibold uppercase text-green-700 dark:text-green-400"
            >
              Importados
            </p>
            <p class="text-xl font-bold text-green-800 dark:text-green-200">
              {{ importedDiscsParsed.length }}
            </p>
          </div>
          <div class="rounded-xl bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
            <p
              class="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400"
            >
              Duplicados · omitidos
            </p>
            <p class="text-xl font-bold text-amber-800 dark:text-amber-200">
              {{ duplicateCount }}
            </p>
          </div>
          <div class="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3">
            <p
              class="text-xs font-semibold uppercase text-red-700 dark:text-red-400"
            >
              Fallidos
            </p>
            <p class="text-xl font-bold text-red-800 dark:text-red-200">
              {{ failedCount }}
            </p>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            v-if="importedDiscsParsed.length"
            @click="buscarEnlacesSpotify"
            :disabled="searchingSpotify"
            class="inline-flex items-center gap-2 bg-[#1DB954] text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-[#1aa34a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i class="fa-brands fa-spotify"></i>
            {{ searchingSpotify ? "Buscando..." : "Buscar en Spotify" }}
          </button>
        </div>

        <ol
          aria-label="Resultados de importación"
          class="divide-y divide-gray-100 dark:divide-white/5"
        >
          <li
            v-for="result in importResults"
            :key="result.inputIndex"
            class="py-3 flex flex-col gap-1"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="text-[10px] font-semibold rounded px-1.5 py-0.5"
                :class="{
                  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400':
                    result.status === 'imported',
                  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400':
                    result.status === 'duplicate',
                  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400':
                    result.status === 'failed',
                }"
              >
                {{
                  result.status === "imported"
                    ? "Importado"
                    : result.status === "duplicate"
                      ? "Duplicado · omitido"
                      : "Fallido"
                }}
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400"
                >Entrada {{ result.inputIndex + 1 }}</span
              >
              <span class="font-medium text-gray-800 dark:text-gray-200">
                {{ result.artistName || "Artista sin identificar" }} –
                {{ result.discName || "Disco sin identificar" }}
              </span>
            </div>
            <p
              v-if="result.source.kind === 'manual' && result.source.inputLine"
              class="text-xs text-gray-500 dark:text-gray-400"
            >
              Línea original: {{ result.source.inputLine }}
            </p>
            <p
              v-if="result.status === 'failed' || result.status === 'duplicate'"
              class="text-sm text-gray-600 dark:text-gray-300"
            >
              <span v-if="result.status === 'failed'"
                >{{ result.reasonCode }} ·
              </span>
              {{ result.message }}
            </p>
          </li>
        </ol>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400"
    >
      <i class="fa-solid fa-triangle-exclamation mr-2"></i>{{ error }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import { fetchManualData } from "@services/imports/imports";
import { getCatalogImportGlobalErrorMessage } from "@services/imports/imports";
import type {
  AlbumEntry,
  CatalogImportImportedResult,
  ManualImportResponse,
} from "@services/imports/imports";
import { updateDisc } from "@services/discs/discs";
import { resolveSpotifyAlbum } from "@services/spotify/spotifyLookup";
import { useCatalogStore } from "@stores/catalog/catalog";
import SearchableSelect from "@components/SearchableSelect.vue";
import SwalService from "@services/swal/SwalService";

export default defineComponent({
  name: "ImportPage",
  components: { SearchableSelect },
  setup() {
    const selectedDate = ref("");
    const responseData = ref<ManualImportResponse | null>(null);
    const error = ref("");
    const searchingSpotify = ref(false);
    const spotifyFound = ref<Record<string, boolean>>({});

    // New album form state
    const newLine = ref("");
    const newGenreId = ref("");
    const newCountryId = ref("");
    const newEp = ref(false);
    const newDebut = ref(false);

    const albums = ref<AlbumEntry[]>([]);

    const catalogStore = useCatalogStore();
    const genres = computed(() => catalogStore.genres);
    const countries = computed(() => catalogStore.countries);

    onMounted(() => {
      catalogStore.fetchCatalog();
    });

    const displayDate = computed(() => {
      if (!selectedDate.value) return "";
      const [year, month, day] = selectedDate.value.split("-");
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
      if (newGenreId.value) entry.genreId = newGenreId.value;
      if (newCountryId.value) entry.countryId = newCountryId.value;
      if (newEp.value) entry.ep = true;
      if (newDebut.value) entry.debut = true;

      albums.value.push(entry);

      newLine.value = "";
      newGenreId.value = "";
      newCountryId.value = "";
      newEp.value = false;
      newDebut.value = false;
    }

    function removeAlbum(index: number) {
      albums.value.splice(index, 1);
    }

    const importResults = computed(
      () => responseData.value?.data.results ?? [],
    );
    const importedDiscsParsed = computed(() =>
      importResults.value.filter(
        (result): result is CatalogImportImportedResult =>
          result.status === "imported",
      ),
    );
    const duplicateCount = computed(
      () =>
        importResults.value.filter((result) => result.status === "duplicate")
          .length,
    );
    const failedCount = computed(
      () =>
        importResults.value.filter((result) => result.status === "failed")
          .length,
    );

    const buscarEnlacesSpotify = async () => {
      if (!importedDiscsParsed.value.length) return;
      searchingSpotify.value = true;
      spotifyFound.value = {};
      try {
        let foundCount = 0;
        for (const item of importedDiscsParsed.value) {
          try {
            const album = await resolveSpotifyAlbum(
              item.discName,
              item.artistName,
            );
            if (!album) {
              spotifyFound.value[item.discId] = false;
              continue;
            }
            await updateDisc(item.discId, {
              link: album.listenUrl,
              image: album.coverUrl,
              verified: true,
            });
            spotifyFound.value[item.discId] = true;
            foundCount++;
          } catch {
            spotifyFound.value[item.discId] = false;
          }
        }
        SwalService.success(
          `${foundCount} de ${importedDiscsParsed.value.length} discos actualizados con datos de Spotify`,
        );
      } finally {
        searchingSpotify.value = false;
      }
    };

    const processData = async () => {
      error.value = "";
      responseData.value = null;
      spotifyFound.value = {};
      try {
        const [year, month, day] = selectedDate.value.split("-");
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        const formattedDate = `${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
        responseData.value = await fetchManualData(formattedDate, albums.value);
      } catch (err) {
        error.value = getCatalogImportGlobalErrorMessage(err);
      }
    };

    return {
      selectedDate,
      albums,
      newLine,
      newGenreId,
      newCountryId,
      newEp,
      newDebut,
      genres,
      countries,
      addAlbum,
      removeAlbum,
      genreLabel,
      countryLabel,
      processData,
      responseData,
      error,
      displayDate,
      importResults,
      importedDiscsParsed,
      duplicateCount,
      failedCount,
      buscarEnlacesSpotify,
      searchingSpotify,
      spotifyFound,
    };
  },
});
</script>
