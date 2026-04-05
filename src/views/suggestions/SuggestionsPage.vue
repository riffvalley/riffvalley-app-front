<template>
  <div class="p-6 max-w-2xl mx-auto">

    <!-- Cabecera -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold mb-1">Bugs y Sugerencias</h1>
      <p class="text-gray-400 text-sm">¿Encontraste un error o tienes una idea? Cuéntanos aquí.</p>
    </div>

    <!-- Formulario de creación -->
    <div class="bg-white rounded-2xl shadow-rv p-6 mb-8">
      <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Enviar nuevo</h2>
      <form @submit.prevent="handleSubmit" class="space-y-4">

        <!-- Tipo -->
        <div class="flex gap-2">
          <button
            type="button"
            v-for="t in typeOptions"
            :key="t.value"
            @click="form.type = t.value"
            :class="form.type === t.value
              ? t.activeClass
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
            class="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
          >
            <i :class="t.icon" class="mr-1"></i>{{ t.label }}
          </button>
        </div>

        <!-- Título -->
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Título <span class="text-rv-pink">*</span>
          </label>
          <input
            v-model="form.title"
            type="text"
            :placeholder="form.type === 'bug' ? 'Describe el problema...' : 'Describe tu sugerencia...'"
            maxlength="200"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink"
          />
        </div>

        <!-- Descripción -->
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Descripción <span class="text-rv-pink">*</span>
          </label>
          <textarea
            v-model="form.description"
            rows="4"
            :placeholder="form.type === 'bug' ? 'Explica el problema con detalle...' : 'Explica tu idea con detalle...'"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink resize-none"
          ></textarea>
        </div>

        <button
          type="submit"
          :disabled="submitting || !form.title.trim() || !form.description.trim()"
          class="w-full bg-rv-navy text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <i class="fa-solid fa-paper-plane mr-2"></i>
          {{ submitting ? 'Enviando...' : 'Enviar' }}
        </button>
      </form>
    </div>

    <!-- Mis envíos -->
    <div>
      <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Mis envíos</h2>

      <div v-if="loading" class="text-center py-8 text-gray-400 text-sm">Cargando...</div>

      <div v-else-if="suggestions.length === 0" class="text-center py-8 text-gray-400 text-sm bg-white rounded-2xl shadow-rv">
        <i class="fa-solid fa-inbox text-2xl mb-2 block text-gray-300"></i>
        Todavía no has enviado nada.
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="s in suggestions"
          :key="s.id"
          class="bg-white rounded-2xl shadow-rv px-5 py-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <span :class="typeClass(s.type)" class="text-xs font-semibold px-2 py-0.5 rounded-full">
                  <i :class="typeIcon(s.type)" class="mr-1"></i>{{ typeLabel(s.type) }}
                </span>
                <span :class="statusClass(s.status)" class="text-xs font-semibold px-2 py-0.5 rounded-full">
                  {{ statusLabel(s.status) }}
                </span>
              </div>
              <p class="font-semibold text-gray-800 text-sm">{{ s.title }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ s.description }}</p>
              <p v-if="s.rejectionReason" class="text-xs text-red-400 mt-1.5 italic">
                <i class="fa-solid fa-circle-xmark mr-1"></i>{{ s.rejectionReason }}
              </p>
              <p v-if="s.versionItem" class="text-xs text-green-600 mt-1.5">
                <i class="fa-solid fa-check-circle mr-1"></i>Implementado
              </p>
              <p class="text-xs text-gray-400 mt-1.5">{{ formatDate(s.createdAt) }}</p>
            </div>
          </div>
        </li>
      </ul>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import {
  createSuggestion,
  getMySuggestions,
  type Suggestion,
  type SuggestionType,
} from '@services/suggestions/suggestions';
import SwalService from '@services/swal/SwalService';

export default defineComponent({
  name: 'SuggestionsPage',
  setup() {
    const suggestions = ref<Suggestion[]>([]);
    const loading = ref(false);
    const submitting = ref(false);

    const form = ref({
      title: '',
      description: '',
      type: 'suggestion' as SuggestionType,
    });

    const typeOptions = [
      { value: 'suggestion', label: 'Sugerencia', icon: 'fa-solid fa-lightbulb', activeClass: 'bg-blue-500 text-white' },
      { value: 'bug', label: 'Bug', icon: 'fa-solid fa-bug', activeClass: 'bg-red-500 text-white' },
    ];

    const fetchMine = async () => {
      loading.value = true;
      try {
        suggestions.value = await getMySuggestions();
      } finally {
        loading.value = false;
      }
    };

    const handleSubmit = async () => {
      if (!form.value.title.trim() || !form.value.description.trim()) return;
      submitting.value = true;
      try {
        const created = await createSuggestion(form.value);
        suggestions.value.unshift(created);
        form.value = { title: '', description: '', type: 'suggestion' };
        SwalService.success('Enviado correctamente');
      } catch {
        SwalService.error('Error al enviar');
      } finally {
        submitting.value = false;
      }
    };

    const formatDate = (iso: string) =>
      new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

    const typeLabel = (t: SuggestionType) => t === 'bug' ? 'Bug' : 'Sugerencia';
    const typeIcon = (t: SuggestionType) => t === 'bug' ? 'fa-solid fa-bug' : 'fa-solid fa-lightbulb';
    const typeClass = (t: SuggestionType) => t === 'bug' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';

    const statusLabel = (s: string) => ({ in_progress: 'Pendiente', done: 'Hecho', rejected: 'Rechazado' }[s] ?? s);
    const statusClass = (s: string) =>
      ({ in_progress: 'bg-amber-100 text-amber-600', done: 'bg-green-100 text-green-600', rejected: 'bg-red-100 text-red-600' }[s] ?? '');

    onMounted(fetchMine);

    return {
      suggestions, loading, submitting, form,
      typeOptions,
      handleSubmit, formatDate,
      typeLabel, typeIcon, typeClass,
      statusLabel, statusClass,
    };
  },
});
</script>
