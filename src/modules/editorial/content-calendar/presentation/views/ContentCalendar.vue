<template>
    <div class="relative flex h-screen overflow-hidden bg-gray-50 dark:bg-rv-darkBg">
        <!-- Overlay móvil al abrir el backlog -->
        <div v-if="showBacklog" class="fixed inset-0 bg-black/50 z-20 lg:hidden" @click="showBacklog = false" />

        <!-- Backlog Panel -->
        <transition name="backlog-slide" @after-enter="updateCalendarSize" @after-leave="updateCalendarSize">
            <div v-if="showBacklog" class="fixed lg:relative inset-y-0 left-0 z-30 lg:z-auto shrink-0">
                <BacklogPanel :backlog-items="backlogItems" :show-only-my-events="showOnlyMyEvents" :user-id="authStore.userId"
                    @create-new="showCreateModal = true" @edit-content="openEditModal" @delete-content="handleDeleteFromBacklog"
                    @close="showBacklog = false"
                    ref="backlogPanelRef" />
            </div>
        </transition>

        <!-- Calendar Panel -->
        <div class="flex-1 flex flex-col overflow-hidden min-w-0">
            <div class="px-5 py-3 bg-white dark:bg-rv-darkCard border-b border-gray-100 dark:border-white/10 flex justify-between items-center gap-3">
                <h1 class="text-lg font-extrabold tracking-tight text-rv-navy dark:text-white flex items-center gap-2">
                    <i class="fa-solid fa-calendar-days text-rv-purple text-base"></i>
                    Calendario RV
                </h1>
                <div class="flex items-center gap-2">
                    <!-- Botón de filtro de usuario -->
                    <button v-if="authStore.userId" @click="toggleMyEventsFilter"
                        class="relative transition-all duration-300"
                        :class="showOnlyMyEvents ? '' : 'opacity-50 grayscale'"
                        :title="showOnlyMyEvents ? 'Mostrar todos los eventos' : 'Mostrar solo mis eventos'">
                        <img v-if="authStore.image" :src="authStore.image" :alt="authStore.username || 'Usuario'"
                            class="w-9 h-9 rounded-full object-cover transition-all"
                            :class="showOnlyMyEvents ? 'ring-2 ring-rv-pink ring-offset-2' : ''" />
                        <div v-else
                            class="w-9 h-9 rounded-full bg-rv-purple flex items-center justify-center text-white font-bold text-base"
                            :class="showOnlyMyEvents ? 'ring-2 ring-rv-pink ring-offset-2' : ''">
                            {{ authStore.username?.charAt(0).toUpperCase() }}
                        </div>
                    </button>

                    <!-- Botón de leyenda -->
                    <button @click="showLegendModal = true"
                        class="w-9 h-9 rounded-full border border-gray-200 dark:border-white/15 bg-transparent hover:bg-rv-purple dark:hover:bg-rv-purple text-rv-navy dark:text-white hover:text-white hover:border-rv-purple font-bold text-sm transition-all flex items-center justify-center"
                        title="Ver leyenda de colores">
                        <i class="fa-solid fa-circle-info text-sm"></i>
                    </button>
                </div>
            </div>

            <div class="flex flex-1 overflow-hidden">
                <!-- Tab para abrir el backlog cuando está cerrado -->
                <div v-if="!showBacklog"
                     @click="showBacklog = true"
                     class="shrink-0 w-8 flex items-center justify-center bg-rv-pink/10 hover:bg-rv-pink dark:bg-rv-pink/10 dark:hover:bg-rv-pink cursor-pointer transition-all group"
                     title="Mostrar backlog">
                    <i class="fa-solid fa-chevron-right text-rv-pink group-hover:text-white text-xs transition-colors"></i>
                </div>

                <div class="rv-calendar-wrapper flex-1 overflow-auto p-3 sm:p-5">
                    <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
                        <div v-if="monthQuery.isPending.value" role="status" class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            Cargando contenidos del calendario…
                        </div>
                        <div v-else-if="monthQuery.isError.value" role="alert" class="px-4 py-3 text-sm text-red-700 dark:text-red-300">
                            No se han podido cargar los contenidos de este mes.
                            <button class="ml-2 underline" @click="monthQuery.refetch()">Reintentar</button>
                        </div>
                        <div v-else-if="monthQuery.isFetching.value" role="status" class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                            Actualizando contenidos…
                        </div>
                        <div v-if="backlogQuery.isPending.value" role="status" class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                            Cargando backlog…
                        </div>
                        <div v-else-if="backlogQuery.isError.value" role="alert" class="px-4 py-2 text-sm text-red-700 dark:text-red-300">
                            No se ha podido cargar el backlog.
                            <button class="ml-2 underline" @click="backlogQuery.refetch()">Reintentar</button>
                        </div>
                        <div v-else-if="backlogQuery.isFetching.value" role="status" class="px-4 py-1 text-xs text-gray-500 dark:text-gray-400">
                            Actualizando backlog…
                        </div>
                        <p v-if="monthQuery.data.value?.length === 0 && !monthQuery.isError.value" class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400" role="status">
                            No hay contenidos programados para este periodo.
                        </p>
                        <FullCalendar :options="calendarOptions" ref="calendarRef" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Modals -->
        <CreateContentModal :show="showCreateModal" :rv-users="rvUsers" @close="showCreateModal = false"
            @create="handleCreateContent" />

        <EditContentModal :show="showEditModal" :content="editingContent" :rv-users="rvUsers"
            @close="showEditModal = false" @update="handleUpdateContent" @delete="confirmDeleteContent" />

        <!-- Actions Modals -->
        <RadarActionsModal v-if="selectedContent?.type === 'radar' || selectedContent?.type === 'best'"
            :show="showActionsModal" :content="selectedContent" :radar-details="radarDetails"
            :loading="loadingRadarDetails" :rv-users="rvUsers" @close="showActionsModal = false"
            @update-field="updateRadarField" @update-status="updateListStatus"
            @toggle-asignation="toggleAsignation" @delete-list="deleteRadarList"
            @delete="confirmDeleteContent" @navigate-detail="navigateToRadarDetail"
            @copy-artist-disc="copyArtistAndDisc" @copy-image="copyToClipboard"
            @update-author="handleUpdateContentAuthor"
            @update-dates="handleUpdateRadarDates" />

        <PhotosActionsModal v-else-if="selectedContent?.type === 'photos'" :show="showActionsModal"
            :content="selectedContent!" :rv-users="rvUsers" @close="showActionsModal = false"
            @update="handleUpdateContent" @delete="confirmDeleteContent" />

        <ReunionActionsModal v-else-if="selectedContent?.type === 'reunion'" :show="showActionsModal"
            :content="selectedContent!" :rv-users="rvUsers" @close="showActionsModal = false"
            @update="handleUpdateContent" @delete="confirmDeleteContent" @navigate-reunions="goToReunions" />

        <ArticleActionsModal v-else-if="selectedContent?.type === 'article'" :show="showActionsModal"
            :content="selectedContent!" :rv-users="rvUsers" @close="showActionsModal = false"
            @update="handleUpdateContent" @update-article="handleUpdateArticle"
            @delete="confirmDeleteContent" @navigate-kanban="goToArticlesKanban" />

        <VideoActionsModal v-else-if="selectedContent?.type === 'video'" :show="showActionsModal"
            :content="selectedContent!" :rv-users="rvUsers" :video-update-error="videoUpdateError"
            @close="showActionsModal = false"
            @update="handleUpdateContent" @update-video="handleUpdateVideo"
            @delete="confirmDeleteContent" @navigate-kanban="goToVideosKanban" />

        <GenericActionsModal v-else :show="showActionsModal" :content="selectedContent"
            @close="showActionsModal = false" @edit="editFromActions" @delete="confirmDeleteContent" />

        <LegendModal :show="showLegendModal" @close="showLegendModal = false" />

        <DeleteConfirmModal :show="showDeleteModal" :content-name="contentToDelete?.name || ''"
            @cancel="cancelDeleteContent" @confirm="executeDeleteContent" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import type { EventClickArg } from '@fullcalendar/core';
