<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <button
      type="button"
      class="absolute inset-0 w-full h-full border-0 bg-transparent p-0"
      aria-label="Cerrar diálogo"
      @click="requestClose"
    ></button>
    <div
      class="bg-white dark:bg-rv-darkCard rounded-t-2xl sm:rounded-2xl p-5 sm:p-8 w-full sm:max-w-2xl shadow-2xl relative overflow-hidden max-h-[92vh] overflow-y-auto z-10"
      ref="dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Acciones de vídeo"
      tabindex="-1"
    >
      <div
        class="absolute top-0 right-0 w-64 h-64 bg-violet-50 dark:bg-violet-900/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"
      ></div>

      <div class="relative z-10">
        <div class="flex justify-between items-start mb-6">
          <div class="flex items-center gap-2">
            <span
              class="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold uppercase tracking-wider rounded-md"
            >
              Video
            </span>
            <span
              v-if="videoData?.type"
              class="px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-md"
              :class="getVideoTypeColor(videoData.type)"
            >
              {{ videoData.type }}
            </span>
          </div>
          <button
            @click="requestClose"
            aria-label="Cerrar diálogo"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-rv-darkSurface"
          >
            <i class="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div class="space-y-6" :inert="saveStatus.saving">
          <div>
            <input
              v-model="formData.name"
              type="text"
              aria-label="Título del video"
              class="w-full text-xl sm:text-3xl font-bold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 border-none focus:ring-0 p-0 bg-transparent"
              placeholder="Título del video..."
            />
            <button
              @click="$emit('navigate-kanban')"
              :disabled="saveStatus.saving"
              class="mt-2 text-xs text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center gap-1"
            >
              <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              <span>Ver en tablero de videos</span>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <span
                  id="cc-label-videoactionsmodal-1"
                  class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"
                  >Notas</span
                >
                <textarea
                  v-model="formData.notes"
                  class="w-full border-0 bg-gray-50 dark:bg-rv-darkSurface rounded-xl px-4 py-3 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30 focus:bg-white dark:focus:bg-rv-darkBg transition-all resize-none text-sm leading-relaxed"
                  rows="4"
                  placeholder="Notas sobre el video..."
                  aria-labelledby="cc-label-videoactionsmodal-1"
                ></textarea>
              </div>

              <div>
                <span
                  id="cc-label-videoactionsmodal-2"
                  class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"
                  >Tipo de video</span
                >
                <select
                  v-model="formData.videoType"
                  class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg text-sm"
                  aria-labelledby="cc-label-videoactionsmodal-2"
                >
                  <option v-for="t in VIDEO_TYPES" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>

              <div>
                <span
                  id="cc-label-videoactionsmodal-3"
                  class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"
                  >Estado</span
                >
                <select
                  v-model="formData.videoStatus"
                  class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg text-sm"
                  aria-labelledby="cc-label-videoactionsmodal-3"
                >
                  <option v-for="s in VIDEO_STATUSES" :key="s" :value="s">
                    {{ getStatusLabel(s) }}
                  </option>
                </select>
              </div>
            </div>

            <div class="space-y-6">
              <div class="bg-gray-50 dark:bg-rv-darkSurface rounded-xl p-5 space-y-5">
                <div>
                  <span
                    id="cc-label-videoactionsmodal-4"
                    class="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"
                  >
                    <i class="fa-regular fa-calendar"></i> Fecha de Publicación
                  </span>
                  <input
                    v-model="formData.publicationDate"
                    type="date"
                    class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg text-sm"
                    aria-labelledby="cc-label-videoactionsmodal-4"
                  />
                  <button
                    v-if="formData.publicationDate"
                    @click="formData.publicationDate = ''"
                    class="text-xs text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 mt-2 flex items-center gap-1 transition-colors"
                  >
                    <i class="fa-solid fa-arrow-rotate-left"></i> Mover a backlog
                  </button>
                </div>

                <div>
                  <span
                    id="cc-label-videoactionsmodal-5"
                    class="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"
                  >
                    <i class="fa-regular fa-user"></i> Autor (Calendario)
                  </span>
                  <AssignableUsersFeedback
                    :loading="usersLoading"
                    :error="usersError"
                    :refreshing="usersRefreshing"
                    @retry="emit('retry-users')"
                  />
                  <select
                    v-model="formData.authorId"
                    :disabled="usersLoading || rvUsers.length === 0"
                    class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg text-sm"
                    aria-labelledby="cc-label-videoactionsmodal-5"
                  >
                    <option value="">Seleccionar autor...</option>
                    <option v-for="user in rvUsers" :key="user.id" :value="user.id">
                      {{ user.username }}
                    </option>
                  </select>
                </div>

                <div>
                  <span
                    id="cc-label-videoactionsmodal-6"
                    class="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"
                  >
                    <i class="fa-solid fa-user"></i> Usuario asignado
                  </span>
                  <select
                    v-model="formData.userId"
                    :disabled="usersLoading || rvUsers.length === 0"
                    class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg text-sm"
                    aria-labelledby="cc-label-videoactionsmodal-6"
                  >
                    <option value="">Sin asignar</option>
                    <option v-for="user in rvUsers" :key="user.id" :value="user.id">
                      {{ user.username }}
                    </option>
                  </select>
                </div>

                <div>
                  <span
                    id="cc-label-videoactionsmodal-7"
                    class="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"
                  >
                    <i class="fa-solid fa-pen-nib"></i> Editor
                  </span>
                  <select
                    v-model="formData.editorId"
                    :disabled="usersLoading || rvUsers.length === 0"
                    class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg text-sm"
                    aria-labelledby="cc-label-videoactionsmodal-7"
                  >
                    <option value="">Sin editor</option>
                    <option v-for="user in rvUsers" :key="user.id" :value="user.id">
                      {{ user.username }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="flex flex-wrap justify-between items-center gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 dark:border-white/10"
        >
          <button
            @click="$emit('delete')"
            :disabled="saveStatus.saving"
            class="group flex items-center gap-2 text-gray-400 hover:text-red-600 transition-colors px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Eliminar permanentemente"
          >
            <i
              class="fa-regular fa-trash-can text-lg group-hover:scale-110 transition-transform"
            ></i>
            <span class="text-sm font-medium">Eliminar</span>
          </button>

          <div class="flex gap-2 sm:gap-3">
            <button
              @click="requestClose"
              :disabled="saveStatus.saving"
              class="px-4 py-2 sm:px-6 sm:py-2.5 bg-gray-100 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg font-medium rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <p
              v-if="saveStatus.message"
              :role="saveStatus.retryAvailable ? 'alert' : 'status'"
              class="text-sm text-red-600 dark:text-red-300"
              aria-live="polite"
            >
              {{ saveStatus.message }}
            </p>
            <button
              @click="handleUpdate"
              :disabled="usersLoading || rvUsers.length === 0 || saveStatus.saving"
              class="px-4 py-2 sm:px-6 sm:py-2.5 bg-rv-purple text-white font-medium rounded-xl hover:bg-rv-pink shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              {{
                saveStatus.saving
                  ? "Guardando…"
                  : saveStatus.message
                    ? saveStatus.retryAvailable
                      ? "Reintentar partes fallidas"
                      : "Revisar estado en servidor"
                    : "Guardar Cambios"
              }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDialogFocus } from "../composables/useDialogFocus";
