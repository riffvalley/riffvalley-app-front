// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getDiscOptions, getRandomDiscs } = vi.hoisted(() => ({
  getDiscOptions: vi.fn(),
  getRandomDiscs: vi.fn(),
}));

vi.mock("@services/discs/discs", () => ({ getDiscOptions, getRandomDiscs }));
vi.mock("@components/DiscCardComponent.vue", () => ({
  default: {
    name: "DiscCard",
    props: ["id", "ep", "image", "name", "releaseDate", "artistName", "genreName", "genreColor", "link", "averageRate", "averageCover", "rate", "cover", "isNew", "userDiscRate", "favoriteId", "pendingId", "commentCount", "rateCount", "artistCountry", "debut"],
    template: '<article data-test="disc-card">{{ artistName }} — {{ name }}</article>',
  },
}));

import { useAuthStore } from "@/modules/identity/auth";
import AdventureModule from "./AdventureModule.vue";
import type { Disc } from "@services/discs/discs";

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

function mountAdventure() {
  setActivePinia(createPinia());
  const authStore = useAuthStore();
  authStore.$patch({
    token: "session-token",
    userId: "user-1",
    authStatus: "authenticated",
    authSessionGeneration: 1,
  });
  return { authStore, wrapper: mount(AdventureModule, { global: { stubs: ["CircleFlags"] } }) };
}

async function beginToFirstQuestion(wrapper: VueWrapper) {
  await wrapper.get('[data-test="adventure-start"]').trigger("click");
  await flushPromises();
}

async function chooseGenre(wrapper: VueWrapper) {
  await wrapper.get('[data-test="adventure-option"]').trigger("click");
  await flushPromises();
}

