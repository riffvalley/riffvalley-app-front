<script setup lang="ts">
import { onMounted, reactive, ref, shallowRef } from 'vue';
import {
  createOwnSuggestion,
  fetchOwnSuggestions,
  fetchSuggestionVersionOptions,
} from '@/app/dependencies/suggestions';
import type { SuggestionVersionOption } from '@/modules/releases/suggestions/application/suggestionVersionOptionsPort';
import type {
  Suggestion,
  SuggestionStatus,
  SuggestionType,
} from '@/modules/releases/suggestions/domain/suggestion';
import SwalService from '@services/swal/SwalService';

interface SuggestionsPageItem extends Suggestion {
  versionItem: SuggestionVersionOption | null;
}

const suggestions = ref<SuggestionsPageItem[]>([]);
const counts = ref({ in_progress: 0, done: 0, rejected: 0 });
const loading = shallowRef(false);
const submitting = shallowRef(false);

const form = reactive({
  title: '',
  description: '',
  type: 'suggestion' as SuggestionType,
});

const typeOptions = [
  { value: 'suggestion' as const, label: 'Sugerencia', icon: 'fa-solid fa-lightbulb', activeClass: 'bg-blue-500 text-white border-blue-500' },
  { value: 'bug' as const, label: 'Bug', icon: 'fa-solid fa-bug', activeClass: 'bg-red-500 text-white border-red-500' },
];

async function fetchMine(): Promise<void> {
  loading.value = true;
  try {
    const result = await fetchOwnSuggestions();
    const versionOptions = await fetchSuggestionVersionOptions().catch(() => []);
    suggestions.value = result.suggestions.map((suggestion) => ({
      ...suggestion,
      versionItem: versionOptions.find(({ id }) => id === suggestion.versionItemId) ?? null,
    }));
    counts.value = result.counts;
  } catch {
    // La carga de la lista mantiene el comportamiento silencioso existente.
  } finally {
    loading.value = false;
  }
}

function createErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return 'Error al enviar la solicitud';
  }

  const response = error.response;
  if (typeof response !== 'object' || response === null || !('data' in response)) {
    return 'Error al enviar la solicitud';
  }

  const data = response.data;
  if (typeof data !== 'object' || data === null || !('message' in data)) {
    return 'Error al enviar la solicitud';
  }

  return typeof data.message === 'string' && data.message
    ? data.message
    : 'Error al enviar la solicitud';
}

