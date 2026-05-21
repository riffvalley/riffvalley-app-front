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
            :content="editingContent" :rv-users="rvUsers" @close="showActionsModal = false"
            @update="handleUpdateContent" @delete="confirmDeleteContent" />

        <ReunionActionsModal v-else-if="selectedContent?.type === 'reunion'" :show="showActionsModal"
            :content="editingContent" :rv-users="rvUsers" @close="showActionsModal = false"
            @update="handleUpdateContent" @delete="confirmDeleteContent" @navigate-reunions="goToReunions" />

        <ArticleActionsModal v-else-if="selectedContent?.type === 'article'" :show="showActionsModal"
            :content="editingContent" :rv-users="rvUsers" @close="showActionsModal = false"
            @update="handleUpdateContent" @update-article="handleUpdateArticle"
            @delete="confirmDeleteContent" @navigate-kanban="goToArticlesKanban" />

        <VideoActionsModal v-else-if="selectedContent?.type === 'video'" :show="showActionsModal"
            :content="editingContent" :rv-users="rvUsers" @close="showActionsModal = false"
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
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import type { ContentType, Content } from '@services/contents/contents';
import { getContents, createContent as createContentAPI, updateContent, deleteContent, getContentsByMonth } from '@services/contents/contents';
import { useAuthStore } from '@stores/auth/auth';
import { getRvUsers } from '@services/users/users';
import SwalService from '@services/swal/SwalService';
import { updateAsignationService } from '@services/asignation/asignation';
import { deleteList, getListDetails, updateList } from '@services/list/list';

import { useRouter } from 'vue-router';
import { updateArticle } from '@services/articles/articles';
import { updateVideo } from '@services/videos/videos';

import BacklogPanel from './components/BacklogPanel.vue';
import CreateContentModal from './components/CreateContentModal.vue';
import EditContentModal from './components/EditContentModal.vue';
import RadarActionsModal from './components/RadarActionsModal.vue';
import PhotosActionsModal from './components/PhotosActionsModal.vue';
import ReunionActionsModal from './components/ReunionActionsModal.vue';
import ArticleActionsModal from './components/ArticleActionsModal.vue';
import VideoActionsModal from './components/VideoActionsModal.vue';
import GenericActionsModal from './components/GenericActionsModal.vue';
import LegendModal from './components/LegendModal.vue';
import DeleteConfirmModal from './components/DeleteConfirmModal.vue';


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
const contentToDelete = ref<Content | null>(null);
const allContents = ref<Content[]>([]);
const editingContentId = ref<string | null>(null);
const rvUsers = ref<any[]>([]);
const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth() + 1); // 1-12
const backlogPanelRef = ref<InstanceType<typeof BacklogPanel> | null>(null);

const radarDetails = ref<any>(null);
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

