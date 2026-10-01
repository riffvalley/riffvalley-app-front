import { buildCommentTree } from "../domain/comment";
import type { DiscComment } from "../domain/comment";
import type { CommentPort } from "./commentPort";
import type { CommentConversationOperations } from "./commentPort";

export async function loadDiscConversation(port: CommentPort, discId: string): Promise<DiscComment[]> {
  return buildCommentTree(await port.listByDisc(discId));
}

export async function createRootComment(port: CommentPort, discId: string, comment: string): Promise<DiscComment> {
  const created = await port.create(discId, comment);
  return { ...created, parentId: null, replies: [] };
}

export async function createReplyComment(
  port: CommentPort,
  discId: string,
  parentId: string,
  comment: string,
): Promise<DiscComment> {
  const created = await port.create(discId, comment, parentId);
  return { ...created, parentId, replies: [] };
}

export async function updateComment(port: CommentPort, id: string, comment: string) {
  return port.update(id, comment);
}

export async function deleteComment(port: CommentPort, id: string): Promise<void> {
  await port.delete(id);
}

export function createCommentConversationOperations(port: CommentPort): CommentConversationOperations {
  return {
    load: (discId) => loadDiscConversation(port, discId),
    createRoot: (discId, comment) => createRootComment(port, discId, comment),
    createReply: (discId, parentId, comment) => createReplyComment(port, discId, parentId, comment),
    update: (id, comment) => updateComment(port, id, comment),
    delete: (id) => deleteComment(port, id),
  };
}
