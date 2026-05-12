<template>
  <div class="p-4 min-h-screen bg-gray-50/50 dark:bg-rv-darkBg">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-2xl md:text-3xl font-bold mb-4 text-gray-800 dark:text-white"><i class="fa-solid fa-compact-disc mr-2"></i>Radares</h1>

      <!-- Listas Actuales -->
      <section class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <div class="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <i class="fa-solid fa-sparkles text-indigo-600 dark:text-indigo-400 text-lg"></i>
          </div>
          <h2 class="text-xl font-bold text-gray-800 dark:text-white">Actuales</h2>
        </div>

        <div v-if="currentLists.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div v-for="list in currentLists" :key="list.id"
            class="group bg-white dark:bg-rv-darkCard rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-white/10 overflow-hidden cursor-pointer flex flex-col h-full"
            @click="goToListDetail(list.id)">

            <div class="p-3 flex-1 flex flex-col">
              <!-- Header con Status -->
              <div class="flex justify-between items-start mb-2">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                  :class="getStatusClass(list.status)">
                  {{ getStatusLabel(list.status) }}
                </span>
                <i class="fa-solid fa-chevron-right text-gray-300 group-hover:text-indigo-500 transition-colors text-xs"></i>
              </div>

              <!-- Título -->
              <h3
                class="font-bold text-base text-gray-900 dark:text-white mb-2 line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {{ list.name }}
              </h3>

              <div class="mt-auto space-y-2">
                <!-- Fechas -->
                <div class="space-y-1 py-2 border-t border-gray-100 dark:border-white/10">
                  <div class="flex items-center text-xs text-gray-600 dark:text-gray-400">
                    <i class="fa-regular fa-calendar w-4 text-gray-400 dark:text-gray-500"></i>
                    <span>{{ formatDate(list.releaseDate || list.listDate) }}</span>
                  </div>
                  <div v-if="list.closeDate" class="flex items-center text-xs text-red-600 dark:text-red-400 font-medium">
                    <i class="fa-regular fa-clock w-4 text-red-400 dark:text-red-500"></i>
                    <span>Cierre: {{ formatDate(list.closeDate) }}</span>
                  </div>
                </div>

                <!-- Avatares de asignaciones -->
                <div v-if="list.asignations && list.asignations.length > 0"
                  class="pt-1 flex items-center justify-between">
                  <div class="flex items-center">
                    <div class="flex -space-x-2">
                      <img v-for="(user, index) in getUniqueAssignees(list.asignations).slice(0, 5)" :key="user.id"
                        :src="user.image || '/avatar/avatar37.png'" :alt="user.username" :title="user.username"
                        class="w-6 h-6 rounded-full border-2 border-white dark:border-rv-darkCard ring-1 ring-gray-100 dark:ring-white/10 object-cover bg-gray-50 dark:bg-rv-darkSurface"
                        :style="{ zIndex: 5 - index }" />
                    </div>
                    <span v-if="getUniqueAssignees(list.asignations).length > 5"
                      class="ml-2 text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-rv-darkSurface px-1.5 py-0.5 rounded-full">
                      +{{ getUniqueAssignees(list.asignations).length - 5 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Barra decorativa inferior -->
            <div class="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"></div>
          </div>
        </div>

        <div v-else class="bg-white dark:bg-rv-darkCard rounded-xl p-6 text-center border-2 border-dashed border-gray-200 dark:border-white/10">
          <div class="w-10 h-10 bg-gray-50 dark:bg-rv-darkSurface rounded-full flex items-center justify-center mx-auto mb-2">
            <i class="fa-solid fa-list text-gray-400 text-lg"></i>
          </div>
          <h3 class="text-base font-medium text-gray-900 dark:text-white">No hay listas actuales</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Las nuevas listas de radar aparecerán aquí.</p>
        </div>
      </section>

      <!-- Listas Anteriores -->
      <section>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-2">
            <div class="p-1.5 bg-gray-100 dark:bg-rv-darkSurface rounded-lg">
              <i class="fa-solid fa-history text-gray-600 dark:text-gray-300 text-lg"></i>
            </div>
            <h2 class="text-xl font-bold text-gray-800 dark:text-white">Anteriores</h2>
          </div>

          <div class="flex gap-1 p-1 bg-white dark:bg-rv-darkCard rounded-lg border border-gray-200 dark:border-white/10 shadow-sm text-sm">
            <select v-model="selectedYear" @change="loadPastLists"
              class="border-none bg-transparent py-1 pl-2 pr-6 text-gray-700 dark:text-gray-200 font-medium focus:ring-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-rv-darkSurface rounded text-xs">
              <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
            </select>
            <div class="w-px bg-gray-200 dark:bg-white/10 my-1"></div>
            <select v-model="selectedMonth" @change="loadPastLists"
              class="border-none bg-transparent py-1 pl-2 pr-6 text-gray-700 dark:text-gray-200 font-medium focus:ring-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-rv-darkSurface rounded text-xs min-w-[100px]">
              <option v-for="(monthName, index) in monthNames" :key="index" :value="index + 1">{{ monthName }}</option>
            </select>
          </div>
        </div>

        <div v-if="pastLists.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div v-for="list in pastLists" :key="list.id"
            class="group bg-white dark:bg-rv-darkCard rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-white/10 overflow-hidden cursor-pointer flex flex-col h-full opacity-90 hover:opacity-100"
            @click="goToListDetail(list.id)">

            <div class="p-3 flex-1 flex flex-col">
              <!-- Header con Status -->
              <div class="flex justify-between items-start mb-2">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                  :class="getStatusClass(list.status)">
                  {{ getStatusLabel(list.status) }}
                </span>
                <i class="fa-solid fa-chevron-right text-gray-300 group-hover:text-indigo-500 transition-colors text-xs"></i>
              </div>

              <!-- Título -->
              <h3
                class="font-bold text-base text-gray-900 dark:text-white mb-2 line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {{ list.name }}
              </h3>

              <div class="mt-auto space-y-2">
                <!-- Fechas -->
                <div class="space-y-1 py-3 border-t border-gray-100 dark:border-white/10">
                  <div class="flex items-center text-xs text-gray-600 dark:text-gray-400">
                    <i class="fa-regular fa-calendar w-4 text-gray-400 dark:text-gray-500"></i>
                    <span>{{ formatDate(list.releaseDate || list.listDate) }}</span>
                  </div>
                  <div v-if="list.closeDate" class="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <i class="fa-regular fa-clock w-4 text-gray-400 dark:text-gray-500"></i>
                    <span>Cerrada: {{ formatDate(list.closeDate) }}</span>
                  </div>
                </div>

                <!-- Avatares de asignaciones -->
                <div v-if="list.asignations && list.asignations.length > 0"
                  class="pt-1 flex items-center justify-between">
                  <div class="flex items-center">
                    <div class="flex -space-x-2">
                      <img v-for="(user, index) in getUniqueAssignees(list.asignations).slice(0, 5)" :key="user.id"
                        :src="user.image || '/avatar/avatar37.png'" :alt="user.username" :title="user.username"
                        class="w-6 h-6 rounded-full border-2 border-white dark:border-rv-darkCard ring-1 ring-gray-100 dark:ring-white/10 object-cover bg-gray-50 dark:bg-rv-darkSurface"
                        :style="{ zIndex: 5 - index }" />
                    </div>
                    <span v-if="getUniqueAssignees(list.asignations).length > 5"
                      class="ml-2 text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-rv-darkSurface px-1.5 py-0.5 rounded-full">
                      +{{ getUniqueAssignees(list.asignations).length - 5 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="bg-white dark:bg-rv-darkCard rounded-xl p-6 text-center border-2 border-dashed border-gray-200 dark:border-white/10">
          <div class="w-10 h-10 bg-gray-50 dark:bg-rv-darkSurface rounded-full flex items-center justify-center mx-auto mb-2">
            <i class="fa-regular fa-folder-open text-gray-400 text-lg"></i>
          </div>
          <h3 class="text-base font-medium text-gray-900 dark:text-white">No hay listas anteriores</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">No se encontraron listas para {{ monthNames[selectedMonth - 1] }} del {{ selectedYear }}.</p>
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
    'new': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'assigned': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'published': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };
  return classes[status] || 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    'new': 'Nueva',
    'assigned': 'Asignada',
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
  } catch (error) {
    currentLists.value = [];
  }
}

async function loadPastLists() {
  try {
    pastLists.value = await getPastWeeklyLists(selectedYear.value, selectedMonth.value);
  } catch (error) {
    pastLists.value = [];
  }
}

onMounted(() => {
  loadCurrentLists();
  loadPastLists();
});
</script>
