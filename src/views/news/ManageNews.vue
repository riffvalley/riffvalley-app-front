<template>
  <div class="view-container p-4 md:p-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <h2 class="text-2xl font-bold text-rv-pink">Gestión de Noticias</h2>
      <button
        @click="openCreateModal"
        class="flex items-center justify-center gap-2 px-5 py-2.5 bg-rv-pink hover:bg-rv-purple text-white font-medium rounded-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Crear Noticia
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 text-gray-400">
      Cargando noticias...
    </div>

    <!-- Table -->
    <div v-else-if="newsList.length > 0" class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-white/10">
            <th class="text-left text-xs text-rv-pink font-medium pb-3 px-3">Título</th>
            <th class="text-left text-xs text-rv-pink font-medium pb-3 px-3">Tipo</th>
            <th class="text-left text-xs text-rv-pink font-medium pb-3 px-3">Estado</th>
            <th class="text-left text-xs text-rv-pink font-medium pb-3 px-3">Fecha publicación</th>
            <th class="text-right text-xs text-rv-pink font-medium pb-3 px-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in newsList"
            :key="item.id"
            class="border-b border-white/5 hover:bg-white/5 transition-colors"
          >

            <!-- Título -->
            <td class="py-3 px-3">
              <span class="text-white text-sm font-medium line-clamp-2">{{ item.title }}</span>
            </td>

            <!-- Tipo -->
            <td class="py-3 px-3">
              <span class="text-gray-300 text-sm">{{ getTypeLabel(item.type) }}</span>
            </td>

            <!-- Estado -->
            <td class="py-3 px-3">
              <span
                class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                :class="item.status === 'published'
                  ? 'bg-green-500/15 text-green-400'
                  : 'bg-yellow-500/15 text-yellow-400'
                "
              >
                {{ item.status === 'published' ? 'Publicado' : 'Borrador' }}
              </span>
            </td>

            <!-- Fecha -->
            <td class="py-3 px-3">
              <span class="text-gray-400 text-sm">
                {{ item.publishDate ? formatDate(item.publishDate) : '—' }}
              </span>
            </td>

            <!-- Acciones -->
            <td class="py-3 px-3">
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="openEditModal(item)"
                  class="action-btn action-btn-blue"
                  title="Editar"
                >
                  <font-awesome-icon icon="fa-solid fa-pen" class="text-sm" />
                </button>
                <button
                  @click="confirmDelete(item)"
                  class="action-btn action-btn-red"
                  title="Eliminar"
                >
                  <font-awesome-icon icon="fa-solid fa-trash" class="text-sm" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Paginación -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
        <button
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
          class="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Anterior
        </button>
        <span class="text-sm text-gray-400">
          Página {{ currentPage }} de {{ totalPages }}
        </span>
        <button
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
          class="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-16 text-gray-500">
      No hay noticias creadas
    </div>

    <!-- Modal -->
    <NewsModal
      v-if="showModal"
      ref="modalRef"
      :news="selectedNews"
      :is-editing="isEditing"
      @close="closeModal"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import SwalService from '@services/swal/SwalService';
import {
  getNewsList,
  createNews,
  updateNews,
  deleteNews,
} from '@services/news/news';
import type { News, NewsStatus, NewsType } from '@services/news/news';
import { NEWS_TYPES } from '@services/news/news';
import NewsModal from './components/NewsModal.vue';

const LIMIT = 10;

const newsList = ref<News[]>([]);
const loading = ref(true);
const currentPage = ref(1);
const totalPages = ref(1);

const showModal = ref(false);
const isEditing = ref(false);
const selectedNews = ref<News | null>(null);
const modalRef = ref<InstanceType<typeof NewsModal> | null>(null);

onMounted(() => fetchNews());

async function fetchNews(page: number = 1) {
  loading.value = true;
  try {
    const offset = (page - 1) * LIMIT;
    const response = await getNewsList(LIMIT, offset);
    newsList.value = response.data;
    totalPages.value = response.totalPages;
    currentPage.value = response.currentPage;
  } catch (error) {
    console.error('Error loading news:', error);
    SwalService.error('Error al cargar las noticias');
  } finally {
    loading.value = false;
  }
}

function goToPage(page: number) {
  fetchNews(page);
}

function getTypeLabel(type: NewsType): string {
  return NEWS_TYPES.find(t => t.value === type)?.label ?? type;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function openCreateModal() {
  selectedNews.value = null;
  isEditing.value = false;
  showModal.value = true;
}

function openEditModal(news: News) {
  selectedNews.value = news;
  isEditing.value = true;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  selectedNews.value = null;
  isEditing.value = false;
}

async function handleSubmit(form: { title: string; body: string; type: NewsType; image: string | null; publishDate: string | null; status: NewsStatus }) {
  try {
    if (isEditing.value && selectedNews.value) {
      await updateNews(selectedNews.value.id, form);
      SwalService.success('Noticia actualizada correctamente');
    } else {
      await createNews(form);
      SwalService.success('Noticia creada correctamente');
    }
    closeModal();
    fetchNews(currentPage.value);
  } catch (error) {
    console.error('Error saving news:', error);
    SwalService.error('Error al guardar la noticia');
    modalRef.value?.resetSubmitting();
  }
}

async function confirmDelete(news: News) {
  const result = await SwalService.confirm(
    '¿Eliminar noticia?',
    `Se eliminará permanentemente "${news.title}"`,
    'warning'
  );
  if (result.isConfirmed) {
    try {
      await deleteNews(news.id);
      SwalService.success('Noticia eliminada');
      fetchNews(currentPage.value);
    } catch (error) {
      console.error('Error deleting news:', error);
      SwalService.error('Error al eliminar la noticia');
    }
  }
}
</script>

<style scoped>
.view-container {
  background: #00021f;
  min-height: 100vh;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.action-btn {
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
}

.action-btn-blue {
  background: rgba(0, 100, 214, 0.15);
  color: #0064d6;
}

.action-btn-blue:hover {
  background: rgba(0, 100, 214, 0.3);
}

.action-btn-red {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.action-btn-red:hover {
  background: rgba(239, 68, 68, 0.3);
}
</style>
