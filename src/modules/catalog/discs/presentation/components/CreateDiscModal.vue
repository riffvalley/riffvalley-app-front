<template>
  <div
    class="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
    @click.self="close"
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-disc-title"
      class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-rv-darkCard"
    >
      <header class="mb-5 flex items-center justify-between gap-4">
        <h2 id="create-disc-title" class="text-xl font-bold text-rv-navy dark:text-white">
          {{ createdDisc ? "Álbum añadido" : "Añadir disco" }}
        </h2>
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-pink dark:text-gray-200 dark:hover:bg-rv-darkSurface"
          aria-label="Cerrar modal"
          @click="close"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </header>

      <form v-if="!createdDisc" class="space-y-4" @submit.prevent="addAlbum">
        <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Nuevo disco
        </p>
        <label
          for="create-disc-date"
          class="block text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          Fecha de lanzamiento <span class="text-rv-pink">*</span>
          <input
            id="create-disc-date"
            v-model="selectedDate"
            type="date"
            required
            class="form-input"
          />
        </label>
        <div>
          <label
            for="create-disc-line"
            class="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Artista – nombre del disco <span class="text-rv-pink">*</span>
          </label>
          <div class="mt-1 flex gap-2">
            <input
              id="create-disc-line"
              v-model="line"
              required
              autocomplete="off"
              placeholder="Artista – Nombre del disco"
              class="form-input mt-0 min-w-0 flex-1"
            />
          </div>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Género <span class="font-normal text-gray-500 dark:text-gray-400">(opcional)</span>
            <SearchableSelect
              v-model="newGenreId"
              :options="genres"
              placeholder="Buscar género..."
              triggerPlaceholder="Sin género"
              allLabel="Sin género"
              title="name"
              trackby="id"
              :max="150"
              class="mt-1 w-full"
            />
          </label>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
            País <span class="font-normal text-gray-500 dark:text-gray-400">(opcional)</span>
            <SearchableSelect
              v-model="newCountryId"
              :options="countries"
              placeholder="Buscar país..."
              triggerPlaceholder="Sin país"
              allLabel="Sin país"
              title="name"
              trackby="id"
              :max="150"
              class="mt-1 w-full"
            />
          </label>
        </div>
        <div class="flex gap-5">
          <label
            class="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
          >
            <input v-model="newEp" type="checkbox" class="h-4 w-4 rounded accent-rv-pink" /> EP
          </label>
          <label
            class="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
          >
            <input v-model="newDebut" type="checkbox" class="h-4 w-4 rounded accent-rv-pink" />
            Debut
          </label>
        </div>
        <p v-if="error" class="text-sm text-red-700 dark:text-red-300" role="alert">{{ error }}</p>
        <p v-if="outcomeMessage" class="text-sm text-amber-800 dark:text-amber-200" role="status">
          {{ outcomeMessage }}
        </p>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" class="cancel-button" @click="close">Cancelar</button>
          <button
            type="submit"
            class="primary-button"
            :disabled="saving || !selectedDate || !line.trim()"
          >
            {{ saving ? "Añadiendo…" : "Añadir" }}
          </button>
        </div>
      </form>

      <div v-else class="space-y-5">
        <div
          class="rounded-xl border border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-800/50 dark:bg-green-900/20 dark:text-green-100"
          role="status"
        >
          <p class="font-semibold">
            Álbum añadido: {{ createdDisc.artistName }} — {{ createdDisc.discName }}
          </p>
          <p class="mt-1 text-sm">
            ID: <span class="font-mono">{{ createdDisc.id }}</span>
          </p>
        </div>
        <p
          v-if="spotifyMessage"
          class="text-sm text-gray-700 dark:text-gray-200"
          :class="spotifyError ? 'text-red-700 dark:text-red-300' : ''"
          :role="spotifyError ? 'alert' : 'status'"
        >
          {{ spotifyMessage }}
        </p>
        <div class="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-[#1DB954] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1aa34a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink disabled:opacity-60"
            :disabled="searchingSpotify || spotifySucceeded"
            @click="searchSpotify"
          >
            <i class="fa-brands fa-spotify" aria-hidden="true" />
            {{
              searchingSpotify
                ? "Buscando…"
                : spotifySucceeded
                  ? "Spotify actualizado"
                  : "Buscar en Spotify"
            }}
          </button>
          <button
            type="button"
            class="secondary-button"
            :disabled="searchingSpotify"
            @click="close"
          >
            Cerrar
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { fetchManualData, getCatalogImportGlobalErrorMessage } from "@services/imports/imports";
import type { CatalogImportImportedResult } from "@services/imports/imports";
import { useCatalogStore } from "@stores/catalog/catalog";
import SearchableSelect from "@components/SearchableSelect.vue";
import { updateDiscFromSpotify } from "@services/spotify/updateDiscFromSpotify";