import { ref, watch } from "vue";
import type { Content } from "@services/contents/contents";
import { formatCalendarDateInput } from "../../utils/contentCalendarDates";
import type { RvUser } from "@/modules/identity/users";
import AssignableUsersFeedback from "./AssignableUsersFeedback.vue";
import type { ContentEditorData, VideoUpdateData } from "../../types/contentCalendar.types";
import type { CompositeSaveStatus } from "../../application/useContentCalendarOperations";
import {
  VIDEO_TYPES,
  VIDEO_STATUSES,
  type VideoStatus,
  type VideoType,
} from "@services/videos/videos";

interface Props {
  show: boolean;
  content: Content;
  rvUsers: RvUser[];
  usersLoading?: boolean;
  usersError?: boolean;
  usersRefreshing?: boolean;
  saveStatus?: CompositeSaveStatus;
}

const props = withDefaults(defineProps<Props>(), {
  saveStatus: () => ({ saving: false, message: "", retryAvailable: true }),
  usersLoading: false,
  usersError: false,
  usersRefreshing: false,
});
const { dialog } = useDialogFocus(() => props.show);

const emit = defineEmits<{
  close: [];
  "retry-users": [];
  save: [content: ContentEditorData, video: VideoUpdateData];
  delete: [];
  "navigate-kanban": [];
}>();

const videoData = ref(props.content.video ?? null);

function formatForInput(dateStr: string): string {
  return formatCalendarDateInput(dateStr);
}

function requestClose() {
  if (!props.saveStatus.saving) emit("close");
}

function getStatusLabel(status: VideoStatus): string {
  const labels: Record<VideoStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    editing: "Reviewing",
    ready: "Ready",
    published: "Published",
  };
  return labels[status];
}

function getVideoTypeColor(type: VideoType): string {
  switch (type) {
    case "best":
      return "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300";
    case "custom":
      return "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300";
    default:
      return "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300";
  }
}

const video = props.content.video;
const initialUserId = ref(video?.userId || video?.user?.id || "");
const initialEditorId = ref(video?.editorId || video?.editor?.id || "");

const formData = ref({
  type: "video" as const,
  name: props.content.name,
  notes: props.content.notes || "",
  publicationDate: formatForInput(props.content.publicationDate || ""),
  authorId: props.content.author?.id || "",
  videoType: video?.type || ("best" as VideoType),
  videoStatus: video?.status || ("not_started" as VideoStatus),
  userId: video?.userId || video?.user?.id || "",
  editorId: video?.editorId || video?.editor?.id || "",
});

watch(
  () => props.content.id,
  () => {
    const newContent = props.content;
    const v = newContent.video;
    videoData.value = v;
    initialUserId.value = v?.userId || v?.user?.id || "";
    initialEditorId.value = v?.editorId || v?.editor?.id || "";
    formData.value = {
      type: "video",
      name: newContent.name,
      notes: newContent.notes || "",
      publicationDate: formatForInput(newContent.publicationDate || ""),
      authorId: newContent.author?.id || "",
      videoType: v?.type || "best",
      videoStatus: v?.status || "not_started",
      userId: v?.userId || v?.user?.id || "",
      editorId: v?.editorId || v?.editor?.id || "",
    };
  }
);

function handleUpdate() {
  const contentData: ContentEditorData = {
    type: formData.value.type,
    name: formData.value.name,
    notes: formData.value.notes,
    publicationDate: formData.value.publicationDate,
    authorId: formData.value.authorId,
  };

  const v = props.content.video;
  if (v?.id) {
    const videoUpdate: VideoUpdateData = {
      videoId: v.id,
      name: formData.value.name,
      type: formData.value.videoType,
      status: formData.value.videoStatus,
    };
    if (formData.value.userId !== initialUserId.value)
      videoUpdate.userId = formData.value.userId || undefined;
    if (formData.value.editorId !== initialEditorId.value)
      videoUpdate.editorId = formData.value.editorId || undefined;
    emit("save", contentData, videoUpdate);
  }
}
</script>
