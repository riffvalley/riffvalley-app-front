<template>
  <div class="min-h-screen bg-gray-50 flex items-start justify-center py-6 px-4">
    <div class="w-full max-w-5xl">

      <!-- Cabecera -->
      <div class="mb-4 text-center">
        <img src="/LOGO-RIFF-VALLEY.svg" class="w-8 h-8 mx-auto mb-2" />
        <p class="text-gray-700 text-sm font-semibold">Nuevos lanzamientos de bandas</p>
        <p class="text-gray-400 text-xs mt-0.5">Los campos marcados con <span class="text-red-500">*</span> son obligatorios</p>
      </div>

      <!-- Success state -->
      <div v-if="submitted" class="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <i class="fas fa-check text-green-600 text-lg"></i>
        </div>
        <h2 class="text-lg font-bold text-gray-800 mb-1">
          {{ submittedCount === 1 ? '¡Lanzamiento enviado!' : `¡${submittedCount} lanzamientos enviados!` }}
        </h2>
        <p class="text-gray-500 text-sm mb-5">Los discos fueron registrados correctamente.</p>
        <button
          @click="resetForm"
          class="px-5 py-2 bg-gradient-to-r from-rv-pink to-rv-purple text-white font-semibold rounded-xl
                 hover:opacity-90 transition-opacity text-sm"
        >
          Enviar otros
        </button>
      </div>

      <!-- Formulario -->
      <div v-else class="space-y-3">

        <!-- Datos compartidos -->
        <div class="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Artista</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Nombre <span class="text-red-500">*</span>
              </label>
              <input
                v-model="shared.artistName"
                type="text"
                placeholder="Ej: Babasónicos"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800
                       focus:outline-none focus:ring-2 focus:ring-rv-pink focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Género <span class="text-red-500">*</span>
              </label>
              <input
                v-model="shared.genre"
                type="text"
                placeholder="Ej: Rock nacional"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800
                       focus:outline-none focus:ring-2 focus:ring-rv-pink focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <!-- Discos en grid responsivo -->
        <div class="grid gap-3" :style="{ gridTemplateColumns: `repeat(${discs.length}, minmax(0, 1fr))` }">

          <div
            v-for="(disc, index) in discs"
            :key="index"
            class="bg-white rounded-xl border border-gray-100 p-3 space-y-3"
          >
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Lanzamiento {{ index + 1 }}</p>
              <button
                v-if="discs.length > 1"
                type="button"
                @click="removeDisc(index)"
                class="w-5 h-5 flex items-center justify-center rounded-full text-gray-300
                       hover:text-red-400 hover:bg-red-50 transition-colors"
              >
                <i class="fas fa-xmark text-xs"></i>
              </button>
            </div>

            <div>
              <label class="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Nombre del lanzamiento <span class="text-red-500">*</span>
              </label>
              <input
                v-model="disc.discName"
                type="text"
                placeholder="Ej: Tema A"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800
                       focus:outline-none focus:ring-2 focus:ring-rv-pink focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Tipo <span class="text-red-500">*</span>
              </label>
              <div class="flex gap-1">
                <button
                  v-for="type in DISC_TYPES"
                  :key="type.value"
                  type="button"
                  @click="disc.discType = type.value"
                  :class="disc.discType === type.value
                    ? 'bg-rv-navy text-white border-rv-navy'
                    : 'bg-white text-gray-400 border-gray-200 hover:border-rv-navy hover:text-rv-navy'"
                  class="flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors"
                >
                  {{ type.label }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 items-end">
              <div>
                <label class="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Fecha de lanzamiento <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="disc.releaseDay"
                  type="date"
                  min="2026-01-01"
                  class="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-rv-pink focus:border-transparent"
                />
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Publicar desde
                </label>
                <p class="text-[9px] text-gray-400 mb-1 leading-tight">En blanco si ya se puede publicar.</p>
                <input
                  v-model="disc.publishAt"
                  type="date"
                  class="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-rv-pink focus:border-transparent"
                />
              </div>
            </div>
          </div>

        </div>

        <!-- Botón agregar (máx 4) -->
        <button
          v-if="discs.length < 4"
          type="button"
          @click="addDisc"
          class="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-semibold text-gray-400
                 hover:border-rv-pink hover:text-rv-pink transition-colors flex items-center justify-center gap-1.5"
        >
          <i class="fas fa-plus text-xs"></i>
          Añadir lanzamiento
        </button>

        <!-- Error -->
        <p v-if="validationError" class="text-red-500 text-xs font-medium px-1">
          {{ validationError }}
        </p>

        <!-- Submit -->
        <button
          type="button"
          @click="submitForm"
          :disabled="submitting"
          class="w-full py-2.5 bg-gradient-to-r from-rv-pink to-rv-purple text-white font-bold rounded-xl
                 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-sm"
        >
          <span v-if="submitting">Enviando...</span>
          <span v-else>
            {{ discs.length === 1 ? 'Enviar lanzamiento' : `Enviar ${discs.length} lanzamientos` }}
          </span>
        </button>

      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue';
import { createNationalRelease, type DiscType } from '@services/national-releases/nationalReleases';

const DISC_TYPES: { value: DiscType; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'ep', label: 'EP' },
  { value: 'album', label: 'Álbum' },
];