import type { ContentType, Content } from '@services/contents/contents';
import { useAuthStore } from '@/modules/identity/auth';
import type { RvUser } from '@/modules/identity/users';
import type { ContentListDetails, ContentEditorData } from '../../types/contentCalendar.types';
import SwalService from '@services/swal/SwalService';
import { useRouter } from 'vue-router';

import BacklogPanel from '../components/BacklogPanel.vue';
import CreateContentModal from '../components/CreateContentModal.vue';
import EditContentModal from '../components/EditContentModal.vue';
import RadarActionsModal from '../components/RadarActionsModal.vue';
import PhotosActionsModal from '../components/PhotosActionsModal.vue';
import ReunionActionsModal from '../components/ReunionActionsModal.vue';
import ArticleActionsModal from '../components/ArticleActionsModal.vue';
import VideoActionsModal from '../components/VideoActionsModal.vue';
import GenericActionsModal from '../components/GenericActionsModal.vue';
import LegendModal from '../components/LegendModal.vue';
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue';
import { useContentCalendarQueries } from '../../application/contentCalendarQueries';
import { useContentCalendarOperations } from '../../application/useContentCalendarOperations';
import { useContentCalendarFullCalendar } from '../composables/useContentCalendarFullCalendar';


const authStore = useAuthStore();
const showOnlyMyEvents = ref(false);
const showBacklog = ref(window.innerWidth >= 1024);

