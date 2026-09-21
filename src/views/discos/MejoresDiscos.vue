<template>
  <div class="p-4 min-h-screen bg-gray-50/50 dark:bg-rv-darkBg">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-2xl md:text-3xl font-bold mb-4 text-gray-800 dark:text-white"><i class="fa-solid fa-star mr-2"></i>Mejores del Mes</h1>

      <!-- Listas Anteriores (colapsadas por defecto) -->
      <CollapsibleSection v-model:open="showPast" class="mb-6" title="Anteriores" icon="fa-solid fa-history">
        <div class="flex gap-1 p-1 mb-4 w-fit bg-white dark:bg-rv-darkCard rounded-lg border border-gray-200 dark:border-white/10 shadow-sm text-sm">
          <select v-model="selectedYear" @change="loadPastLists"
            class="border-none bg-transparent py-1 pl-2 pr-6 text-gray-700 dark:text-gray-200 font-medium focus:ring-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-rv-darkSurface rounded text-xs">
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>

        <div v-if="pastLists.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div v-for="list in pastLists" :key="list.id"
            class="group bg-white dark:bg-rv-darkCard rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-white/10 overflow-hidden cursor-pointer flex flex-col h-full opacity-90 hover:opacity-100"
            @click="goToListDetail(list.id)">

            <div class="p-3 flex-1 flex flex-col">
              <div class="flex justify-between items-start mb-2">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                  :class="getStatusClass(list.status)">
                  {{ getStatusLabel(list.status) }}
                </span>
                <i class="fa-solid fa-chevron-right text-gray-300 group-hover:text-indigo-500 transition-colors text-xs"></i>
              </div>

              <h3 class="font-bold text-base text-gray-900 dark:text-white mb-2 line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {{ list.name }}
              </h3>

              <div class="mt-auto space-y-2">
                <div class="space-y-1 py-3 border-t border-gray-100 dark:border-white/10">
                  <div class="flex items-center text-xs text-gray-600 dark:text-gray-400">
                    <i class="fa-regular fa-calendar w-4 text-gray-400 dark:text-gray-500"></i>
                    <span>{{ formatDate(list.listDate) }}</span>
                  </div>
                  <div v-if="list.closeDate" class="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <i class="fa-regular fa-clock w-4 text-gray-400 dark:text-gray-500"></i>
                    <span>Cerrada: {{ formatDate(list.closeDate) }}</span>
                  </div>
                </div>

                <div v-if="list.asignations && list.asignations.length > 0" class="pt-1 flex items-center justify-between">
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

        <div v-else class="bg-white dark:bg-rv-darkCard rounded-lg p-6 text-center border-2 border-dashed border-gray-200 dark:border-white/10">
          <div class="w-10 h-10 bg-gray-50 dark:bg-rv-darkSurface rounded-full flex items-center justify-center mx-auto mb-2">
            <i class="fa-regular fa-folder-open text-gray-400 text-lg"></i>
          </div>
          <h3 class="text-base font-medium text-gray-900 dark:text-white">No hay listas anteriores</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">No se encontraron listas para el año {{ selectedYear }}.</p>
        </div>
      </CollapsibleSection>

      <!-- Listas Actuales (se comprimen al abrir Anteriores y viceversa) -->
      <CollapsibleSection v-model:open="showCurrent" title="Actuales" icon="fa-solid fa-star"
        :count="currentLists.length" icon-wrap-class="bg-indigo-100 dark:bg-indigo-900/30"
        icon-class="text-indigo-600 dark:text-indigo-400">
        <div v-if="currentLists.length > 0" class="flex flex-wrap justify-center gap-6 py-4">
          <div v-for="list in currentLists" :key="list.id"
            class="group w-full sm:w-[26rem] bg-white dark:bg-rv-darkCard rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-white/10 overflow-hidden cursor-pointer flex flex-col"
            @click="goToListDetail(list.id)">

            <div class="p-6 flex-1 flex flex-col">
              <div class="flex justify-between items-start mb-4">
                <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
                  :class="getStatusClass(list.status)">
                  {{ getStatusLabel(list.status) }}
                </span>
                <i class="fa-solid fa-chevron-right text-gray-300 group-hover:text-indigo-500 transition-colors text-sm"></i>
              </div>

              <h3 class="font-bold text-2xl text-gray-900 dark:text-white mb-4 line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {{ list.name }}
              </h3>

              <div class="mt-auto space-y-3">
                <div class="space-y-2 py-3 border-t border-gray-100 dark:border-white/10">
                  <div class="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <i class="fa-regular fa-calendar w-5 text-gray-400 dark:text-gray-500"></i>
                    <span>{{ formatDate(list.listDate) }}</span>
                  </div>
                  <div v-if="list.closeDate" class="flex items-center text-sm text-red-600 dark:text-red-400 font-medium">
                    <i class="fa-regular fa-clock w-5 text-red-400 dark:text-red-500"></i>
                    <span>Cierre: {{ formatDate(list.closeDate) }}</span>
                  </div>
                </div>

                <div v-if="list.asignations && list.asignations.length > 0" class="flex items-center">
                  <div class="flex -space-x-2">
                    <img v-for="(user, index) in getUniqueAssignees(list.asignations).slice(0, 5)" :key="user.id"
                      :src="user.image || '/avatar/avatar37.png'" :alt="user.username" :title="user.username"
                      class="w-9 h-9 rounded-full border-2 border-white dark:border-rv-darkCard ring-1 ring-gray-100 dark:ring-white/10 object-cover bg-gray-50 dark:bg-rv-darkSurface"
                      :style="{ zIndex: 5 - index }" />
                  </div>
                  <span v-if="getUniqueAssignees(list.asignations).length > 5"
                    class="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-rv-darkSurface px-2 py-0.5 rounded-full">
                    +{{ getUniqueAssignees(list.asignations).length - 5 }}
                  </span>
                </div>
              </div>
            </div>

            <div class="h-1 w-0 group-hover:w-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"></div>
          </div>
        </div>

        <div v-else class="bg-white dark:bg-rv-darkCard rounded-lg p-6 text-center border-2 border-dashed border-gray-200 dark:border-white/10">
          <div class="w-10 h-10 bg-gray-50 dark:bg-rv-darkSurface rounded-full flex items-center justify-center mx-auto mb-2">
            <i class="fa-solid fa-list text-gray-400 text-lg"></i>
          </div>
          <h3 class="text-base font-medium text-gray-900 dark:text-white">No hay listas actuales</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Las nuevas listas de mejores discos aparecerán aquí.</p>
        </div>
      </CollapsibleSection>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getCurrentMonthlyLists, getPastMonthlyLists } from '@services/list/list';
import CollapsibleSection from './components/CollapsibleSection.vue';

const router = useRouter();
const currentLists = ref<any[]>([]);
const pastLists = ref<any[]>([]);
const showCurrent = ref(true);
const showPast = ref(false);

// Acordeón: al desplegar una sección, la otra se comprime.
watch(showPast, open => { if (open) showCurrent.value = false; });
watch(showCurrent, open => { if (open) showPast.value = false; });

const currentDate = new Date();
const selectedYear = ref(currentDate.getFullYear());

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
    'new': 'Nueva', 'assigned': 'Asignada', 'published': 'Publicada',
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
  router.push(`/discos/mejores/${id}`);
}

async function loadCurrentLists() {
  try {
    currentLists.value = await getCurrentMonthlyLists();
  } catch (error) {
    currentLists.value = [];
  }
}

async function loadPastLists() {
  try {
    pastLists.value = await getPastMonthlyLists(selectedYear.value);
  } catch (error) {
    pastLists.value = [];
  }
}

onMounted(() => {
  loadCurrentLists();
  loadPastLists();
});
</script>
