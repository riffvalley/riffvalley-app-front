import { defineStore } from "pinia";
import type { PendingState } from "../domain/pending";

const emptyPending = (): PendingState => ({ pendingId: null, loaded: false });
const keyFor = (userId: string, discId: string) => userId + ":" + discId;

export const useCommunityPendingStore = defineStore("community-pendings", {
  state: () => ({
    pendings: {} as Record<string, PendingState>,
    submitting: {} as Record<string, boolean>,
  }),
  actions: {
    get(userId: string, discId: string): PendingState {
      return this.pendings[keyFor(userId, discId)] ?? emptyPending();
    },
    seed(userId: string, discId: string, pendingId: string | null) {
      const key = keyFor(userId, discId);
      if (!this.pendings[key]) this.pendings[key] = { pendingId, loaded: true };
    },
    set(userId: string, discId: string, pendingId: string | null) {
      this.pendings[keyFor(userId, discId)] = { pendingId, loaded: true };
    },
    isSubmitting(userId: string, discId: string): boolean {
      return this.submitting[keyFor(userId, discId)] === true;
    },
    beginSubmit(userId: string, discId: string): boolean {
      const key = keyFor(userId, discId);
      if (this.submitting[key]) return false;
      this.submitting[key] = true;
      return true;
    },
    finishSubmit(userId: string, discId: string) {
      delete this.submitting[keyFor(userId, discId)];
    },
    clear() {
      this.$reset();
    },
  },
});