describe("AdventureModule", () => {
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

  it("starts with two random categories, advances sequentially with prior filters, and renders the original DiscCard result", async () => {
    const { wrapper } = mountAdventure();
    expect(getDiscOptions).not.toHaveBeenCalled();
    await beginToFirstQuestion(wrapper);

    expect(wrapper.text()).toContain("Elección 1 de 2");
    expect(wrapper.text()).toContain("Elige un género");
    expect(getDiscOptions).toHaveBeenNthCalledWith(1, "genre", {}, 3, { signal: expect.any(AbortSignal) });
    expect(wrapper.find('[data-test="adventure-back"]').exists()).toBe(false);

    await chooseGenre(wrapper);
    expect(wrapper.text()).toContain("Elección 2 de 2");
    expect(wrapper.text()).toContain("Elige un país");
    expect(getDiscOptions).toHaveBeenNthCalledWith(
      2,
      "country",
      { genre: "genre-rock", country: undefined, year: undefined, ep: undefined, debut: undefined },
      3,
      { signal: expect.any(AbortSignal) },
    );

    await chooseGenre(wrapper);
    expect(getRandomDiscs).toHaveBeenCalledOnce();
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
    expect(wrapper.findComponent({ name: "DiscCard" }).props()).toMatchObject({
      id: "disc-1",
      artistName: "Artista de prueba",
      favoriteId: "favorite-1",
      pendingId: "pending-1",
      userDiscRate: "rate-1",
    });
    expect(wrapper.text()).toContain("Vivir otra aventura");
    wrapper.unmount();
  });

  it("keeps the original categories and prior answers after an options failure and retries the same filtered request", async () => {
    getDiscOptions.mockResolvedValueOnce(genreOptions).mockRejectedValueOnce(new Error("offline"));
    const { wrapper } = mountAdventure();
    await beginToFirstQuestion(wrapper);
    await chooseGenre(wrapper);

    expect(wrapper.get('[data-test="adventure-error"]').text()).toContain("Tus elecciones siguen guardadas");
    expect(wrapper.get('[data-test="adventure-retry"]').text()).toContain("Reintentar");
    expect(wrapper.text()).not.toContain("ningún disco responde");
    expect(getDiscOptions).toHaveBeenCalledTimes(2);

    getDiscOptions.mockResolvedValueOnce(countryOptions);
    await wrapper.get('[data-test="adventure-retry"]').trigger("click");
    await flushPromises();
    expect(getDiscOptions).toHaveBeenCalledTimes(3);
    expect(getDiscOptions.mock.calls[2].slice(0, 3)).toEqual(getDiscOptions.mock.calls[1].slice(0, 3));
    expect(getDiscOptions.mock.calls[2][1]).toMatchObject({ genre: "genre-rock" });
    expect(getDiscOptions.mock.calls[2][3].signal).not.toBe(getDiscOptions.mock.calls[1][3].signal);
    expect(wrapper.text()).toContain("Elige un país");
    wrapper.unmount();
  });

  it("preserves the original five-category random order and requests boolean options for EP and debut", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    getDiscOptions.mockImplementation((field: string) => {
      if (field === "debut" || field === "ep") return Promise.resolve([true, false]);
      if (field === "year") return Promise.resolve([1999, 2000]);
      if (field === "country") return Promise.resolve(countryOptions);
      return Promise.resolve(genreOptions);
    });
    const { wrapper } = mountAdventure();
    await beginToFirstQuestion(wrapper);

    expect(wrapper.text()).toContain("Elección 1 de 5");
    expect(wrapper.text()).toContain("Debut o banda consagrada");
    expect(getDiscOptions).toHaveBeenNthCalledWith(1, "debut", {}, 2, { signal: expect.any(AbortSignal) });
    await wrapper.get('[data-test="adventure-option"]').trigger("click");
    await flushPromises();

    expect(getDiscOptions).toHaveBeenNthCalledWith(
      2,
      "ep",
      { country: undefined, genre: undefined, year: undefined, ep: undefined, debut: true },
      2,
      { signal: expect.any(AbortSignal) },
    );
    expect(wrapper.text()).toContain("Elección 2 de 5");
    expect(wrapper.find('[data-test="adventure-back"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="adventure-edit-answer"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("skips an empty category and keeps a genuinely empty final result separate from errors", async () => {
    getDiscOptions.mockResolvedValueOnce([]).mockResolvedValueOnce(countryOptions);
    getRandomDiscs.mockResolvedValueOnce([]);
    const { wrapper } = mountAdventure();
    await beginToFirstQuestion(wrapper);

    expect(getDiscOptions).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("Elección 1 de 1");
    await chooseGenre(wrapper);
    expect(getRandomDiscs).toHaveBeenCalledWith(
      expect.objectContaining({ genre: undefined, countryId: "country-es", limit: 1 }),
      { signal: expect.any(AbortSignal) },
    );
    expect(wrapper.get('[data-test="adventure-empty"]').text()).toContain("ningún disco responde");
    expect(wrapper.find('[data-test="adventure-error"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("passes optional and nullable enriched fields through to DiscCard without inventing values", async () => {
    const optionalDisc: Disc = {
      ...disc("disc-without-personal-data"),
      link: null,
      genre: null,
      averageRate: null,
      averageCover: null,
      voteCount: null,
      commentCount: null,
      userFavoriteId: null,
      pendingId: null,
      userRate: null,
      artist: { ...disc().artist, country: null },
    };
    getRandomDiscs.mockResolvedValueOnce([optionalDisc]);
    const { wrapper } = mountAdventure();
    await beginToFirstQuestion(wrapper);
    await chooseGenre(wrapper);
    await chooseGenre(wrapper);

    expect(wrapper.findComponent({ name: "DiscCard" }).props()).toMatchObject({
      id: "disc-without-personal-data",
      link: null,
      genreName: undefined,
      genreColor: undefined,
      averageRate: null,
      averageCover: null,
      isNew: true,
      userDiscRate: undefined,
      favoriteId: null,
      pendingId: null,
      commentCount: null,
      rateCount: null,
      artistCountry: null,
    });
    wrapper.unmount();
  });

  it("retries a failed final selection with the same decisions and blocks a repeated retry", async () => {
    getRandomDiscs.mockRejectedValueOnce(new Error("server error"));
    const { wrapper } = mountAdventure();
    await beginToFirstQuestion(wrapper);
    await chooseGenre(wrapper);
    await chooseGenre(wrapper);

    expect(wrapper.get('[data-test="adventure-error"]').attributes("role")).toBe("alert");
    expect(getRandomDiscs).toHaveBeenCalledOnce();
    const retry = wrapper.get('[data-test="adventure-retry"]');
    getRandomDiscs.mockResolvedValueOnce([disc("disc-retried")]);
    retry.element.click();
    retry.element.click();
    await flushPromises();

    expect(getRandomDiscs).toHaveBeenCalledTimes(2);
    expect(getRandomDiscs.mock.calls[1][0]).toEqual(getRandomDiscs.mock.calls[0][0]);
    expect(wrapper.findComponent({ name: "DiscCard" }).props("id")).toBe("disc-retried");
    wrapper.unmount();
  });

  it("locks a choice while the next options request is pending and aborts it on unmount", async () => {
    const pendingOptions = deferred<typeof countryOptions>();
    let optionsSignal: AbortSignal | undefined;
    getDiscOptions.mockImplementation((field: string, _filters: unknown, _limit: number, options: { signal: AbortSignal }) => {
      if (field === "genre") return Promise.resolve(genreOptions);
      optionsSignal = options.signal;
      return pendingOptions.promise;
    });
    const { wrapper } = mountAdventure();
    await beginToFirstQuestion(wrapper);

    const choice = wrapper.get('[data-test="adventure-option"]');
    choice.element.click();
    choice.element.click();
    await nextTick();
    expect(getDiscOptions).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-test="adventure-loading"]').attributes("role")).toBe("status");
    expect(wrapper.get('[data-test="adventure-root"]').attributes("aria-busy")).toBe("true");

    wrapper.unmount();
    expect(optionsSignal?.aborted).toBe(true);
    pendingOptions.resolve(countryOptions);
    await flushPromises();
  });

  it("discards pending results after a session change and resets personal result state", async () => {
    const pendingOptions = deferred<typeof genreOptions>();
    let optionsSignal: AbortSignal | undefined;
    getDiscOptions.mockImplementationOnce((_field: string, _filters: unknown, _limit: number, options: { signal: AbortSignal }) => {
      optionsSignal = options.signal;
      return pendingOptions.promise;
    });
    const { authStore, wrapper } = mountAdventure();
    await wrapper.get('[data-test="adventure-start"]').trigger("click");

    authStore.$patch({ userId: "user-2", authSessionGeneration: 2 });
    expect(optionsSignal?.aborted).toBe(true);
    await nextTick();
    expect(wrapper.find('[data-test="adventure-loading"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="adventure-start"]').exists()).toBe(true);

    pendingOptions.resolve(genreOptions);
    await flushPromises();
    expect(wrapper.get('[data-test="adventure-start"]').exists()).toBe(true);
    expect(getRandomDiscs).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("rejects incomplete Catalog results, preserves native keyboard controls, and exposes visible focus styling", async () => {
    getRandomDiscs.mockResolvedValueOnce([{ id: "broken", name: "Sin artista" }]);
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.$patch({ token: "session-token", userId: "user-1", authStatus: "authenticated", authSessionGeneration: 1 });
    const wrapper = mount(AdventureModule, { attachTo: document.body, global: { stubs: ["CircleFlags"] } });
    const start = wrapper.get('[data-test="adventure-start"]');

    expect(start.element.tagName).toBe("BUTTON");
    expect(start.attributes("type")).toBe("button");
    expect(start.classes().join(" ")).toContain("focus-visible:outline");
    start.element.focus();
    expect(document.activeElement).toBe(start.element);
    await start.trigger("click");
    await flushPromises();
    await chooseGenre(wrapper);
    await chooseGenre(wrapper);

    expect(wrapper.find('[data-test="disc-card"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="adventure-error"]').text()).toContain("No se pudo consultar el catálogo");
    expect(wrapper.get('[data-test="adventure-error"]').attributes("aria-live")).toBe("assertive");
    expect(wrapper.find('[data-test="adventure-loading"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it.each(["", "   "])("rejects a Catalog result with an invalid identifier (%j)", async (id) => {
    getRandomDiscs.mockResolvedValueOnce([{ ...disc(id), id }]);
    const { wrapper } = mountAdventure();
    await beginToFirstQuestion(wrapper);
    await chooseGenre(wrapper);
    await chooseGenre(wrapper);

    expect(wrapper.find('[data-test="disc-card"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="adventure-error"]').text()).toContain("No se pudo consultar el catálogo");
    wrapper.unmount();
  });
});
