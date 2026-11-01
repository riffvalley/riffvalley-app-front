import { useQueryClient } from "@tanstack/vue-query";
import { onScopeDispose, watch, type MaybeRefOrGetter, toValue } from "vue";
import { toast } from "vue-sonner";
import { useAuthStore } from "@/modules/identity/auth";
import { hasMinimumRole } from "@/modules/identity/shared";
import type { EditorialAsignation } from "@services/asignation/asignation";
import { bestDetailQueryKeys, bestDetailQueryRoot } from "../../best/application/bestDetailQueries";
import {
  radarDetailQueryKeys,
  radarDetailQueryRoot,
} from "../../radar/application/radarDetailQueries";
import { consumeListsEvents, listsClientId } from "./listsEventsClient";
import {
  changedAssignmentDiscIds,
  deduplicateListsEvents,
  formatListsBatchToast,
  formatListsToast,
  LIST_ASSIGNMENT_MUTATION_KEY,
} from "./listsRealtime";
import type { ListsDescriptiveChangeEvent, ListsEvent } from "./listsEventsParser";

const INVALIDATION_WINDOW_MS = 180;
type ListsView = "week" | "month";

function isDescriptiveChange(event: ListsEvent): event is ListsDescriptiveChangeEvent {
  return event.reason === "change" && "action" in event;
}

