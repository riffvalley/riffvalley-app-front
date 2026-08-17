<template>
  <div class="p-4 md:p-6 min-h-screen bg-gray-50/50 dark:bg-rv-darkBg">
    <div class="max-w-7xl mx-auto">
      <!-- Header Navegación -->
      <button @click="goBack"
        class="mb-6 px-4 py-2 bg-white dark:bg-rv-darkCard text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-rv-darkSurface border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-2 transition-colors">
        <i class="fa-solid fa-arrow-left"></i>
        Volver a Mejores del Mes
      </button>

      <div v-if="loading" class="text-center py-12">
        <i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-500 mb-4"></i>
        <p class="text-gray-500 dark:text-gray-400">Cargando detalles...</p>
      </div>

      <div v-else-if="list" class="space-y-8">
        <!-- Tarjeta Principal -->
        <div class="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900 dark:to-indigo-700 rounded-2xl shadow-lg overflow-hidden relative border border-indigo-100 dark:border-transparent">
          <!-- Icono decorativo sólo en oscuro -->
          <div class="absolute top-0 right-0 p-8 opacity-5 transform rotate-12 pointer-events-none hidden dark:block">
            <i class="fa-solid fa-compact-disc text-8xl text-white"></i>
          </div>

          <div class="px-5 md:px-6 py-5 relative z-10">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">

              <div class="flex-1 space-y-1 min-w-0">
                <input v-model="list.name" @change="updateField('name', list.name)"
                  class="text-2xl md:text-3xl font-black text-gray-900 dark:text-white bg-transparent border-none placeholder-gray-400 dark:placeholder-indigo-300 focus:ring-0 rounded-lg w-full p-0 leading-tight"
                  placeholder="Nombre de la lista" />
              </div>

              <!-- Meta Info Row -->
              <div class="flex flex-wrap items-center gap-2 md:gap-3">

                <!-- WordPress -->
                <button @click="publishToWordPress" :disabled="publishingWp"
                  class="flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
                  title="El post se crea/actualiza siempre como borrador en WordPress, nunca se publica solo">
                  <i class="fab fa-wordpress"></i>
                  <span class="hidden sm:inline">
                    {{ publishingWp ? 'Publicando...' : (list.wpPostId ? 'Añadir discos nuevos al post' : 'Crear post en WordPress') }}
                  </span>
                  <span class="sm:hidden">{{ publishingWp ? '...' : 'WP' }}</span>
                </button>

                <!-- Ver borrador en WP -->
                <a v-if="list.wpPostUrl" :href="list.wpPostUrl" target="_blank" rel="noopener noreferrer"
                  class="flex items-center gap-1.5 px-3 py-2 bg-white/70 dark:bg-black/20 backdrop-blur-sm border border-indigo-200 dark:border-white/5 text-indigo-600 dark:text-indigo-300 text-sm font-semibold rounded-xl hover:bg-white dark:hover:bg-black/30 transition-colors">
                  <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                  <span class="hidden sm:inline">Ver borrador en WP</span>
                </a>

                <!-- Status Badge -->
                <div class="bg-white/70 dark:bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-indigo-200 dark:border-white/5 flex items-center gap-2">
                  <select v-model="list.status" @change="updateField('status', list.status)"
                    class="bg-transparent font-bold text-xs uppercase tracking-wide border-none focus:ring-0 p-0 cursor-pointer [&>option]:text-gray-900"
                    :class="getStatusColorForHeader(list.status)">
                    <option value="new">Nueva</option>
                    <option value="assigned">Asignada</option>
                    <option value="published">Publicada</option>
                  </select>
                </div>

                <!-- Fecha Publicación -->
                <div class="flex items-center bg-white/70 dark:bg-black/20 backdrop-blur-sm rounded-lg border border-indigo-200 dark:border-white/5 overflow-hidden">
                  <div class="px-3 py-1.5 border-r border-indigo-100 dark:border-white/5 bg-indigo-50 dark:bg-white/5">
                    <i class="fa-regular fa-calendar text-indigo-400 dark:text-indigo-300"></i>
                  </div>
                  <input type="date" :value="formatDateForInput(list.listDate)"
                    @change="(e) => updateField('listDate', (e.target as HTMLInputElement).value)"
                    class="bg-transparent text-gray-700 dark:text-white border-none focus:ring-0 px-3 py-1.5 h-full w-auto text-sm font-bold cursor-pointer hover:bg-indigo-50 dark:hover:bg-white/5 transition-colors" />
                </div>

              </div>
            </div>
          </div>
        </div>

        <!-- Componentes de Gestión -->
        <div class="space-y-8">

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
              <DiscsByDate v-if="list.listDate" :date="list.listDate" :type="list.type" :list-id="list.id" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getListDetails, updateList, generateBestDiscsWpPost } from '@services/list/list';
