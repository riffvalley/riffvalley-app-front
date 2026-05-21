<template>
  <div class="p-4 md:p-6">
    <div class="max-w-2xl mx-auto space-y-6">

      <!-- Cabecera -->
      <div class="text-center">
        <h1 class="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          <i class="fa-solid fa-lightbulb mr-2"></i>Solicitud de discos
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          ¿Falta algún disco en la app? Pídelo aquí y lo revisaremos. Solo discos de 2025 en adelante.
        </p>
      </div>

      <!-- Formulario -->
      <div class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
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
              <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Artista <span class="text-rv-pink">*</span>
              </label>
              <input
                v-model="form.artistName"
                type="text"
                placeholder="Ej: Metallica"
                class="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm
                       text-gray-800 dark:text-white bg-white dark:bg-rv-darkSurface
                       placeholder:text-gray-400 dark:placeholder:text-gray-500
                       focus:outline-none focus:ring-2 focus:ring-rv-pink/40 focus:border-rv-pink/40 transition-colors"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Disco <span class="text-rv-pink">*</span>
              </label>
              <input
                v-model="form.discName"
                type="text"
                placeholder="Ej: Master of Puppets"
                class="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm
                       text-gray-800 dark:text-white bg-white dark:bg-rv-darkSurface
                       placeholder:text-gray-400 dark:placeholder:text-gray-500
                       focus:outline-none focus:ring-2 focus:ring-rv-pink/40 focus:border-rv-pink/40 transition-colors"
              />
            </div>
          </div>

          <!-- Fecha -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Fecha de lanzamiento <span class="text-rv-pink">*</span>
            </label>
            <input
              v-model="form.releaseDate"
              type="date"
              min="2025-01-01"
              class="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm
                     text-gray-800 dark:text-white bg-white dark:bg-rv-darkSurface
                     focus:outline-none focus:ring-2 focus:ring-rv-pink/40 focus:border-rv-pink/40 transition-colors"
            />
          </div>

          <!-- Género y País -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Género
              </label>
              <SearchableSelect
                v-model="form.genreId"
                :options="catalogStore.genres"
                title="name" trackby="id"
                triggerPlaceholder="Selecciona un género"
                allLabel="Sin género" placeholder="Buscar género..." :max="4000"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                País
              </label>
              <SearchableSelect
                v-model="form.countryId"
                :options="catalogStore.countries"
                title="name" trackby="id"
                triggerPlaceholder="Selecciona un país"
                allLabel="Sin país" placeholder="Buscar país..." :max="4000"
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
        <div v-if="loadingRequests" class="flex items-center justify-center gap-2 py-10 text-gray-400 dark:text-gray-500 text-sm">
          <i class="fa-solid fa-spinner fa-spin"></i>
          Cargando...
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
import { defineComponent, ref, reactive, onMounted } from 'vue';
import { createRequest, getMyRequests, type DiscRequest } from '@services/requests/requests';
import { useCatalogStore } from '@stores/catalog/catalog';
import SwalService from '@services/swal/SwalService';
import SearchableSelect from '@components/SearchableSelect.vue';

export default defineComponent({
  name: 'SuggestPage',
  components: { SearchableSelect },
  setup() {
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
    const myRequests = ref<DiscRequest[]>([]);
    const loadingRequests = ref(false);

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
        const dto: any = {
          discName: form.discName.trim(),
          artistName: form.artistName.trim(),
          releaseDate: form.releaseDate,
        };
        if (form.ep) dto.ep = true;
        if (form.debut) dto.debut = true;
        if (form.genreId) dto.genreId = form.genreId;
        if (form.countryId) dto.countryId = form.countryId;

        const newRequest = await createRequest(dto);
        myRequests.value.unshift(newRequest);
        resetForm();
        SwalService.success('Petición enviada correctamente');
      } catch (error: any) {
        SwalService.error(error.response?.data?.message || 'Error al enviar la petición');
      } finally {
        submitting.value = false;
      }
    };

    const fetchMyRequests = async () => {
      loadingRequests.value = true;
      try {
        myRequests.value = await getMyRequests();
      } catch {
        // silencioso
      } finally {
        loadingRequests.value = false;
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

    onMounted(() => {
      fetchMyRequests();
    });

    return {
      form,
      submitting,
      validationError,
      myRequests,
      loadingRequests,
      catalogStore,
      submitRequest,
      formatDate,
      statusLabel,
      statusClass,
    };
  },
});
</script>
