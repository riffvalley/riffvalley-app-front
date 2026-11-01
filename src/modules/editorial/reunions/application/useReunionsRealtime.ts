import { useQueryClient } from "@tanstack/vue-query";
import { watch, type ComputedRef, type Ref } from "vue";
import { toast } from "vue-sonner";
import type { AuthStore } from "@/modules/identity/auth";
import { hasMinimumRole } from "@/modules/identity/shared";
import type { Reunion, ReunionsChangeEvent, ReunionsEvent } from "../types/reunions";
import { reunionsQueryKeys } from "./reunionsQueries";
import { REUNIONS_MUTATION_KEY } from "./useReunionsMutations";
import { consumeReunionsEvents } from "./reunionsEventsClient";
import {
  changedVisibleReunionIds,
  formatReunionsBatchToast,
  formatReunionsToast,
} from "./reunionsRealtime";
import { editorialClientId } from "@/shared/realtime/editorialClientId";

const INVALIDATION_WINDOW_MS = 180;

function eventReunionIds(event: ReunionsChangeEvent): string[] {
  if (event.action === undefined) return [];
  if (event.action.startsWith("reunion.")) return [event.reunion.id];
  return event.action === "point.moved"
    ? [event.previousReunion.id, event.reunion.id]
    : [event.reunion.id];
}

function isChange(event: ReunionsEvent): event is ReunionsChangeEvent {
  return event.reason === "change";
}

export function useReunionsRealtime(
  auth: AuthStore,
  enabled: ComputedRef<boolean>,
  visibleReunions: Ref<Reunion[]>
): void {
  const queryClient = useQueryClient();

  watch(
    () =>
      [
        enabled.value,
        auth.authStatus,
        auth.userId,
        auth.authSessionGeneration,
        auth.role,
        auth.token,
      ] as const,
    ([isEnabled, status, userId, generation, role, token], _previous, onCleanup) => {
      if (
        !isEnabled ||
        status !== "authenticated" ||
        !userId ||
        !token ||
        !hasMinimumRole(role, "riffvalley")
      )
        return;

      const session = { userId, generation, role, token };
      const root = reunionsQueryKeys.root(session.userId, session.generation, session.role);
      let controller: AbortController | null = null;
      let disposed = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let invalidationQueued = false;
      const toastEvents: ReunionsChangeEvent[] = [];

      const isCurrent = () =>
        !disposed &&
        auth.authStatus === "authenticated" &&
        auth.userId === session.userId &&
        auth.authSessionGeneration === session.generation &&
        auth.role === session.role &&
        auth.token === session.token;

      const flush = async () => {
        if (!invalidationQueued || !isCurrent()) return;
        invalidationQueued = false;
        const events = [
          ...new Map(toastEvents.splice(0).map((event) => [JSON.stringify(event), event])).values(),
        ];
        const suppressToast = queryClient.isMutating({ mutationKey: REUNIONS_MUTATION_KEY }) > 0;
        const before = [...visibleReunions.value];
        try {
          await queryClient.invalidateQueries(
            { queryKey: root, refetchType: "active" },
            { throwOnError: true }
          );
        } catch {
          return;
        }
        if (!isCurrent() || suppressToast || events.length === 0) return;
        const changedIds = changedVisibleReunionIds(before, visibleReunions.value);
        if (changedIds.size === 0) return;
        const visibleEvents = events.filter((event) =>
          eventReunionIds(event).some((id) => changedIds.has(id))
        );
        if (visibleEvents.length === 0) return;
        const message =
          visibleEvents.length === 1
            ? formatReunionsToast(visibleEvents[0])
            : formatReunionsBatchToast(visibleEvents.length);
        if (!message) return;
        toast(message, {
          id: "reunions-editorial-change",
          duration: 3_000,
          position: "top-right",
          class: "rv-calendar-toast",
        });
      };

      const schedule = (event: ReunionsEvent) => {
        invalidationQueued = true;
        if (isChange(event) && event.action && event.sourceId !== editorialClientId) {
          const localOperationPending =
            queryClient.isMutating({ mutationKey: REUNIONS_MUTATION_KEY }) > 0;
          if (!localOperationPending) toastEvents.push(event);
        }
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = undefined;
          void flush();
        }, INVALIDATION_WINDOW_MS);
      };

      const readEvent = (event: ReunionsEvent) => {
        if (!isCurrent()) return;
        schedule(event);
      };

      const start = () => {
        if (!isCurrent() || (controller && !controller.signal.aborted)) return;
        controller = new AbortController();
        void consumeReunionsEvents(
          {
            getToken: () => (isCurrent() ? auth.token : null),
            renewSession: (expectedGeneration) => auth.renewSession(expectedGeneration),
            generation: session.generation,
            isCurrent,
            onEvent: readEvent,
            onUnauthorized: () => undefined,
            onForbidden: () => undefined,
          },
          controller.signal
        );
      };
      const onOnline = () => start();
      const onOffline = () => controller?.abort();
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      onCleanup(() => {
        disposed = true;
        controller?.abort();
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
        if (timer) clearTimeout(timer);
        toastEvents.length = 0;
        invalidationQueued = false;
      });
      start();
    },
    { immediate: true }
  );
}