import SwalService from '@services/swal/SwalService';
import Swal from 'sweetalert2';
import { useAsignationStore } from '@stores/asignation/asignation';
import { useUserStore } from '@stores/user/users';
import DiscsByDate from '../list/components/DiscByDate.vue';
import MejoresAsignationList from '../list/components/MejoresAsignationList.vue';

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

function getStatusColorForHeader(status: string) {
  const colors: Record<string, string> = {
    'new':       'text-blue-600 dark:text-blue-400',
    'assigned':  'text-green-600 dark:text-green-400',
    'published': 'text-purple-600 dark:text-purple-400',
  };
  return colors[status] || 'text-gray-600 dark:text-gray-400';
}

function goBack() {
  router.push('/discos/mejores');
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
  } catch (error) {
    SwalService.error('No se pudieron cargar los detalles de la lista');
  } finally {
    loading.value = false;
  }
}

async function updateField(field: string, value: any) {
  try {
    await updateList(list.value.id, { [field]: value });
  } catch (error) {
    SwalService.error('No se pudo guardar el cambio');
  }
}

async function publishToWordPress() {
  if (!list.value) return;
  publishingWp.value = true;
  try {
    const result = await generateBestDiscsWpPost(list.value.id);
    list.value.wpPostId = result.wpPostId;
    list.value.wpPostUrl = result.link;

    const linkHtml = `<a href="${result.link}" target="_blank" class="text-blue-600 underline">${result.title}</a>`;
    const removedText = result.removed ? ` (se han eliminado ${result.removed})` : '';

    if (result.skipped) {
      Swal.fire({
        icon: 'info',
        title: 'Ya existía un borrador en WordPress',
        html: `Se ha enlazado la lista al post ya existente: ${linkHtml}`,
      });
    } else if (result.warning) {
      // Algo no ha ido del todo bien al actualizar el post (p.ej. discos que
      // no se pudieron localizar en el contenido existente) — se avisa con
      // icono de aviso en vez de éxito, aunque el post se haya actualizado.
      const changes: string[] = [];
      if (result.added) changes.push(`${result.added} añadido${result.added === 1 ? '' : 's'}`);
      if (result.removed) changes.push(`${result.removed} eliminado${result.removed === 1 ? '' : 's'}`);
      Swal.fire({
        icon: 'warning',
        title: changes.length ? `Post actualizado (${changes.join(', ')})` : 'Aviso al actualizar el post',
        html: `${result.warning}<br><br>${linkHtml}`,
      });
    } else if (result.added !== undefined && result.added > 0) {
      Swal.fire({
        icon: 'success',
        title: `Se han añadido ${result.added} discos nuevos al borrador${removedText}`,
        html: linkHtml,
      });
    } else if (result.added === 0) {
      Swal.fire({
        icon: 'info',
        title: `No hay discos nuevos que añadir${removedText}`,
        html: result.removed ? linkHtml : undefined,
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Borrador creado',
        html: linkHtml,
      });
    }
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
