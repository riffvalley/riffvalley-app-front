// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin, useQuery } from "@tanstack/vue-query";
import { defineComponent, h, reactive, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "vue-sonner";
import type { EditorialAsignation } from "@services/asignation/asignation";
import type { ListsEvent } from "./listsEventsParser";
import { useListsRealtime } from "./useListsRealtime";
import { radarDetailQueryKeys } from "../../radar/application/radarDetailQueries";
import { bestDetailQueryKeys } from "../../best/application/bestDetailQueries";

const { consume, authRef } = vi.hoisted(() => ({
  consume: vi.fn(),
  authRef: { value: null as unknown },
}));
vi.mock("./listsEventsClient", () => ({ consumeListsEvents: consume, listsClientId: "tab-a" }));
vi.mock("@/modules/identity/auth", () => ({ useAuthStore: () => authRef.value }));
vi.mock("@/modules/identity/shared", () => ({ hasMinimumRole: () => true }));
vi.mock("vue-sonner", () => ({ toast: vi.fn() }));

let activeOptions: { onEvent: (event: ListsEvent) => void };

const assignment: EditorialAsignation = {
  id: "assignment-1",
  done: false,
  position: 0,
  description: null,
  user: { id: "editor-1", username: "Carlos" },
  disc: {
    id: "disc-1",
    name: "Disco",
    image: null,
    artist: { id: "artist-1", name: "Grupo 1" },
  },
};

const changedEvent: ListsEvent = {
  type: "lists.invalidate",
  version: 1,
  reason: "change",
  action: "assignment.placed",
  actor: { kind: "user", id: "editor-2", displayName: "María" },
  assignee: { id: "editor-1", displayName: "Carlos" },
  list: { id: "radar-a", type: "week" },
  assignmentId: "assignment-1",
  discId: "disc-1",
  artistName: "Grupo 1",
  previousPosition: 0,
  newPosition: 2,
  sourceId: "tab-b",
};

function createHarness(view: "week" | "month" = "week") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
  });
  const auth = reactive({
    authStatus: "authenticated",
    userId: "user-a",
    authSessionGeneration: 3,
    role: "riffvalley",
    token: "token-a",
    renewSession: vi.fn(async () => "renewed" as const),
  });
  authRef.value = auth;
  const listId = ref("radar-a");
  const session = { userId: "user-a", generation: 3 };
  const key =
    view === "week"
      ? radarDetailQueryKeys.assignments(session, "radar-a")
      : bestDetailQueryKeys.assignments(session, "radar-a");
  let serverAssignments = [assignment];
  const fetchAssignments = vi.fn(async () => serverAssignments);
  queryClient.setQueryData(key, [assignment]);
  const signals: AbortSignal[] = [];
  consume.mockImplementation((options, signal) => {
    activeOptions = options;
    signals.push(signal);
    return Promise.resolve();
  });
  const Probe = defineComponent({
    setup() {
      useQuery({ queryKey: key, queryFn: fetchAssignments });
      useListsRealtime(listId, view);
      return () => h("div");
    },
  });
  const wrapper = mount(Probe, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
  return {
    auth,
    listId,
    key,
    queryClient,
    wrapper,
    signals,
    fetchAssignments,
    setServerAssignments(value: EditorialAsignation[]) {
      serverAssignments = value;
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  authRef.value = null;
});

describe("Lists realtime coordinator", () => {
  it("opens one authenticated view stream, refetches matching changes, and toasts only after confirmation", async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    await flushPromises();
    expect(consume).toHaveBeenCalledOnce();
    expect(consume).toHaveBeenCalledWith(
      expect.objectContaining({
        generation: 3,
        getToken: expect.any(Function),
        renewSession: expect.any(Function),
      }),
      expect.any(AbortSignal)
    );

    harness.setServerAssignments([{ ...assignment, position: 2 }]);
    activeOptions.onEvent(changedEvent);
    await vi.advanceTimersByTimeAsync(180);
    await flushPromises();

    expect(harness.fetchAssignments).toHaveBeenCalledOnce();
    expect(toast).toHaveBeenCalledWith(
      "Grupo 1 ha sido asignado a Radar 2",
      expect.objectContaining({ duration: 3_000 })
    );
    harness.wrapper.unmount();
    expect(harness.signals[0]?.aborted).toBe(true);
    harness.queryClient.clear();
  });

  it("ignores another list, suppresses own source and initial toasts, and handles unknown fallback safely", async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    await flushPromises();
    activeOptions.onEvent({ ...changedEvent, list: { id: "radar-b", type: "week" } });
    await vi.advanceTimersByTimeAsync(180);
    expect(harness.fetchAssignments).not.toHaveBeenCalled();

    activeOptions.onEvent({ ...changedEvent, sourceId: "tab-a" });
    activeOptions.onEvent({ type: "lists.invalidate", version: 1, reason: "initial" });
    activeOptions.onEvent({ type: "lists.invalidate", version: 1, reason: "change" });
    await vi.advanceTimersByTimeAsync(180);
    await flushPromises();
    expect(harness.fetchAssignments).toHaveBeenCalledOnce();
    expect(toast).not.toHaveBeenCalled();
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("replaces the connection when the route id changes without component teardown", async () => {
    const harness = createHarness();
    await flushPromises();
    harness.listId.value = "radar-b";
    await flushPromises();
    expect(consume).toHaveBeenCalledTimes(2);
    expect(harness.signals[0]?.aborted).toBe(true);
    harness.wrapper.unmount();
    expect(harness.signals[1]?.aborted).toBe(true);
    harness.queryClient.clear();
  });

  it("filters Best by month list and confirms its creation from the assignment query", async () => {
    vi.useFakeTimers();
    const harness = createHarness("month");
    await flushPromises();
    const created: EditorialAsignation = {
      ...assignment,
      id: "assignment-2",
      position: null,
      disc: { ...assignment.disc!, id: "disc-2" },
    };
    harness.setServerAssignments([assignment, created]);
    activeOptions.onEvent({
      ...changedEvent,
      action: "assignment.created",
      list: { id: "radar-a", type: "week" },
      discId: "disc-2",
      artistName: "Grupo 2",
      newPosition: null,
    });
    await vi.advanceTimersByTimeAsync(180);
    expect(harness.fetchAssignments).not.toHaveBeenCalled();

    activeOptions.onEvent({
      ...changedEvent,
      action: "assignment.created",
      list: { id: "radar-a", type: "month" },
      discId: "disc-2",
      artistName: "Grupo 2",
      newPosition: null,
    });
    await vi.advanceTimersByTimeAsync(180);
    await flushPromises();
    expect(harness.fetchAssignments).toHaveBeenCalledOnce();
    expect(toast).toHaveBeenCalledWith(
      "María ha asignado Grupo 2 a Carlos en Mejores del Mes",
      expect.any(Object)
    );
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("shows an assignment.deleted toast only after the matching refetch confirms removal", async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    await flushPromises();
    harness.setServerAssignments([]);
    activeOptions.onEvent({
      type: "lists.invalidate",
      version: 1,
      reason: "change",
      action: "assignment.deleted",
      actor: { kind: "user", id: "editor-2", displayName: "María" },
      assignee: { id: "editor-1", displayName: "Carlos" },
      list: { id: "radar-a", type: "week" },
      assignmentId: "assignment-1",
      discId: "disc-1",
      artistName: "Grupo 1",
      previousPosition: 0,
      sourceId: "tab-b",
    });
    await vi.advanceTimersByTimeAsync(180);
    await flushPromises();
    expect(harness.fetchAssignments).toHaveBeenCalledOnce();
    expect(harness.queryClient.getQueryData(harness.key)).toEqual([]);
    expect(toast).toHaveBeenCalledWith(
      "María ha eliminado la asignación de Grupo 1",
      expect.objectContaining({ duration: 3_000 })
    );
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("closes the old stream when session identity or generation changes", async () => {
    const harness = createHarness();
    await flushPromises();
    harness.auth.authSessionGeneration += 1;
    await flushPromises();
    expect(harness.signals[0]?.aborted).toBe(true);
    expect(consume).toHaveBeenCalledTimes(2);
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });

  it("closes the stream on user change and logout", async () => {
    const harness = createHarness();
    await flushPromises();
    harness.auth.userId = "user-b";
    await flushPromises();
    expect(harness.signals[0]?.aborted).toBe(true);
    expect(consume).toHaveBeenCalledTimes(2);
    harness.auth.authStatus = "unauthenticated";
    await flushPromises();
    expect(harness.signals[1]?.aborted).toBe(true);
    expect(consume).toHaveBeenCalledTimes(2);
    harness.wrapper.unmount();
    harness.queryClient.clear();
  });
});
