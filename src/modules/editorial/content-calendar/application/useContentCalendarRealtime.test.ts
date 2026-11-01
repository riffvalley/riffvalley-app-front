// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, defineComponent, h, nextTick, reactive, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "vue-sonner";
import type { Content } from "@services/contents/contents";
import type { AuthStore } from "@/modules/identity/auth";
import { contentCalendarQueryKeys } from "./contentCalendarQueries";
import { useContentCalendarRealtime } from "./useContentCalendarRealtime";
import type { ContentsEventsClientOptions } from "./contentsEventsClient";
import { filterContentCalendarByAuthor } from "../utils/contentCalendarFilters";

const { startConsumer, clientId } = vi.hoisted(() => ({
  startConsumer: vi.fn(),
  clientId: "local-tab",
}));
vi.mock("./contentsEventsClient", () => ({
  consumeContentsEvents: startConsumer,
  contentCalendarClientId: clientId,
}));
vi.mock("vue-sonner", () => ({ toast: vi.fn() }));

const initialContent: Content = {
  id: "content-1",
  type: "article",
  name: "Inicial",
  ready: false,
  backlog: false,
  publicationDate: "2026-11-01T00:00:00.000Z",
  author: { id: "user-1", username: "Editor" },
};

const changeEvent = (overrides: Record<string, unknown> = {}) => ({
  type: "contents.invalidate" as const,
  version: 2 as const,
  reason: "change" as const,
  action: "updated" as const,
  actor: { kind: "user" as const, id: "user-2", displayName: "María" },
  content: { id: "content-1", title: "Radar semanal" },
  ...overrides,
});

