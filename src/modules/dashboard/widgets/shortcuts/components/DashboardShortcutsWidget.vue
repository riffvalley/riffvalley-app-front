<script setup lang="ts">
import { computed } from "vue";
import { MONTHS } from "@helpers/dateConstants";
import { getDiscListCurrentWeekRange } from "@/modules/catalog/discs/application/discListDateFilters";

// Fecha fijada al montar: basta para una visita; al recargar se recalcula.
const today = new Date();

function shortDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]!.slice(0, 3).toLowerCase()}`;
}

const weekLabel = computed(() => {
  const [start, end] = getDiscListCurrentWeekRange(today);
  return `Del ${shortDate(start)} al ${shortDate(end)}`;
});
const monthLabel = computed(() => `${MONTHS[today.getMonth()]} ${today.getFullYear()}`);

const shortcuts = computed(() => [
  {
    key: "semana",
    title: "Novedades de la semana",
    detail: weekLabel.value,
    icon: "fa-solid fa-calendar-week",
  },
  {
    key: "mes",
    title: "Novedades del mes",
    detail: monthLabel.value,
    icon: "fa-solid fa-calendar-days",
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
        Abre Discos con las fechas ya puestas y sigue filtrando desde ahí
      </p>
    </header>

    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 sm:p-6">
      <li v-for="shortcut in shortcuts" :key="shortcut.key">
        <router-link
          :to="{ name: 'DiscList', query: { periodo: shortcut.key } }"
          :data-test="`shortcut-${shortcut.key}`"
          class="group flex items-center gap-3 rounded-xl border border-rv-pink/20 bg-gradient-to-r from-rv-pink/10 to-rv-purple/10 px-4 py-3 text-left no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-rv-pink/50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:border-white/10 dark:from-rv-pink/15 dark:to-rv-purple/15 dark:hover:border-rv-pink/50"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rv-navy text-white dark:bg-rv-purple" aria-hidden="true">
            <i :class="shortcut.icon"></i>
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="font-semibold text-rv-navy dark:text-white">{{ shortcut.title }}</span>
            <span class="text-xs text-gray-600 dark:text-gray-300">{{ shortcut.detail }}</span>
          </span>
          <i class="fa-solid fa-arrow-right text-sm text-rv-pink transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true"></i>
        </router-link>
      </li>
    </ul>
  </section>
</template>