const editingContent = ref<any>({
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

// Calendar events (content with publicationDate and not in backlog)
const calendarEvents = computed(() => {
    return allContents.value
        .filter(c => !c.backlog && c.publicationDate)
        .map(c => {
            let start = c.publicationDate;

            // Always extract just the date part and treat as all-day.
            // In dayGridMonth view, non-allDay events render as small transparent dots
            // instead of full colored bars. Extracting the date-only string also
            // prevents timezone shifts that could display the event on the wrong day.
            start = start.split('T')[0];
            const allDay = true;

            // Calculate end date for FullCalendar (exclusive)
            let end = undefined;
            if (c.closeDate) {
                // Parse closeDate securely. If ISO, take date part.
                const closeDateStr = c.closeDate.split('T')[0]; // "YYYY-MM-DD"
                // Add 1 day using UTC noon to avoid timezone-based day shifts.
                // new Date("YYYY-MM-DD") parses as UTC midnight, and local setDate()
                // arithmetic can roll back to the same UTC day in UTC+ timezones.
                const d = new Date(closeDateStr + 'T12:00:00.000Z');
                d.setUTCDate(d.getUTCDate() + 1);
                const calculatedEnd = d.toISOString().split('T')[0];

                // Sanity check: end date must be after start date
                // Comparison works for ISO strings "YYYY-MM-DD..."
                if (calculatedEnd > start) {
                    end = calculatedEnd;
                }
            }

            return {
                id: c.id,
                title: c.name,
                start: start,
                end: end,
                allDay: allDay,
                backgroundColor: getContentTypeColor(c.type).bg,
                borderColor: getContentTypeColor(c.type).border,
                extendedProps: {
                    contentType: c.type,
                    notes: c.notes,
                    author: c.author,
                    editor: (c as any).article?.editor || (c as any).video?.editor || null,
                    list: c.list
                }
            };
        });
});

const calendarOptions = ref({
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: 'es',
    buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' },
    firstDay: 1,
    height: 'auto',
    headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: ''
    },
    dayHeaderFormat: { weekday: 'short' as const }, // Mostrar días de la semana (Lun, Mar, Mié, etc.)
    editable: true,
    droppable: true,
    events: calendarEvents,
    datesSet: (dateInfo: any) => {
        // When calendar view changes (month navigation)
        const viewDate = new Date(dateInfo.view.currentStart);
        const newYear = viewDate.getFullYear();
        const newMonth = viewDate.getMonth() + 1;

        // Only load if month/year changed
        if (newYear !== currentYear.value || newMonth !== currentMonth.value) {
            currentYear.value = newYear;
            currentMonth.value = newMonth;
            loadContentsByMonth(newYear, newMonth);
        }
    },
    eventContent: (arg: any) => {
        const author = arg.event.extendedProps.author;
        const editor = arg.event.extendedProps.editor;
        const notes = arg.event.extendedProps.notes || '';
        const isMyEvent = authStore.userId && author?.id === authStore.userId;
        const shouldDim = showOnlyMyEvents.value && !isMyEvent;
        const shouldHighlight = showOnlyMyEvents.value && isMyEvent;

        const container = document.createElement('div');
        container.className = `flex items-center gap-1.5 p-1 overflow-hidden transition-all ${shouldDim ? 'opacity-30' : 'opacity-100'}`;
        // Add native tooltip with notes
        if (notes) {
            container.title = notes;
        }

        // Add red border to my events when filter is active
        if (shouldHighlight) {
            container.style.border = '2px solid #ef4444';
            container.style.borderRadius = '4px';
            container.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
        }

        // Avatars container (author + editor)
        const avatarsContainer = document.createElement('div');
        avatarsContainer.className = 'flex items-center -space-x-1.5 flex-shrink-0';

        if (author?.image) {
            const img = document.createElement('img');
            img.src = author.image;
            img.alt = author.username;
            img.className = 'w-5 h-5 rounded-full object-cover border border-white';
            img.title = author.username;
            avatarsContainer.appendChild(img);
        }

        if (editor?.image) {
            const editorImg = document.createElement('img');
            editorImg.src = editor.image;
            editorImg.alt = editor.username;
            editorImg.className = 'w-5 h-5 rounded-full object-cover border border-white';
            editorImg.title = `Editor: ${editor.username}`;
            avatarsContainer.appendChild(editorImg);
        }

        if (avatarsContainer.childElementCount > 0) {
            container.appendChild(avatarsContainer);
        }

        const textContainer = document.createElement('div');
        textContainer.className = 'flex-1 min-w-0';

        const title = document.createElement('div');
        title.className = 'font-semibold text-xs truncate';
        title.textContent = arg.event.title;
        textContainer.appendChild(title);

        if (author?.username) {
            const authorName = document.createElement('div');
            authorName.className = 'text-[10px] opacity-75 truncate';
            authorName.textContent = editor?.username
                ? `${author.username} / ${editor.username}`
                : author.username;
            textContainer.appendChild(authorName);
        }

        container.appendChild(textContainer);

        return { domNodes: [container] };
    },
    eventClick: async (info: any) => {
        const contentId = info.event.id;
        const content = allContents.value.find(c => c.id === contentId);
        if (content) {
            selectedContent.value = content;
            showActionsModal.value = true;

            // Pre-fill editing content for modals that need it
            if (['photos', 'reunion', 'article', 'video'].includes(content.type)) {
                editingContentId.value = content.id;
                editingContent.value = content;
            }

            if ((content.type === 'radar' || content.type === 'best') && content.list?.id) {
                loadingRadarDetails.value = true;
                try {
                    const details = await getListDetails(content.list.id);
                    if (details && details.asignations) {
                        details.asignations.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
                    }
                    radarDetails.value = details;
                } catch (e) {
                    console.error('Error loading radar details', e);
                    SwalService.error('Error cargando detalles de la lista');
                } finally {
                    loadingRadarDetails.value = false;
                }
            } else {
                radarDetails.value = null;
            }
        }
    },
    drop: async (info: any) => {
        // info.draggedEl contains the element that was dropped
        // info.dateStr contains the date where it was dropped
        // The event data comes from data-event attribute correctly parsed by Draggable

        // We can get the ID from the event definition created by Draggable
        // info.event is NOT available in drop callback directly like this for external events initial drop depending on config,
        // but let's check what Draggable provides.
        // Actually, with Draggable, FullCalendar creates an event instance.

        // However, we want to handle the API update.
        // The easiest way with Draggable + parsed data-event is relying on 'eventReceive' if we want the event object,
        // or parsing the element yourself in 'drop'.

        // Let's rely on parsing the data-event attribute from the dragged element for simplicity and consistency with previous logic
        const eventData = JSON.parse(info.draggedEl.getAttribute('data-event'));
        const contentId = eventData.id;

        if (contentId) {
            await handleDropToCalendar(contentId, info.dateStr);
            // We don't need to manually remove the element, Vue's reactivity will handle it 
            // when loadBacklogContents() is called and the item gains a date.
            // But if FullCalendar adds the event automatically, we might have duplication until refresh.
            // 'droppable: true' makes FC render the event immediately.
            // We'll let the refresh syncing handle the final state.
            info.draggedEl.parentNode?.removeChild(info.draggedEl);
        }
    },
    eventReceive: (info: any) => {
        // FullCalendar automatically adds an event to its internal state when an
        // external element is dropped (droppable: true). Since calendarEvents is a
        // reactive computed that drives all displayed events, this auto-added event
        // creates a duplicate ghost. Remove it immediately and let the reactive
        // update (triggered by loadContentsByMonth after the API call) handle display.
        info.event.remove();
    },
    eventDrop: async (info: any) => {
        const contentId = info.event.id;
        const newDate = info.event.startStr;

        // Check for Radar lock: if radar has asignations, prevent move
        const extendedProps = info.event.extendedProps;
        if (extendedProps.contentType === 'radar' && extendedProps.list?.asignations?.length > 0) {
            info.revert();
            SwalService.error('No se puede mover un Radar que ya tiene asignaciones.');
            return;
        }

        try {
            await updateContent(contentId, { publicationDate: toCalendarDate(newDate), backlog: false });
            await loadBacklogContents();
            await loadContentsByMonth(currentYear.value, currentMonth.value);
            SwalService.success('Evento reprogramado correctamente');
        } catch (error) {
            console.error('Error updating content date:', error);
            info.revert();
            SwalService.error('Error al mover el evento');
        }
    },
    eventDragStop: async (info: any) => {
        const jsEvent = info.jsEvent;
        const content = allContents.value.find(c => c.id === info.event.id);

        // Prevent mandatory date types from being moved to backlog
        const mandatoryDateTypes = ['reunion', 'radar', 'best'];
        if (content && mandatoryDateTypes.includes(content.type)) {
            // Check if dropped on backlog
            if (backlogPanelRef.value?.$el.querySelector('.flex-1')) {
                const backlogRect = backlogPanelRef.value?.$el.querySelector('.flex-1').getBoundingClientRect();
                if (
                    jsEvent.clientX >= backlogRect.left &&
                    jsEvent.clientX <= backlogRect.right &&
                    jsEvent.clientY >= backlogRect.top &&
                    jsEvent.clientY <= backlogRect.bottom
                ) {
                    // Revert the drag - these types cannot go to backlog
                    info.revert();
                    SwalService.error(`El contenido tipo "${getContentTypeLabel(content.type)}" requiere fecha obligatoria y no puede volver al backlog.`);
                    return;
                }
            }
        }

        // Check if dropped on backlog (for non-meeting content)
        if (backlogPanelRef.value?.$el.querySelector('.flex-1')) {
            const backlogRect = backlogPanelRef.value?.$el.querySelector('.flex-1').getBoundingClientRect();
            // Check collision with backlog container
            if (
                jsEvent.clientX >= backlogRect.left &&
                jsEvent.clientX <= backlogRect.right &&
                jsEvent.clientY >= backlogRect.top &&
                jsEvent.clientY <= backlogRect.bottom
            ) {
                const contentId = info.event.id;
                try {
                    await handleDropToCalendar(contentId, null as any); // Send null to move to backlog
                } catch {
                    // Reload to restore consistent state
                    await loadBacklogContents();
                    await loadContentsByMonth(currentYear.value, currentMonth.value);
                }
            }
        }
    }
});

function getContentTypeLabel(type: ContentType): string {
    const labels: Record<ContentType, string> = {
        article: 'Artículo',
        photos: 'Fotos',
        spotify: 'Spotify',
        radar: 'Radar',
        best: 'Mejores del Mes',
        video: 'Video',
        reunion: 'Reunión'
    };
    return labels[type];
}



function getContentTypeColor(type: ContentType) {
    const colors: Record<ContentType, { bg: string; border: string }> = {
        article: { bg: '#3b82f6', border: '#2563eb' },     // Azul
        photos: { bg: '#ec4899', border: '#db2777' },      // Rosa/Magenta
        spotify: { bg: '#22c55e', border: '#16a34a' },        // Verde Lima
        radar: { bg: '#f59e0b', border: '#d97706' },       // Amarillo/Ámbar
        best: { bg: '#ef4444', border: '#dc2626' },        // Rojo
        video: { bg: '#8b5cf6', border: '#7c3aed' },       // Violeta
        reunion: { bg: '#f97316', border: '#ea580c' }      // Naranja
    };
    return colors[type];
}

// function handleDragStart(event: DragEvent, content: Content) {
//     if (event.dataTransfer) {
//         event.dataTransfer.effectAllowed = 'move';
//         event.dataTransfer.setData('text/plain', content.id);
//     }
// }

// Converts a "YYYY-MM-DD" date string from FullCalendar to "YYYY-MM-DDT18:00:00.000Z".
// Using 18:00 UTC avoids day-shift issues in any reasonable timezone (UTC-18 to UTC+5).
function toCalendarDate(dateStr: string | null): string | null {
    if (!dateStr) return null;
    // If it already has a time component, leave it as-is
    if (dateStr.includes('T')) return dateStr;
    return dateStr + 'T18:00:00.000Z';
}

async function handleDropToCalendar(contentId: string, dateStr: string | null) {
    try {
        await updateContent(contentId, {
            publicationDate: toCalendarDate(dateStr),
            backlog: dateStr === null
        });
        // Reload both backlog and current month
        await loadBacklogContents();
        await loadContentsByMonth(currentYear.value, currentMonth.value);
        SwalService.success(dateStr ? 'Evento programado correctamente' : 'Evento movido al backlog');
    } catch (error) {
        console.error('Error updating content date:', error);
        SwalService.error('Error al mover el evento');
    }
}

async function handleCreateContent(data: any) {
    const contentData = data || newContent.value;

    if (!contentData.name || !contentData.authorId) return;

    // Validate mandatory date types
    const mandatoryDateTypes = ['reunion', 'radar', 'best'];
    if (mandatoryDateTypes.includes(contentData.type) && !contentData.publicationDate) {
        SwalService.error(`El contenido tipo "${getContentTypeLabel(contentData.type)}" requiere una fecha de publicación obligatoria`);
        return;
    }

    try {
        // Create the content directly without creating a separate reunion entity first
        await createContentAPI({
            type: contentData.type,
            name: contentData.name,
            notes: contentData.notes || undefined,
            publicationDate: contentData.publicationDate ? new Date(contentData.publicationDate).toISOString() : undefined,
            closeDate: contentData.closeDate || undefined,
            authorId: contentData.authorId,
            listDate: contentData.listDate || undefined,
            backlog: !contentData.publicationDate
        });

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
            selectedYear: new Date().getFullYear()
        };
        showCreateModal.value = false;
        // Reload backlog since new content might be created without date
        await loadBacklogContents();
        // Also reload current month to preserve scheduled events
        await loadContentsByMonth(currentYear.value, currentMonth.value);
        SwalService.success('Evento creado correctamente');
    } catch (error) {
        console.error('Error creating content:', error);
        SwalService.error('Error al crear el contenido. Por favor, intenta de nuevo.');
    }
}

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

