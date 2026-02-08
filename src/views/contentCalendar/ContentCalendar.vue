<template>
    <div class="flex h-screen overflow-hidden bg-gray-50">
        <!-- Backlog Panel Component -->
        <BacklogPanel :backlog-items="backlogItems" :show-only-my-events="showOnlyMyEvents" :user-id="authStore.userId"
            @create-new="showCreateModal = true" @edit-content="openEditModal" ref="backlogPanelRef" />

        <!-- Calendar Panel -->
        <div class="flex-1 flex flex-col overflow-hidden">
            <div class="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
                <h1 class="text-xl font-bold text-gray-900">Calendario de Eventos</h1>
                <div class="flex gap-2">
                    <!-- Botón de filtro de usuario -->
                    <button v-if="authStore.userId" @click="toggleMyEventsFilter"
                        class="relative transition-all duration-300"
                        :class="showOnlyMyEvents ? '' : 'opacity-60 grayscale'"
                        :title="showOnlyMyEvents ? 'Mostrar todos los eventos' : 'Mostrar solo mis eventos'">
                        <div class="relative">
                            <img v-if="authStore.image" :src="authStore.image" :alt="authStore.username || 'Usuario'"
                                class="w-10 h-10 rounded-full object-cover transition-all"
                                :class="showOnlyMyEvents ? 'ring-4 ring-indigo-600 ring-offset-2' : ''" />
                            <div v-else
                                class="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg"
                                :class="showOnlyMyEvents ? 'ring-4 ring-indigo-600 ring-offset-2' : ''">
                                {{ authStore.username?.charAt(0).toUpperCase() }}
                            </div>
                        </div>
                    </button>

                    <!-- Botón de leyenda -->
                    <button @click="showLegendModal = true"
                        class="w-10 h-10 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 font-bold text-lg transition-colors flex items-center justify-center"
                        title="Ver leyenda de colores">
                        ?
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-auto p-4">
                <div class="bg-white rounded-lg shadow-lg p-4">
                    <FullCalendar :options="calendarOptions" ref="calendarRef" />
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
            :loading="loadingRadarDetails" @close="showActionsModal = false" @update-field="updateRadarField"
            @update-status="updateListStatus" @toggle-asignation="toggleAsignation" @delete-list="deleteRadarList"
            @navigate-detail="navigateToRadarDetail" @copy-artist-disc="copyArtistAndDisc"
            @copy-image="copyToClipboard" />

        <PhotosActionsModal v-else-if="selectedContent?.type === 'photos'" :show="showActionsModal"
            :content="editingContent" :rv-users="rvUsers" @close="showActionsModal = false"
            @update="handleUpdateContent" @delete="confirmDeleteContent" />

        <ReunionActionsModal v-else-if="selectedContent?.type === 'reunion'" :show="showActionsModal"
            :content="editingContent" :rv-users="rvUsers" @close="showActionsModal = false"
            @update="handleUpdateContent" @delete="confirmDeleteContent" @navigate-reunions="goToReunions" />

        <GenericActionsModal v-else :show="showActionsModal" :content="selectedContent"
            @close="showActionsModal = false" @edit="editFromActions" @delete="confirmDeleteContent" />

        <LegendModal :show="showLegendModal" @close="showLegendModal = false" />

        <DeleteConfirmModal :show="showDeleteModal" :content-name="contentToDelete?.name || ''"
            @cancel="cancelDeleteContent" @confirm="executeDeleteContent" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
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

import BacklogPanel from './components/BacklogPanel.vue';
import CreateContentModal from './components/CreateContentModal.vue';
import EditContentModal from './components/EditContentModal.vue';
import RadarActionsModal from './components/RadarActionsModal.vue';
import PhotosActionsModal from './components/PhotosActionsModal.vue';
import ReunionActionsModal from './components/ReunionActionsModal.vue';
import GenericActionsModal from './components/GenericActionsModal.vue';
import LegendModal from './components/LegendModal.vue';
import DeleteConfirmModal from './components/DeleteConfirmModal.vue';


const authStore = useAuthStore();
const showOnlyMyEvents = ref(false);

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

// Backlog items (content without publicationDate)
const backlogItems = computed(() => {
    return allContents.value
        .filter(c => !c.publicationDate)
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

// Calendar events (content with publicationDate)
// Calendar events (content with publicationDate)
const calendarEvents = computed(() => {
    return allContents.value
        .filter(c => c.publicationDate)
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
                // Add 1 day
                const d = new Date(closeDateStr);
                d.setDate(d.getDate() + 1);
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
                    list: c.list
                }
            };
        });
});

