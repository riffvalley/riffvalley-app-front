<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { MONTHS } from "@helpers/dateConstants";
import {
  formatDiscListDay,
  getDiscListCurrentWeekRange,
  getDiscListDayRange,
} from "@/modules/catalog/discs/application/discListDateFilters";
import { getDiscListPage } from "@/modules/catalog/discs/api/discList";
import { TodayReleasesModal } from "@/modules/catalog/calendar";

// Fecha fijada al montar: basta para una visita; al recargar se recalcula.
const today = new Date();
const todayLabel = formatDiscListDay(getDiscListDayRange(today)[0]);

const weekLabel = computed(() => {
  const [start, end] = getDiscListCurrentWeekRange(today);
  return `Del ${formatDiscListDay(start)} al ${formatDiscListDay(end)}`;
});
const monthLabel = computed(() => `${MONTHS[today.getMonth()]} ${today.getFullYear()}`);

// Cuántos discos salen hoy, de todos los géneros y países: «Novedades de hoy»
// no usa tus filtros, así que el número coincide con lo que verá al entrar.
// null = todavía no se sabe (cargando o error): el acceso funciona igual.
const todayCount = ref<number | null>(null);
// «Novedades de hoy» no cambia de página: abre el día de hoy del Calendario en un modal.
const showTodayModal = ref(false);

onMounted(async () => {
  try {
    const page = await getDiscListPage({
      mode: "all",
      orderBy: "disc.releaseDate:DESC,artist.name:ASC",
      query: "",
      dateRange: getDiscListDayRange(today),
      genreIds: [],
      countryId: "",
      offset: 0,
      limit: 1,
    });
    todayCount.value = page.totalItems;
  } catch {
    todayCount.value = null;
  }
});

const todayDetail = computed(() => {
  if (todayCount.value === null) return `Lanzamientos del ${todayLabel}`;
  const unit = todayCount.value === 1 ? "disco" : "discos";
  return `${todayCount.value} ${unit} · ${todayLabel}`;
});

const shortcuts = computed(() => [
  {
    key: "hoy",
    title: "Novedades de hoy",
    detail: todayDetail.value,
    icon: "fa-solid fa-calendar-day",
    to: null,
    // Sin lanzamientos hoy no lleva a ninguna parte: se avisa aquí mismo.
    empty: todayCount.value === 0,
  },
  {
    key: "semana",
    title: "Mis novedades de la semana",
    detail: weekLabel.value,
    icon: "fa-solid fa-calendar-week",
    to: { name: "DiscList", query: { periodo: "semana" } },
    empty: false,
  },
  {
    key: "mes",
    title: "Mis novedades del mes",
    detail: monthLabel.value,
    icon: "fa-solid fa-calendar-days",
    to: { name: "DiscList", query: { periodo: "mes" } },
    empty: false,
  },
  {
    key: "pendientes",
    title: "Mis pendientes",
    detail: "Los discos que guardaste para escuchar",
    icon: "fa-solid fa-clock",
    to: { name: "DiscList", query: { vista: "pendientes" } },
    empty: false,
  },
]);
</script>

<template>
  <section
    class="bg-white dark:bg-rv-darkSurface rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col flex-1"
    aria-labelledby="shortcuts-title"
    data-test="shortcuts-widget"
  >
    <header class="flex flex-col px-6 py-4 bg-gradient-to-r from-rv-pink/8 to-rv-purple/8 dark:from-rv-pink/10 dark:to-rv-purple/10 border-b border-gray-100 dark:border-white/10 shrink-0">
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-bolt text-rv-pink" aria-hidden="true"></i>
        <h3 id="shortcuts-title" class="font-bold text-gray-900 dark:text-white">Accesos directos</h3>
      </div>
      <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 pl-6">
        Hoy y pendientes muestran todo; «Mis novedades» aplica tus filtros de género y país de Discos
      </p>
    </header>

    <!-- En pantallas anchas, una sola fila de 4: es el primer módulo y no debe empujar el resto -->
    <ul class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-4 sm:p-6">
      <li v-for="shortcut in shortcuts" :key="shortcut.key">
        <!-- Sin discos hoy: tarjeta informativa, no enlace -->
        <div
          v-if="shortcut.empty"
          :data-test="`shortcut-${shortcut.key}`"
          class="flex items-center gap-3 xl:gap-2.5 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-left xl:px-3 dark:border-white/15 dark:bg-white/5"
        >
          <span class="flex h-10 w-10 xl:h-9 xl:w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-300" aria-hidden="true">
            <i class="fa-solid fa-calendar-xmark"></i>
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="font-semibold text-rv-navy dark:text-white">{{ shortcut.title }}</span>
            <span class="text-xs text-gray-600 dark:text-gray-300">Hoy no ha salido nada nuevo</span>
          </span>
        </div>
        <button
          v-else-if="!shortcut.to"
          type="button"
          :data-test="`shortcut-${shortcut.key}`"
          aria-haspopup="dialog"
          class="group flex w-full items-center gap-3 xl:gap-2.5 rounded-xl border border-rv-pink/20 bg-gradient-to-r from-rv-pink/10 to-rv-purple/10 px-4 py-3 text-left xl:px-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-rv-pink/50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:border-white/10 dark:from-rv-pink/15 dark:to-rv-purple/15 dark:hover:border-rv-pink/50"
          @click="showTodayModal = true"
        >
          <span class="flex h-10 w-10 xl:h-9 xl:w-9 shrink-0 items-center justify-center rounded-full bg-rv-navy text-white dark:bg-rv-purple" aria-hidden="true">
            <i :class="shortcut.icon"></i>
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="font-semibold text-rv-navy dark:text-white">{{ shortcut.title }}</span>
            <span class="text-xs text-gray-600 dark:text-gray-300">{{ shortcut.detail }}</span>
          </span>
          <i class="fa-solid fa-up-right-from-square text-sm xl:hidden text-rv-pink transition-transform duration-200 group-hover:scale-110" aria-hidden="true"></i>
        </button>
        <router-link
          v-else
          :to="shortcut.to"
          :data-test="`shortcut-${shortcut.key}`"
          class="group flex items-center gap-3 xl:gap-2.5 rounded-xl border border-rv-pink/20 bg-gradient-to-r from-rv-pink/10 to-rv-purple/10 px-4 py-3 text-left xl:px-3 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-rv-pink/50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:border-white/10 dark:from-rv-pink/15 dark:to-rv-purple/15 dark:hover:border-rv-pink/50"
        >
          <span class="flex h-10 w-10 xl:h-9 xl:w-9 shrink-0 items-center justify-center rounded-full bg-rv-navy text-white dark:bg-rv-purple" aria-hidden="true">
            <i :class="shortcut.icon"></i>
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="font-semibold text-rv-navy dark:text-white">{{ shortcut.title }}</span>
            <span class="text-xs text-gray-600 dark:text-gray-300">{{ shortcut.detail }}</span>
          </span>
          <i class="fa-solid fa-arrow-right text-sm xl:hidden text-rv-pink transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true"></i>
        </router-link>
      </li>
    </ul>

    <TodayReleasesModal
      v-if="showTodayModal"
      @close="showTodayModal = false"
      @count-changed="todayCount = $event"
    />
  </section>
</template>