const router = useRouter();
const calendarRef = ref<InstanceType<typeof FullCalendar>>();
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showActionsModal = ref(false);
const showLegendModal = ref(false);
const showDeleteModal = ref(false);
const selectedContent = ref<Content | null>(null);
const videoUpdateError = ref(0);
const contentToDelete = ref<Content | null>(null);
const editingContentId = ref<string | null>(null);
const rvUsers = ref<RvUser[]>([]);
const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth() + 1); // 1-12
const { monthQuery, backlogQuery, allContents } = useContentCalendarQueries(
    currentYear,
    currentMonth,
    () => authStore.userId,
    () => authStore.authSessionGeneration,
    () => authStore.role,
);
const backlogPanelRef = ref<InstanceType<typeof BacklogPanel> | null>(null);

const radarDetails = ref<ContentListDetails | null>(null);
const loadingRadarDetails = ref(false);

const newContent = ref({
    type: 'article' as ContentType,
    name: '',
    notes: '',
    publicationDate: '',
    closeDate: '',
    authorId: '',
    listDate: '',
    selectedMonth: new Date().getMonth() + 1,
    selectedWeek: 1,
    selectedYear: new Date().getFullYear()
});

const editingContent = ref<Content | ContentEditorData>({
    type: 'article' as ContentType,
    name: '',
    notes: '',
    publicationDate: '',
    authorId: ''
});

// Backlog items (content with backlog: true)
const backlogItems = computed(() => {
    return allContents.value
        .filter(c => c.backlog)
        .sort((a, b) => {
            // Primero ordenar por usuario: 'riff valley' primero
            const aIsRiffValley = a.author?.username?.toLowerCase() === 'riff valley';
            const bIsRiffValley = b.author?.username?.toLowerCase() === 'riff valley';

            if (aIsRiffValley && !bIsRiffValley) return -1;
            if (!aIsRiffValley && bIsRiffValley) return 1;

            // Si ambos son o no son 'riff valley', ordenar alfabéticamente por nombre
            return (a.name || '').localeCompare(b.name || '');
        });
});

// function handleDragStart(event: DragEvent, content: Content) {
//     if (event.dataTransfer) {
//         event.dataTransfer.effectAllowed = 'move';
//         event.dataTransfer.setData('text/plain', content.id);
//     }
// }

function resetNewContentDraft() {
    newContent.value = {
        type: 'article',
        name: '',
        notes: '',
        publicationDate: '',
        closeDate: '',
        authorId: '',
        listDate: '',
        selectedMonth: new Date().getMonth() + 1,
        selectedWeek: 1,
        selectedYear: new Date().getFullYear(),
    };
}

