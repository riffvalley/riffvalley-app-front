<template>
  <div class="p-4 md:p-6">
    <div class="max-w-2xl mx-auto space-y-6">

      <!-- Cabecera -->
      <div class="text-center">
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-rv-navy dark:text-white mb-2">
          <i class="fa-solid fa-lightbulb mr-2"></i>Solicitud de discos
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          ¿Falta algún disco en la app? Pídelo aquí y lo revisaremos. Solo discos de 2025 en adelante.
        </p>
      </div>

      <!-- Formulario. Sin overflow-hidden: si no, recorta las listas desplegables de género y país. -->
      <div class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-rv-pink/10 dark:bg-rv-pink/20 flex items-center justify-center">
            <i class="fa-solid fa-pen text-rv-pink text-xs"></i>
          </div>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white">Nueva solicitud</h2>
        </div>

        <form @submit.prevent="submitRequest" class="p-5 space-y-4">

          <!-- Artista y Disco -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="request-artist" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Artista <span class="text-rv-pink">*</span>
              <input
                id="request-artist"
                v-model="form.artistName"
                type="text"
                placeholder="Ej: Metallica"
                class="h-[50px] w-full rounded-2xl border border-gray-300 bg-white px-4 text-base text-rv-navy shadow-sm placeholder:text-gray-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy dark:border-white/20 dark:bg-rv-darkCard dark:text-white dark:placeholder:text-gray-300 dark:[color-scheme:dark] dark:focus-visible:ring-gray-200"
              />
              </label>
            </div>
            <div>
              <label for="request-disc" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Disco <span class="text-rv-pink">*</span>
              <input
                id="request-disc"
                v-model="form.discName"
                type="text"
                placeholder="Ej: Master of Puppets"
                class="h-[50px] w-full rounded-2xl border border-gray-300 bg-white px-4 text-base text-rv-navy shadow-sm placeholder:text-gray-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy dark:border-white/20 dark:bg-rv-darkCard dark:text-white dark:placeholder:text-gray-300 dark:[color-scheme:dark] dark:focus-visible:ring-gray-200"
              />
              </label>
            </div>
          </div>

          <!-- Fecha -->
          <div>
            <label for="request-release-date" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Fecha de lanzamiento <span class="text-rv-pink">*</span>
            <input
              id="request-release-date"
              v-model="form.releaseDate"
              type="date"
              min="2025-01-01"
              class="h-[50px] w-full rounded-2xl border border-gray-300 bg-white px-4 text-base text-rv-navy shadow-sm placeholder:text-gray-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy dark:border-white/20 dark:bg-rv-darkCard dark:text-white dark:placeholder:text-gray-300 dark:[color-scheme:dark] dark:focus-visible:ring-gray-200"
            />
            </label>
          </div>

          <!-- Género y País -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Género
              </span>
              <!-- Mismos selectores que Discos y Artistas, con textos de formulario. -->
              <DiscListGenreSelect
                :model-value="form.genreId ? [form.genreId] : []"
                :options="catalogStore.genres"
                :multiple="false"
                empty-label="Sin género"
                empty-hint="El disco se enviará sin género"
                @update:model-value="onGenreChange"
              />
            </div>
            <div>
              <span class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                País
              </span>
              <DiscListCountrySelect
                v-model="form.countryId"
                :options="catalogStore.countries"
                empty-label="Sin país"
              />
            </div>
          </div>

          <!-- EP y Debut -->
          <div class="flex gap-2.5">
            <button type="button" @click="form.ep = !form.ep"
              class="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200"
              :class="form.ep
                ? 'bg-rv-pink text-white border-rv-pink shadow-sm'
                : 'bg-white dark:bg-rv-darkSurface text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-rv-pink/50 hover:text-rv-pink'">
              <i class="fas fa-compact-disc text-xs"></i>
              EP
            </button>
            <button type="button" @click="form.debut = !form.debut"
              class="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200"
              :class="form.debut
                ? 'bg-rv-pink text-white border-rv-pink shadow-sm'
                : 'bg-white dark:bg-rv-darkSurface text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-rv-pink/50 hover:text-rv-pink'">
              <i class="fas fa-star text-xs"></i>
              Debut
            </button>
          </div>

          <!-- Error -->
          <p v-if="validationError" class="flex items-center gap-2 text-sm font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl px-4 py-2.5">
            <i class="fa-solid fa-circle-exclamation text-xs"></i>
            {{ validationError }}
          </p>

          <!-- Enviar -->
          <button
            type="submit" :disabled="submitting"
            class="w-full py-3 bg-gradient-to-r from-rv-pink to-rv-purple text-white font-bold rounded-xl
                   hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-sm shadow-sm">
            <i v-if="submitting" class="fa-solid fa-spinner fa-spin mr-2"></i>
            <span>{{ submitting ? 'Enviando...' : 'Enviar solicitud' }}</span>
          </button>

        </form>
      </div>

      <!-- Mis peticiones -->
      <div class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <i class="fa-solid fa-clock-rotate-left text-amber-500 dark:text-amber-400 text-xs"></i>
          </div>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white">Mis peticiones</h2>
          <span v-if="myRequests.length > 0"
            class="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400">
            {{ myRequests.length }}
          </span>
        </div>

        <!-- Loading -->
        <div v-if="requestsLoading" class="flex items-center justify-center gap-2 py-10 text-gray-400 dark:text-gray-500 text-sm">
          <i class="fa-solid fa-spinner fa-spin"></i>
          Cargando...
        </div>

        <div v-else-if="requestsError" class="py-12 text-center">
          <p class="font-semibold text-red-600 dark:text-red-400 mb-3 text-sm">No se pudieron cargar tus solicitudes.</p>
          <button type="button" @click="retryRequests" class="text-sm font-semibold text-rv-pink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink">Reintentar</button>
        </div>

        <!-- Empty -->
        <div v-else-if="myRequests.length === 0" class="py-12 text-center">
          <div class="w-12 h-12 bg-gray-50 dark:bg-rv-darkSurface rounded-2xl flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-inbox text-gray-300 dark:text-gray-600 text-xl"></i>
          </div>
          <p class="font-semibold text-gray-900 dark:text-white mb-1 text-sm">Sin solicitudes todavía</p>
          <p class="text-xs text-gray-400 dark:text-gray-500">Tus peticiones aparecerán aquí una vez enviadas.</p>
        </div>

        <!-- Lista -->
        <ul v-else class="divide-y divide-gray-100 dark:divide-white/5">
          <li v-for="req in myRequests" :key="req.id"
            class="px-5 py-4 flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="font-semibold text-gray-800 dark:text-white text-sm truncate">
                {{ req.artistName }} — {{ req.discName }}
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <span v-if="req.genre">{{ req.genre.name }}</span>
                <span v-if="req.country">{{ req.country.name }}</span>
                <span v-if="req.releaseDate">{{ formatDate(req.releaseDate) }}</span>
                <span v-if="req.ep" class="text-rv-pink font-semibold">EP</span>
                <span v-if="req.debut" class="text-rv-purple font-semibold">Debut</span>
              </p>
              <p v-if="req.adminNotes" class="text-xs text-gray-500 dark:text-gray-400 mt-1.5 italic bg-gray-50 dark:bg-rv-darkSurface rounded-lg px-2.5 py-1.5">
                "{{ req.adminNotes }}"
              </p>
            </div>
            <span :class="statusClass(req.status)"
              class="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0">
              {{ statusLabel(req.status) }}
            </span>
          </li>
        </ul>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { useMyRequestsQuery, useRequestMutations } from '../../application/useRequests';
