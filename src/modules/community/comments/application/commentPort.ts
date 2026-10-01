import type { FlatDiscComment } from "../domain/comment";

export interface CommentPort {
  listByDisc(discId: string): Promise<FlatDiscComment[]>;
  create(discId: string, comment: string, parentId?: string): Promise<FlatDiscComment>;
  update(id: string, comment: string): Promise<Pick<FlatDiscComment, "id" | "comment" | "editedAt">>;
}
