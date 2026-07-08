<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Nombre -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre</label>
        <input v-model="form.name" type="text" maxlength="200" required
          placeholder="Ej: Sala Apolo"
          class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
      </div>

      <!-- Ciudad -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ciudad</label>
        <input v-model="form.city" type="text" maxlength="100" required
          placeholder="Ej: Barcelona"
          class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
      </div>

      <!-- Dirección -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Dirección</label>
        <input v-model="form.address" type="text" maxlength="300"
          placeholder="Ej: Carrer Nou de la Rambla, 113"
          class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
      </div>

      <!-- País -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">País</label>
        <select v-model="form.countryId"
          class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
          <option :value="null">Sin especificar</option>
          <option v-for="country in countries" :key="country.id" :value="country.id">{{ country.name }}</option>
        </select>
      </div>
    </div>

    <!-- Descripción WYSIWYG -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Descripción</label>
      <div class="quill-wrapper">
        <QuillEditor v-model:content="form.description" content-type="html" theme="snow"
          :toolbar="toolbarOptions" placeholder="Describe la sala..." />
      </div>
    </div>

    <!-- Galería de imágenes -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Galería de imágenes</label>
      <div class="flex flex-wrap gap-3 mb-3">
        <div v-for="(img, idx) in form.images" :key="idx" class="relative w-24 h-24 rounded-lg overflow-hidden group">
          <img :src="img" class="w-full h-full object-cover" />
          <button type="button" @click="removeImage(idx)"
            class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
        <label
          class="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-white/20 flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors text-gray-400 hover:text-indigo-500">
          <i v-if="uploadingImage" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-plus"></i>
          <input type="file" accept="image/*" class="hidden" @change="handleImageUpload" :disabled="uploadingImage" />
        </label>
      </div>
    </div>

    <!-- Ubicación manual -->
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Ubicación manual (opcional)
        </label>
        <span class="text-xs text-gray-400">Si no la indicas, se calcula automáticamente a partir del nombre y la ciudad.</span>
      </div>
      <div class="grid grid-cols-2 gap-4 mb-3">
        <input v-model.number="form.latitude" type="number" step="any" placeholder="Latitud"
          class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        <input v-model.number="form.longitude" type="number" step="any" placeholder="Longitud"
          class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
      </div>
      <div class="bg-white dark:bg-rv-darkCard rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
        <l-map :zoom="mapZoom" :center="mapCenter" style="height: 260px; width: 100%;" @click="handleMapClick">
          <l-tile-layer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <l-marker v-if="form.latitude != null && form.longitude != null" :lat-lng="[form.latitude, form.longitude]" />
        </l-map>
      </div>
    </div>

    <!-- Acciones -->
    <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
      <button type="button" @click="$emit('cancel')"
        class="px-5 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-rv-darkBg transition-colors">
        Cancelar
      </button>
      <button type="submit" :disabled="submitting || !form.name.trim() || !form.city.trim()"
        class="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
        <i v-if="submitting" class="fa-solid fa-circle-notch fa-spin"></i>
        <span>{{ submitLabel }}</span>
      </button>
    </div>
  </form>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, onMounted, computed, watch, type PropType } from 'vue';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import { LMap, LTileLayer, LMarker } from '@vue-leaflet/vue-leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import { getCountries } from '@services/countries/countries';
import type { Country } from '@services/countries/countries';
import { uploadVenueImage } from '@services/venues/venues';
import type { Venue, CreateVenueDto } from '@services/venues/venues';
import SwalService from '@services/swal/SwalService';

export default defineComponent({
  name: 'RoomForm',
  components: { QuillEditor, LMap, LTileLayer, LMarker },
  props: {
    initial: { type: Object as PropType<Venue | null>, default: null },
    submitting: { type: Boolean, default: false },
    submitLabel: { type: String, default: 'Guardar' },
  },
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    const countries = ref<Country[]>([]);
    const uploadingImage = ref(false);

    const form = reactive<{
      name: string;
      city: string;
      address: string;
      countryId: string | null;
      description: string;
      images: string[];
      latitude: number | null;
      longitude: number | null;
    }>({
      name: '',
      city: '',
      address: '',
      countryId: null,
      description: '',
      images: [],
      latitude: null,
      longitude: null,
    });

    const toolbarOptions = [
      ['bold', 'italic', 'underline', 'strike'],
      [{ header: [1, 2, 3, false] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ];

    const mapCenter = computed<[number, number]>(() =>
      form.latitude != null && form.longitude != null ? [form.latitude, form.longitude] : [40.4168, -3.7038]
    );
    const mapZoom = computed(() => (form.latitude != null && form.longitude != null ? 12 : 5));

    const handleMapClick = (e: LeafletMouseEvent) => {
      form.latitude = Math.round(e.latlng.lat * 1e6) / 1e6;
      form.longitude = Math.round(e.latlng.lng * 1e6) / 1e6;
    };

    const handleImageUpload = async (event: Event) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      uploadingImage.value = true;
      try {
        const url = await uploadVenueImage(file);
        form.images.push(url);
      } catch (error) {
        console.error('Error uploading image:', error);
        SwalService.error('No se pudo subir la imagen');
      } finally {
        uploadingImage.value = false;
        input.value = '';
      }
    };

    const removeImage = (idx: number) => {
      form.images.splice(idx, 1);
    };

    const applyInitial = (venue: Venue | null) => {
      form.name = venue?.name ?? '';
      form.city = venue?.city ?? '';
      form.address = venue?.address ?? '';
      form.countryId = venue?.countryId ?? null;
      form.description = venue?.description ?? '';
      form.images = venue?.images ? [...venue.images] : [];
      form.latitude = venue?.latitude ?? null;
      form.longitude = venue?.longitude ?? null;
    };

    watch(() => props.initial, applyInitial, { immediate: true });

    onMounted(async () => {
      try {
        const response = await getCountries(500, 0);
        countries.value = [...response.data].sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    });

    const handleSubmit = () => {
      if (!form.name.trim() || !form.city.trim()) return;
      const dto: CreateVenueDto = {
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim() || null,
        countryId: form.countryId || null,
        description: form.description || null,
        images: form.images,
        latitude: form.latitude,
        longitude: form.longitude,
      };
      emit('submit', dto);
    };

    return {
      countries,
      form,
      toolbarOptions,
      uploadingImage,
      mapCenter,
      mapZoom,
      handleMapClick,
      handleImageUpload,
      removeImage,
      handleSubmit,
    };
  },
});
</script>

<style scoped>
.quill-wrapper :deep(.ql-toolbar) {
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px 8px 0 0;
}

.quill-wrapper :deep(.ql-container) {
  border-radius: 0 0 8px 8px;
  min-height: 160px;
  font-size: 0.95rem;
}

:global(.dark) .quill-wrapper :deep(.ql-toolbar) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
}

:global(.dark) .quill-wrapper :deep(.ql-container) {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.15);
  color: #fff;
}

:global(.dark) .quill-wrapper :deep(.ql-editor.ql-blank::before) {
  color: #6b7280;
}
</style>
