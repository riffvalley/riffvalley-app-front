import { useQueryClient } from "@tanstack/vue-query";
import { ref, type ComputedRef, type Ref } from "vue";
import type { EventDropArg } from "@fullcalendar/core";
import {
  createContent,
  deleteContent,
  getContentById,
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
import { getArticle, updateArticle } from "@services/articles/articles";
import { getVideo, updateVideo } from "@services/videos/videos";
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
import { contentCalendarClientId } from "./contentsEventsClient";

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
}

export interface CompositeSaveStatus {
  saving: boolean;
  message: string;
  retryAvailable: boolean;
}

export type ContentMoveResult =
  | { state: "confirmed"; destinationApplied: boolean }
  | { state: "rejected" }
  | { state: "uncertain" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function useContentCalendarOperations(options: ContentCalendarOperationsOptions) {
  const queryClient = useQueryClient();
  const pendingContentIds = new Set<string>();
  const uncertainContentIds = new Set<string>();
  const uncertainDeleteIds = new Set<string>();
  const pendingOperationCount = ref(0);
  const deleteStatus = ref({ pending: false, errorMessage: "" });
  let isCreatingContent = false;
  const articleSaveStatus = ref<CompositeSaveStatus>({
    saving: false,
    message: "",
    retryAvailable: true,
  });
  const videoSaveStatus = ref<CompositeSaveStatus>({
    saving: false,
    message: "",
    retryAvailable: true,
  });
  const compositeProgress = new Map<
    string,
    {
      signature: string;
      contentDone: boolean;
      relatedDone: boolean;
      uncertain: boolean;
    }
  >();

  function startContentOperation(contentId: string): boolean {
    if (pendingContentIds.has(contentId)) return false;
    pendingContentIds.add(contentId);
    pendingOperationCount.value += 1;
    return true;
  }

  function finishContentOperation(contentId: string) {
    if (pendingContentIds.delete(contentId)) pendingOperationCount.value -= 1;
  }

  async function invalidateContentCalendarQueries(session = options.session()) {
    await queryClient.invalidateQueries({
      queryKey: contentCalendarQueryKeys.root(session.userId, session.generation, session.role),
    });
  }

  function isCurrentSession(session: ReturnType<typeof options.session>): boolean {
    const current = options.session();
    return (
      current.userId === session.userId &&
      current.generation === session.generation &&
      current.role === session.role
    );
  }

  function hasDefiniteRejection(error: unknown): boolean {
    return (
      isRecord(error) &&
      isRecord(error.response) &&
      typeof error.response.status === "number" &&
      error.response.status >= 400 &&
      error.response.status < 500
    );
  }

  async function reconcileMove(
    contentId: string,
    date: string | null,
    session: ReturnType<typeof options.session>
  ): Promise<ContentMoveResult> {
    try {
      const persisted = await getContentById(contentId);
      const destinationApplied = date
        ? !persisted.backlog && persisted.publicationDate?.split("T")[0] === date.split("T")[0]
        : persisted.backlog && !persisted.publicationDate;
      await invalidateContentCalendarQueries(session);
      return { state: "confirmed", destinationApplied };
    } catch {
      uncertainContentIds.add(contentId);
      await invalidateContentCalendarQueries(session);
      return { state: "uncertain" };
    }
  }

  async function reconcileBeforeMoveRetry(
    contentId: string,
    session: ReturnType<typeof options.session>
  ): Promise<boolean> {
    if (!uncertainContentIds.has(contentId)) return true;
    if (!startContentOperation(contentId)) return false;
    try {
      await getContentById(contentId);
      uncertainContentIds.delete(contentId);
      await invalidateContentCalendarQueries(session);
      if (isCurrentSession(session)) {
        SwalService.success(
          "Estado actualizado desde el servidor. Revisa la posición y vuelve a mover el contenido."
        );
      }
    } catch {
      if (isCurrentSession(session)) {
        SwalService.error(
          "No se pudo reconciliar el estado. El movimiento sigue bloqueado; vuelve a intentarlo más tarde."
        );
      }
    } finally {
      finishContentOperation(contentId);
    }
    return false;
  }

  function listDetailsQueryKey(listId: string, session = options.session()) {
    return contentCalendarDeferredQueryKeys.listDetails(session, listId);
  }

  async function invalidateListDetails(
    listId: string | null | undefined,
    session?: ReturnType<typeof options.session>
  ) {
    if (!listId) return;
    await queryClient.invalidateQueries({
      queryKey: listDetailsQueryKey(listId, session),
      exact: true,
    });
  }

  async function removeListDetails(
    listId: string | null | undefined,
    session?: ReturnType<typeof options.session>
  ) {
    if (!listId) return;
    await queryClient.removeQueries({
      queryKey: listDetailsQueryKey(listId, session),
      exact: true,
    });
  }

  async function handleBacklogDrop(
    contentId: string,
    date: string | null
  ): Promise<ContentMoveResult> {
    const content = options.allContents.value.find((item) => item.id === contentId);
    if (!content || pendingContentIds.has(contentId)) {
      return { state: "rejected" };
    }
    const session = options.session();
    if (
      uncertainContentIds.has(contentId) &&
      !(await reconcileBeforeMoveRetry(contentId, session))
    ) {
      return { state: "rejected" };
    }
    if (!startContentOperation(contentId)) return { state: "rejected" };
    try {
      await updateContent(
        contentId,
        {
          publicationDate: toCalendarDate(date),
          backlog: date === null,
        },
        contentCalendarClientId
      );
      await invalidateContentCalendarQueries(session);
      if (content?.type === "radar" || content?.type === "best") {
        await invalidateListDetails(content.list?.id, session);
      }
      if (isCurrentSession(session)) {
        SwalService.success(date ? "Evento programado correctamente" : "Evento movido al backlog");
      }
      return { state: "confirmed", destinationApplied: isCurrentSession(session) };
    } catch (error) {
      console.error("Error updating content date:", error);
      if (hasDefiniteRejection(error)) {
        if (isCurrentSession(session)) SwalService.error("Error al mover el evento");
        return { state: "rejected" };
      }
      const result = await reconcileMove(contentId, date, session);
      if (!isCurrentSession(session)) {
        return result.state === "confirmed" ? { ...result, destinationApplied: false } : result;
      }
      if (isCurrentSession(session)) {
        SwalService.error(
          result.state === "uncertain"
            ? "No se pudo confirmar el movimiento. Se está reconciliando con el servidor."
            : result.destinationApplied
              ? "Movimiento confirmado por el servidor"
              : "El servidor no confirmó el movimiento"
        );
      }
      return result;
    } finally {
      finishContentOperation(contentId);
    }
  }

  async function handleEventDrop(info: EventDropArg) {
    const content = options.allContents.value.find((item) => item.id === info.event.id);
    if (!content || pendingContentIds.has(info.event.id)) {
      info.revert();
      return;
    }
    const session = options.session();
    if (
      uncertainContentIds.has(info.event.id) &&
      !(await reconcileBeforeMoveRetry(info.event.id, session))
    ) {
      return;
    }
    if (content?.type === "radar" && content.list?.asignations?.length) {
      info.revert();
      SwalService.error("No se puede mover un Radar que ya tiene asignaciones.");
      return;
    }

    startContentOperation(info.event.id);
    try {
      await updateContent(
        info.event.id,
        {
          publicationDate: toCalendarDate(info.event.startStr),
          backlog: false,
        },
        contentCalendarClientId
      );
      await invalidateContentCalendarQueries(session);
      if (content?.type === "radar" || content?.type === "best") {
        await invalidateListDetails(content.list?.id, session);
      }
      if (isCurrentSession(session)) SwalService.success("Evento reprogramado correctamente");
    } catch (error) {
      console.error("Error updating content date:", error);
      if (hasDefiniteRejection(error)) {
        if (!isCurrentSession(session)) return;
        info.revert();
        SwalService.error("Error al mover el evento");
      } else {
        const result = await reconcileMove(info.event.id, info.event.startStr, session);
        if (isCurrentSession(session)) {
          SwalService.error(
            result.state === "uncertain"
              ? "No se pudo confirmar la nueva fecha. Se está reconciliando con el servidor."
              : result.destinationApplied
                ? "Fecha confirmada por el servidor"
                : "El servidor no confirmó la nueva fecha"
          );
        }
      }
    } finally {
      finishContentOperation(info.event.id);
    }
  }

  async function handleCreateContent(data: CreateContentFormData) {
    if (isCreatingContent) return;
    if (!data.name || !data.authorId) return;
    if (["reunion", "radar", "best"].includes(data.type) && !data.publicationDate) {
      SwalService.error(
        `El contenido tipo "${getContentTypeLabel(data.type)}" requiere una fecha de publicación obligatoria`
      );
      return;
    }

    const session = options.session();
    isCreatingContent = true;
    pendingOperationCount.value += 1;
    try {
      await createContent(
        {
          type: data.type,
          name: data.name,
          notes: data.notes || undefined,
          publicationDate: toCalendarApiDate(data.publicationDate),
          closeDate: data.closeDate || undefined,
          authorId: data.authorId,
          listDate: data.listDate || undefined,
          backlog: !data.publicationDate,
        },
        contentCalendarClientId
      );
      if (isCurrentSession(session)) {
        options.showCreateModal.value = false;
      }
      await invalidateContentCalendarQueries(session);
      if (isCurrentSession(session)) SwalService.success("Evento creado correctamente");
    } catch (error) {
      console.error("Error creating content:", error);
      if (isCurrentSession(session)) {
        SwalService.error("Error al crear el contenido. Por favor, intenta de nuevo.");
      }
    } finally {
      isCreatingContent = false;
      pendingOperationCount.value -= 1;
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

    const session = options.session();
    if (!startContentOperation(contentId)) return;
    try {
      const previousContent = options.allContents.value.find((item) => item.id === contentId);
      await updateContent(
        contentId,
        {
          type: contentData.type,
          name: contentData.name,
          notes: contentData.notes || undefined,
          publicationDate: toCalendarApiDate(contentData.publicationDate) ?? null,
          closeDate: contentData.closeDate || null,
          authorId: contentData.authorId,
        },
        contentCalendarClientId
      );
      if (isCurrentSession(session)) {
        options.showEditModal.value = false;
        options.showActionsModal.value = false;
        options.editingContentId.value = null;
      }
      await invalidateContentCalendarQueries(session);
      if (previousContent?.type === "radar" || previousContent?.type === "best") {
        await invalidateListDetails(previousContent.list?.id, session);
      }
      if (isCurrentSession(session)) SwalService.success("Evento actualizado correctamente");
    } catch (error) {
      console.error("Error updating content:", error);
      if (isCurrentSession(session)) SwalService.error("Error al actualizar el evento");
    } finally {
      finishContentOperation(contentId);
    }
  }

  async function articleMatches(data: ArticleUpdateData): Promise<boolean> {
    const article = await getArticle(data.articleId);
    return (
      article.name === data.name &&
      article.type === data.type &&
      article.status === data.status &&
      (!data.link || article.link === data.link) &&
      (!data.userId || article.userId === data.userId) &&
      (!data.editorId || article.editorId === data.editorId)
    );
  }

  async function videoMatches(data: VideoUpdateData): Promise<boolean> {
    const video = await getVideo(data.videoId);
    return (
      video.name === data.name &&
      video.type === data.type &&
      video.status === data.status &&
      (!Object.prototype.hasOwnProperty.call(data, "userId") ||
        (video.userId || video.user?.id || undefined) === data.userId) &&
      (!Object.prototype.hasOwnProperty.call(data, "editorId") ||
        (video.editorId || video.editor?.id || undefined) === data.editorId)
    );
  }

  async function contentMatches(contentId: string, data: ContentEditorData): Promise<boolean> {
    const content = await getContentById(contentId);
    return (
      content.name === data.name &&
      content.author?.id === data.authorId &&
      content.publicationDate === (toCalendarApiDate(data.publicationDate) ?? null) &&
      content.closeDate === (toCalendarApiDate(data.closeDate) ?? null) &&
      (data.notes ? content.notes === data.notes : true)
    );
  }

  async function runCompositeSave(
    save:
      | { kind: "article"; contentData: ContentEditorData; relatedData: ArticleUpdateData }
      | { kind: "video"; contentData: ContentEditorData; relatedData: VideoUpdateData }
  ): Promise<void> {
    const { kind, contentData, relatedData } = save;
    const contentId = options.editingContentId.value;
    if (!contentId) return;
    const status = kind === "article" ? articleSaveStatus : videoSaveStatus;
    const signature = JSON.stringify([contentId, contentData, relatedData]);
    let progress = compositeProgress.get(`${kind}:${contentId}`);
    if (!progress || progress.signature !== signature) {
      progress = { signature, contentDone: false, relatedDone: false, uncertain: false };
      compositeProgress.set(`${kind}:${contentId}`, progress);
    }
    if (!startContentOperation(contentId)) return;
    status.value = { saving: true, message: "Guardando cambios…", retryAvailable: false };
    const session = options.session();
    const contentPatch = {
      type: contentData.type,
      name: contentData.name,
      notes: contentData.notes || undefined,
      publicationDate: toCalendarApiDate(contentData.publicationDate) ?? null,
      closeDate: contentData.closeDate || null,
      authorId: contentData.authorId,
    };
    let contentFailed = false;
    let relatedFailed = false;
    try {
      if (progress.uncertain) {
        try {
          if (!progress.contentDone)
            progress.contentDone = await contentMatches(contentId, contentData);
          if (!progress.relatedDone) {
            progress.relatedDone =
              kind === "article"
                ? await articleMatches(relatedData)
                : await videoMatches(relatedData);
          }
          progress.uncertain = false;
        } catch {
          if (isCurrentSession(session)) {
            status.value = {
              saving: false,
              message:
                "Resultado incierto. No se pudo leer el estado del servidor; vuelve a intentar reconciliar antes de reintentar.",
              retryAvailable: false,
            };
          }
          return;
        }
      }
      if (!progress.contentDone) {
        try {
          await updateContent(contentId, contentPatch, contentCalendarClientId);
          progress.contentDone = true;
          await invalidateContentCalendarQueries(session);
        } catch (error) {
          if (hasDefiniteRejection(error)) {
            contentFailed = true;
          } else {
            try {
              progress.contentDone = await contentMatches(contentId, contentData);
            } catch {
              progress.uncertain = true;
            }
            if (!progress.contentDone) contentFailed = !progress.uncertain;
          }
        }
      }
      if (!progress.relatedDone) {
        try {
          if (kind === "article") {
            const data = relatedData;
            await updateArticle(
              data.articleId,
              {
                name: data.name,
                type: data.type,
                status: data.status,
                link: data.link || undefined,
                userId: data.userId || undefined,
                editorId: data.editorId || undefined,
              },
              contentCalendarClientId
            );
          } else {
            const data = relatedData;
            const update: Record<string, unknown> = {
              name: data.name,
              type: data.type,
              status: data.status,
            };
            if (Object.prototype.hasOwnProperty.call(data, "userId"))
              update.userId = data.userId || null;
            if (Object.prototype.hasOwnProperty.call(data, "editorId"))
              update.editorId = data.editorId || null;
            await updateVideo(data.videoId, update, contentCalendarClientId);
          }
          progress.relatedDone = true;
          await invalidateContentCalendarQueries(session);
        } catch (error) {
          if (hasDefiniteRejection(error)) {
            relatedFailed = true;
          } else {
            try {
              progress.relatedDone =
                kind === "article"
                  ? await articleMatches(relatedData)
                  : await videoMatches(relatedData);
            } catch {
              progress.uncertain = true;
            }
            if (!progress.relatedDone) relatedFailed = !progress.uncertain;
          }
        }
      }
      if (progress.contentDone && progress.relatedDone) {
        compositeProgress.delete(`${kind}:${contentId}`);
        if (!isCurrentSession(session)) return;
        status.value = { saving: false, message: "", retryAvailable: true };
        options.showActionsModal.value = false;
        options.showEditModal.value = false;
        options.editingContentId.value = null;
        SwalService.success(
          kind === "article"
            ? "Artículo y contenido actualizados"
            : "Vídeo y contenido actualizados"
        );
      } else {
        if (!isCurrentSession(session)) return;
        const failed = [
          contentFailed && "Contenido",
          relatedFailed && (kind === "article" ? "artículo" : "vídeo"),
        ].filter(Boolean);
        status.value = {
          saving: false,
          message: progress.uncertain
            ? `Resultado parcial: ${progress.contentDone ? "Contenido" : "Entidad asociada"} guardado; no se puede confirmar la otra operación. Pulsa «Revisar estado en servidor» antes de reintentar.`
            : `Resultado parcial. Falló: ${failed.join(" y ")}. Puedes reintentar; solo se repetirá la parte fallida.`,
          retryAvailable: !progress.uncertain,
        };
        SwalService.error(status.value.message);
      }
    } finally {
      finishContentOperation(contentId);
    }
  }

  function handleUpdateArticleAndContent(
    contentData: ContentEditorData,
    articleData: ArticleUpdateData
  ) {
    return runCompositeSave({ kind: "article", contentData, relatedData: articleData });
  }

  function handleUpdateVideoAndContent(contentData: ContentEditorData, videoData: VideoUpdateData) {
    return runCompositeSave({ kind: "video", contentData, relatedData: videoData });
  }

  async function executeDeleteContent() {
    const content = options.contentToDelete.value;
    if (!content || !startContentOperation(content.id)) return;
    const session = options.session();
    deleteStatus.value = { pending: true, errorMessage: "" };

    const confirmDeleted = async () => {
      uncertainDeleteIds.delete(content.id);
      if (isCurrentSession(session)) {
        options.showDeleteModal.value = false;
        options.contentToDelete.value = null;
      }
      await invalidateContentCalendarQueries(session);
      if (isCurrentSession(session)) SwalService.success("Entrada eliminada correctamente");
    };

    try {
      if (uncertainDeleteIds.has(content.id)) {
        try {
          await getContentById(content.id);
          uncertainDeleteIds.delete(content.id);
          if (isCurrentSession(session)) {
            deleteStatus.value = {
              pending: false,
              errorMessage:
                "El contenido sigue en el calendario. Puedes volver a confirmar la eliminación.",
            };
          }
          return;
        } catch (error) {
          if (isRecord(error) && isRecord(error.response) && error.response.status === 404) {
            await confirmDeleted();
            return;
          }
          if (isCurrentSession(session)) {
            deleteStatus.value = {
              pending: false,
              errorMessage:
                "No se pudo comprobar el resultado. Vuelve a intentarlo para revisar el estado.",
            };
          }
          if (isCurrentSession(session))
            SwalService.error("No se pudo comprobar si se eliminó el contenido");
          return;
        }
      }

      await deleteContent(content.id, contentCalendarClientId);
      await confirmDeleted();
    } catch (error) {
      console.error("Error deleting content:", error);
      if (hasDefiniteRejection(error)) {
        if (isCurrentSession(session)) {
          deleteStatus.value = {
            pending: false,
            errorMessage:
              "No se pudo eliminar el contenido. Revisa el mensaje y vuelve a intentarlo.",
          };
          SwalService.error("No se pudo eliminar el contenido");
        }
        return;
      }

      try {
        await getContentById(content.id);
        if (isCurrentSession(session)) {
          deleteStatus.value = {
            pending: false,
            errorMessage:
              "El contenido sigue en el calendario. Puedes volver a confirmar la eliminación.",
          };
          SwalService.error("No se pudo confirmar la eliminación");
        }
      } catch (reconciliationError) {
        if (
          isRecord(reconciliationError) &&
          isRecord(reconciliationError.response) &&
          reconciliationError.response.status === 404
        ) {
          await confirmDeleted();
          return;
        }
        uncertainDeleteIds.add(content.id);
        if (isCurrentSession(session)) {
          deleteStatus.value = {
            pending: false,
            errorMessage:
              "No se pudo comprobar el resultado. Vuelve a intentarlo para revisar el estado.",
          };
          SwalService.error("No se pudo comprobar si se eliminó el contenido");
        }
      }
    } finally {
      deleteStatus.value.pending = false;
      finishContentOperation(content.id);
    }
  }

  async function toggleAsignation(asignation: ListAsignationDetails) {
    const session = options.session();
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
      await invalidateContentCalendarQueries(session);
      await invalidateListDetails(listId, session);
    } catch (error) {
      console.error("Error updating asignation", error);
      if (queryKey && previousDetails) queryClient.setQueryData(queryKey, previousDetails);
      if (isCurrentSession(session)) {
        SwalService.error("Error actualizando el estado de la asignación");
      }
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
    const session = options.session();
    try {
      await deleteList(listId, contentCalendarClientId);
      if (isCurrentSession(session)) {
        SwalService.success("Lista eliminada correctamente");
        options.showActionsModal.value = false;
      }
      await removeListDetails(listId, session);
      await invalidateContentCalendarQueries(session);
    } catch (error) {
      console.error(error);
      if (isCurrentSession(session)) SwalService.error("Error eliminando la lista");
    }
  }

  async function updateListStatus(list: RadarListDetails) {
    if (!list.id) return;
    const session = options.session();
    try {
      await updateList(list.id, { status: list.status }, contentCalendarClientId);
      await invalidateContentCalendarQueries(session);
      await invalidateListDetails(list.id, session);
      if (isCurrentSession(session)) SwalService.success("Estado actualizado");
    } catch (error) {
      console.error("Error updating status:", error);
      if (isCurrentSession(session)) SwalService.error("Error al actualizar estado");
    }
  }

  async function updateRadarField(field: string, value: string) {
    const listId = options.selectedContent.value?.list?.id;
    if (!listId) return;
    const session = options.session();
    try {
      await updateList(listId, { [field]: value }, contentCalendarClientId);
      await invalidateContentCalendarQueries(session);
      await invalidateListDetails(listId, session);
      if (isCurrentSession(session)) SwalService.success("Fecha actualizada correctamente");
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      if (isCurrentSession(session)) SwalService.error("Error al actualizar fecha");
    }
  }

  async function handleUpdateRadarDates(publicationDate: string, closeDate: string | null) {
    const content = options.selectedContent.value;
    if (!content) return;
    const session = options.session();
    try {
      await updateContent(
        content.id,
        {
          publicationDate: toCalendarDate(publicationDate),
          closeDate: closeDate ? toCalendarDate(closeDate) : null,
        },
        contentCalendarClientId
      );
      await invalidateContentCalendarQueries(session);
      await invalidateListDetails(content.list?.id, session);
      if (isCurrentSession(session)) SwalService.success("Fechas actualizadas");
    } catch (error) {
      console.error("Error updating dates:", error);
      if (isCurrentSession(session)) SwalService.error("Error al actualizar las fechas");
    }
  }

  async function handleUpdateContentAuthor(authorId: string) {
    const content = options.selectedContent.value;
    if (!content) return;
    const session = options.session();
    try {
      await updateContent(content.id, { authorId }, contentCalendarClientId);
      await invalidateContentCalendarQueries(session);
      if (isCurrentSession(session)) SwalService.success("Autor actualizado");
    } catch (error) {
      console.error("Error updating author:", error);
      if (isCurrentSession(session)) SwalService.error("Error al actualizar el autor");
    }
  }

  return {
    articleSaveStatus,
    pendingOperationCount,
    deleteRadarList,
    deleteStatus,
    executeDeleteContent,
    handleBacklogDrop,
    handleCreateContent,
    handleEventDrop,
    handleUpdateArticleAndContent,
    handleUpdateContent,
    handleUpdateContentAuthor,
    handleUpdateRadarDates,
    handleUpdateVideoAndContent,
    videoSaveStatus,
    toggleAsignation,
    updateListStatus,
    updateRadarField,
  };
}
