import type { FlatDiscComment } from "../domain/comment";

export interface CommentPort {
  listByDisc(discId: string): Promise<FlatDiscComment[]>;
}
