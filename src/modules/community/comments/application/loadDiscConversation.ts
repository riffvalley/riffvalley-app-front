import { buildCommentTree } from "../domain/comment";
import type { DiscComment } from "../domain/comment";
import type { CommentPort } from "./commentPort";

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
