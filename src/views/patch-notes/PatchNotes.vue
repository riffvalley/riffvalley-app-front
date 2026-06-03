<template>
  <div class="min-h-screen px-4 py-8 max-w-3xl mx-auto">

    <!-- Header -->
    <div class="mb-10">
      <h1 class="text-3xl font-bold text-rv-navy dark:text-white mb-1">Notas de Parche</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">Historial de versiones publicadas</p>
    </div>

    <!-- Loading inicial -->
    <div v-if="loading && versions.length === 0" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-rv-pink"></div>
    </div>

    <!-- Timeline vertical -->
    <div v-else class="relative">
      <div v-for="(version, index) in versions" :key="version.id" class="flex items-start gap-4 group">

        <!-- Columna izquierda: nodo + conector -->
        <div class="flex flex-col items-center flex-shrink-0">
          <button
            @click="openModal(version)"
            :title="`Ver detalles de v${version.version}`"
            class="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0
                   bg-rv-navy dark:bg-rv-darkCard
                   border-2 border-rv-pink/50 dark:border-rv-pink/40
                   shadow-md
                   hover:scale-110 hover:border-rv-pink hover:shadow-rv
                   group-hover:border-rv-pink
                   transition-all duration-200
                   focus:outline-none">
            <i class="fa-solid fa-tag text-rv-pink text-sm"></i>
          </button>
          <!-- Conector vertical -->
          <div v-if="index < versions.length - 1"
            class="w-0.5 flex-grow min-h-[52px] mt-1 timeline-connector-gradient opacity-40">
          </div>
        </div>

        <!-- Tarjeta -->
        <div class="flex-1 pb-6 cursor-pointer" @click="openModal(version)">
          <div class="bg-white dark:bg-rv-darkCard
                      border border-gray-200 dark:border-white/10
                      rounded-xl p-4 shadow-sm
                      hover:shadow-md hover:border-rv-pink/50 dark:hover:border-rv-pink/30
                      transition-all duration-200">
            <div class="flex justify-between items-start gap-3">
              <!-- Versión y notas preview -->
              <div class="min-w-0 flex-1">
                <div class="text-lg font-bold text-rv-pink text-left">v{{ version.version }}</div>
                <p v-if="version.notes"
                  class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1 text-left">
                  {{ version.notes }}
                </p>
              </div>
              <!-- Fecha + Telegram -->
              <div class="flex flex-col items-end gap-2 flex-shrink-0">
                <time class="font-mono text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  {{ formatDateTime(version.publishedAt || version.createdAt) }}
                </time>
                <a v-if="version.link" :href="version.link" target="_blank" rel="noopener noreferrer"
                  @click.stop
                  class="flex items-center justify-center w-8 h-8 rounded-lg
                         border border-blue-400/60 dark:border-blue-500/40
                         text-blue-400 dark:text-blue-400
                         hover:bg-blue-500 hover:text-white hover:border-blue-500
                         transition-all duration-200"
                  title="Ver en Telegram">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cargar más -->
      <div v-if="hasMore" ref="loadMoreTrigger" class="flex justify-center py-6">
        <div v-if="loading"
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-rv-pink">
        </div>
        <button v-else @click="loadMore"
          class="px-6 py-2 rounded-full border border-rv-pink text-rv-pink text-sm font-semibold
                 hover:bg-rv-pink hover:text-white transition-all duration-200
                 focus:outline-none">
          Cargar más versiones
        </button>
      </div>
    </div>

    <!-- Sin versiones -->
    <div v-if="!loading && versions.length === 0" class="text-center py-16">
      <div class="text-5xl mb-4 opacity-30">📦</div>
      <p class="text-gray-500 dark:text-gray-400 text-sm">No hay versiones publicadas aún</p>
    </div>

    <!-- ── Modal ─────────────────────────────────────────────── -->
    <div v-if="selectedVersion"
      class="fixed inset-0 z-50 flex items-center justify-center md:left-72 transition-opacity duration-300">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeModal"></div>

      <!-- Contenido -->
      <div class="relative bg-white dark:bg-rv-darkCard rounded-2xl
                  max-w-2xl w-full max-h-[85vh] overflow-y-auto
                  shadow-2xl m-4
                  border border-gray-200 dark:border-white/10
                  animate-fade-in-up">

        <!-- Botón cerrar -->
        <button @click="closeModal"
          class="absolute right-4 top-4 z-10 w-9 h-9 rounded-full
                 flex items-center justify-center
                 bg-rv-navy dark:bg-rv-darkSurface text-white
                 hover:bg-rv-pink transition-all duration-200
                 border-0 outline-none focus:outline-none">
          <i class="fa-solid fa-xmark text-base leading-none"></i>
        </button>

        <!-- Header -->
        <div class="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/10">
          <div class="flex items-center gap-3 mb-3 pr-10">
            <h2 class="text-4xl font-black text-rv-pink leading-none">v{{ selectedVersion.version }}</h2>
            <a v-if="selectedVersion.link" :href="selectedVersion.link" target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-3 py-1.5
                     bg-blue-500 hover:bg-blue-600 text-white
                     rounded-lg transition-colors text-sm font-semibold shadow-sm"
              title="Ver en Telegram">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
              </svg>
              Telegram
            </a>
          </div>

          <div v-if="selectedVersion.publishedAt"
            class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{{ formatDateTime(selectedVersion.publishedAt) }}</span>
          </div>

          <p v-if="selectedVersion.notes"
            class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed
                   bg-gray-50 dark:bg-rv-darkSurface
                   border border-gray-200 dark:border-white/10
                   rounded-xl px-4 py-3">
            {{ selectedVersion.notes }}
          </p>
        </div>

        <!-- Items agrupados por tipo -->
        <div class="px-6 py-5 space-y-3">
          <div v-if="selectedVersion.items && selectedVersion.items.length > 0">
            <div v-for="(items, type) in groupItemsByType(selectedVersion.items)" :key="type as string"
              class="bg-gray-50 dark:bg-rv-darkSurface
                     border border-gray-100 dark:border-white/5
                     rounded-xl p-4">
              <!-- Cabecera del grupo -->
              <h3 class="text-sm font-bold mb-3 flex items-center gap-2
                         text-rv-navy dark:text-white">
                <span class="text-lg leading-none">{{ getTypeIcon(type as ChangeType) }}</span>
                <span>{{ getTypeLabel(type as ChangeType) }}</span>
                <span class="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full
                             bg-white dark:bg-rv-darkCard
                             border border-gray-200 dark:border-white/10
                             text-gray-400 dark:text-gray-500 tabular-nums">
                  {{ items.length }}
                </span>
              </h3>
              <!-- Lista de cambios -->
              <ul class="space-y-2">
                <li v-for="item in items" :key="item.id"
                  class="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <span :class="getTypeColor(type as ChangeType)"
                    class="mt-[3px] text-[9px] flex-shrink-0 leading-none">▶</span>
                  <span class="flex-1 leading-relaxed text-left">{{ item.description }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Sin items -->
          <div v-else
            class="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400
                   bg-gray-50 dark:bg-rv-darkSurface
                   border border-gray-100 dark:border-white/5
                   rounded-xl px-4 py-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-400 flex-shrink-0" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>No hay cambios registrados para esta versión</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { getProductionVersionsPaginated } from '@services/versions/versions';
import type { Version, VersionItem, ChangeType } from '@services/versions/versions';

export default defineComponent({
  name: 'PatchNotes',
  setup() {
    const versions = ref<Version[]>([]);
    const loading = ref(false);
    const currentPage = ref(1);
    const totalPages = ref(1);
    const loadMoreTrigger = ref<HTMLElement | null>(null);
    const selectedVersion = ref<Version | null>(null);
    const hasMore = ref(false);

    const loadVersions = async (page: number) => {
      if (loading.value) return;
      loading.value = true;
      try {
        const response = await getProductionVersionsPaginated(page);
        if (page === 1) {
          versions.value = response.data;
          if (response.data.length > 0) {
            setTimeout(() => openModal(response.data[0]), 300);
          }
        } else {
          versions.value.push(...response.data);
        }
        currentPage.value = response.page;
        totalPages.value = response.totalPages;
        hasMore.value = response.page < response.totalPages;
      } catch (error) {
        console.error('Error loading versions:', error);
      } finally {
        loading.value = false;
        await nextTick();
        checkIfNeedsMore();
      }
    };

    const checkIfNeedsMore = () => {
      if (!hasMore.value || loading.value || !loadMoreTrigger.value) return;
      const rect = loadMoreTrigger.value.getBoundingClientRect();
      if (rect.top < window.innerHeight + 200) loadMore();
    };

    const loadMore = () => {
      if (hasMore.value && !loading.value) loadVersions(currentPage.value + 1);
    };

    const openModal  = (version: Version) => { selectedVersion.value = version; };
    const closeModal = () => { selectedVersion.value = null; };

    let observer: IntersectionObserver | null = null;

    const setupIntersectionObserver = () => {
      observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting && hasMore.value && !loading.value) loadMore(); },
        { rootMargin: '200px' }
      );
      if (loadMoreTrigger.value) observer.observe(loadMoreTrigger.value);
    };

    onMounted(() => {
      loadVersions(1);
      setTimeout(setupIntersectionObserver, 100);
    });

    onUnmounted(() => { observer?.disconnect(); });

    // ── Helpers ──────────────────────────────────────────────
    const groupItemsByType = (items: VersionItem[]) => {
      const grouped: Record<string, VersionItem[]> = {};
      items.forEach(item => {
        if (!grouped[item.type]) grouped[item.type] = [];
        grouped[item.type].push(item);
      });
      return grouped;
    };

    const getTypeLabel = (type: ChangeType): string => ({
      feat:     'Nuevas Funcionalidades',
      fix:      'Correcciones',
      docs:     'Documentación',
      style:    'Estilos',
      refactor: 'Refactorización',
      perf:     'Mejoras de Rendimiento',
      test:     'Tests',
      build:    'Build',
      ci:       'CI/CD',
      chore:    'Tareas',
      revert:   'Reversiones',
    }[type] ?? type);

    const getTypeIcon = (type: ChangeType): string => ({
      feat:     '✨',
      fix:      '🐛',
      docs:     '📚',
      style:    '🎨',
      refactor: '♻️',
      perf:     '⚡',
      test:     '✅',
      build:    '🔨',
      ci:       '👷',
      chore:    '🔧',
      revert:   '⏪',
    }[type] ?? '📝');

    const getTypeColor = (type: ChangeType): string => ({
      feat:     'text-green-500',
      fix:      'text-red-500',
      docs:     'text-blue-500',
      style:    'text-purple-500',
      refactor: 'text-yellow-500',
      perf:     'text-orange-500',
      test:     'text-teal-500',
      build:    'text-gray-500',
      ci:       'text-indigo-500',
      chore:    'text-gray-400',
      revert:   'text-rv-pink',
    }[type] ?? 'text-gray-400');

    const formatDateTime = (dateStr: string): string =>
      new Date(dateStr).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

    const formatDate = (dateStr: string): string =>
      new Date(dateStr).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric',
      });

    return {
      versions,
      loading,
      hasMore,
      loadMoreTrigger,
      loadMore,
      selectedVersion,
      openModal,
      closeModal,
      groupItemsByType,
      getTypeLabel,
      getTypeIcon,
      getTypeColor,
      formatDate,
      formatDateTime,
    };
  },
});
</script>

<style scoped>
/* Gradiente del conector de la timeline */
.timeline-connector-gradient {
  background: linear-gradient(to bottom, #e46e8a, #b0669f, #0064d6);
}

/* Animación de entrada del modal */
.animate-fade-in-up {
  animation: fadeInUp 0.28s ease-out;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Line clamp */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

button:focus { outline: none; }
button:focus-visible { outline: 2px solid #e46e8a; outline-offset: 2px; }
</style>
