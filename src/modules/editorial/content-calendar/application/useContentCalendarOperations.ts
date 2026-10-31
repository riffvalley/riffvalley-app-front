import { useQueryClient } from "@tanstack/vue-query";
import type { ComputedRef, Ref } from "vue";
import type { EventDropArg } from "@fullcalendar/core";
import {
  createContent,
  deleteContent,
  updateContent,
  type Content,
} from "@services/contents/contents";
import { updateAsignationService } from "@services/asignation/asignation";
import {
  deleteList,
  updateList,
  type ListAsignationDetails,
  type RadarListDetails,
} from "@services/list/list";
import { updateArticle } from "@services/articles/articles";
import { updateVideo } from "@services/videos/videos";
import SwalService from "@services/swal/SwalService";
import type {
  ArticleUpdateData,
  ContentEditorData,
  CreateContentFormData,
  VideoUpdateData,
} from "../types/contentCalendar.types";
import { toCalendarApiDate } from "../utils/contentCalendarDates";
import { getContentTypeLabel, toCalendarDate } from "../utils/contentCalendarEvents";
import { contentCalendarQueryKeys } from "./contentCalendarQueries";
import { contentCalendarDeferredQueryKeys } from "./contentCalendarDeferredQueries";

interface ContentCalendarOperationsOptions {
  allContents: ComputedRef<Content[]>;
  session: () => { userId: string | null; generation: number; role: string | null };
  showCreateModal: Ref<boolean>;
  showEditModal: Ref<boolean>;
  showActionsModal: Ref<boolean>;
  showDeleteModal: Ref<boolean>;
  selectedContent: Ref<Content | null>;
  contentToDelete: Ref<Content | null>;
  editingContentId: Ref<string | null>;
  editingContent: Ref<Content | ContentEditorData>;
  videoUpdateError: Ref<number>;
  resetCreateDraft: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getHttpErrorMessage(error: unknown): string | string[] | undefined {
  if (!isRecord(error) || !isRecord(error.response) || !isRecord(error.response.data))
    return undefined;
  const message = error.response.data.message;
  return typeof message === "string" ||
    (Array.isArray(message) && message.every((item) => typeof item === "string"))
    ? message
    : undefined;
}

export function useContentCalendarOperations(options: ContentCalendarOperationsOptions) {
  const queryClient = useQueryClient();

  async function invalidateContentCalendarQueries() {
    const { userId, generation, role } = options.session();
    await queryClient.invalidateQueries({
      queryKey: contentCalendarQueryKeys.root(userId, generation, role),
    });
  }

  function listDetailsQueryKey(listId: string) {
    return contentCalendarDeferredQueryKeys.listDetails(options.session(), listId);
  }

  async function invalidateListDetails(listId: string | null | undefined) {
    if (!listId) return;
    await queryClient.invalidateQueries({ queryKey: listDetailsQueryKey(listId), exact: true });
  }

  async function removeListDetails(listId: string | null | undefined) {
    if (!listId) return;
    await queryClient.removeQueries({ queryKey: listDetailsQueryKey(listId), exact: true });
  }

  async function handleBacklogDrop(contentId: string, date: string | null) {
    const content = options.allContents.value.find((item) => item.id === contentId);
    try {
      await updateContent(contentId, {
        publicationDate: toCalendarDate(date),
        backlog: date === null,
      });
      await invalidateContentCalendarQueries();
      if (content?.type === "radar" || content?.type === "best") {
        await invalidateListDetails(content.list?.id);
      }
      SwalService.success(date ? "Evento programado correctamente" : "Evento movido al backlog");
    } catch (error) {
      console.error("Error updating content date:", error);
      SwalService.error("Error al mover el evento");
    }
  }

  async function handleEventDrop(info: EventDropArg) {
    const content = options.allContents.value.find((item) => item.id === info.event.id);
    if (content?.type === "radar" && content.list?.asignations?.length) {
      info.revert();
      SwalService.error("No se puede mover un Radar que ya tiene asignaciones.");
      return;
    }

    try {
      await updateContent(info.event.id, {
        publicationDate: toCalendarDate(info.event.startStr),
        backlog: false,
      });
      await invalidateContentCalendarQueries();
      if (content?.type === "radar" || content?.type === "best") {
        await invalidateListDetails(content.list?.id);
      }
      SwalService.success("Evento reprogramado correctamente");
    } catch (error) {
      console.error("Error updating content date:", error);
      info.revert();
      SwalService.error("Error al mover el evento");
    }
  }

  async function handleCreateContent(data: CreateContentFormData) {
    if (!data.name || !data.authorId) return;
    if (["reunion", "radar", "best"].includes(data.type) && !data.publicationDate) {
      SwalService.error(
        `El contenido tipo "${getContentTypeLabel(data.type)}" requiere una fecha de publicación obligatoria`
      );
      return;
    }

    try {
      await createContent({
        type: data.type,
        name: data.name,
        notes: data.notes || undefined,
        publicationDate: toCalendarApiDate(data.publicationDate),
        closeDate: data.closeDate || undefined,
        authorId: data.authorId,
        listDate: data.listDate || undefined,
        backlog: !data.publicationDate,
      });
      options.resetCreateDraft();
      options.showCreateModal.value = false;
      await invalidateContentCalendarQueries();
      SwalService.success("Evento creado correctamente");
    } catch (error) {
      console.error("Error creating content:", error);
      SwalService.error("Error al crear el contenido. Por favor, intenta de nuevo.");
    }
  }

  async function handleUpdateContent(data?: ContentEditorData) {
    const contentData = data || options.editingContent.value;
    const contentId = options.editingContentId.value;
    if (!contentId || !contentData.name || !contentData.authorId) return;
    if (["reunion", "radar", "best"].includes(contentData.type) && !contentData.publicationDate) {
      SwalService.error(
        `El contenido tipo "${getContentTypeLabel(contentData.type)}" requiere una fecha de publicación obligatoria`
      );
      return;
    }

    try {
      const previousContent = options.allContents.value.find((item) => item.id === contentId);
      await updateContent(contentId, {
        type: contentData.type,
        name: contentData.name,
        notes: contentData.notes || undefined,
        publicationDate: toCalendarApiDate(contentData.publicationDate) ?? null,
        closeDate: contentData.closeDate || null,
        authorId: contentData.authorId,
      });
      options.showEditModal.value = false;
      options.showActionsModal.value = false;
      options.editingContentId.value = null;
      await invalidateContentCalendarQueries();
      if (previousContent?.type === "radar" || previousContent?.type === "best") {
        await invalidateListDetails(previousContent.list?.id);
      }
      SwalService.success("Evento actualizado correctamente");
    } catch (error) {
      console.error("Error updating content:", error);
      SwalService.error("Error al actualizar el evento");
    }
  }

  async function handleUpdateArticle(data: ArticleUpdateData) {
    try {
      await updateArticle(data.articleId, {
        name: data.name,
        type: data.type,
        status: data.status,
        link: data.link,
        userId: data.userId,
        editorId: data.editorId,
      });
      await invalidateContentCalendarQueries();
    } catch (error) {
      console.error("Error updating article:", error);
      SwalService.error("Error al actualizar el artículo");
    }
  }

  async function handleUpdateVideo(data: VideoUpdateData) {
    try {
      const update: Record<string, unknown> = {
        name: data.name,
        type: data.type,
        status: data.status,
      };
      if (Object.prototype.hasOwnProperty.call(data, "userId")) update.userId = data.userId;
      if (Object.prototype.hasOwnProperty.call(data, "editorId")) update.editorId = data.editorId;
      await updateVideo(data.videoId, update);
      await invalidateContentCalendarQueries();
    } catch (error) {
      console.error("Error updating video:", error);
      options.videoUpdateError.value += 1;
      const message = getHttpErrorMessage(error);
      SwalService.error(
        Array.isArray(message) ? message.join(", ") : message || "Error al actualizar el video"
      );
    }
  }

  async function executeDeleteContent() {
    const content = options.contentToDelete.value;
    if (!content) return;
    try {
      await deleteContent(content.id);
      options.showDeleteModal.value = false;
      options.contentToDelete.value = null;
      await invalidateContentCalendarQueries();
      SwalService.success("Evento eliminado correctamente");
    } catch (error) {
      console.error("Error deleting content:", error);
      SwalService.error("No se pudo eliminar el evento");
    }
  }

  async function handleDeleteFromBacklog(content: Content) {
    const result = await SwalService.confirm(
      "¿Eliminar evento?",
      `Vas a eliminar "${content.name}". Esta acción no se puede deshacer.`,
      "Sí, eliminar",
      "Cancelar"
    );
    if (!result.isConfirmed) return;
    try {
      await deleteContent(content.id);
      await invalidateContentCalendarQueries();
      SwalService.success("Evento eliminado correctamente");
    } catch (error) {
      console.error("Error deleting content:", error);
      SwalService.error("No se pudo eliminar el evento");
    }
  }

  async function toggleAsignation(asignation: ListAsignationDetails) {
    const nextDone = !asignation.done;
    const listId = options.selectedContent.value?.list?.id;
    const queryKey = listId ? listDetailsQueryKey(listId) : null;
    const previousDetails = queryKey
      ? queryClient.getQueryData<RadarListDetails>(queryKey)
      : undefined;
    if (queryKey && previousDetails) {
      queryClient.setQueryData<RadarListDetails>(queryKey, {
        ...previousDetails,
        asignations: previousDetails.asignations.map((item) =>
          item.id === asignation.id ? { ...item, done: nextDone } : item
        ),
      });
    }
    try {
      await updateAsignationService(asignation.id, { done: nextDone });
      await invalidateContentCalendarQueries();
      await invalidateListDetails(listId);
    } catch (error) {
      console.error("Error updating asignation", error);
      if (queryKey && previousDetails) queryClient.setQueryData(queryKey, previousDetails);
      SwalService.error("Error actualizando el estado de la asignación");
    }
  }

  async function deleteRadarList() {
    const listId = options.selectedContent.value?.list?.id;
    if (!listId) return;
    const result = await SwalService.confirm(
      "¿Eliminar Lista?",
      "Estás a punto de eliminar la lista asociada a este radar. Esta acción no se puede deshacer.",
      "Sí, eliminar",
      "Cancelar"
    );
    if (!result.isConfirmed) return;
    try {
      await deleteList(listId);
      SwalService.success("Lista eliminada correctamente");
      options.showActionsModal.value = false;
      await removeListDetails(listId);
      await invalidateContentCalendarQueries();
    } catch (error) {
      console.error(error);
      SwalService.error("Error eliminando la lista");
    }
  }

  async function updateListStatus(list: RadarListDetails) {
    if (!list.id) return;
    try {
      await updateList(list.id, { status: list.status });
      await invalidateContentCalendarQueries();
      await invalidateListDetails(list.id);
      SwalService.success("Estado actualizado");
    } catch (error) {
      console.error("Error updating status:", error);
      SwalService.error("Error al actualizar estado");
    }
  }

  async function updateRadarField(field: string, value: string) {
    const listId = options.selectedContent.value?.list?.id;
    if (!listId) return;
    try {
      await updateList(listId, { [field]: value });
      await invalidateContentCalendarQueries();
      await invalidateListDetails(listId);
      SwalService.success("Fecha actualizada correctamente");
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      SwalService.error("Error al actualizar fecha");
    }
  }

  async function handleUpdateRadarDates(publicationDate: string, closeDate: string | null) {
    const content = options.selectedContent.value;
    if (!content) return;
    try {
      await updateContent(content.id, {
        publicationDate: toCalendarDate(publicationDate),
        closeDate: closeDate ? toCalendarDate(closeDate) : null,
      });
      await invalidateContentCalendarQueries();
      await invalidateListDetails(content.list?.id);
      SwalService.success("Fechas actualizadas");
    } catch (error) {
      console.error("Error updating dates:", error);
      SwalService.error("Error al actualizar las fechas");
    }
  }

  async function handleUpdateContentAuthor(authorId: string) {
    const content = options.selectedContent.value;
    if (!content) return;
    try {
      await updateContent(content.id, { authorId });
      await invalidateContentCalendarQueries();
      SwalService.success("Autor actualizado");
    } catch (error) {
      console.error("Error updating author:", error);
      SwalService.error("Error al actualizar el autor");
    }
  }

  return {
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
    toggleAsignation,
    updateListStatus,
    updateRadarField,
  };
}
