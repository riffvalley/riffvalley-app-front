<template>
  <div class="patch-notes-container">
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-gray-800 mb-2">Notas de Parche</h1>
      <p class="text-gray-600">Historial de versiones publicadas</p>
    </div>

    <!-- Loading inicial -->
    <div v-if="loading && versions.length === 0" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <!-- Timeline vertical -->
    <div v-else class="relative py-8 flex justify-center">
      <div class="timeline-container">
        <div v-for="(version, index) in versions" :key="version.id" class="timeline-row">
          <!-- Botón con línea vertical -->
          <div class="timeline-button-wrapper">
            <button @click="openModal(version)" class="timeline-icon-button"
              :title="`Ver detalles de v${version.version}`">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                <path fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z"
                  clip-rule="evenodd" />
              </svg>
            </button>
            <div v-if="index < versions.length - 1" class="timeline-connector"></div>
          </div>

          <!-- Tarjeta con título a la izquierda y fecha a la derecha -->
          <div class="timeline-card" @click="openModal(version)">
            <div class="timeline-card-content">
              <div class="timeline-card-left">
                <div class="text-lg font-bold text-primary">v{{ version.version }}</div>
                <p v-if="version.notes" class="text-xs text-gray-500 mt-1 line-clamp-1">
                  {{ version.notes }}
                </p>
              </div>
              <div class="timeline-card-right">
                <div class="flex flex-col items-end gap-2">
                  <time class="font-mono text-xs text-gray-600 whitespace-nowrap">
                    {{ formatDateTime(version.publishedAt || version.createdAt) }}
                  </time>
                  <!-- Telegram link icon - más grande y clickeable -->
                  <a v-if="version.link" :href="version.link" target="_blank" rel="noopener noreferrer" @click.stop
                    class="inline-flex items-center justify-center p-2 text-blue-500 hover:text-white hover:bg-blue-500 rounded-lg transition-all border border-blue-500"
                    title="Ver en Telegram">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading más versiones -->
      <div v-if="hasMore" ref="loadMoreTrigger" class="flex justify-center py-8">
        <div v-if="loading" class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <button v-else @click="loadMore" class="btn btn-primary">
          Cargar más versiones
        </button>
      </div>

    </div>

    <!-- Sin versiones -->
    <div v-if="!loading && versions.length === 0" class="text-center py-12">
      <p class="text-gray-500 text-lg">No hay versiones publicadas aún</p>
    </div>

    <!-- Modal con backdrop blur -->
    <!-- Modal Custom Overlay -->
    <div v-if="selectedVersion"
      class="fixed inset-0 z-50 flex items-center justify-center md:left-72 transition-opacity duration-300">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="closeModal"></div>

      <!-- Modal Content -->
      <div
        class="relative bg-white rounded-box max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-8 m-4 animate-fade-in-up">
        <!-- Botón cerrar -->
        <button @click="closeModal" class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 z-10">
          ✕
        </button>

        <!-- Header del modal -->
        <div class="border-b pb-4 mb-6">
          <div class="flex items-center gap-4 mb-3">
            <h2 class="text-4xl font-bold text-gray-800">
              v{{ selectedVersion.version }}
            </h2>
            <a v-if="selectedVersion.link" :href="selectedVersion.link" target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-base font-semibold shadow-md hover:shadow-lg"
              title="Ver en Telegram">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
              </svg>
              Telegram
            </a>
          </div>
          <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span v-if="selectedVersion.publishedAt" class="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {{ formatDateTime(selectedVersion.publishedAt) }}
            </span>
          </div>
          <p v-if="selectedVersion.notes" class="mt-4 text-gray-700 bg-gray-200 p-4 rounded-lg text-left">
            {{ selectedVersion.notes }}
          </p>
        </div>

        <!-- Items agrupados por tipo -->
        <div v-if="selectedVersion.items && selectedVersion.items.length > 0" class="space-y-6">
          <div v-for="(items, type) in groupItemsByType(selectedVersion.items)" :key="type as string">
            <div class="bg-base-200 rounded-lg p-4">
              <h3 class="text-lg font-bold mb-3 flex items-center gap-2 text-left">
                <span :class="getTypeColor(type as ChangeType)" class="text-2xl">
                  {{ getTypeIcon(type as ChangeType) }}
                </span>
                <span>{{ getTypeLabel(type as ChangeType) }}</span>
                <span class="badge badge-neutral badge-sm">{{ items.length }}</span>
              </h3>
              <ul class="space-y-2">
                <li v-for="item in items" :key="item.id" class="flex items-start gap-3 text-gray-700">
                  <span class="text-primary mt-0.5 text-lg">▪</span>
                  <span class="flex-1 text-left">{{ item.description }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Sin items -->
        <div v-else class="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>No hay cambios registrados para esta versión</span>
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
    // const modalRef = ref<HTMLDialogElement | null>(null); // Removed
    const selectedVersion = ref<Version | null>(null);

    const hasMore = ref(false);

    const loadVersions = async (page: number) => {
      if (loading.value) return;

      loading.value = true;
      try {
        const response = await getProductionVersionsPaginated(page);

        if (page === 1) {
          versions.value = response.data;
          // Abrir modal de la última versión automáticamente
          if (response.data.length > 0) {
            setTimeout(() => {
              openModal(response.data[0]);
            }, 300);
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
      if (rect.top < window.innerHeight + 200) {
        loadMore();
      }
    };

    const loadMore = () => {
      if (hasMore.value && !loading.value) {
        loadVersions(currentPage.value + 1);
      }
    };

    // Modal functions
    const openModal = (version: Version) => {
      selectedVersion.value = version;
    };

    const closeModal = () => {
      selectedVersion.value = null;
    };

    // Intersection Observer para scroll infinito
    let observer: IntersectionObserver | null = null;

    const setupIntersectionObserver = () => {
      observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting && hasMore.value && !loading.value) {
            loadMore();
          }
        },
        {
          rootMargin: '200px',
        }
      );

      if (loadMoreTrigger.value) {
        observer.observe(loadMoreTrigger.value);
      }
    };

    onMounted(() => {
      loadVersions(1);
      setTimeout(setupIntersectionObserver, 100);
    });

    onUnmounted(() => {
      if (observer) {
        observer.disconnect();
      }
    });

    // Agrupar items por tipo
    const groupItemsByType = (items: VersionItem[]) => {
      const grouped: Record<string, VersionItem[]> = {};
      items.forEach((item) => {
        if (!grouped[item.type]) {
          grouped[item.type] = [];
        }
        grouped[item.type].push(item);
      });
      return grouped;
    };

    // Obtener etiqueta del tipo
    const getTypeLabel = (type: ChangeType): string => {
      const labels: Record<ChangeType, string> = {
        feat: 'Nuevas Funcionalidades',
        fix: 'Correcciones',
        docs: 'Documentación',
        style: 'Estilos',
        refactor: 'Refactorización',
        perf: 'Mejoras de Rendimiento',
        test: 'Tests',
        build: 'Build',
        ci: 'CI/CD',
        chore: 'Tareas',
        revert: 'Reversiones',
      };
      return labels[type] || type;
    };

    // Obtener icono del tipo
    const getTypeIcon = (type: ChangeType): string => {
      const icons: Record<ChangeType, string> = {
        feat: '✨',
        fix: '🐛',
        docs: '📚',
        style: '🎨',
        refactor: '♻️',
        perf: '⚡',
        test: '✅',
        build: '🔨',
        ci: '👷',
        chore: '🔧',
        revert: '⏪',
      };
      return icons[type] || '📝';
    };

    // Obtener color del tipo
    const getTypeColor = (type: ChangeType): string => {
      const colors: Record<ChangeType, string> = {
        feat: 'text-green-600',
        fix: 'text-red-600',
        docs: 'text-blue-600',
        style: 'text-purple-600',
        refactor: 'text-yellow-600',
        perf: 'text-orange-600',
        test: 'text-teal-600',
        build: 'text-gray-600',
        ci: 'text-indigo-600',
        chore: 'text-gray-500',
        revert: 'text-pink-600',
      };
      return colors[type] || 'text-gray-600';
    };

    // Formatear fecha
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    // Formatear fecha y hora
    const formatDateTime = (dateStr: string): string => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

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
/* Container principal */
.patch-notes-container {
  min-height: 100vh;
  padding: 2rem 1.5rem;
  max-width: 1280px;
  margin: 0 auto;
}

/* Remove focus outline from modal */
dialog:focus {
  outline: none;
}

dialog::backdrop {
  background: transparent;
}

/* Remove focus outline from buttons */
button:focus {
  outline: none;
}

button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Timeline custom layout */
.timeline-container {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: 800px;
}

.timeline-row {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
}

.timeline-button-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.timeline-connector {
  width: 3px;
  flex-grow: 1;
  min-height: 60px;
  background: linear-gradient(to bottom, #3b82f6, #60a5fa);
  opacity: 0.6;
}

.timeline-icon-button {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  border-radius: 50%;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.2);
  border: 4px solid white;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.timeline-icon-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 12px -1px rgba(59, 130, 246, 0.4), 0 4px 8px -1px rgba(59, 130, 246, 0.3);
  background: linear-gradient(135deg, #2563eb, #3b82f6);
}

.timeline-icon-button:active {
  transform: scale(0.95);
}

.timeline-card {
  flex: 1;
  cursor: pointer;
  margin-bottom: 1.5rem;
}

.timeline-card-content {
  background: white;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06);
  border: 2px solid #e5e7eb;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.timeline-card-content:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-color: #3b82f6;
}

.timeline-card-left {
  flex: 1;
  min-width: 0;
}

.timeline-card-right {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  padding-top: 0.125rem;
}

/* Animaciones */
.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Line clamp para notas */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