const emit = defineEmits<{
  close: [
    result: {
      createdDisc: Pick<CatalogImportImportedResult, "discId" | "discName" | "artistName"> | null;
    },
  ];
}>();

const catalogStore = useCatalogStore();
const genres = computed(() => catalogStore.genres);
const countries = computed(() => catalogStore.countries);
const saving = ref(false);
const error = ref("");
const outcomeMessage = ref("");
const createdDisc = ref<
  (Pick<CatalogImportImportedResult, "discId" | "discName" | "artistName"> & { id: string }) | null
>(null);
const searchingSpotify = ref(false);
const spotifyMessage = ref("");
const spotifyError = ref(false);
const spotifySucceeded = ref(false);
const selectedDate = ref("");
const line = ref("");
const newGenreId = ref("");
const newCountryId = ref("");
const newEp = ref(false);
const newDebut = ref(false);

onMounted(() => {
  void catalogStore.fetchCatalog();
});

function formatImportDate(date: string): string {
  const [year, month, day] = date.split("-");
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
  return `${monthNames[Number(month) - 1]} ${Number(day)}, ${year}`;
}

async function addAlbum() {
  if (saving.value) return;
  error.value = "";
  outcomeMessage.value = "";
  const inputLine = line.value.trim();
  saving.value = true;
  try {
    const response = await fetchManualData(formatImportDate(selectedDate.value), [
      {
        line: inputLine,
        ...(newGenreId.value ? { genreId: newGenreId.value } : {}),
        ...(newCountryId.value ? { countryId: newCountryId.value } : {}),
        ...(newEp.value ? { ep: true } : {}),
        ...(newDebut.value ? { debut: true } : {}),
      },
    ]);
    const result = response.data.results[0];
    if (result?.status === "imported") {
      createdDisc.value = {
        id: result.discId,
        discId: result.discId,
        discName: result.discName,
        artistName: result.artistName,
      };
    } else if (result?.status === "duplicate") {
      outcomeMessage.value = "El disco ya existe y se ha omitido; no se ha creado otro.";
    } else {
      error.value =
        result?.message || "No se pudo añadir el disco. Revisa los datos e inténtalo de nuevo.";
    }
  } catch (createError) {
    error.value = getCatalogImportGlobalErrorMessage(createError);
  } finally {
    saving.value = false;
  }
}

async function searchSpotify() {
  if (!createdDisc.value || searchingSpotify.value || spotifySucceeded.value) return;
  searchingSpotify.value = true;
  spotifyMessage.value = "";
  spotifyError.value = false;
  try {
    const updated = await updateDiscFromSpotify(
      createdDisc.value.discId,
      createdDisc.value.discName,
      createdDisc.value.artistName
    );
    if (updated) {
      spotifySucceeded.value = true;
      spotifyMessage.value = "Se encontraron y guardaron los datos de Spotify.";
    } else {
      spotifyMessage.value = "No se encontró una coincidencia en Spotify. El disco sigue creado.";
    }
  } catch {
    spotifyError.value = true;
    spotifyMessage.value =
      "Falló la búsqueda en Spotify. El disco sigue creado y puedes cerrar este modal.";
  } finally {
    searchingSpotify.value = false;
  }
}

function close() {
  if (searchingSpotify.value || saving.value) return;
  emit("close", { createdDisc: createdDisc.value });
}
</script>

<style scoped>
.form-input {
  @apply mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-pink dark:border-white/20 dark:bg-rv-darkSurface dark:text-white;
}

.primary-button {
  @apply rounded-xl bg-rv-navy px-4 py-2 text-sm font-semibold text-white hover:bg-rv-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-gray-300;
}

.secondary-button {
  @apply rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:text-gray-200 dark:hover:bg-rv-darkSurface disabled:cursor-not-allowed disabled:opacity-50;
}

.cancel-button {
  @apply rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600 dark:focus-visible:outline-red-400;
}
</style>
