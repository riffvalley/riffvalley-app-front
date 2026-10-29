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
  authenticated = true,
  optionsLoader: (request: {
    mode: string;
    query: string;
    dateRange: [string, string] | null;
    countryId: string;
    genreIds: string[];
  }) => Promise<{
    countries: { id: string; name: string; isoCode: string | null }[];
    genres: { id: string; name: string; color: string | null }[];
  }> = vi.fn().mockResolvedValue({ countries: [], genres: [] })
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
  const coordinator = scope.run(() =>
    useDiscListCoordinator({
      loadPage: loader,
      loadOptions: optionsLoader,
    })
  );
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

  it("normalizes genre sets for request identity and resets offset when the set changes", async () => {
    const loader = vi.fn(async (request: DiscListRequest) => page(request, ["result"], 50));
    const optionsLoader = vi.fn().mockResolvedValue({
      countries: [{ id: "country-a", name: "España", isoCode: "ES" }],
      genres: [
        { id: "genre-a", name: "Black Metal", color: null },
        { id: "genre-b", name: "Death Metal", color: null },
      ],
    });
    const { coordinator, scope } = setup(loader, true, optionsLoader);
    scopes.push(scope);
    await settle();

    coordinator.setGenres(["GENRE-B", "genre-a", "genre-b"]);
    await settle();
    expect(loader).toHaveBeenLastCalledWith(
      expect.objectContaining({ genreIds: ["genre-a", "genre-b"], offset: 0 })
    );
    const requestCount = loader.mock.calls.length;
    coordinator.setGenres(["genre-a", "genre-b"]);
    await settle();
    expect(loader).toHaveBeenCalledTimes(requestCount);

    coordinator.setGenres(["genre-b"]);
    await settle();
    expect(loader).toHaveBeenLastCalledWith(
      expect.objectContaining({ genreIds: ["genre-b"], offset: 0 })
    );
  });

  it("discards stale option responses and errors across rapid criteria changes", async () => {
    const responses: Array<
      ReturnType<
        typeof deferred<{
          countries: { id: string; name: string; isoCode: string | null }[];
          genres: { id: string; name: string; color: string | null }[];
        }>
      >
    > = [];
    const optionsLoader = vi.fn(() => {
      const response = deferred<{
        countries: { id: string; name: string; isoCode: string | null }[];
        genres: { id: string; name: string; color: string | null }[];
      }>();
      responses.push(response);
      return response.promise;
    });
    const { coordinator, scope } = setup(
      async (request) => page(request, [], 0),
      true,
      optionsLoader
    );
    scopes.push(scope);
    coordinator.setSearchQuery("B");
    await settle();
    coordinator.setSearchQuery("C");
    await settle();
    expect(optionsLoader.mock.calls.map(([request]) => request.query)).toEqual(["", "B", "C"]);

    responses[1]!.reject(new Error("stale options failure"));
    responses[2]!.resolve({
      countries: [{ id: "country-c", name: "Current", isoCode: null }],
      genres: [{ id: "genre-c", name: "Current genre", color: null }],
    });
    await settle();
    responses[0]!.resolve({
      countries: [{ id: "country-a", name: "Stale", isoCode: null }],
      genres: [],
    });
    await settle();

    expect(coordinator.options.value.countries.map(({ id }) => id)).toEqual(["country-c"]);
    expect(coordinator.optionsError.value).toBeNull();
    expect(coordinator.optionsReady.value).toBe(true);
  });

  it("discards options from a previous authenticated user", async () => {
    type Options = {
      countries: { id: string; name: string; isoCode: string | null }[];
      genres: { id: string; name: string; color: string | null }[];
    };
    const responses: Array<ReturnType<typeof deferred<Options>>> = [];
    const optionsLoader = vi.fn(() => {
      const response = deferred<Options>();
      responses.push(response);
      return response.promise;
    });
    const { authStore, coordinator, scope } = setup(
      async (request) => page(request, [], 0),
      true,
      optionsLoader
    );
    scopes.push(scope);
    authStore.$patch({ userId: "user-b", authSessionGeneration: 2 });
    await settle();
    expect(responses).toHaveLength(2);

    responses[0]!.resolve({
      countries: [{ id: "private-user-a", name: "A", isoCode: null }],
      genres: [],
    });
    responses[1]!.resolve({
      countries: [{ id: "private-user-b", name: "B", isoCode: null }],
      genres: [],
    });
    await settle();

    expect(coordinator.options.value.countries.map(({ id }) => id)).toEqual(["private-user-b"]);
  });

  it("cross-filters countries and genres while preserving the last explicit filter action", async () => {
    const optionsLoader = vi.fn(async (request: { countryId: string; genreIds: string[] }) => {
      if (request.countryId === "country-b" && request.genreIds.includes("genre-a")) {
        return {
          countries: [{ id: "country-a", name: "A", isoCode: null }],
          genres: [{ id: "genre-b", name: "B", color: null }],
        };
      }
      if (request.countryId === "country-b") {
        return {
          countries: [{ id: "country-b", name: "B", isoCode: null }],
          genres: [{ id: "genre-b", name: "B", color: null }],
        };
      }
      if (request.genreIds.includes("genre-a")) {
        return {
          countries: [{ id: "country-a", name: "A", isoCode: null }],
          genres: [
            { id: "genre-a", name: "A", color: null },
            { id: "genre-b", name: "B", color: null },
          ],
        };
      }
      return {
        countries: [
          { id: "country-a", name: "A", isoCode: null },
          { id: "country-b", name: "B", isoCode: null },
        ],
        genres: [
          { id: "genre-a", name: "A", color: null },
          { id: "genre-b", name: "B", color: null },
        ],
      };
    });
    const { coordinator, scope } = setup(
      async (request) => page(request, [], 0),
      true,
      optionsLoader
    );
    scopes.push(scope);
    await settle();
    coordinator.setGenres(["genre-a"]);
    await settle();
    coordinator.setCountry("country-b");
    await settle();

    expect(coordinator.selectedCountry.value).toBe("country-b");
    expect(coordinator.selectedGenres.value).toEqual([]);
    expect(optionsLoader).toHaveBeenCalledWith(
      expect.objectContaining({ countryId: "country-b", genreIds: ["genre-a"] })
    );
    expect(optionsLoader).toHaveBeenLastCalledWith(
      expect.objectContaining({ countryId: "country-b", genreIds: [] })
    );

    coordinator.setGenres(["genre-a"]);
    await settle();
    expect(coordinator.selectedGenres.value).toEqual(["genre-a"]);
    expect(coordinator.selectedCountry.value).toBe("");
  });

  it("filters by the selected artist ID and preserves text, mode and every other filter", async () => {
    const pageLoader = vi.fn(async (request: DiscListRequest) => page(request, [], 0));
    const optionsLoader = vi.fn().mockResolvedValue({
      countries: [{ id: "country-a", name: "España", isoCode: "ES" }],
      genres: [{ id: "genre-a", name: "Rock", color: null }],
    });
    const { coordinator, scope } = setup(pageLoader, true, optionsLoader);
    scopes.push(scope);
    await settle();
    coordinator.setMode("favorites");
    coordinator.setSearchQuery("MØL");
    coordinator.setSelectedWeek(["2025-01-01", "2025-01-31"]);
    coordinator.setCountry("country-a");
    coordinator.setGenres(["genre-a"]);
    await settle();

    const callsBeforeArtist = pageLoader.mock.calls.length;
    coordinator.setSelectedArtist({ id: "artist-homonym-b", name: "MØL" });
    await settle();

    expect(pageLoader).toHaveBeenCalledTimes(callsBeforeArtist + 1);
    expect(pageLoader).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "favorites",
        query: "MØL",
        dateRange: ["2025-01-01", "2025-01-31"],
        countryId: "country-a",
        genreIds: ["genre-a"],
        artistId: "artist-homonym-b",
        offset: 0,
      })
    );
    expect(optionsLoader).toHaveBeenLastCalledWith(
      expect.objectContaining({ artistId: "artist-homonym-b" })
    );
    expect(coordinator.selectedArtist.value).toEqual({ id: "artist-homonym-b", name: "MØL" });
    expect(coordinator.selectedCountry.value).toBe("country-a");
    expect(coordinator.selectedGenres.value).toEqual(["genre-a"]);
  });

  it("applies saved criteria atomically while preserving search, artist, mode, order and resetting pagination", async () => {
    const loader = vi.fn(async (request: DiscListRequest) => page(request, [], 45));
    const optionsLoader = vi.fn().mockResolvedValue({ countries: [], genres: [] });
    const { coordinator, scope } = setup(loader, true, optionsLoader);
    scopes.push(scope);
    await settle();
    coordinator.setMode("favorites");
    coordinator.setSearchQuery("MØL");
    coordinator.setSelectedArtist({ id: "artist-a", name: "MØL" });
    coordinator.orderBy.value = "disc.releaseDate:ASC,artist.name:ASC";
    coordinator.setSelectedWeek(["2025-01-01T00:00:00.000Z", "2025-01-31T23:59:59.999Z"]);
    await settle();
    await coordinator.loadNextPage();
    expect(coordinator.offset.value).toBe(40);

    coordinator.applySavedCriteria({
      genreIds: ["GENRE-B", "genre-a", "genre-a"],
      countryId: "country-saved",
      yearFrom: 2025,
      yearTo: 2026,
    });
    await settle();

    expect(loader).toHaveBeenLastCalledWith(expect.objectContaining({
      mode: "favorites",
      query: "MØL",
      artistId: "artist-a",
      orderBy: "disc.releaseDate:ASC,artist.name:ASC",
      genreIds: ["genre-a", "genre-b"],
      countryId: "country-saved",
      dateRange: ["2025-01-01T00:00:00.000Z", "2026-12-31T23:59:59.999Z"],
      offset: 0,
    }));
    expect(coordinator.offset.value).toBe(20);
    expect(optionsLoader).toHaveBeenLastCalledWith(expect.objectContaining({
      mode: "favorites", query: "MØL", artistId: "artist-a", countryId: "country-saved",
      genreIds: ["genre-a", "genre-b"],
    }));
  });

  it("preserves one-sided saved year bounds instead of narrowing them to one year", async () => {
    const loader = vi.fn(async (request: DiscListRequest) => page(request, [], 0));
    const { coordinator, scope } = setup(loader);
    scopes.push(scope);
    await settle();

    coordinator.applySavedCriteria({ genreIds: [], countryId: null, yearFrom: 2025, yearTo: null });
    await settle();
    expect(loader).toHaveBeenLastCalledWith(expect.objectContaining({
      dateRange: ["2025-01-01T00:00:00.000Z", "9999-12-31T23:59:59.999Z"], offset: 0,
    }));

    coordinator.applySavedCriteria({ genreIds: [], countryId: null, yearFrom: null, yearTo: 2026 });
    await settle();
    expect(loader).toHaveBeenLastCalledWith(expect.objectContaining({
      dateRange: ["0001-01-01T00:00:00.000Z", "2026-12-31T23:59:59.999Z"], offset: 0,
    }));
  });

  it("refreshes results and contextual options without dropping the current filters", async () => {
    const pageLoader = vi.fn(async (request: DiscListRequest) => page(request, [], 0));
    let omitContextualOptions = false;
    const optionsLoader = vi.fn(async () =>
      omitContextualOptions
        ? { countries: [], genres: [] }
        : {
            countries: [{ id: "country-a", name: "España", isoCode: "ES" }],
            genres: [{ id: "genre-a", name: "Rock", color: null }],
          }
    );
    const { coordinator, scope } = setup(pageLoader, true, optionsLoader);
    scopes.push(scope);
    await settle();
    coordinator.setMode("favorites");
    coordinator.setSearchQuery("Álbum");
    coordinator.setSelectedWeek(["2025-01-01", "2025-01-31"]);
    coordinator.setCountry("country-a");
    coordinator.setGenres(["genre-a"]);
    await settle();

    omitContextualOptions = true;
    coordinator.refresh();
    await settle();

    expect(pageLoader).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "favorites",
        query: "Álbum",
        dateRange: ["2025-01-01", "2025-01-31"],
        countryId: "country-a",
        genreIds: ["genre-a"],
        offset: 0,
      })
    );
    expect(coordinator.selectedCountry.value).toBe("country-a");
    expect(coordinator.selectedGenres.value).toEqual(["genre-a"]);
  });

  it("does not request private results or options while logged out and clears private selections", async () => {
    const pageLoader = vi.fn(async (request: DiscListRequest) => page(request, [], 0));
    const optionsLoader = vi.fn().mockResolvedValue({
      countries: [{ id: "country-a", name: "España", isoCode: null }],
      genres: [{ id: "genre-a", name: "Rock", color: null }],
    });
    const { authStore, coordinator, scope } = setup(pageLoader, true, optionsLoader);
    scopes.push(scope);
    await settle();
    coordinator.setCountry("country-a");
    coordinator.setGenres(["genre-a"]);
    await settle();
    const pageCount = pageLoader.mock.calls.length;
    authStore.$patch({
      authStatus: "anonymous",
      token: null,
      userId: null,
      authSessionGeneration: 2,
    });
    await settle();

    expect(coordinator.discs.value).toEqual([]);
    expect(coordinator.options.value).toEqual({ countries: [], genres: [] });
    expect(coordinator.selectedCountry.value).toBe("");
    expect(coordinator.selectedGenres.value).toEqual([]);
    expect(pageLoader).toHaveBeenCalledTimes(pageCount);
  });
});
