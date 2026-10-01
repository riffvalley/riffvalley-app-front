import type { PendingState } from "../domain/pending";
import { createUserDiscState } from "../../shared/application/userDiscState";

const emptyPending = (): PendingState => ({ pendingId: null, loaded: false });

const entries = createUserDiscState(
  emptyPending,
  (value) => ({ ...value }),
);

export const communityPendingState = {
  get: entries.get,
  seed(userId: string, discId: string, pendingId: string | null) {
    entries.seed(userId, discId, { pendingId, loaded: true });
  },
  set(userId: string, discId: string, pendingId: string | null) {
    entries.set(userId, discId, { pendingId, loaded: true });
  },
  isSubmitting: entries.isSubmitting,
  getSessionGeneration: entries.getSessionGeneration,
  beginSubmit: entries.beginSubmit,
  finishSubmit: entries.finishSubmit,
  clear: entries.clear,
  subscribe: entries.subscribe,
  subscribeAll: entries.subscribeAll,
};
