import type { UserCommentsQuery, UserCommentsResult } from "../domain/userComments";

export interface UserCommentsPort {
  listByUser(query: UserCommentsQuery): Promise<UserCommentsResult>;
}