function toggleMyEventsFilter() {
    showOnlyMyEvents.value = !showOnlyMyEvents.value;
    // Force calendar to re-render by triggering reactivity
    allContents.value = [...allContents.value];
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

async function handleUpdateArticle(data: any) {
    try {
        await updateArticle(data.articleId, {
            name: data.name,
            type: data.type,
            status: data.status,
            link: data.link,
            userId: data.userId,
            editorId: data.editorId
        });
    } catch (error) {
        console.error('Error updating article:', error);
        SwalService.error('Error al actualizar el artículo');
    }
}

async function handleUpdateVideo(data: any) {
    try {
        await updateVideo(data.videoId, {
            name: data.name,
            type: data.type,
            status: data.status,
            link: data.link,
            userId: data.userId,
            editorId: data.editorId
        });
    } catch (error) {
        console.error('Error updating video:', error);
        SwalService.error('Error al actualizar el video');
    }
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

async function executeDeleteContent() {
    if (!contentToDelete.value) return;

    try {
        await deleteContent(contentToDelete.value.id);
        // Remove from local state
        allContents.value = allContents.value.filter(c => c.id !== contentToDelete.value!.id);
        showDeleteModal.value = false;
        contentToDelete.value = null;
        // Reload data
        await loadBacklogContents();
        await loadContentsByMonth(currentYear.value, currentMonth.value);
        SwalService.success('Evento eliminado correctamente');
    } catch (error) {
        console.error('Error deleting content:', error);
        SwalService.error('No se pudo eliminar el evento');
    }
}

async function handleDeleteFromBacklog(content: Content) {
    const result = await SwalService.confirm(
        '¿Eliminar evento?',
        `Vas a eliminar "${content.name}". Esta acción no se puede deshacer.`,
        'Sí, eliminar', 'Cancelar'
    );
    if (!result.isConfirmed) return;

    try {
        await deleteContent(content.id);
        allContents.value = allContents.value.filter(c => c.id !== content.id);
        await loadBacklogContents();
        SwalService.success('Evento eliminado correctamente');
    } catch (error) {
        console.error('Error deleting content:', error);
        SwalService.error('No se pudo eliminar el evento');
    }
}

async function toggleAsignation(asig: any) {
    const newState = !asig.done;
    // Optimistic UI update
    asig.done = newState;

    try {
        await updateAsignationService(asig.id, { done: newState });
    } catch (e) {
        console.error('Error updating asignation', e);
        asig.done = !newState; // Revert
        SwalService.error('Error actualizando el estado de la asignación');
    }
}

async function deleteRadarList() {
    if (!selectedContent.value?.list?.id) return;

    const result = await SwalService.confirm(
        '¿Eliminar Lista?',
        'Estás a punto de eliminar la lista asociada a este radar. Esta acción no se puede deshacer.',
        'Sí, eliminar', 'Cancelar'
    );

    if (result.isConfirmed) {
        try {
            await deleteList(selectedContent.value.list.id);
            SwalService.success('Lista eliminada correctamente');
            showActionsModal.value = false;
            // Reload calendar
            await loadContentsByMonth(currentYear.value, currentMonth.value);
        } catch (e) {
            console.error(e);
            SwalService.error('Error eliminando la lista');
        }
    }
}

async function handleUpdateContent(data: any) {
    const contentData = data || editingContent.value;

    if (!editingContentId.value || !contentData.name || !contentData.authorId) return;

    // Validate mandatory date types
    const mandatoryDateTypes = ['reunion', 'radar', 'best'];
    if (mandatoryDateTypes.includes(contentData.type) && !contentData.publicationDate) {
        SwalService.error(`El contenido tipo "${getContentTypeLabel(contentData.type)}" requiere una fecha de publicación obligatoria`);
        return;
    }

    try {
        await updateContent(editingContentId.value, {
            type: contentData.type,
            name: contentData.name,
            notes: contentData.notes || undefined,
            publicationDate: contentData.publicationDate ? new Date(contentData.publicationDate).toISOString() : null,
            closeDate: contentData.closeDate || null,
            authorId: contentData.authorId
        });

        showEditModal.value = false;
        showActionsModal.value = false;
        editingContentId.value = null;
        // Reload both backlog and current month
        await loadBacklogContents();
        await loadContentsByMonth(currentYear.value, currentMonth.value);
        SwalService.success('Evento actualizado correctamente');
    } catch (error) {
        console.error('Error updating content:', error);
        SwalService.error('Error al actualizar el evento');
    }
}


function copyToClipboard(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        SwalService.success("Copiado al portapapeles");
    });
}


