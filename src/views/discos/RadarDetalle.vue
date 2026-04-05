<template>
  <div class="p-6 min-h-screen bg-gray-50/50">
    <div class="max-w-7xl mx-auto">
      <!-- Header Navegación -->
      <button @click="goBack"
        class="mb-6 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 border border-gray-200 shadow-sm flex items-center gap-2 transition-colors">
        <i class="fa-solid fa-arrow-left"></i>
        Volver a Nuevos Discos
      </button>

      <div v-if="loading" class="text-center py-12">
        <i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-500 mb-4"></i>
        <p class="text-gray-500">Cargando detalles de la semana...</p>
      </div>

      <div v-else-if="list" class="space-y-8">
        <!-- Header Estilo "Blue Bar" -->
        <div class="bg-indigo-800 rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <!-- Background Decoration -->
          <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

          <!-- Left: Title & Description -->
          <div class="flex-1 w-full z-10">
            <input 
              v-model="list.name" 
              @change="updateField('name', list.name)"
              class="text-3xl font-bold text-white bg-transparent border-none placeholder-indigo-300 focus:ring-0 w-full p-0 leading-tight mb-1"
              placeholder="Nombre de la lista"
            />
            <input 
              v-model="list.description" 
              @change="updateField('description', list.description)"
              class="text-indigo-200 text-sm font-medium bg-transparent border-none placeholder-indigo-400 focus:ring-0 w-full p-0"
              placeholder="Añade una descripción..."
            />
          </div>

          <!-- Right: Controls Compact Group -->
          <div class="flex flex-wrap items-center gap-3 z-10 w-full md:w-auto justify-end">
             <!-- WordPress Button -->
             <button @click="publishToWordPress" :disabled="publishingWp"
               class="bg-orange-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 focus:ring-2 focus:ring-orange-400 flex items-center gap-2 shadow-sm">
               <i class="fab fa-wordpress"></i>
               {{ publishingWp ? 'Publicando...' : 'Publicar en WordPress' }}
             </button>

             <!-- Status Badge -->
             <div class="relative">
                <select 
                  v-model="list.status" 
                  @change="updateField('status', list.status)"
                  :class="getStatusClass(list.status)"
                  class="appearance-none pl-4 pr-8 py-2 border rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors focus:ring-1 focus:ring-white/20 shadow-sm"
                >
                    <option value="new" class="text-gray-900">Nueva</option>
                    <option value="assigned" class="text-gray-900">Asignada</option>
                    <option value="published" class="text-gray-900">Publicada</option>
                </select>
                <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-indigo-300 pointer-events-none"></i>
             </div>

             <!-- Date Badges Group -->
             <div class="flex items-center gap-2 bg-indigo-900/30 p-1 rounded-lg border border-indigo-500/20">
                <!-- List Date -->
                <div class="flex items-center gap-2 px-3 py-1.5 bg-indigo-900/80 rounded-md text-white border border-indigo-500/30 shadow-sm" title="Fecha Lista">
                  <i class="fa-regular fa-calendar text-indigo-300 text-xs"></i>
                  <input 
                    type="date" 
                    :value="formatDateForInput(list.listDate)"
                    :min="minListDate"
                    :max="maxListDate"
                    @change="(e) => updateField('listDate', (e.target as HTMLInputElement).value)"
                    class="bg-transparent border-none p-0 text-white text-xs font-bold focus:ring-0 cursor-pointer w-[80px]"
                  />
                </div>
                <!-- Close Date -->
                <div class="flex items-center gap-2 px-3 py-1.5 bg-indigo-900/80 rounded-md text-white border border-indigo-500/30 shadow-sm" title="Fecha Cierre">
                   <i class="fa-regular fa-clock text-indigo-300 text-xs"></i>
                   <input 
                    type="date" 
                    :value="formatDateForInput(list.closeDate)"
                     :min="minCloseDate"
                    :max="maxCloseDate"
                     @change="(e) => updateField('closeDate', (e.target as HTMLInputElement).value)"
                    class="bg-transparent border-none p-0 text-white text-xs font-bold focus:ring-0 cursor-pointer w-[80px]"
                  />
                </div>
             </div>
          </div>
        </div>

        <!-- Componentes de Gestión -->
        <div class="space-y-8">
          <!-- Lista de Asignaciones (Radares) -->
          <div>
            <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fa-solid fa-users-viewfinder text-indigo-500"></i>
              Asignaciones y Radares
            </h2>
            <AsignationList :type="list.type" />
          </div>

          <!-- Buscador de Discos -->
          <div class="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fa-solid fa-compact-disc text-indigo-500"></i>
              Listado de Discos por Fecha
            </h2>
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
  // Próximo domingo desde la fecha actual de la lista
  const d = new Date(list.value.listDate);
  const day = d.getDay();
  // day: 0 (Sun) to 6 (Sat)
  // Distance to next Sunday (which is day 0, represented as 7 for logic)
  // Actually usually weeks start Monday (1) and end Sunday (7 aka 0)
  // If we want "Sunday of that week"
  const diff = day === 0 ? 0 : 7 - day; 
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
});

