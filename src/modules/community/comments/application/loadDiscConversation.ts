import { buildCommentTree } from "../domain/comment";
import type { DiscComment } from "../domain/comment";
import type { CommentPort } from "./commentPort";

export async function loadDiscConversation(port: CommentPort, discId: string): Promise<DiscComment[]> {
  return buildCommentTree(await port.listByDisc(discId));
}