const contentCalendarOperations = useContentCalendarOperations({
    allContents,
    session: () => ({
        userId: authStore.userId,
        generation: authStore.authSessionGeneration,
        role: authStore.role,
    }),
    showCreateModal,
    showEditModal,
    showActionsModal,
    showDeleteModal,
    selectedContent,
    contentToDelete,
    editingContentId,
    editingContent,
    radarDetails,
    loadingRadarDetails,
    videoUpdateError,
    rvUsers,
    currentUserId: () => authStore.userId,
    setDefaultAuthorIfEmpty: (userId) => {
        if (!newContent.value.authorId) newContent.value.authorId = userId;
    },
    resetCreateDraft: resetNewContentDraft,
});

const {
    deleteRadarList,
    executeDeleteContent,
    handleBacklogDrop,
    handleCreateContent,
    handleDeleteFromBacklog,
    handleEventDrop,
    handleUpdateArticle,
    handleUpdateContent,
    handleUpdateContentAuthor,
    handleUpdateRadarDates,
    handleUpdateVideo,
    loadAssignableUsers,
    loadRadarDetails,
    toggleAsignation,
    updateListStatus,
    updateRadarField,
} = contentCalendarOperations;

async function handleCalendarEventClick(info: EventClickArg) {
    const content = allContents.value.find(({ id }) => id === info.event.id);
    if (!content) return;

    selectedContent.value = content;
    showActionsModal.value = true;
    if (["photos", "reunion", "article", "video"].includes(content.type)) {
        editingContentId.value = content.id;
        editingContent.value = content;
    }
    await loadRadarDetails(content);
}

const { calendarOptions, initBacklogDraggable } = useContentCalendarFullCalendar({
    allContents,
    userId: computed(() => authStore.userId),
    showOnlyMyEvents,
    currentYear,
    currentMonth,
    backlogPanelRef,
    onEventClick: handleCalendarEventClick,
    onBacklogDrop: handleBacklogDrop,
    onEventDrop: handleEventDrop,
});

function openEditModal(content: Content) {
    editingContentId.value = content.id;
    editingContent.value = {
        type: content.type,
        name: content.name,
        notes: content.notes || '',
        publicationDate: content.publicationDate || '',
        authorId: content.author?.id || ''
    };

    // Photos and reunions open their specialized actions modal directly from calendar click,
    // but from backlog or generic edit they should use the standard edit modal
    showEditModal.value = true;
}

function copyToClipboard(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        SwalService.success('Copiado al portapapeles');
    });
}

function copyArtistAndDisc(artist: string, disc: string) {
    navigator.clipboard.writeText(`**${artist}** - *${disc}*`).then(() => {
        SwalService.success('Info copiada');
    });
}

function toggleMyEventsFilter() {
    showOnlyMyEvents.value = !showOnlyMyEvents.value;
    calendarRef.value?.getApi?.()?.rerenderEvents?.();
}

function goToReunions() {
    showActionsModal.value = false;
    router.push('/reunions');
}

function goToArticlesKanban() {
    showActionsModal.value = false;
    router.push('/articles');
}

function goToVideosKanban() {
    showActionsModal.value = false;
    router.push('/videos');
}

function editFromActions() {
    if (selectedContent.value) {
        showActionsModal.value = false;
        openEditModal(selectedContent.value);
    }
}

function confirmDeleteContent() {
    contentToDelete.value = selectedContent.value;
    showActionsModal.value = false;
    showDeleteModal.value = true;
}

function cancelDeleteContent() {
    showDeleteModal.value = false;
    contentToDelete.value = null;
}

function updateCalendarSize() {
    calendarRef.value?.getApi().updateSize();
}

watch(showBacklog, async (isVisible) => {
    if (!isVisible) return;
    await nextTick();
    initBacklogDraggable();
});

onMounted(async () => {
    await loadAssignableUsers();
    initBacklogDraggable();
});



