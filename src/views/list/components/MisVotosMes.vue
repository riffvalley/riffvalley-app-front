<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Tus votos de discos (sin EPs) lanzados en <span class="font-semibold capitalize">{{ monthLabel }}</span>,
        de mayor a menor nota.
      </p>
      <span v-if="!loading" class="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
        {{ votes.length }} {{ votes.length === 1 ? 'voto' : 'votos' }}
      </span>
    </div>

    <div v-if="loading" class="text-center py-10 text-gray-500 dark:text-gray-400">
      <i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
      <p class="text-sm">Cargando tus votos...</p>
    </div>

    <div v-else-if="errorMessage" class="text-center py-10 text-red-500 text-sm">
      {{ errorMessage }}
    </div>

    <div v-else-if="votes.length === 0"
      class="text-center py-12 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl">
      <i class="fa-regular fa-star text-4xl mb-3 opacity-30"></i>
      <p class="text-sm font-medium">No has votado ningún disco de este mes.</p>
    </div>

    <ul v-else class="divide-y divide-gray-100 dark:divide-white/10">
      <li v-for="vote in votes" :key="vote.id"
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3">

        <!-- Info del disco -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-12 h-12 rounded-lg bg-gray-100 dark:bg-rv-darkSurface overflow-hidden shrink-0 flex items-center justify-center text-gray-400 font-bold border border-gray-200 dark:border-white/10">
            <img v-if="vote.disc.image" :src="vote.disc.image" :alt="vote.disc.name" class="w-full h-full object-cover" />
            <span v-else>{{ vote.disc.artist?.name?.charAt(0) }}</span>
          </div>

          <div class="min-w-0">
            <p class="font-semibold text-sm text-gray-900 dark:text-white truncate" :title="vote.disc.name">
              {{ vote.disc.name }}
            </p>
            <div class="flex items-center gap-2 min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate" :title="vote.disc.artist?.name">
                {{ vote.disc.artist?.name }}
              </p>
              <span v-if="vote.disc.genre"
                class="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                :style="{ backgroundColor: vote.disc.genre.color || '#9ca3af' }">
                {{ vote.disc.genre.name }}
              </span>
            </div>
          </div>
        </div>

        <!-- Nota + asignación -->
        <div class="flex items-center gap-3 sm:shrink-0">
          <span class="px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
            title="Tu nota">
            <i class="fa-solid fa-star text-[10px] mr-1"></i>{{ formatRate(vote.rate) }}
          </span>

          <span v-if="assignedTo(vote.disc.id)"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            <i class="fa-solid fa-check mr-1"></i>
            {{ isMine(vote.disc.id) ? 'Asignado a ti' : `Asignado a ${assignedTo(vote.disc.id)?.user?.username ?? 'otro usuario'}` }}
          </span>
          <button v-else type="button" :disabled="assigning === vote.disc.id" @click="assignToMe(vote)"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 border-0 transition-colors">
            {{ assigning === vote.disc.id ? 'Asignando...' : 'Asignarme' }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getRatesByUser } from '@services/rates/rates';
import { postAsignationService } from '@services/asignation/asignation';
import SwalService from '@services/swal/SwalService';
import { useAsignationStore } from '@stores/asignation/asignation';
import { useAuthStore } from '@stores/auth/auth';

const props = defineProps<{
  listId: string;
  /** listDate de la lista mensual: de él se deduce el mes. */
  date: string;
}>();

const asignationStore = useAsignationStore();
const authStore = useAuthStore();

const votes = ref<any[]>([]);
const loading = ref(true);
const errorMessage = ref('');
const assigning = ref<string | null>(null);

// Mismo rango que "Selección de discos" (DiscByDate): del día 1 al último del mes.
const monthRange = computed(() => {
  const start = new Date(props.date);
  const end = new Date(props.date);
  start.setUTCDate(1);
  end.setUTCMonth(start.getUTCMonth() + 1);
  end.setUTCDate(0);
  return { start, end };
});

const monthLabel = computed(() =>
  monthRange.value.start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })
);

function formatRate(rate: string | number | null) {
  return rate == null ? '-' : parseFloat(String(rate));
}

function assignedTo(discId: string) {
  return asignationStore.asignations.find(a => a.disc?.id === discId);
}

function isMine(discId: string) {
  const asignation = assignedTo(discId);
  return !!asignation && asignation.user?.id === authStore.userId;
}

async function loadVotes() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const { start, end } = monthRange.value;
    const response = await getRatesByUser(
      500,
      0,
      undefined,
      [start.toISOString(), end.toISOString()],
      undefined,
      undefined,
      'rate',
      'rate.rate:DESC,artist.name:ASC'
    );
    // Los EPs no entran en Mejores del Mes.
    votes.value = (response.data ?? []).filter((vote: any) => !vote.disc?.ep);
  } catch {
    votes.value = [];
    errorMessage.value = 'No se pudieron cargar tus votos';
  } finally {
    loading.value = false;
  }
}

async function assignToMe(vote: any) {
  if (!authStore.userId) {
    SwalService.error('No se pudo identificar al usuario');
    return;
  }
  assigning.value = vote.disc.id;
  try {
    await postAsignationService({
      userId: authStore.userId,
      discId: vote.disc.id,
      listId: props.listId,
      genre: vote.disc.genre?.name,
    });
    // Se recarga para que "Discos Asignados" muestre la asignación completa (disco, artista, usuario).
    await asignationStore.loadAsignations(props.listId);
    SwalService.success('Disco asignado a ti');
  } catch {
    SwalService.error('No se pudo asignar el disco');
  } finally {
    assigning.value = null;
  }
}

onMounted(loadVotes);
</script>
