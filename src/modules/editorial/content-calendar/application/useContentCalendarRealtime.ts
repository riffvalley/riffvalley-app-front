import { useQueryClient } from "@tanstack/vue-query";
import { defineComponent, h, onScopeDispose, watch, type ComputedRef, type Ref } from "vue";
import { toast } from "vue-sonner";
import type { Content } from "@services/contents/contents";
import type { AuthStore } from "@/modules/identity/auth";
import { hasMinimumRole } from "@/modules/identity/shared";
import { contentCalendarQueryKeys } from "./contentCalendarQueries";
import { consumeContentsEvents, contentCalendarClientId } from "./contentsEventsClient";
import {
  deduplicateEditorialEvents,
  formatEditorialBatchToast,
  formatEditorialToast,
  getVisibleChangedContentIds,
} from "./contentCalendarRealtime";
import type {
  ContentsInvalidateChangeEvent,
  ContentsInvalidateEvent,
} from "./contentsInvalidateParser";
import {
  faCalendarPlus,
  faCalendarDays,
  faArrowsLeftRight,
  faInbox,
  faPen,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

interface RealtimeOptions {
  auth: AuthStore;
  enabled: ComputedRef<boolean>;
  visibleContents: ComputedRef<Content[]>;
  pendingOperationCount: Ref<number>;
  showOnlyMyEvents: ComputedRef<boolean> | Ref<boolean>;
}

const BATCH_WINDOW_MS = 180;
const actionIcons = {
  created: faCalendarPlus,
  scheduled: faCalendarDays,
  moved: faArrowsLeftRight,
  unscheduled: faInbox,
  updated: faPen,
  deleted: faTrash,
};

const EditorialActionIcon = defineComponent({
  props: { action: { type: String, required: true } },
  setup: (props) => () =>
    h(FontAwesomeIcon, {
      icon: actionIcons[props.action as keyof typeof actionIcons] ?? faCalendarDays,
      "aria-hidden": true,
    }),
});

export function useContentCalendarRealtime(options: RealtimeOptions): void {
  const queryClient = useQueryClient();
  let stopSubscription: (() => void) | undefined;

  const stop = watch(
    () =>
      [
        options.enabled.value,
        options.auth.authStatus,
        options.auth.userId,
        options.auth.authSessionGeneration,
        options.auth.role,
        options.auth.token,
      ] as const,
    ([enabled, status, userId, generation, role, token], _previous, onCleanup) => {
      if (
        !enabled ||
        status !== "authenticated" ||
        !userId ||
        !hasMinimumRole(role, "riffvalley")
      ) {
        stopSubscription?.();
        stopSubscription = undefined;
        return;
      }

      if (!token) return;
      const session = { userId, generation, role, token };
      let controller: AbortController | null = null;
      let disposed = false;
      let batchTimer: ReturnType<typeof setTimeout> | undefined;
      let queued = false;
      let suppressQueuedToasts = false;
      const queuedEvents: ContentsInvalidateChangeEvent[] = [];

      const isCurrent = () =>
        !disposed &&
        options.auth.authStatus === "authenticated" &&
        options.auth.userId === session.userId &&
        options.auth.authSessionGeneration === session.generation &&
        options.auth.role === session.role &&
        options.auth.token === session.token;

      const flush = async () => {
        if (!queued || !isCurrent()) return;
        if (options.pendingOperationCount.value > 0) return;
        queued = false;
        const events = deduplicateEditorialEvents(queuedEvents.splice(0));
        const canShowToast = !suppressQueuedToasts;
        suppressQueuedToasts = false;
        const before = [...options.visibleContents.value];
        try {
          await queryClient.invalidateQueries(
            {
              queryKey: contentCalendarQueryKeys.root(
                session.userId,
                session.generation,
                session.role
              ),
              refetchType: "active",
            },
            { throwOnError: true }
          );
        } catch {
          return;
        }
        if (!isCurrent() || !canShowToast || events.length === 0) return;
        const after = options.visibleContents.value;
        const changedIds = getVisibleChangedContentIds(before, after);
        if (changedIds.size === 0) return;
        const visibleEvents = events.filter((event) => {
          const contentId = event.content?.id;
          if (!contentId) return !options.showOnlyMyEvents.value;
          return changedIds.has(contentId);
        });
        if (visibleEvents.length === 0) return;
        const single = visibleEvents.length === 1 ? visibleEvents[0] : undefined;
        const message = single
          ? formatEditorialToast(single)
          : formatEditorialBatchToast(visibleEvents);
        toast(message, {
          id: "content-calendar-editorial-change",
          duration: 3_000,
          position: "top-right",
          class: "rv-calendar-toast",
          icon: single
            ? h(EditorialActionIcon, { action: single.action ?? "updated" })
            : h(FontAwesomeIcon, { icon: faCalendarDays, "aria-hidden": true }),
        });
      };

      const scheduleFlush = (event: ContentsInvalidateEvent) => {
        queued = true;
        if (event.reason === "change" && event.sourceId !== contentCalendarClientId) {
          if (options.pendingOperationCount.value > 0) suppressQueuedToasts = true;
          else queuedEvents.push(event);
        }
        if (options.pendingOperationCount.value > 0) {
          return;
        }
        if (batchTimer) clearTimeout(batchTimer);
        batchTimer = setTimeout(() => {
          batchTimer = undefined;
          void flush();
        }, BATCH_WINDOW_MS);
      };

      const stopPendingWatch = watch(options.pendingOperationCount, (count) => {
        if (count > 0 && queued) suppressQueuedToasts = true;
        if (count === 0 && queued) {
          if (batchTimer) clearTimeout(batchTimer);
          batchTimer = setTimeout(() => {
            batchTimer = undefined;
            void flush();
          }, BATCH_WINDOW_MS);
        }
      });

      stopSubscription = () => {
        disposed = true;
        controller?.abort();
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
        stopPendingWatch();
        if (batchTimer) clearTimeout(batchTimer);
        queued = false;
        queuedEvents.length = 0;
        suppressQueuedToasts = false;
      };
      onCleanup(() => stopSubscription?.());

      const start = () => {
        if (!isCurrent() || (controller && !controller.signal.aborted)) return;
        controller = new AbortController();
        void consumeContentsEvents(
          {
            getToken: () => (isCurrent() ? options.auth.token : null),
            renewSession: (expectedGeneration) => options.auth.renewSession(expectedGeneration),
            generation: session.generation,
            isCurrent,
            onInvalidate: scheduleFlush,
          },
          controller.signal
        );
      };
      const onOnline = () => start();
      const onOffline = () => controller?.abort();
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      start();
    },
    { immediate: true }
  );

  onScopeDispose(() => {
    stopSubscription?.();
    stop();
  });
}
