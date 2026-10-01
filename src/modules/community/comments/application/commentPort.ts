import type { DiscComment, FlatDiscComment } from "../domain/comment";

export interface CommentPort {
  listByDisc(discId: string): Promise<FlatDiscComment[]>;
  create(discId: string, comment: string, parentId?: string): Promise<FlatDiscComment>;
  update(id: string, comment: string): Promise<Pick<FlatDiscComment, "id" | "comment" | "editedAt">>;
  delete(id: string): Promise<void>;
}

export interface CommentConversationOperations {
  load(discId: string): Promise<DiscComment[]>;
  createRoot(discId: string, comment: string): Promise<DiscComment>;
  createReply(discId: string, parentId: string, comment: string): Promise<DiscComment>;
  update(id: string, comment: string): Promise<Pick<FlatDiscComment, "id" | "comment" | "editedAt">>;
  delete(id: string): Promise<void>;
}
