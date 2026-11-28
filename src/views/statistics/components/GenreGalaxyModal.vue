<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import { usePageScrollLock } from "@/composables/usePageScrollLock";
import { useStatisticsGalaxyQuery } from "@/modules/statistics/application/useStatisticsQueries";
import GenreGalaxyDesktop from "./GenreGalaxyDesktop.vue";

defineOptions({ name: "GenreGalaxyModal" });

defineProps<{ year: number }>();
const emit = defineEmits<{ close: [] }>();

const queryEnabled = ref(true);
const query = useStatisticsGalaxyQuery(() => queryEnabled.value);
const dialog = useTemplateRef<HTMLElement>("dialog");
const closeButton = useTemplateRef<HTMLButtonElement>("closeButton");
const selectedDiscId = ref<string | null>(null);
const discs = computed(() => query.data.value ?? []);
const currentYearData = computed(() => query.data.value && query.data.value.length >= 0);
const selectedDisc = computed(() => discs.value.find((disc) => disc.id === selectedDiscId.value) ?? null);

let previouslyFocused: HTMLElement | null = null;
// Bloquea el scroll de la página de detrás mientras el modal está abierto.
usePageScrollLock();

onMounted(async () => {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  await nextTick();
  dialog.value?.addEventListener("keydown", handleKeydown);
  closeButton.value?.focus();
});

onBeforeUnmount(() => {
  dialog.value?.removeEventListener("keydown", handleKeydown);
  queryEnabled.value = false;
  if (previouslyFocused?.isConnected) previouslyFocused.focus();
});

function close(): void {
  emit("close");
}

function selectDisc(id: string): void {
  selectedDiscId.value = id;
}

function selectDiscFromList(event: Event): void {
  const id = (event.target as HTMLSelectElement).value;
  if (id) selectDisc(id);
}