function copyArtistAndDisc(artist: string, disc: string) {
    const formattedText = `**${artist}** - *${disc}*`;
    navigator.clipboard.writeText(formattedText).then(() => {
        SwalService.success("Info copiada");
    });
}



async function updateListStatus(list: any) {
    if (!list || !list.id) return;
    try {
        await updateList(list.id, { status: list.status });
        SwalService.success('Estado actualizado');
    } catch (error) {
        console.error('Error updating status:', error);
        SwalService.error('Error al actualizar estado');
    }
}

async function updateRadarField(field: string, value: any) {
    if (!radarDetails.value || !radarDetails.value.id) return;
    try {
        await updateList(radarDetails.value.id, { [field]: value });
        radarDetails.value = { ...radarDetails.value, [field]: value };
        await loadContentsByMonth(currentYear.value, currentMonth.value);
        SwalService.success('Fecha actualizada correctamente');
    } catch (error) {
        console.error(`Error updating ${field}:`, error);
        SwalService.error('Error al actualizar fecha');
    }
}

async function handleUpdateRadarDates(publicationDate: string, closeDate: string | null) {
    if (!selectedContent.value) return;
    const contentId = selectedContent.value.id;
    try {
        await updateContent(contentId, {
            publicationDate: toCalendarDate(publicationDate),
            closeDate: closeDate ? toCalendarDate(closeDate) : null
        });
        const item = allContents.value.find(c => c.id === contentId);
        if (item) {
            item.publicationDate = toCalendarDate(publicationDate)!;
            item.closeDate = closeDate ? toCalendarDate(closeDate) : null;
        }
        SwalService.success('Fechas actualizadas');
    } catch (error) {
        console.error('Error updating dates:', error);
        SwalService.error('Error al actualizar las fechas');
    }
}