function createHarness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
  });
  const auth = reactive({
    authStatus: "authenticated",
    userId: "user-1",
    authSessionGeneration: 3,
    role: "riffvalley",
    token: "access-token",
    renewSession: vi.fn(async () => "renewed" as const),
  });
  const monthData = ref<Content[]>([initialContent]);
  const backlogData = ref<Content[]>([]);
  const monthFetches = vi.fn(async () => monthData.value);
  const backlogFetches = vi.fn(async () => backlogData.value);
  const pendingOperationCount = ref(0);
  const showOnlyMyEvents = ref(false);
  let monthQuery!: ReturnType<typeof useQuery<Content[]>>;
  let backlogQuery!: ReturnType<typeof useQuery<Content[]>>;
  const Probe = defineComponent({
    setup() {
      const client = useQueryClient();
      monthQuery = useQuery({
        queryKey: contentCalendarQueryKeys.month("user-1", 3, "riffvalley", 2026, 11),
        queryFn: monthFetches,
      });
      backlogQuery = useQuery({
        queryKey: contentCalendarQueryKeys.backlog("user-1", 3, "riffvalley"),
        queryFn: backlogFetches,
      });
      const visibleContents = computed(() =>
        filterContentCalendarByAuthor(
          [...(monthQuery.data.value ?? []), ...(backlogQuery.data.value ?? [])],
          showOnlyMyEvents.value,
          auth.userId
        )
      );
      useContentCalendarRealtime({
        auth: auth as unknown as AuthStore,
        enabled: computed(() => auth.authStatus === "authenticated" && Boolean(auth.token)),
        visibleContents,
        pendingOperationCount,
        showOnlyMyEvents,
      });
      return () => h("div", { "data-query-count": client.getQueryCache().getAll().length });
    },
  });
  const wrapper = mount(Probe, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  });
  const eventOptions = startConsumer.mock.calls.at(-1)?.[0] as ContentsEventsClientOptions;
  return {
    auth,
    backlogData,
    backlogFetches,
    eventOptions,
    monthData,
    monthFetches,
    pendingOperationCount,
    queryClient,
    showOnlyMyEvents,
    wrapper,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("Content Calendar realtime orchestration", () => {
  it("invalidates active month and backlog for the current session, but initial events never toast", async () => {
    vi.useFakeTimers();
    startConsumer.mockImplementation(() => Promise.resolve());
    const harness = createHarness();
    await flushPromises();
    expect(harness.monthFetches).toHaveBeenCalledOnce();
    expect(harness.backlogFetches).toHaveBeenCalledOnce();

    harness.eventOptions.onInvalidate({
      type: "contents.invalidate",
      version: 2,
      reason: "initial",
    });
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();

    expect(harness.monthFetches).toHaveBeenCalledTimes(2);
    expect(harness.backlogFetches).toHaveBeenCalledTimes(2);
    expect(toast).not.toHaveBeenCalled();
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("shows one toast only after a successful refetch changes visible data", async () => {
    vi.useFakeTimers();
    startConsumer.mockImplementation(() => Promise.resolve());
    const harness = createHarness();
    await flushPromises();
    harness.monthData.value = [{ ...initialContent, name: "Actualizado" }];

    harness.eventOptions.onInvalidate(changeEvent());
    harness.eventOptions.onInvalidate(changeEvent());
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();

    expect(toast).toHaveBeenCalledOnce();
    expect(toast).toHaveBeenCalledWith(
      "María ha actualizado Radar semanal",
      expect.objectContaining({
        id: "content-calendar-editorial-change",
        duration: 3000,
      })
    );
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("does not show a toast when any active calendar refetch fails", async () => {
    vi.useFakeTimers();
    startConsumer.mockImplementation(() => Promise.resolve());
    const harness = createHarness();
    await flushPromises();
    harness.monthData.value = [{ ...initialContent, name: "No confirmado" }];
    harness.monthFetches.mockRejectedValueOnce(new Error("HTTP unavailable"));

    harness.eventOptions.onInvalidate(changeEvent());
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();

    expect(toast).not.toHaveBeenCalled();
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("suppresses notices for equivalent data and for events received during local operations", async () => {
    vi.useFakeTimers();
    startConsumer.mockImplementation(() => Promise.resolve());
    const harness = createHarness();
    await flushPromises();

    harness.eventOptions.onInvalidate(changeEvent());
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();
    expect(toast).not.toHaveBeenCalled();

    harness.pendingOperationCount.value = 1;
    harness.monthData.value = [{ ...initialContent, name: "Cambio mientras se guarda" }];
    harness.eventOptions.onInvalidate(changeEvent());
    harness.pendingOperationCount.value = 0;
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();
    expect(toast).not.toHaveBeenCalled();

    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("does not notify about records hidden by the author filter and cancels stale sessions", async () => {
    vi.useFakeTimers();
    startConsumer.mockImplementation(() => Promise.resolve());
    const harness = createHarness();
    await flushPromises();
    harness.showOnlyMyEvents.value = true;
    harness.monthData.value = [
      initialContent,
      {
        ...initialContent,
        id: "other-author-content",
        name: "Cambio oculto",
        author: { id: "user-2", username: "Otra persona" },
      },
    ];
    harness.eventOptions.onInvalidate(
      changeEvent({
        content: { id: "other-author-content", title: "Cambio oculto" },
      })
    );
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();
    expect(toast).not.toHaveBeenCalled();

    const activeSignal = startConsumer.mock.calls[0]?.[1] as AbortSignal;
    harness.auth.authStatus = "anonymous";
    await nextTick();
    expect(activeSignal.aborted).toBe(true);
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("suppresses same-tab origin events but allows another tab for the same user", async () => {
    vi.useFakeTimers();
    startConsumer.mockImplementation(() => Promise.resolve());
    const harness = createHarness();
    await flushPromises();
    harness.monthData.value = [{ ...initialContent, name: "Actualizado" }];
    harness.eventOptions.onInvalidate(changeEvent({ sourceId: clientId }));
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();
    expect(toast).not.toHaveBeenCalled();

    harness.monthData.value = [{ ...initialContent, name: "Cambio remoto" }];
    harness.eventOptions.onInvalidate(changeEvent({ sourceId: "another-tab" }));
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();
    expect(toast).toHaveBeenCalledOnce();
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("aggregates distinct visible events after one refetch", async () => {
    vi.useFakeTimers();
    startConsumer.mockImplementation(() => Promise.resolve());
    const harness = createHarness();
    await flushPromises();
    harness.monthData.value = [
      { ...initialContent, name: "Actualizado" },
      {
        ...initialContent,
        id: "content-2",
        name: "Nuevo",
        author: { id: "user-1", username: "Editor" },
      },
    ];
    harness.eventOptions.onInvalidate(changeEvent());
    harness.eventOptions.onInvalidate(
      changeEvent({
        content: { id: "content-2", title: "Nuevo" },
        action: "created",
      })
    );
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();
    expect(toast).toHaveBeenCalledOnce();
    expect(toast).toHaveBeenCalledWith(
      "María ha realizado varios cambios visibles en el calendario.",
      expect.any(Object)
    );
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("notifies a Content removed from the scheduled query and added to backlog", async () => {
    vi.useFakeTimers();
    startConsumer.mockImplementation(() => Promise.resolve());
    const harness = createHarness();
    await flushPromises();
    harness.monthData.value = [];
    harness.backlogData.value = [{ ...initialContent, backlog: true, publicationDate: null }];

    harness.eventOptions.onInvalidate(
      changeEvent({
        action: "unscheduled",
        changes: { previousDate: "2026-11-01" },
      })
    );
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();

    expect(toast).toHaveBeenCalledWith(
      "María ha enviado Radar semanal al backlog",
      expect.any(Object)
    );
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("notifies a Content moved out of the active month after the monthly refetch", async () => {
    vi.useFakeTimers();
    startConsumer.mockImplementation(() => Promise.resolve());
    const harness = createHarness();
    await flushPromises();
    harness.monthData.value = [];
    harness.eventOptions.onInvalidate(
      changeEvent({
        action: "moved",
        changes: { previousDate: "2026-11-01", newDate: "2026-12-01" },
      })
    );
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();

    expect(toast).toHaveBeenCalledWith(
      "María ha movido Radar semanal del 01/11 al 01/12",
      expect.any(Object)
    );
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("shows a change that remains in the filtered current-user projection", async () => {
    vi.useFakeTimers();
    startConsumer.mockImplementation(() => Promise.resolve());
    const harness = createHarness();
    await flushPromises();
    harness.showOnlyMyEvents.value = true;
    harness.monthData.value = [{ ...initialContent, name: "Actualizado" }];
    harness.eventOptions.onInvalidate(changeEvent());
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();

    expect(toast).toHaveBeenCalledWith("María ha actualizado Radar semanal", expect.any(Object));
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("restarts exactly one stream when the access token changes in the active generation", async () => {
    startConsumer.mockImplementation(() => Promise.resolve());
    const harness = createHarness();
    await flushPromises();
    const oldSignal = startConsumer.mock.calls[0]?.[1] as AbortSignal;

    harness.auth.token = "refreshed-token";
    await nextTick();

    expect(oldSignal.aborted).toBe(true);
    expect(startConsumer).toHaveBeenCalledTimes(2);
    expect(startConsumer.mock.calls[1]?.[0]).toMatchObject({ getToken: expect.any(Function) });
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("closes on role loss and resumes after returning online", async () => {
    startConsumer.mockImplementation(() => Promise.resolve());
    const harness = createHarness();
    await flushPromises();
    const initialSignal = startConsumer.mock.calls[0]?.[1] as AbortSignal;

    harness.auth.role = "collaborator";
    await nextTick();
    expect(initialSignal.aborted).toBe(true);
    expect(startConsumer).toHaveBeenCalledOnce();

    harness.auth.role = "riffvalley";
    await nextTick();
    const onlineSignal = startConsumer.mock.calls[1]?.[1] as AbortSignal;
    window.dispatchEvent(new Event("offline"));
    expect(onlineSignal.aborted).toBe(true);
    window.dispatchEvent(new Event("online"));
    await nextTick();
    expect(startConsumer).toHaveBeenCalledTimes(3);

    harness.wrapper.unmount();
    harness.queryClient.clear();
  });
});
