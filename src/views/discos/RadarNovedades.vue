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

      <!-- Actuales -->
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

        <div v-if="currentLists.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          <div v-for="list in currentLists" :key="list.id"
            class="group bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col overflow-hidden"
            @click="goToListDetail(list.id)">

            <div class="p-4 flex-1 flex flex-col">
              <!-- Status + flecha -->
              <div class="flex items-center justify-between mb-3">
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                  :class="getStatusClass(list.status)">
                  {{ getStatusLabel(list.status) }}
                </span>
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-gray-300 dark:text-gray-600 group-hover:text-rv-purple transition-colors"></i>
              </div>

              <!-- Título -->
              <h3 class="font-bold text-sm leading-snug text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-rv-purple dark:group-hover:text-rv-pink transition-colors">
                {{ list.name }}
              </h3>

              <div class="mt-auto space-y-2">
                <!-- Fechas -->
                <div class="space-y-1 pt-2 border-t border-gray-100 dark:border-white/5">
                  <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <i class="fa-regular fa-calendar text-[10px] text-gray-400"></i>
                    <span>{{ formatDate(list.releaseDate || list.listDate) }}</span>
                  </div>
                  <div v-if="list.closeDate" class="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 font-medium">
                    <i class="fa-regular fa-clock text-[10px]"></i>
                    <span>Cierre: {{ formatDate(list.closeDate) }}</span>
                  </div>
                </div>

                <!-- Avatares -->
                <div v-if="list.asignations && list.asignations.length > 0" class="flex items-center gap-1.5 pt-1">
                  <div class="flex -space-x-1.5">
                    <img v-for="(user, index) in getUniqueAssignees(list.asignations).slice(0, 5)"
                      :key="user.id" :src="user.image || '/avatar/avatar37.png'"
                      :alt="user.username" :title="user.username"
                      class="w-5 h-5 rounded-full border-2 border-white dark:border-rv-darkCard object-cover"
                      :style="{ zIndex: 5 - index }" />
                  </div>
                  <span v-if="getUniqueAssignees(list.asignations).length > 5"
                    class="text-[10px] text-gray-400 font-medium">
                    +{{ getUniqueAssignees(list.asignations).length - 5 }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Barra inferior animada -->
            <div class="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-rv-purple to-rv-pink transition-all duration-500"></div>
          </div>
        </div>

        <div v-else class="bg-white dark:bg-rv-darkCard rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-10 text-center">
          <div class="w-12 h-12 bg-gray-50 dark:bg-rv-darkSurface rounded-2xl flex items-center justify-center mx-auto mb-3">
            <i class="fa-solid fa-compact-disc text-gray-300 dark:text-gray-600 text-xl"></i>
          </div>
          <p class="font-semibold text-gray-900 dark:text-white mb-1">No hay radares activos</p>
          <p class="text-sm text-gray-400 dark:text-gray-500">Las nuevas listas de radar aparecerán aquí.</p>
        </div>
      </section>

      <!-- Anteriores -->
      <section>
        <!-- Header con filtros -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-gray-100 dark:bg-rv-darkSurface flex items-center justify-center shrink-0">
              <i class="fa-solid fa-clock-rotate-left text-gray-500 dark:text-gray-400 text-sm"></i>
            </div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">Anteriores</h2>
          </div>

          <div class="flex gap-2">
            <select v-model="selectedYear" @change="loadPastLists"
              class="bg-white dark:bg-rv-darkCard border-0 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 font-medium shadow-sm focus:ring-2 focus:ring-rv-purple/30 cursor-pointer">
              <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
            </select>
            <select v-model="selectedMonth" @change="loadPastLists"
              class="bg-white dark:bg-rv-darkCard border-0 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 font-medium shadow-sm focus:ring-2 focus:ring-rv-purple/30 cursor-pointer min-w-[120px]">
              <option v-for="(monthName, index) in monthNames" :key="index" :value="index + 1">{{ monthName }}</option>
            </select>
          </div>
        </div>

        <div v-if="pastLists.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          <div v-for="list in pastLists" :key="list.id"
            class="group bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col overflow-hidden"
            @click="goToListDetail(list.id)">

            <div class="p-4 flex-1 flex flex-col">
              <!-- Status + flecha -->
              <div class="flex items-center justify-between mb-3">
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                  :class="getStatusClass(list.status)">
                  {{ getStatusLabel(list.status) }}
                </span>
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-gray-300 dark:text-gray-600 group-hover:text-rv-purple transition-colors"></i>
              </div>

              <!-- Título -->
              <h3 class="font-bold text-sm leading-snug text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-rv-purple dark:group-hover:text-rv-pink transition-colors">
                {{ list.name }}
              </h3>

              <div class="mt-auto space-y-2">
                <!-- Fechas -->
                <div class="space-y-1 pt-2 border-t border-gray-100 dark:border-white/5">
                  <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <i class="fa-regular fa-calendar text-[10px] text-gray-400"></i>
                    <span>{{ formatDate(list.releaseDate || list.listDate) }}</span>
                  </div>
                  <div v-if="list.closeDate" class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <i class="fa-regular fa-clock text-[10px]"></i>
                    <span>Cerrada: {{ formatDate(list.closeDate) }}</span>
                  </div>
                </div>

                <!-- Avatares -->
                <div v-if="list.asignations && list.asignations.length > 0" class="flex items-center gap-1.5 pt-1">
                  <div class="flex -space-x-1.5">
                    <img v-for="(user, index) in getUniqueAssignees(list.asignations).slice(0, 5)"
                      :key="user.id" :src="user.image || '/avatar/avatar37.png'"
                      :alt="user.username" :title="user.username"
                      class="w-5 h-5 rounded-full border-2 border-white dark:border-rv-darkCard object-cover"
                      :style="{ zIndex: 5 - index }" />
                  </div>
                  <span v-if="getUniqueAssignees(list.asignations).length > 5"
                    class="text-[10px] text-gray-400 font-medium">
                    +{{ getUniqueAssignees(list.asignations).length - 5 }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Barra inferior animada -->
            <div class="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-rv-purple to-rv-pink transition-all duration-500"></div>
          </div>
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
      </section>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getCurrentWeeklyLists, getPastWeeklyLists } from '@services/list/list';
import { MONTHS } from '@helpers/dateConstants';

const router = useRouter();
const currentLists = ref<any[]>([]);
const pastLists = ref<any[]>([]);

const currentDate = new Date();
const selectedYear = ref(currentDate.getFullYear());
const selectedMonth = ref(currentDate.getMonth() + 1);

const monthNames = MONTHS;

const availableYears = ref<number[]>([]);
for (let i = 0; i < 5; i++) {
  availableYears.value.push(currentDate.getFullYear() - i);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function getStatusClass(status: string) {
  const classes: Record<string, string> = {
    'new':       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'assigned':  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'published': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };
  return classes[status] || 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    'new':       'Nueva',
    'assigned':  'Asignada',
    'published': 'Publicada',
  };
  return labels[status] || status;
}

function getUniqueAssignees(asignations: any[]) {
  if (!asignations) return [];
  const uniqueUsers = new Map();
  asignations.forEach(a => {
    if (a.user && !uniqueUsers.has(a.user.id)) uniqueUsers.set(a.user.id, a.user);
  });
  return Array.from(uniqueUsers.values());
}

function goToListDetail(id: string) {
  router.push(`/discos/radar/${id}`);
}

async function loadCurrentLists() {
  try {
    currentLists.value = await getCurrentWeeklyLists();
  } catch {
    currentLists.value = [];
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