import { requestErrorMessage } from '../../application/requestErrorMessage';
import type { CreateRequestDto, DiscRequest } from '../../types/requests';
import { useCatalogStore } from '@stores/catalog/catalog';
import SwalService from '@services/swal/SwalService';
import { DiscListCountrySelect, DiscListGenreSelect } from '@/modules/catalog/discs';
import { mutateAndInvalidateSidebarSummary } from '@/app/sidebarSummary';

export default defineComponent({
  name: 'SuggestPage',
  components: { DiscListCountrySelect, DiscListGenreSelect },
  setup() {
    const queryClient = useQueryClient();
    const catalogStore = useCatalogStore();

    const form = reactive({
      discName: '',
      artistName: '',
      releaseDate: '',
      ep: false,
      debut: false,
      genreId: '',
      countryId: '',
    });

    const submitting = ref(false);
    const validationError = ref('');
    const myRequestsQuery = useMyRequestsQuery();
    const mutations = useRequestMutations();
    const myRequests = computed(() => myRequestsQuery.data.value ?? []);
    const requestsLoading = computed(() => myRequestsQuery.isPending.value);
    const requestsError = computed(() => myRequestsQuery.isError.value);
    const retryRequests = () => myRequestsQuery.refetch();

    /** El selector trabaja en minúsculas: se guarda el id tal como viene del servidor. */
    const onGenreChange = (ids: string[]) => {
      const id = ids[0] ?? '';
      form.genreId = catalogStore.genres.find((genre) => genre.id.toLowerCase() === id)?.id ?? id;
    };

    const resetForm = () => {
      form.discName = '';
      form.artistName = '';
      form.releaseDate = '';
      form.ep = false;
      form.debut = false;
      form.genreId = '';
      form.countryId = '';
    };

    const submitRequest = async () => {
      validationError.value = '';
      if (!form.discName.trim() || !form.artistName.trim()) {
        validationError.value = 'El nombre del artista y del disco son obligatorios.';
        return;
      }
      if (!form.releaseDate) {
        validationError.value = 'La fecha de lanzamiento es obligatoria.';
        return;
      }
      if (new Date(form.releaseDate) < new Date('2025-01-01')) {
        validationError.value = 'La fecha de lanzamiento no puede ser anterior a 2025.';
        return;
      }

      submitting.value = true;
      try {
        const dto: CreateRequestDto = {
          discName: form.discName.trim(),
          artistName: form.artistName.trim(),
          releaseDate: form.releaseDate,
          ...(form.ep ? { ep: true } : {}),
          ...(form.debut ? { debut: true } : {}),
          ...(form.genreId ? { genreId: form.genreId } : {}),
          ...(form.countryId ? { countryId: form.countryId } : {}),
        };
        await mutateAndInvalidateSidebarSummary(queryClient, () => mutations.create.mutateAsync(dto));
        resetForm();
        SwalService.success('Petición enviada correctamente');
      } catch (error: unknown) {
        SwalService.error(requestErrorMessage(error, 'Error al enviar la petición'));
      } finally {
        submitting.value = false;
      }
    };

    const formatDate = (dateStr: string) =>
      new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });

    const statusLabel = (status: DiscRequest['status']) =>
      ({ pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' })[status];

    const statusClass = (status: DiscRequest['status']) =>
      ({
        pending:  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      })[status];

    return {
      form,
      submitting,
      validationError,
      myRequests,
      myRequestsQuery,
      requestsLoading,
      requestsError,
      retryRequests,
      catalogStore,
      submitRequest,
      onGenreChange,
      formatDate,
      statusLabel,
      statusClass,
    };
  },
});
</script>
