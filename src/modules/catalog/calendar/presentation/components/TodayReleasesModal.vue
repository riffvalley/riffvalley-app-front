<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { getDiscsDated } from "@services/discs/discs";
import { useCatalogStore } from "@stores/catalog/catalog";
import { useAuthStore } from "@/modules/identity/auth";
import { hasMinimumRole } from "@/modules/identity/shared";
import { usePageScrollLock } from "@/composables/usePageScrollLock";
import { getDiscListDayRange } from "@/modules/catalog/discs/application/discListDateFilters";
import { formatCalendarDate } from "../utils/calendarViewUtils";
import DiscComponent from "./DiscComponent.vue";
import DiscComponentBaby from "./DiscComponentBaby.vue";
import CalendarDayTools from "./CalendarDayTools.vue";

/**
 * «Novedades de hoy» del Dashboard: el desplegable del día de hoy del Calendario,
 * ya abierto y dentro de un modal. Los roles altos ven las tarjetas editables
 * del Calendario y sus herramientas; el resto, las del Calendario baby.
 */
const emit = defineEmits<{ close: []; "count-changed": [count: number] }>();

const authStore = useAuthStore();
const catalogStore = useCatalogStore();
// Mismo reparto que CalendarRoleView: riffvalley y superadmin ven el Calendario completo.
const isFullCalendar = computed(() => hasMinimumRole(authStore.role, "riffvalley"));
const genres = computed(() => catalogStore.genres ?? []);
const countries = computed(() => catalogStore.countries ?? []);

const day = ref<{ releaseDate: string; discs: any[] } | null>(null);
const loading = ref(true);
const error = ref(false);
const todayRange = getDiscListDayRange();
const title = formatCalendarDate(todayRange[0].slice(0, 10) + "T12:00:00");

async function load(): Promise<void> {
  loading.value = true;
  error.value = false;
  try {
    // 200 basta de sobra para un día; es el mismo tamaño de página que el Calendario.
    const response = await getDiscsDated(200, 0, [...todayRange]);
    const discs = response.data.flatMap((group: any) => group.discs);
    discs.forEach((disc: any) => {
      disc.genreId = disc.genre?.id ?? "";
    });
    day.value = { releaseDate: response.data[0]?.releaseDate ?? todayRange[0], discs };
    emit("count-changed", discs.length);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

// Borrar un disco o moverlo de fecha lo saca de «hoy», igual que en el Calendario.
function removeDisc(discId: string): void {
  if (!day.value) return;
  day.value.discs = day.value.discs.filter((disc) => disc.id !== discId);
  emit("count-changed", day.value.discs.length);
}

// --- Diálogo accesible: foco dentro, Escape cierra y se devuelve el foco al abrir ---
usePageScrollLock();
const dialogElement = ref<HTMLElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

function close(): void {
  emit("close");
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    // Si hay otro modal abierto encima (por ejemplo, editar un disco), que lo cierre él.
    if (event.defaultPrevented) return;
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== "Tab" || !dialogElement.value) return;
  const focusable = [...dialogElement.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.tabIndex >= 0 && element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  closeButton.value?.focus();
  void load();
});

onBeforeUnmount(() => {
  if (opener?.isConnected) opener.focus();
});
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6"
      data-test="today-releases-overlay"
      @click.self="close"
    >
      <section
        ref="dialogElement"
        role="dialog"
        aria-modal="true"
        aria-labelledby="today-releases-title"
        tabindex="-1"
        class="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl focus:outline-none dark:bg-rv-darkBg"
        data-test="today-releases-modal"
        @keydown="onKeydown"
      >
        <!-- Cabecera: la misma barra del día del Calendario, siempre abierta -->
        <header class="flex shrink-0 items-center gap-2 border-b border-gray-100 p-3 sm:p-4 dark:border-white/10">
          <div class="flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-rv-navy px-4 py-3 shadow-md sm:gap-3 sm:px-5 dark:bg-gray-200">
            <h2 id="today-releases-title" class="truncate text-base font-bold text-white sm:text-lg dark:text-rv-navy">
              <span class="sr-only">Novedades de hoy: </span>{{ title }}
            </h2>
            <span
              v-if="day"
              class="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-rv-navy/10 dark:text-rv-navy"
            >
              {{ day.discs.length }} disco{{ day.discs.length !== 1 ? "s" : "" }}
            </span>
          </div>
          <button
            ref="closeButton"
            type="button"
            aria-label="Cerrar novedades de hoy"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-rv-navy p-0 text-white shadow-md transition hover:bg-rv-pink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:bg-rv-purple"
            @click="close"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>

        <div class="overflow-y-auto overflow-x-hidden p-3 sm:p-4">
          <div v-if="loading" role="status" aria-live="polite" class="flex flex-col items-center gap-3 py-10">
            <i class="fa-solid fa-compact-disc animate-spin text-3xl text-rv-pink motion-reduce:animate-none" aria-hidden="true"></i>
            <span class="text-sm font-medium text-rv-navy dark:text-white">Cargando discos...</span>
          </div>

          <div v-else-if="error" role="alert" class="flex flex-col items-center gap-3 py-10 text-center">
            <p class="text-sm text-red-700 dark:text-red-300">No se pudieron cargar las novedades de hoy.</p>
            <button
              type="button"
              class="rounded-full bg-rv-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink focus-visible:ring-offset-2 dark:bg-gray-200 dark:text-rv-navy"
              @click="load"
            >
              Reintentar
            </button>
          </div>

          <div v-else-if="!day || day.discs.length === 0" role="status" class="flex flex-col items-center gap-2 py-10 text-center" data-test="today-releases-empty">
            <i class="fa-solid fa-calendar-xmark text-2xl text-rv-pink" aria-hidden="true"></i>
            <p class="font-semibold text-rv-navy dark:text-white">Hoy no ha salido nada nuevo</p>
          </div>

          <template v-else>
            <!-- Calendario completo: herramientas del día y tarjetas editables en lista -->
            <template v-if="isFullCalendar">
              <CalendarDayTools :group="day" :genres="genres" />
              <ul class="mt-3 flex w-full flex-col gap-3" data-test="today-releases-full">
                <li v-for="disc in day.discs" :key="disc.id">
                  <DiscComponent
                    :disc="disc"
                    :genres="genres"
                    :countries="countries"
                    @disc-deleted="removeDisc"
                    @date-changed="removeDisc"
                  />
                </li>
              </ul>
            </template>
            <!-- Calendario baby: tarjetas compactas en cuadrícula -->
            <ul v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-test="today-releases-baby">
              <li v-for="disc in day.discs" :key="disc.id">
                <DiscComponentBaby
                  :disc="disc"
                  :genres="genres"
                  :artistCountry="disc.artist?.country"
                  @disc-deleted="removeDisc"
                  @date-changed="removeDisc"
                />
              </li>
            </ul>
          </template>
        </div>
      </section>
    </div>
  </Teleport>
</template>
