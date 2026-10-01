import { buildCommentTree } from "../domain/comment";
import type { DiscComment } from "../domain/comment";
import type { CommentPort } from "./commentPort";

export async function loadDiscConversation(port: CommentPort, discId: string): Promise<DiscComment[]> {
  return buildCommentTree(await port.listByDisc(discId));
}

export async function createRootComment(port: CommentPort, discId: string, comment: string): Promise<DiscComment> {
  const created = await port.createRoot(discId, comment);
  return { ...created, parentId: null, replies: [] };
}
