import { afterEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { effectScope, nextTick } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import type { DiscListRequest, DiscListResult } from "../types/discList";
import { useDiscListCoordinator } from "./useDiscListCoordinator";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function page(request: DiscListRequest, ids: string[], totalItems: number): DiscListResult {
  const metadata = {
    totalItems,
    totalPages: Math.ceil(totalItems / 20),
    currentPage: Math.floor(request.offset / 20) + 1,
    limit: 20,
  };
  if (request.mode === "comments") return { mode: "comments", comments: [], ...metadata };
  return {
    mode: request.mode,
    data: ids.map((id) => ({ id }) as never),
    ...metadata,
  };
}

function setup(
  loader: (request: DiscListRequest) => Promise<DiscListResult>,
  authenticated = true
) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const authStore = useAuthStore(pinia);
  authStore.$patch({
    authStatus: authenticated ? "authenticated" : "anonymous",
    token: authenticated ? "session-token" : null,
    userId: authenticated ? "user-a" : null,
    authSessionGeneration: 1,
  });
  const scope = effectScope();
  const coordinator = scope.run(() => useDiscListCoordinator(loader));
  if (!coordinator) throw new Error("Coordinator scope was not created");
  return { authStore, coordinator, scope };
}

async function settle() {
  await nextTick();
  await Promise.resolve();
}

const scopes: Array<{ stop: () => void }> = [];

afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
  vi.restoreAllMocks();
});

