<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
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
let previousBodyOverflow = "";

onMounted(async () => {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  await nextTick();
  dialog.value?.addEventListener("keydown", handleKeydown);
  closeButton.value?.focus();
});

onBeforeUnmount(() => {
  dialog.value?.removeEventListener("keydown", handleKeydown);
  queryEnabled.value = false;
  document.body.style.overflow = previousBodyOverflow;
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
    <div class="galaxy-overlay">
      <button type="button" class="galaxy-backdrop" tabindex="-1" aria-label="Cerrar diálogo desde el fondo" @click="close"></button>
      <dialog
        open
        ref="dialog"
        class="galaxy-dialog"
        aria-modal="true"
        aria-labelledby="galaxy-title"
        tabindex="-1"
        data-test="galaxy-dialog"
      >
        <header class="galaxy-header">
          <div class="min-w-0">
            <h2 id="galaxy-title" class="galaxy-title">Galaxia musical <span>· {{ year }}</span></h2>
            <p class="galaxy-subtitle">Tus discos con puntuación vigente</p>
          </div>
          <button
            ref="closeButton"
            type="button"
            class="close-button"
            aria-label="Cerrar galaxia musical"
            @click="close"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>

        <label for="galaxy-disc-select" class="galaxy-disc-select-label">
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

        <div class="galaxy-body">
          <div v-if="query.isPending.value" class="galaxy-state" role="status" aria-live="polite" aria-busy="true">
            <i class="fa-solid fa-compact-disc fa-spin" aria-hidden="true"></i>
            <span>Cargando discos de {{ year }}…</span>
          </div>
          <div v-else-if="query.isError.value" class="galaxy-state error-state" role="alert">
            <p>No se pudo cargar la galaxia de {{ year }}.</p>
            <button type="button" class="retry-button" @click="query.refetch()">Reintentar</button>
          </div>
          <p v-else-if="currentYearData && discs.length === 0" class="galaxy-state" role="status">
            No hay discos con puntuación vigente para este año.
          </p>
          <template v-else-if="currentYearData">
            <div class="galaxy-canvas-wrap" aria-label="Visualización interactiva de discos por género">
              <GenreGalaxyDesktop
                :discs="discs"
                :selected-disc-id="selectedDiscId"
                @select="selectDisc"
              />
            </div>
            <aside v-if="selectedDisc" class="selected-disc" aria-live="polite" data-test="selected-disc">
              <span class="selected-mark" aria-hidden="true"><i class="fa-solid fa-compact-disc"></i></span>
              <div class="selected-copy">
                <h3>{{ selectedDisc.name }}</h3>
                <p>{{ selectedDisc.artist?.name ?? "Artista no disponible" }}</p>
              </div>
              <div class="selected-meta">
                <span class="selected-rate"><i class="fa-solid fa-star" aria-hidden="true"></i> {{ formatRate(selectedDisc.rate) }}</span>
                <span v-if="selectedDisc.genre" class="selected-genre">{{ selectedDisc.genre.name }}</span>
                <span v-else class="selected-genre">Sin género</span>
              </div>
            </aside>
          </template>
        </div>
      </dialog>
    </div>
  </Teleport>
</template>

<style scoped>
.galaxy-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.galaxy-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: rgb(3 8 22 / 76%); backdrop-filter: blur(5px); }
.galaxy-dialog { position: relative; z-index: 1; display: flex; width: min(100%, 76rem); height: min(88dvh, 56rem); max-height: none; min-height: 0; flex-direction: column; overflow: hidden; margin: 0; padding: 0; border: 1px solid rgb(255 255 255 / 12%); border-radius: 1.1rem; background: #080d20; color: white; box-shadow: 0 24px 90px rgb(0 0 0 / 42%); outline: none; }
.galaxy-disc-select:focus { position: fixed; z-index: 101; top: 1rem; left: 1rem; width: min(30rem, calc(100vw - 2rem)); height: auto; margin: 0; padding: .65rem .8rem; overflow: visible; clip: auto; border: 1px solid #f1a6bd; border-radius: .65rem; background: #fff; color: #080d20; white-space: normal; }
.galaxy-header { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 1rem; padding: .9rem 1.1rem; border-bottom: 1px solid rgb(255 255 255 / 10%); }
.galaxy-title { margin: 0; font-size: clamp(1rem, 2.5vw, 1.35rem); font-weight: 750; letter-spacing: -.02em; }
.galaxy-title span { color: #f1a6bd; }
.galaxy-subtitle { margin: .2rem 0 0; color: rgb(255 255 255 / 62%); font-size: .78rem; }
.close-button { display: grid; width: 2.75rem; height: 2.75rem; flex: 0 0 auto; place-items: center; border: 1px solid rgb(255 255 255 / 18%); border-radius: .8rem; background: rgb(255 255 255 / 9%); color: white; font-size: 1.2rem; }
.close-button:hover { background: rgb(255 255 255 / 18%); }
.close-button:focus-visible, .retry-button:focus-visible { outline: 3px solid #ee91af; outline-offset: 2px; }
.galaxy-body { display: flex; min-height: 0; flex: 1; flex-direction: column; padding: .65rem; }
.galaxy-canvas-wrap { min-height: 0; flex: 1; overflow: hidden; border: 1px solid rgb(255 255 255 / 10%); border-radius: .8rem; }
.selected-disc { display: flex; min-height: 3.8rem; flex: 0 0 auto; align-items: center; gap: .65rem; margin-top: .55rem; padding: .55rem .7rem; border: 1px solid rgb(255 255 255 / 13%); border-radius: .8rem; background: rgb(255 255 255 / 7%); }
.selected-mark { display: grid; width: 2.2rem; height: 2.2rem; flex: 0 0 auto; place-items: center; border-radius: 50%; background: rgb(238 145 175 / 16%); color: #f1a6bd; }
.selected-copy { min-width: 0; flex: 1; }
.selected-copy h3, .selected-copy p { overflow: hidden; margin: 0; text-overflow: ellipsis; white-space: nowrap; }
.selected-copy h3 { font-size: .83rem; font-weight: 700; }
.selected-copy p { margin-top: .12rem; color: rgb(255 255 255 / 60%); font-size: .73rem; }
.selected-meta { display: flex; flex: 0 0 auto; flex-direction: column; align-items: flex-end; gap: .12rem; font-size: .72rem; }
.selected-rate { color: #ffc857; font-weight: 750; }
.selected-genre { max-width: 10rem; overflow: hidden; color: rgb(255 255 255 / 65%); text-overflow: ellipsis; white-space: nowrap; }
.galaxy-state { display: grid; min-height: 10rem; flex: 1; place-content: center; justify-items: center; gap: .8rem; padding: 1rem; color: rgb(255 255 255 / 72%); text-align: center; }
.galaxy-state > i { color: #f1a6bd; font-size: 1.6rem; }
.error-state { color: #ffc2d2; }
.retry-button { min-height: 2.65rem; padding: .4rem 1rem; border: 1px solid rgb(255 255 255 / 20%); border-radius: .65rem; background: rgb(255 255 255 / 10%); color: white; font-weight: 700; }
@media (max-width: 639px) {
  .galaxy-overlay { align-items: stretch; padding: 0; }
  .galaxy-dialog { width: 100%; height: 100dvh; max-height: 100dvh; border: 0; border-radius: 0; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
  .galaxy-header { gap: .6rem; padding: .6rem .75rem; }
  .galaxy-subtitle { font-size: .72rem; }
  .close-button { width: 2.8rem; height: 2.8rem; }
  .galaxy-body { padding: .5rem; }
  .selected-disc { gap: .45rem; padding: .45rem .5rem; }
  .selected-mark { width: 1.9rem; height: 1.9rem; }
  .selected-genre { max-width: 7rem; }
}
@media (max-height: 480px) and (max-width: 900px) {
  .galaxy-header { padding-block: .35rem; }
  .galaxy-subtitle { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}
</style>
