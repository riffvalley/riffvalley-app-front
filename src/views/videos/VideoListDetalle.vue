<template>
  <div class="p-4 md:p-6 min-h-screen bg-gray-50/50 dark:bg-rv-darkBg">
    <div class="max-w-7xl mx-auto">
      <!-- Header Navegación -->
      <button @click="goBack"
        class="mb-6 px-4 py-2 bg-white dark:bg-rv-darkCard text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-rv-darkSurface border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-2 transition-colors">
        <i class="fa-solid fa-arrow-left"></i>
        Volver al Tablero de Vídeos
      </button>

      <div v-if="loading" class="text-center py-12">
        <i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-500 mb-4"></i>
        <p class="text-gray-500 dark:text-gray-400">Cargando detalles...</p>
      </div>

      <div v-else-if="list" class="space-y-8">
        <!-- Tarjeta Principal -->
        <div class="bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-2xl shadow-lg overflow-hidden relative">
          <div class="absolute top-0 right-0 p-8 opacity-5 transform rotate-12 pointer-events-none">
            <i class="fa-solid fa-video text-8xl text-white"></i>
          </div>

          <div class="px-5 md:px-6 py-5 relative z-10 text-white">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
              <div class="flex-1 space-y-1 min-w-0">
                <input v-model="list.name" @change="updateField('name', list.name)"
                  class="text-2xl md:text-3xl font-black bg-transparent border-none placeholder-indigo-300 focus:ring-0 rounded-lg w-full p-0 leading-tight"
                  placeholder="Nombre de la lista" />
              </div>

              <div class="flex flex-wrap items-center gap-2 md:gap-3">
                <!-- Status Badge -->
                <div
                  class="bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/5 flex items-center gap-2">
                  <select v-model="list.status" @change="updateField('status', list.status)"
                    class="bg-transparent font-bold text-xs uppercase tracking-wide border-none focus:ring-0 p-0 cursor-pointer [&>option]:text-gray-900"
                    :class="getStatusColorForHeader(list.status)">
                    <option value="new">Nueva</option>
                    <option value="assigned">Asignada</option>
                    <option value="published">Publicada</option>
                  </select>
                </div>

                <!-- Fecha -->
                <div
                  class="flex items-center bg-black/20 backdrop-blur-sm rounded-lg border border-white/5 overflow-hidden">
                  <div class="px-3 py-1.5 border-r border-white/5 bg-white/5">
                    <i class="fa-regular fa-calendar text-indigo-300"></i>
                  </div>
                  <input type="date" :value="formatDateForInput(list.listDate)"
                    @change="(e) => updateField('listDate', (e.target as HTMLInputElement).value)"
                    class="bg-transparent text-white border-none focus:ring-0 px-3 py-1.5 h-full w-auto [color-scheme:dark] text-sm font-bold cursor-pointer hover:bg-white/5 transition-colors" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- BEST: Discos asignados + Selección de discos (como MejoresDetalle) -->
        <template v-if="videoType === 'best'">
          <!-- Discos Asignados -->
          <div>
            <div class="flex items-center gap-3 mb-4">
              <div class="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <i class="fa-solid fa-users-viewfinder text-lg"></i>
              </div>
              <div class="flex items-center gap-3">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">Discos Asignados</h2>
                <span class="px-3 py-1 rounded-lg font-bold text-sm transition-colors shadow-sm"
                  :class="asignationStore.asignations.length >= 10
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/30'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30'">
                  {{ asignationStore.asignations.length }}
                </span>
              </div>
            </div>

            <MejoresAsignationList />
          </div>

          <!-- Selección de Discos -->
          <div>
            <div class="flex items-center gap-3 mb-4">
              <div class="p-1.5 bg-pink-100 dark:bg-pink-900/30 rounded-lg text-pink-600 dark:text-pink-400">
                <i class="fa-solid fa-compact-disc text-lg"></i>
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">Selección de Discos</h2>
                <p class="text-gray-500 dark:text-gray-400 text-xs">Discos lanzados en este periodo</p>
              </div>
            </div>

            <div class="bg-white dark:bg-rv-darkCard p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10">
              <DiscsByDate v-if="list.listDate" :date="list.listDate" type="video" :list-id="list.id" />
            </div>
          </div>
        </template>

        <!-- CUSTOM: Checklist de asignaciones (SpecialAsignationList) -->
        <template v-else>
          <div>
            <div class="flex items-center gap-3 mb-4">
              <div class="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <i class="fa-solid fa-list-check text-lg"></i>
              </div>
              <div class="flex items-center gap-3">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">Asignaciones</h2>
                <span
                  class="px-3 py-1 rounded-lg font-bold text-sm transition-colors shadow-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30">
                  {{ asignationStore.asignations.length }}
                </span>
              </div>
            </div>

            <SpecialAsignationList :list-id="(id as string)" :asignations="asignationStore.asignations" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getListDetails, updateList } from '@services/list/list';
import SwalService from '@services/swal/SwalService';
import { useAsignationStore } from '@stores/asignation/asignation';
import { useUserStore } from '@stores/user/users';
import SpecialAsignationList from '../list/components/SpecialAsignationList.vue';
import MejoresAsignationList from '../list/components/MejoresAsignationList.vue';
import DiscsByDate from '../list/components/DiscByDate.vue';

const props = defineProps<{ id: string }>();

const route = useRoute();
const router = useRouter();
const asignationStore = useAsignationStore();
const userStore = useUserStore();

const list = ref<any>(null);
const loading = ref(true);
const videoType = ref<string>((route.query.videoType as string) || 'custom');

function formatDateForInput(dateString: string) {
  if (!dateString) return '';
  return new Date(dateString).toISOString().split('T')[0];
}

function getStatusColorForHeader(status: string) {
  const colors: Record<string, string> = {
    'new': 'text-blue-400',
    'assigned': 'text-green-400',
    'published': 'text-purple-400',
  };
  return colors[status] || 'text-gray-400';
}

function goBack() {
  router.push('/videos');
}

async function loadData() {
  loading.value = true;
  try {
    const [data] = await Promise.all([
      getListDetails(props.id),
      asignationStore.loadAsignations(props.id),
      userStore.loadRvUsers()
    ]);
    list.value = data;
  } catch (error) {
    console.error('Error loading list details:', error);
    SwalService.error('No se pudieron cargar los detalles de la lista');
  } finally {
    loading.value = false;
  }
}

async function updateField(field: string, value: any) {
  try {
    const payload = { [field]: value };
    await updateList(list.value.id, payload);
  } catch (error) {
    console.error(`Error updating ${field}:`, error);
    SwalService.error('No se pudo guardar el cambio');
  }
}

onMounted(() => {
  loadData();
});
</script>
