import { deleteCommentService, getDisccomments, postcommentService, updateCommentService } from "@services/comments/comments";
import type { CommentPort } from "../application/commentPort";
import type { FlatDiscComment, CommentUser } from "../domain/comment";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown): string | null | undefined {
  return typeof value === "string" || value === null ? value : undefined;
}

function toComment(value: unknown): FlatDiscComment {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.comment !== "string" ||
      typeof value.createdAt !== "string" || !isRecord(value.user) ||
      typeof value.user.id !== "string" || typeof value.user.username !== "string") {
    throw new Error("La respuesta de comentarios no tiene el formato esperado.");
  }

  const user: CommentUser = {
    id: value.user.id,
    username: value.user.username,
    image: optionalString(value.user.image),
    avatarUrl: optionalString(value.user.avatarUrl),
  };

  return {
    id: value.id,
    parentId: optionalString(value.parentId),
    comment: value.comment,
    createdAt: value.createdAt,
    editedAt: optionalString(value.editedAt),
    user,
    isDeleted: typeof value.isDeleted === "boolean" ? value.isDeleted : undefined,
  };
}

export const legacyCommentApi: CommentPort = {
  async listByDisc(discId) {
    const response: unknown = await getDisccomments(discId);
    if (!Array.isArray(response)) throw new Error("La respuesta de comentarios no es una lista.");
    return response.map(toComment);
  },
  async create(discId, comment, parentId) {
    const response: unknown = await postcommentService({ discId, comment, ...(parentId ? { parentId } : {}) });
    return toComment(response);
  },
  async update(id, comment) {
    const response: unknown = await updateCommentService(id, { comment });
    if (!isRecord(response) || typeof response.id !== "string" || typeof response.comment !== "string") {
      throw new Error("La respuesta de comentarios no tiene el formato esperado.");
    }
    return { id: response.id, comment: response.comment, editedAt: optionalString(response.editedAt) };
  },
  async delete(id) {
    await deleteCommentService(id);
  },
};