describe("useDiscListCoordinator", () => {
  it("retains the latest A→B→C intent and discards out-of-order results and errors", async () => {
    const requests: Array<{
      request: DiscListRequest;
      response: ReturnType<typeof deferred<DiscListResult>>;
    }> = [];
    const loader = vi.fn((request: DiscListRequest) => {
      const response = deferred<DiscListResult>();
      requests.push({ request, response });
      return response.promise;
    });
    const { coordinator, scope } = setup(loader);
    scopes.push(scope);

    coordinator.searchQuery.value = "B";
    await settle();
    coordinator.searchQuery.value = "C";
    await settle();
    expect(requests.map(({ request }) => request.query)).toEqual(["", "B", "C"]);

    requests[1]!.response.resolve(page(requests[1]!.request, ["stale-B"], 1));
    requests[2]!.response.resolve(page(requests[2]!.request, ["current-C"], 1));
    await settle();
    requests[0]!.response.resolve(page(requests[0]!.request, ["stale-A"], 1));
    await settle();

    expect(coordinator.discs.value.map(({ id }) => id)).toEqual(["current-C"]);
    expect(coordinator.loading.value).toBe(false);
    expect(coordinator.error.value).toBeNull();
  });

  it("keeps B loading when A responds before B and never exposes A", async () => {
    const requests: Array<{
      request: DiscListRequest;
      response: ReturnType<typeof deferred<DiscListResult>>;
    }> = [];
    const { coordinator, scope } = setup((request) => {
      const response = deferred<DiscListResult>();
      requests.push({ request, response });
      return response.promise;
    });
    scopes.push(scope);
    coordinator.searchQuery.value = "B";
    await settle();

    requests[0]!.response.resolve(page(requests[0]!.request, ["stale-A"], 1));
    await settle();
    expect(coordinator.discs.value).toEqual([]);
    expect(coordinator.loadingInitial.value).toBe(true);

    requests[1]!.response.resolve(page(requests[1]!.request, ["current-B"], 1));
    await settle();
    expect(coordinator.discs.value.map(({ id }) => id)).toEqual(["current-B"]);
  });

  it("ignores a personal response from the previous authenticated user", async () => {
    const requests: Array<{
      request: DiscListRequest;
      response: ReturnType<typeof deferred<DiscListResult>>;
    }> = [];
    const { authStore, coordinator, scope } = setup((request) => {
      const response = deferred<DiscListResult>();
      requests.push({ request, response });
      return response.promise;
    });
    scopes.push(scope);
    coordinator.setMode("favorites");
    await settle();
    authStore.$patch({ userId: "user-b", authSessionGeneration: 2 });
    await settle();

    expect(requests.map(({ request }) => request.mode)).toEqual(["all", "favorites", "favorites"]);
    requests[1]!.response.resolve(page(requests[1]!.request, ["user-a-favorite"], 1));
    requests[2]!.response.resolve(page(requests[2]!.request, ["user-b-favorite"], 1));
    await settle();
    expect(coordinator.discs.value.map(({ id }) => id)).toEqual(["user-b-favorite"]);

    authStore.$patch({
      authStatus: "anonymous",
      token: null,
      userId: null,
      authSessionGeneration: 3,
    });
    await settle();
    expect(coordinator.discs.value).toEqual([]);
    expect(requests).toHaveLength(3);
  });

  it.each(["all", "rates", "covers", "comments", "favorites", "pendientes"] as const)(
    "isolates the %s mode when the authenticated user changes",
    async (mode) => {
      const requests: Array<{
        request: DiscListRequest;
        response: ReturnType<typeof deferred<DiscListResult>>;
      }> = [];
      const { authStore, coordinator, scope } = setup((request) => {
        const response = deferred<DiscListResult>();
        requests.push({ request, response });
        return response.promise;
      });
      scopes.push(scope);

      if (mode !== "all") coordinator.setMode(mode);
      await settle();
      const previousModeRequest = requests.at(-1);
      expect(previousModeRequest?.request.mode).toBe(mode);

      authStore.$patch({ userId: "user-b", authSessionGeneration: 2 });
      await settle();
      const currentRequest = requests.at(-1);
      expect(currentRequest?.request.mode).toBe(mode);
      expect(requests).toHaveLength(mode === "all" ? 2 : 3);

      if (mode === "comments") {
        previousModeRequest?.response.resolve({
          mode: "comments",
          comments: [{ id: "stale-user-a", comment: "stale", createdAt: "2026-01-01" }],
          totalItems: 1,
          totalPages: 1,
          currentPage: 1,
          limit: 20,
        });
        currentRequest?.response.resolve({
          mode: "comments",
          comments: [{ id: "current-user-b", comment: "current", createdAt: "2026-01-01" }],
          totalItems: 1,
          totalPages: 1,
          currentPage: 1,
          limit: 20,
        });
      } else {
        previousModeRequest?.response.resolve(
          page(previousModeRequest.request, ["stale-user-a"], 1)
        );
        currentRequest?.response.resolve(page(currentRequest.request, ["current-user-b"], 1));
      }
      await settle();

      if (mode === "comments") {
        expect(coordinator.userComments.value.map(({ id }) => id)).toEqual(["current-user-b"]);
      } else {
        expect(coordinator.discs.value.map(({ id }) => id)).toEqual(["current-user-b"]);
      }
      expect(coordinator.totalItems.value).toBe(1);
      expect(coordinator.loading.value).toBe(false);
    }
  );

  it("clears all private all-mode state on logout and ignores its pending page", async () => {
    const requests: Array<{
      request: DiscListRequest;
      response: ReturnType<typeof deferred<DiscListResult>>;
    }> = [];
    const { authStore, coordinator, scope } = setup((request) => {
      const response = deferred<DiscListResult>();
      requests.push({ request, response });
      return response.promise;
    });
    scopes.push(scope);
    await settle();

    requests[0]!.response.resolve(page(requests[0]!.request, ["user-a-first"], 41));
    await settle();
    const pendingPage = coordinator.loadNextPage();
    await settle();
    expect(requests.map(({ request }) => request.offset)).toEqual([0, 20]);

    authStore.$patch({
      authStatus: "anonymous",
      token: null,
      userId: null,
      authSessionGeneration: 2,
    });
    await settle();
    expect(coordinator.discs.value).toEqual([]);
    expect(coordinator.userComments.value).toEqual([]);
    expect(coordinator.totalItems.value).toBe(0);
    expect(coordinator.totalDisc.value).toBe("");
    expect(coordinator.offset.value).toBe(0);
    expect(coordinator.loadingInitial.value).toBe(false);
    expect(coordinator.loadingMore.value).toBe(false);
    expect(coordinator.error.value).toBeNull();
    expect(requests).toHaveLength(2);

    requests[1]!.response.resolve(page(requests[1]!.request, ["stale-user-a-page"], 41));
    await pendingPage;
    expect(coordinator.discs.value).toEqual([]);
    expect(coordinator.totalItems.value).toBe(0);
    expect(coordinator.loading.value).toBe(false);
    expect(requests).toHaveLength(2);
  });

  it("blocks requests while logged out and ignores a late prior-session error", async () => {
    const requests: Array<{
      request: DiscListRequest;
      response: ReturnType<typeof deferred<DiscListResult>>;
    }> = [];
    const { authStore, coordinator, scope } = setup((request) => {
      const response = deferred<DiscListResult>();
      requests.push({ request, response });
      return response.promise;
    }, false);
    scopes.push(scope);
    await settle();
    expect(requests).toHaveLength(0);

    authStore.$patch({
      authStatus: "authenticated",
      token: "user-a-token",
      userId: "user-a",
      authSessionGeneration: 2,
    });
    await settle();
    expect(requests).toHaveLength(1);

    authStore.$patch({
      authStatus: "anonymous",
      token: null,
      userId: null,
      authSessionGeneration: 3,
    });
    await settle();
    expect(requests).toHaveLength(1);
    expect(coordinator.loading.value).toBe(false);

    authStore.$patch({
      authStatus: "authenticated",
      token: "user-b-token",
      userId: "user-b",
      authSessionGeneration: 4,
    });
    await settle();
    expect(requests).toHaveLength(2);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    requests[0]!.response.reject(new Error("late user-a failure"));
    await settle();
    expect(coordinator.error.value).toBeNull();
    expect(coordinator.loadingInitial.value).toBe(true);
    expect(coordinator.discs.value).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();

    requests[1]!.response.resolve(page(requests[1]!.request, ["user-b-result"], 1));
    await settle();
    expect(coordinator.discs.value.map(({ id }) => id)).toEqual(["user-b-result"]);
    expect(coordinator.error.value).toBeNull();
    expect(coordinator.loading.value).toBe(false);
  });

  it("does not mix a pending page with the first page of a new session", async () => {
    const requests: Array<{
      request: DiscListRequest;
      response: ReturnType<typeof deferred<DiscListResult>>;
    }> = [];
    const { authStore, coordinator, scope } = setup((request) => {
      const response = deferred<DiscListResult>();
      requests.push({ request, response });
      return response.promise;
    });
    scopes.push(scope);
    await settle();
    requests[0]!.response.resolve(page(requests[0]!.request, ["user-a-first"], 41));
    await settle();

    const pendingPage = coordinator.loadNextPage();
    await settle();
    authStore.$patch({ userId: "user-b", authSessionGeneration: 2 });
    await settle();
    expect(requests.map(({ request }) => request.offset)).toEqual([0, 20, 0]);
    expect(coordinator.discs.value).toEqual([]);
    expect(coordinator.offset.value).toBe(0);

    requests[1]!.response.resolve(page(requests[1]!.request, ["stale-user-a-page"], 41));
    await pendingPage;
    requests[2]!.response.resolve(page(requests[2]!.request, ["user-b-first"], 1));
    await settle();
    expect(coordinator.discs.value.map(({ id }) => id)).toEqual(["user-b-first"]);
    expect(coordinator.totalItems.value).toBe(1);
    expect(coordinator.totalDisc.value).toBe(1);
    expect(coordinator.offset.value).toBe(20);
  });

  it("deduplicates additional pages, advances by 20, and stops at the final offset", async () => {
    const firstPage = deferred<DiscListResult>();
    const nextPage = deferred<DiscListResult>();
    const loader = vi
      .fn<(request: DiscListRequest) => Promise<DiscListResult>>()
      .mockImplementationOnce(() => firstPage.promise)
      .mockImplementationOnce(() => nextPage.promise)
      .mockImplementationOnce(async (request) => page(request, [], 41));
    const { coordinator, scope } = setup(loader);
    scopes.push(scope);
    await settle();

    await coordinator.loadNextPage();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(coordinator.loadingInitial.value).toBe(true);
    firstPage.resolve(page(loader.mock.calls[0]![0], ["first"], 41));
    await settle();
    expect(coordinator.offset.value).toBe(20);
    expect(coordinator.totalItems.value).toBe(41);
    const pageRequest = coordinator.loadNextPage();
    const duplicateRequest = coordinator.loadNextPage();
    await settle();
    expect(loader.mock.calls.map(([request]) => request.offset)).toEqual([0, 20]);
    expect(coordinator.loadingMore.value).toBe(true);

    nextPage.resolve(page(loader.mock.calls[1]![0], ["second"], 41));
    await Promise.all([pageRequest, duplicateRequest]);
    expect(coordinator.offset.value).toBe(40);
    expect(coordinator.discs.value.map(({ id }) => id)).toEqual(["first", "second"]);

    await coordinator.loadNextPage();
    expect(loader.mock.calls.map(([request]) => request.offset)).toEqual([0, 20, 40]);
    expect(coordinator.offset.value).toBe(60);
    expect(coordinator.hasMore.value).toBe(false);
  });

  it("resets pagination and ignores a pending later page after a filter change", async () => {
    const laterPage = deferred<DiscListResult>();
    const requests: DiscListRequest[] = [];
    const loader = vi.fn((request: DiscListRequest) => {
      requests.push(request);
      if (request.offset === 20) return laterPage.promise;
      return Promise.resolve(page(request, [request.query || "initial"], 50));
    });
    const { coordinator, scope } = setup(loader);
    scopes.push(scope);
    await settle();
    const pendingPage = coordinator.loadNextPage();
    await settle();
    coordinator.searchQuery.value = "filtered";
    await settle();

    expect(requests.map(({ offset, query }) => [offset, query])).toEqual([
      [0, ""],
      [20, ""],
      [0, "filtered"],
    ]);
    expect(coordinator.offset.value).toBe(20);
    laterPage.resolve(page(requests[1]!, ["stale-page"], 50));
    await pendingPage;
    expect(coordinator.discs.value.map(({ id }) => id)).toEqual(["filtered"]);
    expect(coordinator.offset.value).toBe(20);
  });

  it("clears the active mode total on a switch and counts empty results as complete", async () => {
    const loader = vi.fn(async (request: DiscListRequest) =>
      page(request, request.mode === "all" ? ["all-result"] : [], 0)
    );
    const { coordinator, scope } = setup(loader);
    scopes.push(scope);
    await settle();
    expect(coordinator.totalDisc.value).toBe(0);

    coordinator.setMode("covers");
    await settle();
    expect(loader.mock.calls[1]?.[0]).toMatchObject({ mode: "covers", offset: 0, limit: 20 });
    expect(coordinator.discs.value).toEqual([]);
    expect(coordinator.totalCovers.value).toBe(0);
    expect(coordinator.isEmpty.value).toBe(true);
    expect(coordinator.hasMore.value).toBe(false);
  });
});
