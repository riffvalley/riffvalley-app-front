import { communityRelationKey } from "../domain/relationKey";

export type UserDiscStateListener = () => void;

export interface UserDiscState<T> {
  get(userId: string, discId: string): T;
  has(userId: string, discId: string): boolean;
  seed(userId: string, discId: string, value: T): void;
  set(userId: string, discId: string, value: T): void;
  isSubmitting(userId: string, discId: string): boolean;
  getSessionGeneration(): number;
  beginSubmit(userId: string, discId: string): boolean;
  finishSubmit(userId: string, discId: string): void;
  clear(): void;
  subscribe(userId: string, discId: string, listener: UserDiscStateListener): () => void;
  subscribeAll(listener: UserDiscStateListener): () => void;
}

/** Framework-free in-memory application state shared by consumers of a user/disc relation. */
export function createUserDiscState<T>(empty: () => T, clone: (value: T) => T): UserDiscState<T> {
  const values = new Map<string, T>();
  const submitting = new Set<string>();
  const listeners = new Map<string, Set<UserDiscStateListener>>();
  const allListeners = new Set<UserDiscStateListener>();
  let sessionGeneration = 0;

  function publish(key: string) {
    listeners.get(key)?.forEach((listener) => listener());
    allListeners.forEach((listener) => listener());
  }

  return {
    get(userId, discId) {
      const value = values.get(communityRelationKey(userId, discId));
      return clone(value ?? empty());
    },
    has(userId, discId) {
      return values.has(communityRelationKey(userId, discId));
    },
    seed(userId, discId, value) {
      const key = communityRelationKey(userId, discId);
      if (values.has(key)) return;
      values.set(key, clone(value));
      publish(key);
    },
    set(userId, discId, value) {
      const key = communityRelationKey(userId, discId);
      values.set(key, clone(value));
      publish(key);
    },
    isSubmitting(userId, discId) {
      return submitting.has(communityRelationKey(userId, discId));
    },
    getSessionGeneration() {
      return sessionGeneration;
    },
    beginSubmit(userId, discId) {
      const key = communityRelationKey(userId, discId);
      if (submitting.has(key)) return false;
      submitting.add(key);
      publish(key);
      return true;
    },
    finishSubmit(userId, discId) {
      const key = communityRelationKey(userId, discId);
      if (submitting.delete(key)) publish(key);
    },
    clear() {
      sessionGeneration += 1;
      values.clear();
      submitting.clear();
      listeners.forEach((keyListeners) => keyListeners.forEach((listener) => listener()));
      allListeners.forEach((listener) => listener());
    },
    subscribe(userId, discId, listener) {
      const key = communityRelationKey(userId, discId);
      const keyListeners = listeners.get(key) ?? new Set<UserDiscStateListener>();
      keyListeners.add(listener);
      listeners.set(key, keyListeners);
      return () => {
        keyListeners.delete(listener);
        if (keyListeners.size === 0) listeners.delete(key);
      };
    },
    subscribeAll(listener) {
      allListeners.add(listener);
      return () => allListeners.delete(listener);
    },
  };
}