async function handleSubmit(): Promise<void> {
  if (!form.title.trim() || !form.description.trim()) return;
  submitting.value = true;
  try {
    await createOwnSuggestion({ ...form });
    form.title = '';
    form.description = '';
    form.type = 'suggestion';
    SwalService.success('Enviado correctamente');
    await fetchMine();
  } catch (error: unknown) {
    SwalService.error(createErrorMessage(error));
  } finally {
    submitting.value = false;
  }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

const typeLabel = (type: SuggestionType) => type === 'bug' ? 'Bug' : 'Sugerencia';
const typeIcon = (type: SuggestionType) => type === 'bug' ? 'fa-solid fa-bug' : 'fa-solid fa-lightbulb';
const typeClass = (type: SuggestionType) => type === 'bug'
  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';

const statusLabel = (status: SuggestionStatus) =>
  ({ in_progress: 'Pendiente', done: 'Hecho', rejected: 'Rechazado' }[status] ?? status);
const statusClass = (status: SuggestionStatus) =>
  ({
    in_progress: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    done: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  }[status] ?? '');

onMounted(fetchMine);
</script>

<template>
  <div class="p-4 md:p-6">
    <div class="max-w-2xl mx-auto space-y-6">

      <!-- Cabecera -->
      <div class="text-center">
        <h1 class="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          <i class="fa-solid fa-bug mr-2"></i>Bugs y Sugerencias
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          ¿Encontraste un error o tienes una idea? Cuéntanos aquí.
        </p>
      </div>

      <!-- Formulario -->
      <div class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-rv-pink/10 dark:bg-rv-pink/20 flex items-center justify-center">
            <i class="fa-solid fa-pen text-rv-pink text-xs"></i>
          </div>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white">Nuevo envío</h2>
        </div>

        <form @submit.prevent="handleSubmit" class="p-5 space-y-4">

          <!-- Tipo -->
          <div class="flex gap-2">
            <button
              type="button"
              v-for="t in typeOptions"
              :key="t.value"
              @click="form.type = t.value"
              class="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200 focus:outline-none"
              :class="form.type === t.value
                ? t.activeClass
                : 'bg-white dark:bg-rv-darkSurface text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-rv-pink/50 hover:text-rv-pink'">
              <i :class="[t.icon, 'text-xs']"></i>
              {{ t.label }}
            </button>
          </div>

          <!-- Título -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Título <span class="text-rv-pink">*</span>
            </label>
            <input
              v-model="form.title"
              type="text"
              :placeholder="form.type === 'bug' ? 'Describe el problema...' : 'Describe tu sugerencia...'"
              maxlength="200"
              class="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm
                     text-gray-800 dark:text-white bg-white dark:bg-rv-darkSurface
                     placeholder:text-gray-400 dark:placeholder:text-gray-500
                     focus:outline-none focus:ring-2 focus:ring-rv-pink/40 focus:border-rv-pink/40 transition-colors"
            />
          </div>

          <!-- Descripción -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Descripción <span class="text-rv-pink">*</span>
            </label>
            <textarea
              v-model="form.description"
              rows="4"
              :placeholder="form.type === 'bug' ? 'Explica el problema con detalle...' : 'Explica tu idea con detalle...'"
              class="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm
                     text-gray-800 dark:text-white bg-white dark:bg-rv-darkSurface
                     placeholder:text-gray-400 dark:placeholder:text-gray-500
                     focus:outline-none focus:ring-2 focus:ring-rv-pink/40 focus:border-rv-pink/40 transition-colors resize-none">
            </textarea>
          </div>

          <!-- Enviar -->
          <button
            type="submit"
            :disabled="submitting || !form.title.trim() || !form.description.trim()"
            class="w-full py-3 bg-gradient-to-r from-rv-pink to-rv-purple text-white font-bold rounded-xl
                   hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-sm shadow-sm">
            <i v-if="submitting" class="fa-solid fa-spinner fa-spin mr-2"></i>
            <i v-else class="fa-solid fa-paper-plane mr-2"></i>
            <span>{{ submitting ? 'Enviando...' : 'Enviar' }}</span>
          </button>

        </form>
      </div>

      <!-- Mis envíos -->
      <div class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center gap-2 flex-wrap">
          <div class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <i class="fa-solid fa-clock-rotate-left text-amber-500 dark:text-amber-400 text-xs"></i>
          </div>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white">Mis envíos</h2>
          <div v-if="suggestions.length > 0" class="ml-auto flex items-center gap-1.5">
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
              {{ counts.in_progress }} pendiente{{ counts.in_progress !== 1 ? 's' : '' }}
            </span>
            <span v-if="counts.done" class="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              {{ counts.done }} hecho{{ counts.done !== 1 ? 's' : '' }}
            </span>
            <span v-if="counts.rejected" class="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              {{ counts.rejected }} rechazado{{ counts.rejected !== 1 ? 's' : '' }}
            </span>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center gap-2 py-10 text-gray-400 dark:text-gray-500 text-sm">
          <i class="fa-solid fa-spinner fa-spin"></i>
          Cargando...
        </div>

        <!-- Empty -->
        <div v-else-if="suggestions.length === 0" class="py-12 text-center">
          <div class="w-12 h-12 bg-gray-50 dark:bg-rv-darkSurface rounded-2xl flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-inbox text-gray-300 dark:text-gray-600 text-xl"></i>
          </div>
          <p class="font-semibold text-gray-900 dark:text-white mb-1 text-sm">Sin envíos todavía</p>
          <p class="text-xs text-gray-400 dark:text-gray-500">Tus envíos aparecerán aquí una vez enviados.</p>
        </div>

        <!-- Lista -->
        <ul v-else class="divide-y divide-gray-100 dark:divide-white/5">
          <li v-for="s in suggestions" :key="s.id" class="px-5 py-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-1.5">
                  <span :class="typeClass(s.type)" class="text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    <i :class="[typeIcon(s.type), 'mr-1']"></i>{{ typeLabel(s.type) }}
                  </span>
                  <span :class="statusClass(s.status)" class="text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {{ statusLabel(s.status) }}
                  </span>
                </div>
                <p class="font-semibold text-gray-800 dark:text-white text-sm">{{ s.title }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{{ s.description }}</p>
                <p v-if="s.rejectionReason" class="text-xs text-red-500 dark:text-red-400 mt-1.5 italic bg-red-50 dark:bg-red-900/20 rounded-lg px-2.5 py-1.5">
                  <i class="fa-solid fa-circle-xmark mr-1"></i>{{ s.rejectionReason }}
                </p>
                <p v-if="s.versionItem" class="text-xs text-green-600 dark:text-green-400 mt-1.5">
                  <i class="fa-solid fa-code-branch mr-1"></i>Incluido en: {{ s.versionItem.description }}
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{{ formatDate(s.createdAt) }}</p>
              </div>
            </div>
          </li>
        </ul>
      </div>

    </div>
  </div>
</template>
