<template>
  <div class="p-4 md:p-6 min-h-screen bg-gray-50 dark:bg-rv-darkBg">
    <div class="max-w-7xl mx-auto">

      <!-- Volver -->
      <button @click="goBack"
        class="mb-5 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg bg-white dark:bg-rv-darkCard border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:text-rv-purple dark:hover:text-rv-pink hover:border-rv-purple/30 dark:hover:border-rv-pink/30 shadow-sm transition-all">
        <i class="fa-solid fa-arrow-left text-xs"></i>
        Volver a Radares
      </button>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-24 gap-3">
        <i class="fa-solid fa-spinner fa-spin text-3xl text-rv-purple"></i>
        <p class="text-sm text-gray-400 dark:text-gray-500">Cargando radar...</p>
      </div>

      <div v-else-if="list" class="space-y-6">

        <!-- ─── Header ─── -->
        <div class="relative bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-indigo-900 dark:to-indigo-700 rounded-2xl shadow-lg overflow-hidden border border-purple-100 dark:border-transparent">
          <!-- Icono decorativo (modo oscuro) -->
          <div class="absolute top-0 right-0 p-8 opacity-5 transform rotate-12 pointer-events-none hidden dark:block">
            <i class="fa-solid fa-compact-disc text-8xl text-white"></i>
          </div>
          <!-- Decoración claro -->
          <div class="absolute top-0 right-0 w-72 h-72 bg-rv-purple/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none dark:hidden"></div>
          <div class="absolute bottom-0 left-0 w-48 h-48 bg-rv-pink/5 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none dark:hidden"></div>

          <div class="relative z-10 p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <!-- Título + descripción -->
            <div class="flex-1 min-w-0">
              <input
                v-model="list.name"
                @change="updateField('name', list.name)"
                class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white bg-transparent border-none placeholder-gray-400 dark:placeholder-white/40 focus:ring-0 w-full p-0 leading-tight mb-1"
                placeholder="Nombre de la lista"
              />
              <input
                v-model="list.description"
                @change="updateField('description', list.description)"
                class="text-gray-500 dark:text-white/60 text-sm bg-transparent border-none placeholder-gray-400 dark:placeholder-white/30 focus:ring-0 w-full p-0"
                placeholder="Añade una descripción..."
              />
            </div>

            <!-- Controles -->
            <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <!-- WordPress -->
              <button @click="publishToWordPress" :disabled="publishingWp"
                class="flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
                <i class="fab fa-wordpress"></i>
                <span class="hidden sm:inline">{{ publishingWp ? 'Publicando...' : 'Publicar en WP' }}</span>
                <span class="sm:hidden">{{ publishingWp ? '...' : 'WP' }}</span>
              </button>

              <!-- Status -->
              <div class="relative">
                <select
                  v-model="list.status"
                  @change="updateField('status', list.status)"
                  :class="getStatusClass(list.status)"
                  class="appearance-none pl-3 pr-8 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border-0 focus:ring-1 focus:ring-white/20 shadow-sm transition-colors"
                >
                  <option value="new" class="text-gray-900">Nueva</option>
                  <option value="assigned" class="text-gray-900">Asignada</option>
                  <option value="published" class="text-gray-900">Publicada</option>
                </select>
                <i class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-500 dark:text-white/60 pointer-events-none"></i>
              </div>

              <!-- Fechas -->
              <div class="flex items-center gap-1.5 bg-white/70 dark:bg-white/10 backdrop-blur-sm border border-purple-200 dark:border-white/20 rounded-xl px-3 py-2">
                <i class="fa-regular fa-calendar text-gray-400 dark:text-white/50 text-xs"></i>
                <input
                  type="date"
                  :value="formatDateForInput(list.listDate)"
                  :min="minListDate"
                  :max="maxListDate"
                  @change="(e) => updateField('listDate', (e.target as HTMLInputElement).value)"
                  class="bg-transparent border-none p-0 text-gray-700 dark:text-white text-xs font-bold focus:ring-0 cursor-pointer w-[82px]"
                  title="Fecha de lista"
                />
                <span class="text-gray-300 dark:text-white/30 text-xs">→</span>
                <i class="fa-regular fa-clock text-gray-400 dark:text-white/50 text-xs"></i>
                <input
                  type="date"
                  :value="formatDateForInput(list.closeDate)"
                  :min="minCloseDate"
                  :max="maxCloseDate"
                  @change="(e) => updateField('closeDate', (e.target as HTMLInputElement).value)"
                  class="bg-transparent border-none p-0 text-gray-700 dark:text-white text-xs font-bold focus:ring-0 cursor-pointer w-[82px]"
                  title="Fecha de cierre"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- ─── Asignaciones ─── -->
        <div class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-rv-purple/10 dark:bg-rv-purple/20 flex items-center justify-center">
              <i class="fa-solid fa-users-viewfinder text-rv-purple text-xs"></i>
            </div>
            <h2 class="text-base font-bold text-gray-900 dark:text-white">Asignaciones</h2>
          </div>
          <div class="p-4 md:p-5">
            <AsignationList :type="list.type" />
          </div>
        </div>

        <!-- ─── Listado de Discos ─── -->
        <div class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <i class="fa-solid fa-compact-disc text-amber-500 dark:text-amber-400 text-xs"></i>
            </div>
            <h2 class="text-base font-bold text-gray-900 dark:text-white">Listado de Discos por Fecha</h2>
          </div>
          <div class="p-4 md:p-5">
            <DiscsByDate
              v-if="list.listDate"
              :date="list.listDate"
              :type="list.type"
              :list-id="list.id"
            />
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getListDetails, updateList, createWpPosts } from '@services/list/list';
import SwalService from '@services/swal/SwalService';
import Swal from 'sweetalert2';
import { useAsignationStore } from '@stores/asignation/asignation';
import { useUserStore } from '@stores/user/users';
import DiscsByDate from '../list/components/DiscByDate.vue';
import AsignationList from '../list/components/AsignationList.vue';

