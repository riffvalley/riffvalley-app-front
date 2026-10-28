// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getDiscOptions, getRandomDiscs } = vi.hoisted(() => ({
  getDiscOptions: vi.fn(),
  getRandomDiscs: vi.fn(),
}));

vi.mock("@services/discs/discs", () => ({ getDiscOptions, getRandomDiscs }));

import { useAuthStore } from "@/modules/identity/auth";
import type { Disc } from "@services/discs/discs";
import { useAdventureFlow } from "./useAdventureFlow";

const genreOptions = [{ id: "genre-rock", name: "Rock" }];
const countryOptions = [{ id: "country-es", name: "España", isoCode: "es" }];
const disc = (id = "disc-1"): Disc => ({
  id,
  name: "Álbum de prueba",
  description: "Descripción",
  image: "https://images.test/cover.jpg",
  releaseDate: "2020-01-01",
  artist: {
    id: "artist-1",
    name: "Artista de prueba",
    description: "",
    image: "",
    country: { id: "country-es", name: "España", isoCode: "es" },
  },
  verified: true,
  ep: false,
  debut: false,
  link: `https://riffvalley.es/disc/${id}`,
  genre: { id: "genre-rock", name: "Rock", color: "#123456" },
  averageRate: 7.5,
  averageCover: 8,
  voteCount: 6,
  commentCount: 2,
  userFavoriteId: "favorite-1",
  pendingId: "pending-1",
  userRate: { id: "rate-1", rate: "8.5", cover: "9" },
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function mountFlow() {
  setActivePinia(createPinia());
  const authStore = useAuthStore();
  authStore.$patch({
    token: "session-token",
    userId: "user-1",
    authStatus: "authenticated",
    authSessionGeneration: 1,
  });

  let flow!: ReturnType<typeof useAdventureFlow>;
  const wrapper = mount(defineComponent({
    setup() {
      flow = useAdventureFlow();
      return () => h("div");
    },
  }));
  return { authStore, flow, wrapper };
}

describe("useAdventureFlow", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    getDiscOptions.mockReset().mockImplementation((field: string) =>
      Promise.resolve(field === "genre" ? genreOptions : countryOptions),
    );
    getRandomDiscs.mockReset().mockResolvedValue([disc()]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates two categories in the existing random order and starts only after the action", async () => {
    const { flow, wrapper } = mountFlow();
    expect(getDiscOptions).not.toHaveBeenCalled();

    const firstStart = flow.startAdventure();
    await flow.startAdventure();
    await firstStart;

    expect(flow.categoryOrder.value).toEqual(["genero", "pais"]);
    expect(flow.stepIndex.value).toBe(0);
    expect(flow.currentQuestion.value?.category).toBe("genero");
    expect(getDiscOptions).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("preserves a five-question selection order and its endpoint fields", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    getDiscOptions.mockImplementation((field: string) => {
      if (field === "debut" || field === "ep") return Promise.resolve([true, false]);
      if (field === "year") return Promise.resolve([1999, 2000]);
      if (field === "country") return Promise.resolve(countryOptions);
      return Promise.resolve(genreOptions);
    });
    const { flow, wrapper } = mountFlow();

    await flow.startAdventure();
    expect(flow.categoryOrder.value).toEqual(["debut", "ep", "anio", "pais", "genero"]);
    expect(getDiscOptions).toHaveBeenNthCalledWith(1, "debut", {}, 2, { signal: expect.any(AbortSignal) });
    expect(flow.currentQuestion.value?.options).toEqual([
      { category: "debut", value: true, label: "Un debut" },
      { category: "debut", value: false, label: "Una banda ya consagrada" },
    ]);
    wrapper.unmount();
  });

  it("progresses with accumulated filters and never reapplies a confirmed answer after retry", async () => {
    getDiscOptions
      .mockResolvedValueOnce(genreOptions)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(countryOptions);
    const { flow, wrapper } = mountFlow();
    await flow.startAdventure();
    const confirmedGenre = flow.currentQuestion.value!.options[0]!;

    await flow.choose(confirmedGenre);
    expect(flow.phase.value).toBe("error");
    expect(flow.isBusy.value).toBe(false);

    await flow.retry();
    expect(flow.currentQuestion.value?.category).toBe("pais");
    expect(flow.stepIndex.value).toBe(1);
    expect(getDiscOptions.mock.calls[2][1]).toMatchObject({ genre: "genre-rock" });

    const callsBeforeStaleChoice = getDiscOptions.mock.calls.length;
    await flow.choose(confirmedGenre);
    expect(getDiscOptions).toHaveBeenCalledTimes(callsBeforeStaleChoice);

    await flow.choose(flow.currentQuestion.value!.options[0]!);
    expect(getRandomDiscs).toHaveBeenCalledWith(
      {
        genre: "genre-rock",
        countryId: "country-es",
        year: undefined,
        ep: undefined,
        debut: undefined,
        limit: 1,
      },
      { signal: expect.any(AbortSignal) },
    );
    expect(flow.phase.value).toBe("result");
    wrapper.unmount();
  });

  it("does not accept an old option or a second selection while the next request is pending", async () => {
    const pendingCountry = deferred<typeof countryOptions>();
    let signal: AbortSignal | undefined;
    getDiscOptions.mockImplementation((field: string, _filters: unknown, _limit: number, options: { signal: AbortSignal }) => {
      if (field === "genre") return Promise.resolve(genreOptions);
      signal = options.signal;
      return pendingCountry.promise;
    });
    const { flow, wrapper } = mountFlow();
    await flow.startAdventure();
    const genreChoice = flow.currentQuestion.value!.options[0]!;

    const firstChoice = flow.choose(genreChoice);
    await flow.choose(genreChoice);
    await flow.choose(genreChoice);
    expect(getDiscOptions).toHaveBeenCalledTimes(2);
    expect(flow.phase.value).toBe("loading");
    expect(flow.isBusy.value).toBe(true);

    pendingCountry.resolve(countryOptions);
    await firstChoice;
    expect(signal?.aborted).toBe(false);
    expect(flow.currentQuestion.value?.category).toBe("pais");
    wrapper.unmount();
  });

  it("skips empty option categories and preserves a genuinely empty final result", async () => {
    getDiscOptions.mockResolvedValueOnce([]).mockResolvedValueOnce(countryOptions);
    getRandomDiscs.mockResolvedValueOnce([]);
    const { flow, wrapper } = mountFlow();

    await flow.startAdventure();
    expect(getDiscOptions).toHaveBeenCalledTimes(2);
    expect(flow.categoryOrder.value).toEqual(["pais"]);
    expect(flow.currentQuestion.value?.category).toBe("pais");
    await flow.choose(flow.currentQuestion.value!.options[0]!);

    expect(getRandomDiscs).toHaveBeenCalledWith(
      expect.objectContaining({ genre: undefined, countryId: "country-es", limit: 1 }),
      { signal: expect.any(AbortSignal) },
    );
    expect(flow.phase.value).toBe("empty");
    expect(flow.resultDisc.value).toBeNull();
    wrapper.unmount();
  });

  it("retries a failed final selection with the same filters and prevents duplicate retries", async () => {
    getRandomDiscs.mockRejectedValueOnce(new Error("offline"));
    const { flow, wrapper } = mountFlow();
    await flow.startAdventure();
    await flow.choose(flow.currentQuestion.value!.options[0]!);
    await flow.choose(flow.currentQuestion.value!.options[0]!);
    expect(flow.phase.value).toBe("error");

    getRandomDiscs.mockResolvedValueOnce([disc("disc-retried")]);
    const retry = flow.retry();
    await flow.retry();
    await retry;

    expect(getRandomDiscs).toHaveBeenCalledTimes(2);
    expect(getRandomDiscs.mock.calls[1][0]).toEqual(getRandomDiscs.mock.calls[0][0]);
    expect(flow.resultDisc.value?.id).toBe("disc-retried");
    wrapper.unmount();
  });

  it("reports malformed Catalog responses as errors and keeps the answer when retrying", async () => {
    getDiscOptions.mockResolvedValueOnce(genreOptions).mockResolvedValueOnce(null).mockResolvedValueOnce(countryOptions);
    const { flow, wrapper } = mountFlow();
    await flow.startAdventure();
    await flow.choose(flow.currentQuestion.value!.options[0]!);
    expect(flow.phase.value).toBe("error");

    await flow.retry();
    expect(flow.currentQuestion.value?.category).toBe("pais");
    expect(getDiscOptions.mock.calls[2][1]).toMatchObject({ genre: "genre-rock" });
    wrapper.unmount();
  });

  it("aborts a pending request on unmount and ignores its late response", async () => {
    const pendingOptions = deferred<typeof genreOptions>();
    let signal: AbortSignal | undefined;
    getDiscOptions.mockImplementationOnce((_field: string, _filters: unknown, _limit: number, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return pendingOptions.promise;
    });
    const { flow, wrapper } = mountFlow();
    const start = flow.startAdventure();
    expect(getDiscOptions).toHaveBeenCalledOnce();

    wrapper.unmount();
    expect(signal?.aborted).toBe(true);
    pendingOptions.resolve(genreOptions);
    await start;
    expect(getDiscOptions).toHaveBeenCalledOnce();
    expect(flow.currentQuestion.value).toBeNull();
  });

  it("aborts and resets the flow on a session change without accepting the old response", async () => {
    const pendingOptions = deferred<typeof genreOptions>();
    let signal: AbortSignal | undefined;
    getDiscOptions.mockImplementationOnce((_field: string, _filters: unknown, _limit: number, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return pendingOptions.promise;
    });
    const { authStore, flow, wrapper } = mountFlow();
    const start = flow.startAdventure();

    authStore.$patch({ userId: "user-2", authSessionGeneration: 2 });
    expect(signal?.aborted).toBe(true);
    expect(flow.phase.value).toBe("intro");
    expect(flow.categoryOrder.value).toEqual([]);
    pendingOptions.resolve(genreOptions);
    await start;
    await flushPromises();
    expect(flow.currentQuestion.value).toBeNull();
    expect(getDiscOptions).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("passes AbortSignal and keeps the existing result endpoint parameters", async () => {
    getDiscOptions.mockImplementation((field: string) => {
      if (field === "genre") return Promise.resolve(genreOptions);
      return Promise.resolve(countryOptions);
    });
    const { flow, wrapper } = mountFlow();
    await flow.startAdventure();
    await flow.choose(flow.currentQuestion.value!.options[0]!);
    await flow.choose(flow.currentQuestion.value!.options[0]!);

    expect(getDiscOptions).toHaveBeenNthCalledWith(1, "genre", {}, 3, { signal: expect.any(AbortSignal) });
    expect(getDiscOptions).toHaveBeenNthCalledWith(
      "2",
      "country",
      { country: undefined, genre: "genre-rock", year: undefined, ep: undefined, debut: undefined },
      3,
      { signal: expect.any(AbortSignal) },
    );
    expect(flow.resultDisc.value).toMatchObject({
      id: "disc-1",
      artist: { country: { id: "country-es", isoCode: "es", name: "España" } },
      userRate: { rate: 8.5, cover: 9 },
    });
    wrapper.unmount();
  });
});
