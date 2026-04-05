<template>
  <div class="p-6 max-w-2xl mx-auto">

    <!-- Cabecera -->
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-bold mb-2">Sugerir un disco</h1>
      <p class="text-gray-400 text-sm">
        ¿Falta algún disco en la app? Pídelo aquí y lo revisaremos.<br />
        Solo discos de 2025 en adelante, muchas gracias.
      </p>
    </div>

    <!-- Formulario -->
    <div class="bg-white rounded-2xl shadow-rv p-6 mb-8">
      <form @submit.prevent="submitRequest" class="space-y-5">

        <!-- Artista, disco y fecha -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Artista <span class="text-rv-pink">*</span>
            </label>
            <input
              v-model="form.artistName"
              type="text"
              placeholder="Ej: Metallica"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800
                     focus:outline-none focus:ring-2 focus:ring-rv-pink focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Disco <span class="text-rv-pink">*</span>
            </label>
            <input
              v-model="form.discName"
              type="text"
              placeholder="Ej: Master of Puppets"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800
                     focus:outline-none focus:ring-2 focus:ring-rv-pink focus:border-transparent"
            />
          </div>
        </div>

        <!-- Fecha -->
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Fecha de lanzamiento <span class="text-rv-pink">*</span>
          </label>
          <input
            v-model="form.releaseDate"
            type="date"
            min="2025-01-01"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800
                   focus:outline-none focus:ring-2 focus:ring-rv-pink focus:border-transparent"
          />
        </div>

        <!-- Género y País -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Género
            </label>
            <SearchableSelect
              v-model="form.genreId"
              :options="catalogStore.genres"
              title="name"
              trackby="id"
              triggerPlaceholder="Selecciona un género"
              allLabel="Sin género"
              placeholder="Buscar género..."
              :max="4000"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              País
            </label>
            <SearchableSelect
              v-model="form.countryId"
              :options="catalogStore.countries"
              title="name"
              trackby="id"
              triggerPlaceholder="Selecciona un país"
              allLabel="Sin país"
              placeholder="Buscar país..."
              :max="4000"
            />
          </div>
        </div>

        <!-- EP y Debut -->
        <div class="flex gap-3">
          <button
            type="button"
            @click="form.ep = !form.ep"
            :class="form.ep
              ? 'bg-rv-pink text-white border-rv-pink'
              : 'bg-white text-gray-500 border-gray-200 hover:border-rv-pink hover:text-rv-pink'"
            class="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors"
          >
            <i class="fas fa-compact-disc text-xs"></i>
            EP
          </button>
          <button
            type="button"
            @click="form.debut = !form.debut"
            :class="form.debut
              ? 'bg-rv-pink text-white border-rv-pink'
              : 'bg-white text-gray-500 border-gray-200 hover:border-rv-pink hover:text-rv-pink'"
            class="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors"
          >
            <i class="fas fa-star text-xs"></i>
            Debut
          </button>
        </div>

        <!-- Error -->
        <p v-if="validationError" class="text-rv-pink text-sm font-medium">
          {{ validationError }}
        </p>

        <!-- Enviar -->
        <button
          type="submit"
          :disabled="submitting"
          class="w-full py-3 bg-gradient-to-r from-rv-pink to-rv-purple text-white font-bold rounded-xl
                 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-sm"
        >
          <span v-if="submitting">Enviando...</span>
          <span v-else>Enviar petición</span>
        </button>

      </form>
    </div>

    <!-- Mis peticiones -->
    <div>
      <h2 class="text-lg font-bold mb-4">Mis peticiones</h2>

      <div v-if="loadingRequests" class="text-gray-400 text-sm text-center py-6">
        Cargando...
      </div>

      <div v-else-if="myRequests.length === 0"
        class="text-center py-8 text-gray-400 text-sm bg-white rounded-2xl shadow-rv">
        <i class="fas fa-inbox text-2xl mb-2 block text-gray-300"></i>
        Aún no has enviado ninguna petición.
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="req in myRequests"
          :key="req.id"
          class="bg-white rounded-2xl shadow-rv px-5 py-4 flex items-start justify-between gap-4"
        >
          <div class="min-w-0">
            <p class="font-semibold text-gray-800 truncate">
              {{ req.artistName }} — {{ req.discName }}
            </p>
            <p class="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-2">
              <span v-if="req.genre">{{ req.genre.name }}</span>
              <span v-if="req.country">{{ req.country.name }}</span>
              <span v-if="req.releaseDate">{{ formatDate(req.releaseDate) }}</span>
              <span v-if="req.ep" class="text-rv-pink font-medium">EP</span>
              <span v-if="req.debut" class="text-rv-purple font-medium">Debut</span>
            </p>
            <p v-if="req.adminNotes" class="text-xs text-gray-500 mt-1 italic">
              "{{ req.adminNotes }}"
            </p>
          </div>
          <span
            :class="statusClass(req.status)"
            class="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0"
          >
            {{ statusLabel(req.status) }}
          </span>
        </li>
      </ul>
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
        pending: 'bg-yellow-100 text-yellow-700',
        approved: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-700',
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