function navigateToRadarDetail() {
    if (selectedContent.value?.list?.id) {
        showActionsModal.value = false;
        if (selectedContent.value.type === 'best') {
            router.push(`/discos/mejores/${selectedContent.value.list.id}`);
        } else {
            router.push(`/discos/radar/${selectedContent.value.list.id}`);
        }
    }
}
</script>

<style scoped>
/* ─── Base ─── */
:deep(.fc) {
    font-family: inherit;
}

/* ─── Toolbar ─── */
:deep(.fc-toolbar) {
    padding: 1rem 1.25rem 0.75rem;
    flex-wrap: wrap;
    gap: 0.5rem;
}

:deep(.fc-toolbar-title) {
    font-size: 1.25rem;
    font-weight: 800;
    color: #00021f;
    letter-spacing: -0.02em;
}

/* Prev / Next — círculo rosa */
:deep(.fc-prev-button),
:deep(.fc-next-button) {
    background-color: rgba(228, 110, 138, 0.1) !important;
    border: none !important;
    color: #e46e8a !important;
    border-radius: 50% !important;
    width: 2rem !important;
    height: 2rem !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-shadow: none !important;
}

:deep(.fc-prev-button:hover),
:deep(.fc-next-button:hover) {
    background-color: #e46e8a !important;
    border-color: transparent !important;
    color: #ffffff !important;
}