const MIN_DATE = '2026-01-01';

function makeDisc() {
  return { discName: '', discType: 'single' as DiscType, releaseDay: '', publishAt: '' };
}

export default defineComponent({
  name: 'NationalReleaseForm',
  setup() {
    const submitted = ref(false);
    const submitting = ref(false);
    const submittedCount = ref(0);
    const validationError = ref('');

    const shared = reactive({ artistName: '', genre: '' });
    const discs = ref([makeDisc()]);

    const addDisc = () => discs.value.push(makeDisc());

    const removeDisc = (index: number) => discs.value.splice(index, 1);

    const resetForm = () => {
      shared.artistName = '';
      shared.genre = '';
      discs.value = [makeDisc()];
      validationError.value = '';
      submitted.value = false;
      submittedCount.value = 0;
    };

    const submitForm = async () => {
      validationError.value = '';

      if (!shared.artistName.trim()) {
        validationError.value = 'El nombre del artista es obligatorio.';
        return;
      }
      if (!shared.genre.trim()) {
        validationError.value = 'El género es obligatorio.';
        return;
      }

      for (let i = 0; i < discs.value.length; i++) {
        const disc = discs.value[i];
        const label = `Disco ${i + 1}`;
        if (!disc.discName.trim()) {
          validationError.value = `${label}: el nombre del disco es obligatorio.`;
          return;
        }
        if (!disc.releaseDay) {
          validationError.value = `${label}: la fecha de lanzamiento es obligatoria.`;
          return;
        }
        if (disc.releaseDay < MIN_DATE) {
          validationError.value = `${label}: la fecha no puede ser anterior a 2026.`;
          return;
        }
      }

      submitting.value = true;
      try {
        const payload = discs.value.map(disc => ({
          artistName: shared.artistName.trim(),
          genre: shared.genre.trim(),
          discName: disc.discName.trim(),
          discType: disc.discType,
          releaseDay: disc.releaseDay,
          ...(disc.publishAt ? { publishAt: disc.publishAt } : {}),
        }));

        if (payload.length === 1) {
          await createNationalRelease(payload[0]);
        } else {
          await createNationalRelease(payload);
        }

        submittedCount.value = discs.value.length;
        submitted.value = true;
      } catch (error: any) {
        validationError.value =
          error.response?.data?.message || 'Error al enviar. Intentá de nuevo.';
      } finally {
        submitting.value = false;
      }
    };

    return {
      shared,
      discs,
      DISC_TYPES,
      submitted,
      submitting,
      submittedCount,
      validationError,
      addDisc,
      removeDisc,
      submitForm,
      resetForm,
    };
  },
});
</script>