const calendarOptions = ref({
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: 'es',
    firstDay: 1, // Empezar en lunes
    height: 'auto',
    headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth'
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

        if (author?.image) {
            const img = document.createElement('img');
            img.src = author.image;
            img.alt = author.username;
            img.className = 'w-5 h-5 rounded-full object-cover flex-shrink-0';
            container.appendChild(img);
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
            authorName.textContent = author.username;
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

            // Pre-fill editing content for photos and reunions for the direct modal
            if (content.type === 'photos' || content.type === 'reunion') {
                editingContentId.value = content.id;
                editingContent.value = {
                    type: content.type,
                    name: content.name,
                    notes: content.notes || '',
                    publicationDate: content.publicationDate || '',
                    authorId: content.author?.id || ''
                };
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

        await handleDropToCalendar(contentId, newDate);
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
        best: 'Mejores Discos',
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

async function handleDropToCalendar(contentId: string, dateStr: string | null) {
    try {
        await updateContent(contentId, { publicationDate: dateStr });
        // Reload both backlog and current month
        await loadBacklogContents();
        await loadContentsByMonth(currentYear.value, currentMonth.value);
        // No need to manually update events - calendarEvents is reactive
    } catch (error) {
        console.error('Error updating content date:', error);
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
            listDate: contentData.listDate || undefined
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
        'warning'
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
    } catch (error) {
        console.error('Error updating content:', error);
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
        // Optionally show success toast
        // SwalService.success('Estado actualizado');
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
    } catch (error) {
        console.error(`Error updating ${field}:`, error);
        SwalService.error('Error al actualizar fecha');
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

        // Keep backlog items (no publicationDate) and add new month contents
        const backlogItems = allContents.value.filter(c => !c.publicationDate);
        const scheduledItems = monthContents.filter(c => c.publicationDate);

        allContents.value = [...backlogItems, ...scheduledItems];
    } catch (error) {
        console.error('Error loading contents by month:', error);
    }
}

async function loadBacklogContents() {
    try {
        // Load all contents to get backlog items (those without publicationDate)
        const allData = await getContents();
        const backlog = allData.filter(c => !c.publicationDate);
        // Preserve existing scheduled items while updating backlog
        const scheduledItems = allContents.value.filter(c => c.publicationDate);
        allContents.value = [...backlog, ...scheduledItems];
    } catch (error) {
        console.error('Error loading backlog contents:', error);
    }
}

onMounted(async () => {
    await loadRvUsers();
    // Load backlog first
    await loadBacklogContents();
    // Then load current month's scheduled content
    await loadContentsByMonth(currentYear.value, currentMonth.value);

    // Initialize Draggable
    if (backlogPanelRef.value?.$el.querySelector('.flex-1')) {
        new Draggable(backlogPanelRef.value?.$el.querySelector('.flex-1'), {
            itemSelector: '.fc-event',
            eventData: function (eventEl) {
                return JSON.parse(eventEl.getAttribute('data-event') || '{}');
            }
        });
    }
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
:deep(.fc) {
    font-family: inherit;
}

:deep(.fc-toolbar-title) {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
}

:deep(.fc-button) {
    background-color: #6366f1 !important;
    border-color: #6366f1 !important;
    text-transform: capitalize;
    font-size: 0.875rem;
    padding: 0.375rem 0.75rem;
}

:deep(.fc-button:hover) {
    background-color: #4f46e5 !important;
    border-color: #4f46e5 !important;
}

:deep(.fc-button-active) {
    background-color: #4338ca !important;
    border-color: #4338ca !important;
}

:deep(.fc-daygrid-day-number) {
    color: #374151;
    font-weight: 600;
    font-size: 0.875rem;
}

:deep(.fc-day-today) {
    background-color: #fef3c7 !important;
}

:deep(.fc-event) {
    cursor: pointer;
    border-radius: 4px;
    padding: 4px;
    font-size: 0.75rem;
    min-height: 40px;
}

:deep(.fc-event:hover) {
    opacity: 0.85;
    transform: scale(1.02);
    transition: all 0.2s;
}

:deep(.fc-daygrid-day-frame) {
    min-height: 100px;
}
</style>