/* Hoy — gradiente pink→purple */
:deep(.fc-today-button) {
    background: linear-gradient(to right, #e46e8a, #b0669f) !important;
    border: none !important;
    border-radius: 9999px !important;
    font-size: 0.8rem !important;
    font-weight: 700 !important;
    padding: 0.3rem 0.9rem !important;
    letter-spacing: 0.01em;
    box-shadow: none !important;
    text-transform: capitalize;
}

:deep(.fc-today-button:hover) {
    background: linear-gradient(to right, #b0669f, #e46e8a) !important;
    opacity: 1 !important;
}

:deep(.fc-today-button:disabled) {
    opacity: 0.4 !important;
}

:deep(.fc-button:focus) {
    box-shadow: none !important;
    outline: none !important;
}

/* ─── Cabeceras de columna ─── */
:deep(.fc-col-header) {
    background-color: #f8fafc;
}

:deep(.fc-col-header-cell) {
    padding: 0.5rem 0;
    border-bottom: 1px solid #f0f4f8 !important;
}

:deep(.fc-col-header-cell-cushion) {
    color: #6b7280;
    font-weight: 700;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-decoration: none;
}

/* ─── Celdas de día ─── */
:deep(.fc-daygrid-day-frame) {
    min-height: 110px;
    padding: 4px 6px;
}

:deep(.fc-daygrid-day-number) {
    font-weight: 700;
    font-size: 0.8125rem;
    color: #374151;
    text-decoration: none;
    padding: 4px 6px;
    border-radius: 50%;
    min-width: 1.75rem;
    text-align: center;
    line-height: 1.4;
    transition: background-color 0.15s;
}

/* Días de otros meses */
:deep(.fc-day-other .fc-daygrid-day-number) {
    color: #d1d5db;
    font-weight: 400;
}

/* Hoy: círculo sobre el número */
:deep(.fc-day-today) {
    background-color: rgba(228, 110, 138, 0.07) !important;
}

:deep(.fc-day-today .fc-daygrid-day-number) {
    background-color: #e46e8a;
    color: #ffffff !important;
}

/* ─── Eventos ─── */
:deep(.fc-event) {
    cursor: pointer;
    border-radius: 6px !important;
    border: none !important;
    padding: 2px 6px !important;
    font-size: 0.7rem !important;
    font-weight: 600 !important;
    margin-bottom: 2px !important;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

:deep(.fc-event:hover) {
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.18) !important;
    opacity: 0.95;
}

:deep(.fc-event-title) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ─── Grid ─── */
:deep(.fc-scrollgrid) {
    border: none !important;
}

:deep(.fc-scrollgrid td),
:deep(.fc-scrollgrid th) {
    border-color: #f1f5f9 !important;
}

/* Elimina el hueco blanco del scrollbar reservado por FullCalendar */
:deep(.fc-scroller),
:deep(.fc-scroller-liquid),
:deep(.fc-scroller-liquid-absolute) {
    overflow: hidden !important;
}

/* Dark mode button overrides — prev/next igual que en claro */
.dark :deep(.fc-prev-button),
.dark :deep(.fc-next-button) {
    background-color: rgba(228, 110, 138, 0.15) !important;
    color: #e46e8a !important;
}

.dark :deep(.fc-prev-button:hover),
.dark :deep(.fc-next-button:hover) {
    background-color: #e46e8a !important;
    color: #ffffff !important;
}

/* Transición del backlog */
.backlog-slide-enter-active,
.backlog-slide-leave-active {
    transition: transform 0.3s ease;
}
.backlog-slide-enter-from,
.backlog-slide-leave-to {
    transform: translateX(-100%);
}

/* ─── Mobile ─── */
@media (max-width: 639px) {
    /* Toolbar compacto */
    :deep(.fc-toolbar) {
        padding: 0.6rem 0.75rem 0.5rem;
        gap: 0.25rem;
    }

    :deep(.fc-toolbar-title) {
        font-size: 0.95rem;
    }

    :deep(.fc-prev-button),
    :deep(.fc-next-button) {
        width: 1.65rem !important;
        height: 1.65rem !important;
    }

    :deep(.fc-today-button) {
        font-size: 0.68rem !important;
        padding: 0.2rem 0.6rem !important;
    }

    /* Cabeceras — una sola letra */
    :deep(.fc-col-header-cell-cushion) {
        font-size: 0.62rem;
        letter-spacing: 0.04em;
    }

    /* Celdas de día más compactas */
    :deep(.fc-daygrid-day-frame) {
        min-height: 64px;
        padding: 2px 3px;
    }

    :deep(.fc-daygrid-day-number) {
        font-size: 0.68rem;
        padding: 2px 4px;
        min-width: 1.4rem;
    }

    /* Eventos más pequeños */
    :deep(.fc-event) {
        font-size: 0.6rem !important;
        padding: 1px 3px !important;
        border-radius: 4px !important;
    }

    /* Menos padding exterior en móvil */
    .rv-calendar-wrapper {
        padding: 0.5rem !important;
    }
}
</style>

<!-- Dark mode overrides for FullCalendar: must be non-scoped because the
     `dark` class lives on <html>, outside this component's scope boundary. -->
<style>
.dark .rv-calendar-wrapper .fc-toolbar-title { color: #ffffff !important; letter-spacing: -0.02em; }
.dark .rv-calendar-wrapper .fc-col-header { background-color: #32334a !important; }
.dark .rv-calendar-wrapper .fc-col-header-cell { border-bottom-color: rgba(255,255,255,0.08) !important; }
.dark .rv-calendar-wrapper .fc-col-header-cell-cushion { color: #9ca3af !important; }
.dark .rv-calendar-wrapper .fc-daygrid-day-number { color: #e5e7eb !important; }
.dark .rv-calendar-wrapper .fc-day-other .fc-daygrid-day-number { color: #4b5563 !important; }
.dark .rv-calendar-wrapper .fc-daygrid-day { background-color: #2a2b3d !important; }
.dark .rv-calendar-wrapper .fc-day-other { background-color: #1e1f2d !important; }
.dark .rv-calendar-wrapper .fc-scrollgrid { border-color: rgba(255,255,255,0.08) !important; }
.dark .rv-calendar-wrapper .fc-scrollgrid td,
.dark .rv-calendar-wrapper .fc-scrollgrid th { border-color: rgba(255,255,255,0.08) !important; }
.dark .rv-calendar-wrapper .fc-day-today { background-color: rgba(228, 110, 138, 0.15) !important; }
.dark .rv-calendar-wrapper .fc-day-today .fc-daygrid-day-number { background-color: #e46e8a; color: #ffffff !important; }
</style>
