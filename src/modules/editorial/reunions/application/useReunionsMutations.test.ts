// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { defineComponent, h } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createContent } from "@services/contents/contents";
import {
  createPoint,
  createReunion,
  deletePoint,
  deleteReunion,
  updatePoint,
  updateReunion,
} from "../api/reunionsApi";
import { editorialClientId } from "@/shared/realtime/editorialClientId";
import { reunionsQueryKeys } from "./reunionsQueries";
import { useReunionsMutations } from "./useReunionsMutations";

vi.mock("@services/contents/contents", () => ({ createContent: vi.fn() }));
vi.mock("../api/reunionsApi", () => ({
  createPoint: vi.fn(),
  createReunion: vi.fn(),
  deletePoint: vi.fn(),
  deleteReunion: vi.fn(),
  updatePoint: vi.fn(),
  updateReunion: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

describe("Reunions mutations", () => {
  it("creates a Reunion through Contents and invalidates both editorial query owners", async () => {
    vi.mocked(createContent).mockResolvedValue({
      id: "content-1",
      type: "reunion",
      name: "Editorial",
      ready: false,
      backlog: false,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const session = { userId: "user-a", generation: 3, role: "riffvalley" };
    const reunionKey = reunionsQueryKeys.list(session.userId, session.generation, session.role);
    const calendarKey = [
      "editorial",
      "contents",
      "content-calendar",
      "user-a",
      3,
      "riffvalley",
      "backlog",
    ] as const;
    queryClient.setQueryData(reunionKey, []);
    queryClient.setQueryData(calendarKey, []);
    let mutations!: ReturnType<typeof useReunionsMutations>;
    const Probe = defineComponent({
      setup() {
        mutations = useReunionsMutations(session);
        return () => h("div");
      },
    });
    const wrapper = mount(Probe, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });

    await mutations.createReunionFromContentMutation.mutateAsync({
      type: "reunion",
      name: "Editorial",
      publicationDate: "2026-11-01T12:00:00.000Z",
      authorId: "author-1",
    });
    await flushPromises();

    expect(createContent).toHaveBeenCalledWith(
      {
        type: "reunion",
        name: "Editorial",
        publicationDate: "2026-11-01T12:00:00.000Z",
        authorId: "author-1",
      },
      editorialClientId
    );
    expect(queryClient.getQueryState(reunionKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(calendarKey)?.isInvalidated).toBe(true);
    wrapper.unmount();
    queryClient.clear();
  });

  it("does not invalidate queries after a failed mutation", async () => {
    vi.mocked(createContent).mockRejectedValue(new Error("forbidden"));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const session = { userId: "user-a", generation: 3, role: "riffvalley" };
    const key = reunionsQueryKeys.list(session.userId, session.generation, session.role);
    queryClient.setQueryData(key, []);
    let mutations!: ReturnType<typeof useReunionsMutations>;
    const Probe = defineComponent({
      setup() {
        mutations = useReunionsMutations(session);
        return () => h("div");
      },
    });
    const wrapper = mount(Probe, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
    await expect(
      mutations.createReunionFromContentMutation.mutateAsync({
        type: "reunion",
        name: "Editorial",
        publicationDate: "2026-11-01T12:00:00.000Z",
        authorId: "author-1",
      })
    ).rejects.toThrow("forbidden");
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
    wrapper.unmount();
    queryClient.clear();
  });

  it("centralizes Reunion and Point CRUD, completion, reopening, reassignment, and invalidation", async () => {
    vi.mocked(createReunion).mockResolvedValue({} as never);
    vi.mocked(updateReunion).mockResolvedValue({} as never);
    vi.mocked(deleteReunion).mockResolvedValue(undefined);
    vi.mocked(createPoint).mockResolvedValue({} as never);
    vi.mocked(updatePoint).mockResolvedValue({} as never);
    vi.mocked(deletePoint).mockResolvedValue(undefined);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const session = { userId: "user-a", generation: 3, role: "riffvalley" };
    const key = reunionsQueryKeys.list(session.userId, session.generation, session.role);
    queryClient.setQueryData(key, []);
    let mutations!: ReturnType<typeof useReunionsMutations>;
    const Probe = defineComponent({
      setup() {
        mutations = useReunionsMutations(session);
        return () => h("div");
      },
    });
    const wrapper = mount(Probe, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });

    await mutations.createReunionMutation.mutateAsync({
      titulo: "Editorial",
      fecha: "2026-11-01T12:00:00.000Z",
    });
    await mutations.updateReunionMutation.mutateAsync({
      id: "meeting-1",
      dto: { titulo: "Editorial 2" },
    });
    await mutations.deleteReunionMutation.mutateAsync("meeting-1");
    await mutations.createPointMutation.mutateAsync({ titulo: "Agenda", reunionId: "meeting-1" });
    await mutations.updatePointMutation.mutateAsync({
      id: "point-1",
      dto: { titulo: "Agenda 2", content: "Notas" },
    });
    await mutations.updatePointMutation.mutateAsync({ id: "point-1", dto: { done: true } });
    await mutations.updatePointMutation.mutateAsync({ id: "point-1", dto: { done: false } });
    await mutations.updatePointMutation.mutateAsync({
      id: "point-1",
      dto: { reunionId: "meeting-2" },
    });
    await mutations.deletePointMutation.mutateAsync("point-1");

    expect(createReunion).toHaveBeenCalledWith(
      { titulo: "Editorial", fecha: "2026-11-01T12:00:00.000Z" },
      editorialClientId
    );
    expect(updateReunion).toHaveBeenCalledWith(
      "meeting-1",
      { titulo: "Editorial 2" },
      editorialClientId
    );
    expect(deleteReunion).toHaveBeenCalledWith("meeting-1", editorialClientId);
    expect(createPoint).toHaveBeenCalledWith(
      { titulo: "Agenda", reunionId: "meeting-1" },
      editorialClientId
    );
    expect(updatePoint).toHaveBeenNthCalledWith(
      1,
      "point-1",
      { titulo: "Agenda 2", content: "Notas" },
      editorialClientId
    );
    expect(updatePoint).toHaveBeenNthCalledWith(2, "point-1", { done: true }, editorialClientId);
    expect(updatePoint).toHaveBeenNthCalledWith(3, "point-1", { done: false }, editorialClientId);
    expect(updatePoint).toHaveBeenNthCalledWith(
      4,
      "point-1",
      { reunionId: "meeting-2" },
      editorialClientId
    );
    expect(deletePoint).toHaveBeenCalledWith("point-1", editorialClientId);
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    wrapper.unmount();
    queryClient.clear();
  });
});
