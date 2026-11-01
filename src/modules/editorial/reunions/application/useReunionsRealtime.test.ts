// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin, useQuery } from "@tanstack/vue-query";
import { computed, defineComponent, h, reactive, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "vue-sonner";
import type { AuthStore } from "@/modules/identity/auth";
import type { Reunion, ReunionsEvent } from "../types/reunions";
import { reunionsQueryKeys } from "./reunionsQueries";
import { useReunionsRealtime } from "./useReunionsRealtime";

const { consume, localSourceId } = vi.hoisted(() => ({
  consume: vi.fn(),
  localSourceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
}));
vi.mock("./reunionsEventsClient", () => ({ consumeReunionsEvents: consume }));
vi.mock("@/shared/realtime/editorialClientId", () => ({
  editorialClientId: localSourceId,
}));
vi.mock("vue-sonner", () => ({ toast: vi.fn() }));

let activeOptions: { onEvent: (event: ReunionsEvent) => void };

const initial: Reunion = {
  id: "meeting-1",
  title: "Editorial",
  date: "2026-11-01T12:00:00.000Z",
  description: null,
  points: [
    {
      id: "point-1",
      title: "Agenda",
      content: null,
      done: false,
      createdAt: "2026-11-01T00:00:00.000Z",
    },
  ],
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};
const remoteEvent: ReunionsEvent = {
  type: "reunions.invalidate",
  version: 1,
  reason: "change",
  action: "point.completed",
  actor: { kind: "user", id: "user-b", displayName: "María" },
  reunion: { id: "meeting-1", title: "Editorial" },
  point: { id: "point-1", title: "Agenda" },
  sourceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
};

function createHarness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
  });
  const auth = reactive({
    authStatus: "authenticated",
    userId: "user-a",
    authSessionGeneration: 2,
    role: "riffvalley",
    token: "token-a",
    renewSession: vi.fn(async () => "renewed" as const),
  });
  const enabled = ref(true);
  const showMeeting = ref(true);
  let serverData = [initial];
  let fetchFails = false;
  const fetchReunions = vi.fn(async () => {
    if (fetchFails) throw new Error("network");
    return serverData;
  });
  const listKey = reunionsQueryKeys.list("user-a", 2, "riffvalley");
  queryClient.setQueryData(listKey, [initial]);
  const signals: AbortSignal[] = [];
  consume.mockImplementation((options, consumerSignal) => {
    signals.push(consumerSignal);
    activeOptions = options;
    return Promise.resolve();
  });
  const Probe = defineComponent({
    setup() {
      const listQuery = useQuery({ queryKey: listKey, queryFn: fetchReunions });
      useReunionsRealtime(
        auth as unknown as AuthStore,
        computed(() => enabled.value),
        computed(() => (showMeeting.value ? (listQuery.data.value ?? []) : []))
      );
      return () => h("div");
    },
  });
  const wrapper = mount(Probe, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
  return {
    auth,
    enabled,
    showMeeting,
    fetchReunions,
    queryClient,
    wrapper,
    signals,
    setServerData(value: Reunion[]) {
      serverData = value;
    },
    setFetchFails(value: boolean) {
      fetchFails = value;
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("Reunions realtime section lifecycle", () => {
  it("keeps one stream as the section remains enabled and batches a foreign event into HTTP refresh + toast", async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    await flushPromises();
    expect(consume).toHaveBeenCalledOnce();
    harness.setServerData([{ ...initial, points: [{ ...initial.points[0]!, done: true }] }]);
    activeOptions.onEvent(remoteEvent);
    await vi.advanceTimersByTimeAsync(180);
    await flushPromises();
    expect(harness.fetchReunions).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      "María ha completado Agenda",
      expect.objectContaining({ duration: 3_000 })
    );
    harness.enabled.value = true;
    await flushPromises();
    expect(consume).toHaveBeenCalledOnce();
    harness.wrapper.unmount();
    expect(harness.signals[0]?.aborted).toBe(true);
    harness.queryClient.clear();
  });

  it("invalidates own and fallback events without showing a toast", async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    await flushPromises();
    const ownEvent = { ...remoteEvent, sourceId: localSourceId };
    activeOptions.onEvent(ownEvent);
    await vi.advanceTimersByTimeAsync(180);
    await flushPromises();
    activeOptions.onEvent({ type: "reunions.invalidate", version: 1, reason: "change" });
    await vi.advanceTimersByTimeAsync(180);
    await flushPromises();
    expect(harness.fetchReunions).toHaveBeenCalledTimes(2);
    expect(toast).not.toHaveBeenCalled();
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("uses initial synchronization to refetch HTTP without a toast", async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    await flushPromises();
    harness.setServerData([{ ...initial, title: "Estado HTTP actual" }]);
    activeOptions.onEvent({ type: "reunions.invalidate", version: 1, reason: "initial" });
    await vi.advanceTimersByTimeAsync(180);
    await flushPromises();
    expect(harness.fetchReunions).toHaveBeenCalledOnce();
    expect(toast).not.toHaveBeenCalled();
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("does not toast a failed HTTP refresh, unchanged data, or data from a different session", async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    await flushPromises();
    harness.setFetchFails(true);
    activeOptions.onEvent(remoteEvent);
    await vi.advanceTimersByTimeAsync(180);
    await flushPromises();
    expect(toast).not.toHaveBeenCalled();
    harness.setFetchFails(false);
    activeOptions.onEvent(remoteEvent);
    await vi.advanceTimersByTimeAsync(180);
    await flushPromises();
    expect(toast).not.toHaveBeenCalled();
    harness.auth.userId = "user-c";
    await flushPromises();
    expect(harness.signals[0]?.aborted).toBe(true);
    expect(consume).toHaveBeenCalledTimes(2);
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("does not toast changes outside the records currently visible after local filters", async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    await flushPromises();
    harness.showMeeting.value = false;
    harness.setServerData([{ ...initial, points: [{ ...initial.points[0]!, done: true }] }]);
    activeOptions.onEvent(remoteEvent);
    await vi.advanceTimersByTimeAsync(180);
    await flushPromises();
    expect(harness.fetchReunions).toHaveBeenCalledOnce();
    expect(toast).not.toHaveBeenCalled();
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("uses a neutral aggregate when a burst changes multiple visible records", async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    await flushPromises();
    const second: Reunion = { ...initial, id: "meeting-2", title: "Semanal" };
    const listKey = reunionsQueryKeys.list("user-a", 2, "riffvalley");
    harness.queryClient.setQueryData(listKey, [initial, second]);
    await flushPromises();
    harness.setServerData([
      { ...initial, title: "Editorial nueva" },
      { ...second, title: "Semanal nueva" },
    ]);
    activeOptions.onEvent(remoteEvent);
    activeOptions.onEvent({
      ...remoteEvent,
      action: "reunion.updated",
      reunion: { id: second.id, title: second.title },
    });
    await vi.advanceTimersByTimeAsync(180);
    await flushPromises();
    expect(toast).toHaveBeenCalledWith(
      "Hay 2 cambios visibles en las reuniones.",
      expect.objectContaining({ duration: 3_000 })
    );
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });
});