async function handleUpdateContentAuthor(authorId: string) {
    if (!selectedContent.value) return;
    const contentId = selectedContent.value.id;
    try {
        await updateContent(contentId, { authorId });
        const item = allContents.value.find(c => c.id === contentId);
        if (item) {
            const user = rvUsers.value.find((u: any) => u.id === authorId);
            if (user) item.author = user;
        }
        SwalService.success('Autor actualizado');
    } catch (error) {
        console.error('Error updating author:', error);
        SwalService.error('Error al actualizar el autor');
    }
}

async function loadRvUsers() {
    try {
        rvUsers.value = await getRvUsers();
        // Set default author to current user if available
        if (authStore.userId && !newContent.value.authorId) {
            newContent.value.authorId = authStore.userId;
        }
    } catch (error) {
        console.error('Error loading RV users:', error);
    }
}

async function loadContentsByMonth(year: number, month: number) {
    try {
        const monthContents = await getContentsByMonth(year, month);

        // Keep backlog items and add new month contents
        const currentBacklog = allContents.value.filter(c => c.backlog);
        const scheduledItems = monthContents.filter(c => !c.backlog && c.publicationDate);

        allContents.value = [...currentBacklog, ...scheduledItems];
    } catch (error) {
        console.error('Error loading contents by month:', error);
    }
}