export function useListsRealtime(listId: MaybeRefOrGetter<string>, view: ListsView): void {
  const auth = useAuthStore();
  const queryClient = useQueryClient();
  let stopSubscription: (() => void) | undefined;

  const stopWatch = watch(
    () =>
      [
        toValue(listId),
        auth.authStatus,
        auth.userId,
        auth.authSessionGeneration,
        auth.role,
        auth.token,
      ] as const,
    ([activeListId, status, userId, generation, role, token], _previous, onCleanup) => {
      if (
        !activeListId ||
        status !== "authenticated" ||
        !userId ||
        !token ||
        !hasMinimumRole(role, "riffvalley")
      ) {
        stopSubscription?.();
        stopSubscription = undefined;
        return;
      }

      const session = { userId, generation, role, token };
      const assignmentsKey =
        view === "week"
          ? radarDetailQueryKeys.assignments(session, activeListId)
          : bestDetailQueryKeys.assignments(session, activeListId);
      const queryRoot = view === "week" ? radarDetailQueryRoot : bestDetailQueryRoot;
      let disposed = false;
      let controller: AbortController | null = null;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let queued = false;
      let suppressToasts = false;
      let includeRadarCatalog = false;
      let invalidateUnknownFallback = false;
      let genericFallbackQueued = false;
      const toastEvents: ListsDescriptiveChangeEvent[] = [];

      const isCurrent = () =>
        !disposed &&
        auth.authStatus === "authenticated" &&
        auth.userId === session.userId &&
        auth.authSessionGeneration === session.generation &&
        auth.role === session.role &&
        auth.token === session.token &&
        toValue(listId) === activeListId;

      const scheduleFlush = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = undefined;
          void flush();
        }, INVALIDATION_WINDOW_MS);
      };

      const flush = async () => {
        if (!queued || !isCurrent()) return;
        if (queryClient.isMutating({ mutationKey: LIST_ASSIGNMENT_MUTATION_KEY }) > 0) {
          suppressToasts = true;
          console.info("[Lists SSE] Refetch aplazado: hay una mutación local pendiente.");
          return;
        }
        queued = false;
        const events = deduplicateListsEvents(toastEvents.splice(0));
        const canShowToast = !suppressToasts;
        suppressToasts = false;
        const refreshRadarCatalog = includeRadarCatalog;
        const refreshUnknownFallback = invalidateUnknownFallback;
        const hasGenericFallback = genericFallbackQueued;
        includeRadarCatalog = false;
        invalidateUnknownFallback = false;
        genericFallbackQueued = false;
        const before = [...(queryClient.getQueryData<EditorialAsignation[]>(assignmentsKey) ?? [])];
        const invalidations: Promise<void>[] = [];
        if (!refreshUnknownFallback) {
          invalidations.push(
            queryClient.invalidateQueries(
              { queryKey: assignmentsKey, refetchType: "active" },
              { throwOnError: true }
            )
          );
        }
        if (view === "week" && refreshRadarCatalog) {
          invalidations.push(
            queryClient.invalidateQueries(
              {
                predicate: (query) =>
                  query.queryKey[0] === queryRoot[0] &&
                  query.queryKey[1] === queryRoot[1] &&
                  query.queryKey[2] === queryRoot[2] &&
                  query.queryKey[3] === "catalog" &&
                  query.queryKey[4] === activeListId &&
                  query.isActive(),
                refetchType: "active",
              },
              { throwOnError: true }
            )
          );
        }
        if (refreshUnknownFallback) {
          invalidations.push(
            queryClient.invalidateQueries(
              {
                predicate: (query) =>
                  (query.queryKey[0] === radarDetailQueryRoot[0] &&
                    query.queryKey[1] === radarDetailQueryRoot[1] &&
                    query.queryKey[2] === radarDetailQueryRoot[2] &&
                    query.queryKey[3] === "assignments") ||
                  (query.queryKey[0] === bestDetailQueryRoot[0] &&
                    query.queryKey[1] === bestDetailQueryRoot[1] &&
                    query.queryKey[2] === bestDetailQueryRoot[2] &&
                    query.queryKey[3] === "assignments"),
                refetchType: "active",
              },
              { throwOnError: true }
            )
          );
        }

        try {
          await Promise.all(invalidations);
        } catch {
          console.warn("[Lists SSE] Falló el refetch HTTP de las asignaciones.", {
            listId: activeListId,
            view,
          });
          return;
        }
        if (hasGenericFallback) {
          console.info(
            "[Lists SSE] Refetch completado para el fallback genérico; no hay toast descriptivo.",
            {
              listId: activeListId,
              view,
            }
          );
        }
        if (!isCurrent() || !canShowToast || events.length === 0) {
          if (events.length > 0) {
            console.info("[Lists SSE] Refetch completado; toast suprimido.", {
              listId: activeListId,
              view,
              currentTabEvent: events.every((event) => event.sourceId === listsClientId),
              localMutationPending: !canShowToast,
            });
          }
          return;
        }
        const after = queryClient.getQueryData<EditorialAsignation[]>(assignmentsKey) ?? [];
        const changedIds = changedAssignmentDiscIds(before, after);
        const confirmed = events.filter((event) => changedIds.has(event.discId));
        if (confirmed.length === 0) {
          console.info("[Lists SSE] Refetch completado; no confirmó cambios visibles.", {
            listId: activeListId,
            view,
            events: events.length,
          });
          return;
        }
        console.info("[Lists SSE] Cambio confirmado; mostrando notificación.", {
          listId: activeListId,
          view,
          events: confirmed.map((event) => event.action),
        });
        toast(confirmed.length === 1 ? formatListsToast(confirmed[0]) : formatListsBatchToast(), {
          id: "lists-editorial-assignment-change",
          duration: 3_000,
          position: "top-right",
          class: "rv-calendar-toast",
        });
      };

      const receive = (event: ListsEvent) => {
        if (!isCurrent()) return;
        console.info("[Lists SSE] Evento recibido.", {
          reason: event.reason,
          action: isDescriptiveChange(event) ? event.action : undefined,
          eventListId: "list" in event ? event.list?.id : undefined,
          eventListType: "list" in event ? event.list?.type : undefined,
          activeListId,
          activeView: view,
          ownTab: isDescriptiveChange(event) && event.sourceId === listsClientId,
        });
        if (event.reason === "change") {
          if ("list" in event && event.list) {
            if (event.list.id !== activeListId || event.list.type !== view) {
              console.info("[Lists SSE] Evento ignorado: no coincide la lista o su tipo.");
              return;
            }
            if (view === "week") includeRadarCatalog = true;
            if (!isDescriptiveChange(event)) {
              genericFallbackQueued = true;
              console.info(
                "[Lists SSE] Fallback genérico coincidente; se sincronizará por HTTP sin toast."
              );
            }
          } else if ("action" in event) {
            console.info("[Lists SSE] Evento descriptivo inválido sin referencia de lista.");
            return;
          } else {
            invalidateUnknownFallback = true;
            genericFallbackQueued = true;
            console.info(
              "[Lists SSE] Fallback sin lista; se invalidarán las asignaciones activas sin toast."
            );
          }
        }
        if (isDescriptiveChange(event)) {
          if (event.list.id !== activeListId || event.list.type !== view) return;
          includeRadarCatalog ||= view === "week";
          if (event.sourceId !== listsClientId) {
            if (queryClient.isMutating({ mutationKey: LIST_ASSIGNMENT_MUTATION_KEY }) > 0) {
              suppressToasts = true;
            } else {
              toastEvents.push(event);
            }
          }
        }
        queued = true;
        scheduleFlush();
      };

      const unsubscribeMutations = queryClient.getMutationCache().subscribe(() => {
        if (
          queued &&
          queryClient.isMutating({ mutationKey: LIST_ASSIGNMENT_MUTATION_KEY }) === 0 &&
          !timer
        ) {
          scheduleFlush();
        }
      });

      const start = () => {
        if (!isCurrent() || (controller && !controller.signal.aborted)) return;
        controller = new AbortController();
        void consumeListsEvents(
          {
            getToken: () => (isCurrent() ? auth.token : null),
            renewSession: (expectedGeneration) => auth.renewSession(expectedGeneration),
            generation: session.generation,
            isCurrent,
            onEvent: receive,
          },
          controller.signal
        );
      };
      const onOnline = () => start();
      const onOffline = () => controller?.abort();
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      stopSubscription = () => {
        disposed = true;
        controller?.abort();
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
        unsubscribeMutations();
        if (timer) clearTimeout(timer);
        queued = false;
        toastEvents.length = 0;
      };
      onCleanup(() => stopSubscription?.());
      start();
    },
    { immediate: true }
  );

  onScopeDispose(() => {
    stopSubscription?.();
    stopWatch();
  });
}
