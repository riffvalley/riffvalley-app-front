<template>
  <div class="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" @click.self="close">
    <section
      ref="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-disc-title"
      class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-rv-darkCard"
      @keydown="onDialogKeydown"
    >
      <header class="mb-5 flex items-center justify-between gap-4">
        <h2 id="request-disc-title" class="text-xl font-bold text-rv-navy dark:text-white">
          {{ submitted ? "Solicitud enviada" : "Solicitar disco" }}
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

      <form v-if="!submitted" class="space-y-4" @submit.prevent="submitRequest">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Pide que añadamos un disco al catálogo. Solo se admiten lanzamientos de 2025 en adelante.
        </p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label for="request-disc-artist" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Artista <span class="text-rv-pink">*</span>
            <input id="request-disc-artist" v-model="artistName" required autocomplete="off" class="form-input" placeholder="Nombre del artista" />
          </label>
          <label for="request-disc-name" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Disco <span class="text-rv-pink">*</span>
            <input id="request-disc-name" v-model="discName" required autocomplete="off" class="form-input" placeholder="Nombre del disco" />
          </label>
        </div>
        <label for="request-disc-date" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Fecha de lanzamiento <span class="text-rv-pink">*</span>
          <input id="request-disc-date" v-model="releaseDate" type="date" min="2025-01-01" required class="form-input" />
        </label>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Género <span class="font-normal text-gray-500 dark:text-gray-400">(opcional)</span>
            <SearchableSelect v-model="genreId" :options="genres" placeholder="Buscar género..." triggerPlaceholder="Sin género" allLabel="Sin género" title="name" trackby="id" :max="4000" class="mt-1 w-full" />
          </label>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
            País <span class="font-normal text-gray-500 dark:text-gray-400">(opcional)</span>
            <SearchableSelect v-model="countryId" :options="countries" placeholder="Buscar país..." triggerPlaceholder="Sin país" allLabel="Sin país" title="name" trackby="id" :max="4000" class="mt-1 w-full" />
          </label>
        </div>
        <div class="flex flex-wrap gap-x-5 gap-y-2">
          <label class="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input v-model="ep" type="checkbox" class="h-4 w-4 rounded accent-rv-pink" /> EP
          </label>
          <label class="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input v-model="debut" type="checkbox" class="h-4 w-4 rounded accent-rv-pink" /> Debut
          </label>
        </div>
        <p v-if="error" class="text-sm text-red-700 dark:text-red-300" role="alert">{{ error }}</p>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" class="secondary-button" :disabled="submitting" @click="close">Cancelar</button>
          <button type="submit" class="primary-button" :disabled="submitting || !artistName.trim() || !discName.trim() || !releaseDate">
            {{ submitting ? "Enviando…" : "Enviar solicitud" }}
          </button>
        </div>
      </form>

      <div v-else class="space-y-5">
        <div class="rounded-xl border border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-800/50 dark:bg-green-900/20 dark:text-green-100" role="status">
          <p class="font-semibold">Solicitud enviada correctamente</p>
          <p class="mt-1 text-sm">{{ artistName.trim() }} — {{ discName.trim() }}</p>
          <p class="mt-1 text-sm">La revisaremos y podrás consultar su estado en Solicitudes de discos.</p>
        </div>
        <div class="flex justify-end">
          <button type="button" class="primary-button" @click="close">Cerrar</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import SearchableSelect from "@components/SearchableSelect.vue";
import { useCatalogStore } from "@stores/catalog/catalog";
import { requestErrorMessage } from "@/modules/requests/application/requestErrorMessage";
import { useRequestMutations } from "@/modules/requests/application/useRequests";
import type { CreateRequestDto } from "@/modules/requests/types/requests";
import { mutateAndInvalidateSidebarSummary } from "@/app/sidebarSummary";

const emit = defineEmits<{ close: [] }>();
const catalogStore = useCatalogStore();
const queryClient = useQueryClient();
const mutations = useRequestMutations();
const genres = computed(() => catalogStore.genres);
const countries = computed(() => catalogStore.countries);
const artistName = ref("");
const discName = ref("");
const releaseDate = ref("");
const genreId = ref("");
const countryId = ref("");
const ep = ref(false);
const debut = ref(false);
const submitting = ref(false);
const submitted = ref(false);
const error = ref("");
const dialog = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

onMounted(() => {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.value?.querySelector<HTMLElement>("input")?.focus();
  document.addEventListener("keydown", onDocumentKeydown);
  void catalogStore.fetchCatalog();
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onDocumentKeydown);
  previouslyFocused?.focus();
});

async function submitRequest() {
  if (submitting.value) return;
  error.value = "";
  if (releaseDate.value < "2025-01-01") {
    error.value = "La fecha de lanzamiento no puede ser anterior a 2025.";
    return;
  }

  const dto: CreateRequestDto = {
    artistName: artistName.value.trim(),
    discName: discName.value.trim(),
    releaseDate: releaseDate.value,
    ...(genreId.value ? { genreId: genreId.value } : {}),
    ...(countryId.value ? { countryId: countryId.value } : {}),
    ...(ep.value ? { ep: true } : {}),
    ...(debut.value ? { debut: true } : {}),
  };

  submitting.value = true;
  try {
    await mutateAndInvalidateSidebarSummary(queryClient, () => mutations.create.mutateAsync(dto));
    submitted.value = true;
  } catch (cause) {
    error.value = requestErrorMessage(cause, "No se pudo enviar la solicitud. Inténtalo de nuevo.");
  } finally {
    submitting.value = false;
  }
}

function close() {
  if (!submitting.value) emit("close");
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}

function onDialogKeydown(event: KeyboardEvent) {
  if (event.key !== "Tab") return;
  const focusable = dialog.value?.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (!focusable?.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
</script>

<style scoped>
.form-input {
  @apply mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-pink dark:border-white/20 dark:bg-rv-darkSurface dark:text-white dark:placeholder:text-gray-300;
}

.primary-button {
  @apply rounded-xl bg-rv-navy px-4 py-2 text-sm font-semibold text-white hover:bg-rv-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-gray-300;
}

.secondary-button {
  @apply rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:text-gray-200 dark:hover:bg-rv-darkSurface disabled:cursor-not-allowed disabled:opacity-50;
}
</style>