const maxCloseDate = computed(() => {
   if (!list.value?.listDate) return undefined;
   // Miércoles siguiente a la fecha de la lista
   const d = new Date(list.value.listDate);
   // Primero vamos al domingo de esa semana
   const day = d.getDay();
   const diffToSunday = day === 0 ? 0 : 7 - day;
   d.setDate(d.getDate() + diffToSunday);
   
   // Ahora sumamos 3 días para llegar al miércoles
   d.setDate(d.getDate() + 3);
   return d.toISOString().split('T')[0];
});

const minListDate = computed(() => {
  if (!list.value?.listDate) return undefined;
  // Lunes de la semana actual
  const d = new Date(list.value.listDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); 
  // day: 0 (Sun) to 6 (Sat)
  // Monday is 1
  const diff = day === 0 ? -6 : 1 - day; // If day is 0 (Sun), go back 6 days to Mon. If 1 (Mon), 0 days.
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
});

const minCloseDate = computed(() => {
  if (!list.value?.listDate) return undefined;
  // Close date can be the same as list date
  const d = new Date(list.value.listDate);
  d.setHours(0, 0, 0, 0); // Normalize time to avoid timezone shifts
  return d.toISOString().split('T')[0];
});




function getStatusClass(status: string) {
  const classes = {
    'new': 'bg-red-500 hover:bg-red-600 border-red-400 text-white',
    'assigned': 'bg-orange-500 hover:bg-orange-600 border-orange-400 text-white',
    'published': 'bg-green-500 hover:bg-green-600 border-green-400 text-white'
  };
  return classes[status as keyof typeof classes] || 'bg-indigo-900/50 hover:bg-indigo-900 border-indigo-500/30 text-white';
}

function goBack() {
  router.push('/discos/radar');
}

async function loadData() {
  loading.value = true;
  try {
    const id = route.params.id as string;
    
    // Cargar detalles básicos
    const data = await getListDetails(id);
    list.value = data;
    
    // Cargar stores para componentes
    await Promise.all([
      asignationStore.loadAsignations(id),
      userStore.loadRvUsers()
    ]);
    
  } catch (error) {
    console.error('Error loading list details:', error);
    SwalService.error('No se pudieron cargar los detalles de la lista');
  } finally {
    loading.value = false;
  }
}

async function updateField(field: string, value: any) {
  try {
    // Preparar payload solo con el campo cambiado (o todo el objeto merged, la API suele necesitar parcial o todo)
    // Asumimos que updateList acepta un objeto parcial
    const payload = {
        [field]: value
    };

    // Si es fecha, asegurar que no mandamos null inválido si el input está vacío
    if ((field === 'listDate' || field === 'closeDate') && !value) {
        // Manejo específico si la API rechaza strings vacíos para fechas
        // payload[field] = null; 
    }

    await updateList(list.value.id, payload);
    
    // Opcional: Feedback muy sutil, como un pequeño check o toast instantáneo
    // SwalService.success('Actualizado', '', false); // sin modal mejor
    
    // Actualizar referencia local por si el backend normalizó algo, pero para inputs suele ser mejor mantener el valor del usuario para no causar saltos
    // Pero si es crítico, reload silencioso
  } catch (error) {
    console.error(`Error updating ${field}:`, error);
    SwalService.error('No se pudo guardar el cambio');
    // Revertir cambio local si falla? Sería ideal.
    // Por ahora simplificado.
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
