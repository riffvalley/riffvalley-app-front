<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import { getAllGenres, type Genre } from "@services/genres/genres";
import { getAllCountries, type Country } from "@services/countries/countries";
import { useSavedDiscFilters } from "../../../application/useSavedDiscFilters";
import { describeSavedDiscFilterYears } from "../../../application/savedDiscFilterCriteria";
import type { SavedDiscFilter } from "../../../types/savedDiscFilter";
import SavedDiscFilterConfirmModal from "../SavedDiscFilterConfirmModal.vue";
import SavedDiscFilterEditor, { type SavedDiscFilterEditorValue } from "./SavedDiscFilterEditor.vue";

/** Máximo de filtros guardados que admite el backend por usuario. */
const MAX_SAVED_FILTERS = 20;

const savedFilters = useSavedDiscFilters();
const filters = savedFilters.filters;
const filtersLoading = savedFilters.isLoading;
const filtersError = savedFilters.isError;

const open = defineModel<boolean>("open", { required: true });
const props = withDefaults(defineProps<{
  /** Texto del botón que aplica un filtro («Ver en Discos» en Perfil, «Aplicar» en Discos). */
  applyLabel?: string;
}>(), { applyLabel: "Ver en Discos" });
const emit = defineEmits<{ apply: [filter: SavedDiscFilter] }>();
/** null = lista; "new" = crear; un filtro = editarlo. */
const editing = ref<SavedDiscFilter | "new" | null>(null);
const deleteTarget = ref<SavedDiscFilter | null>(null);
const mutationError = ref("");
const notice = ref("");
const dialog = ref<HTMLElement | null>(null);
/** Elemento con el foco al abrir, para devolvérselo al cerrar. */
let returnFocusTo: HTMLElement | null = null;
const closeButton = ref<HTMLButtonElement | null>(null);

const genres = ref<Genre[]>([]);
const countries = ref<Country[]>([]);
const optionsLoading = ref(false);
const optionsError = ref(false);
let optionsLoaded = false;

const pending = computed(
  () =>
    savedFilters.create.isPending.value ||
    savedFilters.update.isPending.value ||
    savedFilters.remove.isPending.value
);
const limitReached = computed(() => filters.value.length >= MAX_SAVED_FILTERS);
const counterLabel = computed(() => `${filters.value.length} / ${MAX_SAVED_FILTERS}`);
const editorTitle = computed(() =>
  editing.value === "new" ? "Nuevo filtro" : editing.value ? "Editar filtro" : ""
);

async function loadOptions() {
  if (optionsLoaded || optionsLoading.value) return;
  optionsLoading.value = true;
  optionsError.value = false;
  try {
    const [genreList, countryList] = await Promise.all([getAllGenres(), getAllCountries()]);
    genres.value = [...genreList].sort((a, b) => a.name.localeCompare(b.name, "es"));
    countries.value = [...countryList].sort((a, b) => a.name.localeCompare(b.name, "es"));
    optionsLoaded = true;
  } catch {
    optionsError.value = true;
  } finally {
    optionsLoading.value = false;
  }
}

function genreName(id: string): string {
  return genres.value.find((genre) => genre.id.toLowerCase() === id.toLowerCase())?.name ?? "";
}

function genreColor(id: string): string {
  return genres.value.find((genre) => genre.id.toLowerCase() === id.toLowerCase())?.color || "#6b7280";
}

function countryName(id: string | null): string {
  if (!id) return "Todos los países";
  return (
    countries.value.find((country) => country.id.toLowerCase() === id.toLowerCase())?.name ??
    "País no disponible"
  );
}

function isMissingGenre(filter: SavedDiscFilter, id: string): boolean {
  return filter.missingGenreIds.some((missing) => missing.toLowerCase() === id.toLowerCase());
}

function showNotice(message: string) {
  notice.value = message;
  window.setTimeout(() => {
    if (notice.value === message) notice.value = "";
  }, 4000);
}

function getMutationError(error: unknown): string {
  const response = (error as {
    response?: { status?: number; data?: { code?: string; message?: string | string[] } };
  })?.response;
  if (response?.data?.code === "SAVED_DISC_FILTER_LIMIT_REACHED")
    return `Has alcanzado el límite de ${MAX_SAVED_FILTERS} filtros guardados.`;
  const message = response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string") return message;
  return "No se pudo guardar el filtro. Revisa los datos e inténtalo de nuevo.";
}

function startEditing(target: SavedDiscFilter | "new") {
  if (target === "new" && limitReached.value) return;
  mutationError.value = "";
  editing.value = target;
}

function backToList() {
  if (pending.value) return;
  editing.value = null;
  mutationError.value = "";
  void nextTick(() => closeButton.value?.focus());
}

async function submitEditor(value: SavedDiscFilterEditorValue) {
  mutationError.value = "";
  try {
    if (editing.value === "new") {
      const { result } = await savedFilters.create.mutateAsync(value);
      showNotice(`Filtro «${result.name}» creado.`);
    } else if (editing.value) {
      const { result } = await savedFilters.update.mutateAsync({
        id: editing.value.id,
        payload: value,
      });
      showNotice(`Filtro «${result.name}» actualizado.`);
    }
    editing.value = null;
    void nextTick(() => closeButton.value?.focus());
  } catch (error) {
    mutationError.value = getMutationError(error);
  }
}

