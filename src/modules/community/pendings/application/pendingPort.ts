import type { UserPendingsQuery, UserPendingsResult } from "../domain/pending";

export interface PendingPort {
  create(discId: string): Promise<string>;
  remove(pendingId: string): Promise<void>;
  list(query: UserPendingsQuery): Promise<UserPendingsResult>;
}

export interface PendingStatePort {
  get(userId: string, discId: string): { pendingId: string | null; loaded: boolean };
  beginSubmit(userId: string, discId: string): boolean;
  set(userId: string, discId: string, pendingId: string | null): void;
  finishSubmit(userId: string, discId: string): void;
}