const route = useRoute();
const router = useRouter();
const asignationStore = useAsignationStore();
const userStore = useUserStore();

const list = ref<any>(null);
const loading = ref(true);
const publishingWp = ref(false);

function formatDateForInput(dateString: string) {
  if (!dateString) return '';
  return new Date(dateString).toISOString().split('T')[0];
}

const maxListDate = computed(() => {
  if (!list.value?.listDate) return undefined;
  const d = new Date(list.value.listDate);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
});

const maxCloseDate = computed(() => {
  if (!list.value?.listDate) return undefined;
  const d = new Date(list.value.listDate);
  const day = d.getDay();
  const diffToSunday = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diffToSunday);
  d.setDate(d.getDate() + 3);
  return d.toISOString().split('T')[0];
});

const minListDate = computed(() => {
  if (!list.value?.listDate) return undefined;
  const d = new Date(list.value.listDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
});

const minCloseDate = computed(() => {
  if (!list.value?.listDate) return undefined;
  const d = new Date(list.value.listDate);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
});

function getStatusClass(status: string) {
  const classes: Record<string, string> = {
    'new':       'bg-blue-500 hover:bg-blue-600 text-white',
    'assigned':  'bg-amber-500 hover:bg-amber-600 text-white',
    'published': 'bg-green-500 hover:bg-green-600 text-white',
  };
  return classes[status] || 'bg-white/20 hover:bg-white/30 text-white';
}

function goBack() {
  router.push('/discos/radar');
}

async function loadData() {
  loading.value = true;
  try {
    const id = route.params.id as string;
    const data = await getListDetails(id);
    list.value = data;
    await Promise.all([
      asignationStore.loadAsignations(id),
      userStore.loadRvUsers()
    ]);
  } catch {
    SwalService.error('No se pudieron cargar los detalles de la lista');
  } finally {
    loading.value = false;
  }
}

async function updateField(field: string, value: any) {
  try {
    await updateList(list.value.id, { [field]: value });
  } catch {
    SwalService.error('No se pudo guardar el cambio');
  }
}

async function publishToWordPress() {
  if (!list.value) return;
  publishingWp.value = true;
  try {
    const result = await createWpPosts(list.value.id);
    const postsHtml = result.posts
      .map(p => `<li class="mb-1">
        ${p.skipped ? '⚠️ Ya existía' : '✅ Creado'} —
        <a href="${p.link}" target="_blank" class="text-blue-600 underline">${p.title}</a>
      </li>`)
      .join('');
    Swal.fire({
      icon: 'success',
      title: `${result.created} post(s) creados en WordPress`,
      html: `<ul class="text-left text-sm mt-2">${postsHtml}</ul>`,
    });
  } catch (error: any) {
    SwalService.error(error.response?.data?.message || 'Error al publicar en WordPress');
  } finally {
    publishingWp.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>