function isVisibleFocusable(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current && current !== dialog.value) {
    if (current.hidden || getComputedStyle(current).display === "none") return false;
    current = current.parentElement;
  }
  return true;
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== "Tab" || !dialog.value) return;

  const focusable = [...dialog.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) =>
    element.tabIndex >= 0
      && !element.hasAttribute("hidden")
      && isVisibleFocusable(element),
  );
  if (!focusable.length) {
    event.preventDefault();
    dialog.value.focus();
    return;
  }
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (!dialog.value.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function formatRate(rate: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(rate);
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] flex items-stretch justify-center sm:items-center sm:p-4">
      <!-- Fondo oscuro translúcido: al pulsarlo se cierra, igual que en los demás modales. -->
      <button
        type="button"
        class="absolute inset-0 h-full w-full cursor-default rounded-none border-0 bg-black/70 p-0 backdrop-blur-sm"
        tabindex="-1"
        aria-label="Cerrar diálogo desde el fondo"
        @click="close"
      ></button>
      <dialog
        open
        ref="dialog"
        class="galaxy-dialog relative z-[1] m-0 flex h-[100dvh] max-h-none w-full max-w-none flex-col overflow-hidden border-0 bg-white p-0 text-left text-gray-900 shadow-2xl outline-none dark:bg-rv-darkCard dark:text-white sm:h-[min(88dvh,56rem)] sm:w-[min(100%,76rem)] sm:rounded-2xl sm:border sm:border-gray-200 sm:dark:border-white/10"
        aria-modal="true"
        aria-labelledby="galaxy-title"
        tabindex="-1"
        data-test="galaxy-dialog"
      >
        <header class="galaxy-header flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-white/10 sm:px-5 sm:py-4">
          <div class="min-w-0">
            <h2 id="galaxy-title" class="text-xl font-extrabold tracking-tight text-rv-navy dark:text-white sm:text-2xl">
              Galaxia musical <span class="text-rv-pink">· {{ year }}</span>
            </h2>
            <p class="galaxy-subtitle mt-0.5 text-sm text-gray-500 dark:text-gray-400">Tus discos con puntuación vigente</p>
          </div>
          <!-- Botón de cerrar redondo, el mismo que en el resto de modales. -->
          <button
            ref="closeButton"
            type="button"
            class="close-button inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-rv-navy p-0 text-white shadow-md transition hover:bg-rv-pink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-rv-pink dark:hover:text-white"
            aria-label="Cerrar galaxia musical"
            @click="close"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>

        <label for="galaxy-disc-select">
          <span class="sr-only">Seleccionar disco de la galaxia</span>
          <select
            class="galaxy-disc-select sr-only"
            id="galaxy-disc-select"
            aria-label="Seleccionar disco de la galaxia"
            :value="selectedDiscId ?? ''"
            @change="selectDiscFromList"
          >
            <option value="">Selecciona un disco</option>
            <option v-for="disc in discs" :key="disc.id" :value="disc.id">
              {{ disc.name }} — {{ disc.artist?.name ?? "Artista no disponible" }} — {{ disc.genre?.name ?? "Sin género" }} — {{ formatRate(disc.rate) }}/10
            </option>
          </select>
        </label>

        <div class="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
          <div
            v-if="query.isPending.value"
            class="grid min-h-40 flex-1 place-content-center justify-items-center gap-3 p-4 text-center text-sm text-gray-600 dark:text-gray-300"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <i class="fa-solid fa-compact-disc fa-spin text-2xl text-rv-pink" aria-hidden="true"></i>
            <span>Cargando discos de {{ year }}…</span>
          </div>
          <div
            v-else-if="query.isError.value"
            class="grid min-h-40 flex-1 place-content-center justify-items-center gap-3 p-4 text-center text-sm text-red-700 dark:text-red-300"
            role="alert"
          >
            <p>No se pudo cargar la galaxia de {{ year }}.</p>
            <button
              type="button"
              class="min-h-10 rounded-lg border-0 bg-rv-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rv-pink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-rv-pink dark:hover:text-white"
              @click="query.refetch()"
            >
              Reintentar
            </button>
          </div>
          <p
            v-else-if="currentYearData && discs.length === 0"
            class="grid min-h-40 flex-1 place-content-center p-4 text-center text-sm text-gray-600 dark:text-gray-300"
            role="status"
          >
            No hay discos con puntuación vigente para este año.
          </p>
          <template v-else-if="currentYearData">
            <div
              class="min-h-0 flex-1"
              aria-label="Visualización interactiva de discos por género"
            >
              <GenreGalaxyDesktop
                :discs="discs"
                :selected-disc-id="selectedDiscId"
                @select="selectDisc"
              />
            </div>
            <aside
              v-if="selectedDisc"
              class="flex min-h-14 shrink-0 items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/5"
              aria-live="polite"
              data-test="selected-disc"
            >
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rv-pink/15 text-rv-pink" aria-hidden="true">
                <i class="fa-solid fa-compact-disc"></i>
              </span>
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-sm font-bold text-rv-navy dark:text-white">{{ selectedDisc.name }}</h3>
                <p class="truncate text-xs text-gray-600 dark:text-gray-300">{{ selectedDisc.artist?.name ?? "Artista no disponible" }}</p>
              </div>
              <div class="flex shrink-0 flex-col items-end gap-0.5 text-xs">
                <span class="font-bold tabular-nums text-amber-700 dark:text-amber-300">
                  <i class="fa-solid fa-star" aria-hidden="true"></i> {{ formatRate(selectedDisc.rate) }}
                </span>
                <span class="max-w-28 truncate text-gray-600 dark:text-gray-300 sm:max-w-40">{{ selectedDisc.genre?.name ?? "Sin género" }}</span>
              </div>
            </aside>
          </template>
        </div>
      </dialog>
    </div>
  </Teleport>
</template>

<style scoped>
/* El selector oculto de discos solo aparece al llegar con el teclado (Tab). */
.galaxy-disc-select:focus { position: fixed; z-index: 101; top: 1rem; left: 1rem; width: min(30rem, calc(100vw - 2rem)); height: auto; margin: 0; padding: .65rem .8rem; overflow: visible; clip: auto; border: 1px solid #f1a6bd; border-radius: .65rem; background: #fff; color: #00021f; white-space: normal; }
:global(.dark) .galaxy-disc-select:focus { background: #404157; color: #fff; }
@media (max-width: 639px) {
  .galaxy-dialog { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
}
@media (max-height: 480px) and (max-width: 900px) {
  .galaxy-header { padding-block: .35rem; }
  .galaxy-subtitle { display: none; }
}
</style>
