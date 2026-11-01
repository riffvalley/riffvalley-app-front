// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { computed, defineComponent, h, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getReunionDetails, getReunions } from "../api/reunionsApi";
import { reunionsQueryKeys, useReunionDetailQuery, useReunionsListQuery } from "./reunionsQueries";
import type { Reunion } from "../types/reunions";

vi.mock("../api/reunionsApi", () => ({
  getReunions: vi.fn(),
  getReunionDetails: vi.fn(),
}));

const sample: Reunion = {
  id: "meeting-1",
  title: "Editorial",
  date: "2026-11-01T12:00:00.000Z",
  description: null,
  points: [
    {
      id: "point-1",
      title: "Agenda",
      content: null,
      done: null,
      createdAt: "2026-11-01T00:00:00.000Z",
    },
  ],
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

afterEach(() => vi.clearAllMocks());

describe("Reunions TanStack Query ownership", () => {
  it("isolates list and detail keys by user, session generation, and role", () => {
    const first = reunionsQueryKeys.list("user-a", 2, "riffvalley");
    expect(first).toEqual(["editorial", "reunions", "user-a", 2, "riffvalley", "list"]);
    expect(reunionsQueryKeys.detail("user-a", 2, "riffvalley", "meeting-1")).toEqual([
      "editorial",
      "reunions",
      "user-a",
      2,
      "riffvalley",
      "detail",
      "meeting-1",
    ]);
    expect(reunionsQueryKeys.list("user-b", 2, "riffvalley")).not.toEqual(first);
    expect(reunionsQueryKeys.list("user-a", 3, "riffvalley")).not.toEqual(first);
    expect(reunionsQueryKeys.list("user-a", 2, "superadmin")).not.toEqual(first);
  });

  it("loads all Reunions once, keeping their associated Points in the result", async () => {
    vi.mocked(getReunions).mockResolvedValue([sample]);
    const queryClient = createQueryClient();
    const session = {
      userId: ref<string | null>("user-a"),
      generation: ref(2),
      role: ref<string | null>("riffvalley"),
    };
    let query!: ReturnType<typeof useReunionsListQuery>;
    const Probe = defineComponent({
      setup() {
        query = useReunionsListQuery({
          userId: computed(() => session.userId.value),
          generation: session.generation,
          role: session.role,
        });
        return () => h("div", query.data.value?.[0]?.points.length ?? 0);
      },
    });
    const wrapper = mount(Probe, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
    await flushPromises();
    expect(getReunions).toHaveBeenCalledOnce();
    expect(getReunions).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(getReunionDetails).not.toHaveBeenCalled();
    expect(query.data.value?.[0]?.points).toHaveLength(1);
    wrapper.unmount();
    queryClient.clear();
  });

  it("seeds a fresh detail from the list without another HTTP request", async () => {
    const queryClient = createQueryClient();
    const session = {
      userId: ref<string | null>("user-a"),
      generation: ref(2),
      role: ref<string | null>("riffvalley"),
    };
    const listKey = reunionsQueryKeys.list("user-a", 2, "riffvalley");
    queryClient.setQueryData(listKey, [sample]);
    let detail!: ReturnType<typeof useReunionDetailQuery>;
    const Probe = defineComponent({
      setup() {
        detail = useReunionDetailQuery(session, ref("meeting-1"));
        return () => h("div", detail.data.value?.title ?? "pending");
      },
    });
    const wrapper = mount(Probe, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
    await flushPromises();
    expect(detail.data.value?.points).toHaveLength(1);
    expect(getReunionDetails).not.toHaveBeenCalled();
    wrapper.unmount();
    queryClient.clear();
  });

  it("aborts an unobserved list request after its view unmounts", async () => {
    let receivedSignal!: AbortSignal;
    vi.mocked(getReunions).mockImplementation((signal) => {
      receivedSignal = signal!;
      return new Promise<Reunion[]>(() => undefined);
    });
    const queryClient = createQueryClient();
    const Probe = defineComponent({
      setup() {
        useReunionsListQuery({ userId: "user-a", generation: 2, role: "riffvalley" });
        return () => h("div");
      },
    });
    const wrapper = mount(Probe, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
    await flushPromises();
    wrapper.unmount();
    await flushPromises();
    expect(receivedSignal.aborted).toBe(true);
    queryClient.clear();
  });
});
