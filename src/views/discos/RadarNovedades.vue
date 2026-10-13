<template>
  <div class="min-h-screen bg-gray-50 dark:bg-rv-darkBg p-4 md:p-6">
    <div class="max-w-7xl mx-auto">

      <!-- Cabecera -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <i class="fa-solid fa-compact-disc text-rv-purple"></i>
          Radares
        </h1>
      </div>

      <!-- Actuales: las aún abiertas, el próximo viernes y el siguiente -->
      <section class="mb-8">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <i class="fa-solid fa-bolt text-amber-500 dark:text-amber-400 text-sm"></i>
          </div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Actuales</h2>
          <span v-if="currentLists.length > 0"
            class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            {{ currentLists.length }}
          </span>
        </div>

        <div v-if="currentLists.length > 0" :class="gridClass">
          <RadarListCard v-for="list in currentLists" :key="list.id" :list="list" @open="goToListDetail" />
        </div>

        <div v-else class="bg-white dark:bg-rv-darkCard rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-10 text-center">
          <div class="w-12 h-12 bg-gray-50 dark:bg-rv-darkSurface rounded-2xl flex items-center justify-center mx-auto mb-3">
            <i class="fa-solid fa-compact-disc text-gray-300 dark:text-gray-600 text-xl"></i>
          </div>
          <p class="font-semibold text-gray-900 dark:text-white mb-1">No hay radares activos</p>
          <p class="text-sm text-gray-400 dark:text-gray-500">Las nuevas listas de radar aparecerán aquí.</p>
        </div>
      </section>

      <!-- Futuras: más allá de las dos próximas semanas -->
      <CollapsibleSection v-if="futureLists.length > 0" v-model:open="showFuture" class="mb-8"
        title="Futuras" icon="fa-solid fa-forward" :count="futureLists.length"
        icon-wrap-class="bg-blue-100 dark:bg-blue-900/30" icon-class="text-blue-500 dark:text-blue-400">
        <div :class="gridClass">
          <RadarListCard v-for="list in futureLists" :key="list.id" :list="list" @open="goToListDetail" />
        </div>
      </CollapsibleSection>

      <!-- Anteriores -->
      <CollapsibleSection v-model:open="showPast" title="Anteriores" icon="fa-solid fa-clock-rotate-left">
        <div class="flex gap-2 mb-4">
          <select v-model="selectedYear" @change="loadPastLists"
            class="bg-white dark:bg-rv-darkCard border-0 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 font-medium shadow-sm focus:ring-2 focus:ring-rv-purple/30 cursor-pointer">
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
          <select v-model="selectedMonth" @change="loadPastLists"
            class="bg-white dark:bg-rv-darkCard border-0 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 font-medium shadow-sm focus:ring-2 focus:ring-rv-purple/30 cursor-pointer min-w-[120px]">
            <option v-for="(monthName, index) in monthNames" :key="index" :value="index + 1">{{ monthName }}</option>
          </select>
        </div>

        <div v-if="pastLists.length > 0" :class="gridClass">
          <RadarListCard v-for="list in pastLists" :key="list.id" :list="list" closed @open="goToListDetail" />
        </div>

        <div v-else class="bg-white dark:bg-rv-darkCard rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-10 text-center">
          <div class="w-12 h-12 bg-gray-50 dark:bg-rv-darkSurface rounded-2xl flex items-center justify-center mx-auto mb-3">
            <i class="fa-regular fa-folder-open text-gray-300 dark:text-gray-600 text-xl"></i>
          </div>
          <p class="font-semibold text-gray-900 dark:text-white mb-1">Sin radares este mes</p>
          <p class="text-sm text-gray-400 dark:text-gray-500">
            No hay listas para {{ monthNames[selectedMonth - 1] }} de {{ selectedYear }}.
          </p>
        </div>
      </CollapsibleSection>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getCurrentWeeklyLists, getPastWeeklyLists } from '@services/list/list';
import { MONTHS } from '@helpers/dateConstants';
import RadarListCard from './components/RadarListCard.vue';
import CollapsibleSection from './components/CollapsibleSection.vue';

const router = useRouter();
const gridClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4';

// Lo que devuelve el backend como "actuales" (abiertas y futuras), sin clasificar.
const openLists = ref<any[]>([]);
const pastLists = ref<any[]>([]);

const showFuture = ref(false);
const showPast = ref(false);

const currentDate = new Date();
const selectedYear = ref(currentDate.getFullYear());
const selectedMonth = ref(currentDate.getMonth() + 1);

const monthNames = MONTHS;

const availableYears = ref<number[]>([]);
for (let i = 0; i < 5; i++) {
  availableYears.value.push(currentDate.getFullYear() - i);
}

// Las fechas se comparan como "YYYY-MM-DD" para no depender de la zona horaria.
function toDateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function listKey(list: any) {
  const date = list.listDate || list.releaseDate;
  return date ? String(date).split('T')[0] : '';
}

// Ventana de "actuales": el próximo viernes (hoy, si es viernes) y el siguiente.
const currentWindowEndKey = (() => {
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7) + 7);
  return toDateKey(d);
})();

// Incluye los radares de la semana pasada que siguen abiertos (hasta el martes).
const currentLists = computed(() =>
  openLists.value.filter(l => listKey(l) <= currentWindowEndKey)
);
const futureLists = computed(() =>
  openLists.value.filter(l => listKey(l) > currentWindowEndKey)
);

function goToListDetail(id: string) {
  router.push(`/discos/radar/${id}`);
}

async function loadCurrentLists() {
  try {
    openLists.value = await getCurrentWeeklyLists();
  } catch {
    openLists.value = [];
  }
}

async function loadPastLists() {
  try {
    pastLists.value = await getPastWeeklyLists(selectedYear.value, selectedMonth.value);
  } catch {
    pastLists.value = [];
  }
}

onMounted(() => {
  loadCurrentLists();
  loadPastLists();
});
</script>
