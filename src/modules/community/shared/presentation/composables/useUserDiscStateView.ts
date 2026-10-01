import { computed, onScopeDispose, ref } from "vue";
import type { ComputedRef, Ref } from "vue";
import type { UserDiscState } from "../../application/userDiscState";

type StateViewSource<T> = Pick<UserDiscState<T>, "get" | "isSubmitting" | "subscribe">;

/** Reactive presentation snapshot backed by, but not owning, application state. */
export function useUserDiscStateView<T>(
  source: StateViewSource<T>,
  userId: string,
  discId: string,
): { state: ComputedRef<T>; isSubmitting: ComputedRef<boolean>; revision: Ref<number> } {
  const revision = ref(0);
  const state = computed(() => {
    revision.value;
    return source.get(userId, discId);
  });
  const isSubmitting = computed(() => {
    revision.value;
    return source.isSubmitting(userId, discId);
  });
  const refresh = () => { revision.value += 1; };

  const unsubscribe = source.subscribe(userId, discId, refresh);
  onScopeDispose(unsubscribe);

  return { state, isSubmitting, revision };
}

type StateRevisionSource = Pick<UserDiscState<unknown>, "subscribeAll">;

/** UI invalidation signal for views that render a dynamic set of user/disc keys. */
export function useUserDiscStateRevision(source: StateRevisionSource): Ref<number> {
  const revision = ref(0);
  const unsubscribe = source.subscribeAll(() => { revision.value += 1; });
  onScopeDispose(unsubscribe);
  return revision;
}