async function confirmDelete() {
  const target = deleteTarget.value;
  if (!target || pending.value) return;
  try {
    await savedFilters.remove.mutateAsync(target.id);
    showNotice(`Filtro «${target.name}» eliminado.`);
  } catch (error) {
    showNotice(getMutationError(error));
  } finally {
    deleteTarget.value = null;
  }
}

function applyFilter(filter: SavedDiscFilter) {
  open.value = false;
  emit("apply", filter);
}

function onKeydown(event: KeyboardEvent) {
  // El aviso de borrado gestiona su propio teclado.
  if (deleteTarget.value || event.defaultPrevented) return;
  if (event.key === "Escape") {
    if (editing.value) backToList();
    else open.value = false;
    return;
  }
  if (event.key !== "Tab" || !dialog.value) return;
  const focusable = dialog.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable.item(0);
  const last = focusable.item(focusable.length - 1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

watch(open, (isOpen) => {
  document.body.style.overflow = isOpen ? "hidden" : "";
  if (isOpen) {
    returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    void loadOptions();
    document.addEventListener("keydown", onKeydown);
    void nextTick(() => closeButton.value?.focus());
  } else {
    editing.value = null;
    deleteTarget.value = null;
    mutationError.value = "";
    document.removeEventListener("keydown", onKeydown);
    returnFocusTo?.focus();
    returnFocusTo = null;
  }
});

onUnmounted(() => {
  document.body.style.overflow = "";
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
<Teleport to="body">
  <Transition name="modal">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        role="presentation"
        aria-hidden="true"
        class="absolute inset-0 bg-black/50 backdrop-blur-sm"
        @click="open = false"
      ></div>

      <div
        ref="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-filters-dialog-title"
        tabindex="-1"
        data-testid="saved-filters-dialog"
        class="relative z-10 w-full sm:max-w-2xl bg-white dark:bg-rv-darkCard rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden"
      >
        <div
          class="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10 shrink-0"
        >
          <div class="flex min-w-0 items-center gap-2">
            <i class="fa-solid fa-filter text-rv-pink" aria-hidden="true"></i>
            <h2
              id="saved-filters-dialog-title"
              class="truncate text-lg font-extrabold tracking-tight text-gray-900 dark:text-white"
            >
              {{ editing ? editorTitle : "Gestionar mis filtros" }}
            </h2>
            <span
              v-if="!editing"
              class="shrink-0 rounded-full bg-rv-navy/10 px-2.5 py-0.5 text-xs font-bold text-rv-navy dark:bg-white/10 dark:text-white"
            >
              {{ counterLabel }}
            </span>
          </div>
          <button
            ref="closeButton"
            type="button"
            aria-label="Cerrar"
            class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-gray-500 bg-gray-100 dark:bg-white/10 dark:text-gray-300 hover:text-white hover:bg-rv-pink dark:hover:bg-rv-pink border-0 outline-none focus-visible:ring-2 focus-visible:ring-rv-pink transition-colors duration-150"
            @click="open = false"
          >
            <i class="fa-solid fa-xmark text-sm" aria-hidden="true"></i>
          </button>
        </div>

        <div class="overflow-y-auto overflow-x-hidden flex-1 p-5">
          <p
            v-if="notice"
            class="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100"
            role="status"
          >
            {{ notice }}
          </p>
          <p
            v-if="optionsError"
            class="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-100"
            role="alert"
          >
            No se pudieron cargar los géneros y países. Algunos nombres pueden no mostrarse.
          </p>

          <SavedDiscFilterEditor
            v-if="editing"
            :key="editing === 'new' ? 'new' : editing.id"
            :filter="editing === 'new' ? null : editing"
            :genres="genres"
            :countries="countries"
            :options-loading="optionsLoading"
            :pending="pending"
            :error-message="mutationError"
            @cancel="backToList"
            @submit="submitEditor"
          />

          <template v-else>
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p class="text-sm text-gray-600 dark:text-gray-300">
                {{
                  limitReached
                    ? "Has llegado al máximo de filtros. Elimina alguno para crear otro."
                    : `Puedes guardar hasta ${MAX_SAVED_FILTERS} filtros.`
                }}
              </p>
              <button
                type="button"
                data-testid="saved-filters-new"
                class="!inline-flex !items-center !gap-2 !rounded-full !border-0 !bg-rv-navy !px-4 !py-2 !text-sm !font-semibold !text-white hover:!bg-rv-navy/90 focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-rv-pink disabled:!cursor-not-allowed disabled:!opacity-50 dark:!bg-gray-200 dark:!text-rv-navy dark:hover:!bg-white"
                :disabled="limitReached || filtersLoading || filtersError"
                @click="startEditing('new')"
              >
                <i class="fa-solid fa-plus" aria-hidden="true"></i>
                Nuevo filtro
              </button>
            </div>

            <p
              v-if="filtersLoading"
              class="py-8 text-center text-sm text-gray-500 dark:text-gray-400"
              role="status"
            >
              Cargando filtros…
            </p>
            <div
              v-else-if="filtersError"
              class="py-8 text-center text-sm text-gray-600 dark:text-gray-300"
              role="alert"
            >
              No se pudieron cargar tus filtros.
              <button
                type="button"
                class="ml-1 font-semibold text-rv-pink underline underline-offset-2"
                @click="savedFilters.retry()"
              >
                Reintentar
              </button>
            </div>
            <p
              v-else-if="!filters.length"
              class="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-600 dark:border-white/20 dark:text-gray-300"
            >
              Todavía no tienes filtros guardados. Crea uno aquí o guárdalo desde Discos.
            </p>

            <ul v-else class="space-y-3" aria-label="Filtros guardados">
              <li
                v-for="filter in filters"
                :key="filter.id"
                class="rounded-2xl border border-rv-pink/15 bg-gradient-to-r from-rv-pink/10 to-rv-purple/10 p-4 dark:border-white/10"
                data-testid="saved-filter-item"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <h3 class="min-w-0 break-words text-base font-bold text-rv-navy dark:text-white">
                    {{ filter.name }}
                  </h3>
                  <div class="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      class="!inline-flex !items-center !gap-1.5 !rounded-full !border-0 !bg-rv-pink !px-3 !py-1.5 !text-xs !font-semibold !text-white hover:!bg-rv-pink/90 focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-rv-pink"
                      :aria-label="`${props.applyLabel}: «${filter.name}»`"
                      @click="applyFilter(filter)"
                    >
                      <i class="fa-solid fa-compact-disc" aria-hidden="true"></i>
                      {{ applyLabel }}
                    </button>
                    <button
                      type="button"
                      class="!inline-flex !items-center !gap-1.5 !rounded-full !border !border-rv-navy/20 !bg-white !px-3 !py-1.5 !text-xs !font-semibold !text-rv-navy hover:!bg-gray-50 focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-rv-pink dark:!border-white/20 dark:!bg-transparent dark:!text-white dark:hover:!bg-white/10"
                      :aria-label="`Editar «${filter.name}»`"
                      :disabled="pending"
                      @click="startEditing(filter)"
                    >
                      <i class="fa-solid fa-pen" aria-hidden="true"></i>
                      Editar
                    </button>
                    <button
                      type="button"
                      class="!inline-flex !items-center !gap-1.5 !rounded-full !border !border-red-300 !bg-white !px-3 !py-1.5 !text-xs !font-semibold !text-red-700 hover:!bg-red-50 focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-rv-pink dark:!border-red-400/40 dark:!bg-transparent dark:!text-red-300 dark:hover:!bg-red-500/10"
                      :aria-label="`Eliminar «${filter.name}»`"
                      :disabled="pending"
                      @click="deleteTarget = filter"
                    >
                      <i class="fa-solid fa-trash" aria-hidden="true"></i>
                      Eliminar
                    </button>
                  </div>
                </div>

                <dl class="mt-3 grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
                  <dt class="font-semibold text-gray-700 dark:text-gray-200">Géneros</dt>
                  <dd class="flex flex-wrap gap-1.5 text-gray-700 dark:text-gray-200">
                    <template v-if="filter.filters.genreIds.length">
                      <span
                        v-for="id in filter.filters.genreIds"
                        :key="id"
                        class="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-white/10 dark:text-gray-100"
                      >
                        <span
                          class="inline-block h-2 w-2 rounded-full"
                          :style="{ backgroundColor: isMissingGenre(filter, id) ? '#9ca3af' : genreColor(id) }"
                          aria-hidden="true"
                        ></span>
                        {{ isMissingGenre(filter, id) ? "Género eliminado" : genreName(id) || "…" }}
                      </span>
                    </template>
                    <span v-else>Todos los géneros</span>
                  </dd>
                  <dt class="font-semibold text-gray-700 dark:text-gray-200">País</dt>
                  <dd class="text-gray-700 dark:text-gray-200">
                    {{ filter.countryMissing ? "País eliminado" : countryName(filter.filters.countryId) }}
                  </dd>
                  <dt class="font-semibold text-gray-700 dark:text-gray-200">Años</dt>
                  <dd class="text-gray-700 dark:text-gray-200">
                    {{ describeSavedDiscFilterYears(filter.filters) }}
                  </dd>
                </dl>

                <p
                  v-if="filter.missingGenreIds.length || filter.countryMissing"
                  class="mt-3 text-xs text-amber-800 dark:text-amber-200"
                >
                  <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                  Este filtro incluye datos que ya no existen. Edítalo para actualizarlo.
                </p>
              </li>
            </ul>
          </template>
        </div>

        <SavedDiscFilterConfirmModal
          v-if="deleteTarget"
          title="Eliminar filtro guardado"
          :message="`¿Eliminar el filtro «${deleteTarget.name}»? Esta acción no se puede deshacer.`"
          confirm-label="Eliminar filtro"
          dangerous
          :pending="pending"
          @close="deleteTarget = null"
          @confirm="confirmDelete"
        />
      </div>
    </div>
  </Transition>
</Teleport>
</template>
