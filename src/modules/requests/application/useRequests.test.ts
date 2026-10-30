// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

const api = vi.hoisted(() => ({
  getMyRequests: vi.fn(), getAllRequests: vi.fn(), createRequest: vi.fn(), updateRequest: vi.fn(),
  approveRequest: vi.fn(), reopenRequest: vi.fn(), rejectRequest: vi.fn(),
}));
vi.mock("../api/requests", () => api);

import { useAuthStore } from "@/modules/identity/auth";
import { useAdminRequestsQuery, useMyRequestsQuery, useRequestMutations, requestsQueryKeyForSession } from "./useRequests";

describe("Requests application queries and mutations", () => {
  let pinia: ReturnType<typeof createPinia>;
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    pinia = createPinia();
    setActivePinia(pinia);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const auth = useAuthStore();
    auth.$patch({ authStatus: "authenticated", token: "token-a", userId: "user-a", role: "riffvalley", authSessionGeneration: 3 });
    api.getMyRequests.mockResolvedValue([]);
    api.getAllRequests.mockResolvedValue([]);
    api.createRequest.mockResolvedValue({ id: "new-request" });
    api.updateRequest.mockResolvedValue({ id: "request-1" });
    api.approveRequest.mockResolvedValue(undefined);
    api.reopenRequest.mockResolvedValue({ id: "request-1" });
    api.rejectRequest.mockResolvedValue({ id: "request-1" });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    queryClient.clear();
  });

  function mountHarness(setup: () => unknown) {
    wrapper = mount(defineComponent({ setup, render: () => h("div") }), {
      global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
    });
  }

  it("keys private lists by scope, user and session generation", () => {
    expect(requestsQueryKeyForSession("mine", "a", 2)).not.toEqual(requestsQueryKeyForSession("mine", "b", 2));
    expect(requestsQueryKeyForSession("mine", "a", 2)).not.toEqual(requestsQueryKeyForSession("mine", "a", 3));
    expect(requestsQueryKeyForSession("mine", "a", 2)).not.toEqual(requestsQueryKeyForSession("admin", "a", 2));
  });

  it("loads both list scopes and passes the Query cancellation signal", async () => {
    let mine: ReturnType<typeof useMyRequestsQuery> | undefined;
    let admin: ReturnType<typeof useAdminRequestsQuery> | undefined;
    mountHarness(() => { mine = useMyRequestsQuery(); admin = useAdminRequestsQuery(); return {}; });
    await flushPromises();
    expect(api.getMyRequests).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(api.getAllRequests).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(mine?.data.value).toEqual([]);
    expect(admin?.data.value).toEqual([]);
  });

  it("disables the admin query below riffvalley while allowing the own list", async () => {
    const auth = useAuthStore();
    auth.role = "user";
    mountHarness(() => { useMyRequestsQuery(); useAdminRequestsQuery(); return {}; });
    await flushPromises();
    expect(api.getMyRequests).toHaveBeenCalledOnce();
    expect(api.getAllRequests).not.toHaveBeenCalled();
  });

  it("invalidates the Requests cache after a successful mutation", async () => {
    let mutations: ReturnType<typeof useRequestMutations> | undefined;
    mountHarness(() => { mutations = useRequestMutations(); return {}; });
    const existingKey = requestsQueryKeyForSession("admin", "user-a", 3);
    queryClient.setQueryData(existingKey, [{ id: "request-1" }]);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await mutations?.create.mutateAsync({ discName: "Album", artistName: "Artist" });
    await flushPromises();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["requests"] });
    expect(api.createRequest).toHaveBeenCalledWith({ discName: "Album", artistName: "Artist" });
  });

  it.each([
    ["update", { id: "request-1", dto: { adminNotes: "Fixed" } }, api.updateRequest, ["request-1", { adminNotes: "Fixed" }]],
    ["approve", "request-1", api.approveRequest, ["request-1"]],
    ["reopen", "request-1", api.reopenRequest, ["request-1"]],
    ["reject", { id: "request-1", notes: "Duplicate" }, api.rejectRequest, ["request-1", "Duplicate"]],
  ] as const)("invalidates Requests after %s", async (operation, input, apiMethod, expectedArgs) => {
    let mutations: ReturnType<typeof useRequestMutations> | undefined;
    mountHarness(() => { mutations = useRequestMutations(); return {}; });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const mutation = mutations?.[operation];
    if (!mutation) throw new Error(`Missing ${operation} mutation`);
    await mutation.mutateAsync(input as never);
    await flushPromises();
    expect(apiMethod).toHaveBeenCalledWith(...expectedArgs);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["requests"] });
  });

  it("preserves query errors rather than returning an empty list", async () => {
    const failure = new Error("offline");
    api.getMyRequests.mockRejectedValueOnce(failure);
    let query: ReturnType<typeof useMyRequestsQuery> | undefined;
    mountHarness(() => { query = useMyRequestsQuery(); return {}; });
    await vi.waitFor(() => expect(query?.isError.value).toBe(true));
    expect(query?.error.value).toBe(failure);
    expect(query?.data.value).toBeUndefined();
  });
});