async function loadBacklogContents() {
    try {
        const backlog = await getContents(true);
        // Preserve existing scheduled items while updating backlog
        const scheduledItems = allContents.value.filter(c => !c.backlog && c.publicationDate);
        allContents.value = [...backlog, ...scheduledItems];
    } catch (error) {
        console.error('Error loading backlog contents:', error);
    }
}

function updateCalendarSize() {
    calendarRef.value?.getApi().updateSize();
}

function initDraggable() {
    const container = backlogPanelRef.value?.$el.querySelector('.flex-1');
    if (container) {
        new Draggable(container, {
            itemSelector: '.fc-event',
            eventData: (eventEl: HTMLElement) => JSON.parse(eventEl.getAttribute('data-event') || '{}')
        });
    }
}

watch(showBacklog, async (val) => {
    if (val) {
        await nextTick();
        initDraggable();
    }
});

const isMobile = ref(window.innerWidth < 640);
const onResize = () => {
    const mobile = window.innerWidth < 640;
    if (mobile !== isMobile.value) {
        isMobile.value = mobile;
        calendarOptions.value.dayHeaderFormat = { weekday: mobile ? 'narrow' : 'short' };
    }
};

onMounted(async () => {
    await loadRvUsers();
    await loadBacklogContents();
    await loadContentsByMonth(currentYear.value, currentMonth.value);
    initDraggable();
    window.addEventListener('resize', onResize);
    // Aplica el formato correcto al montar
    calendarOptions.value.dayHeaderFormat = { weekday: isMobile.value ? 'narrow' : 'short' };
});

onUnmounted(() => {
    window.removeEventListener('resize', onResize);
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
