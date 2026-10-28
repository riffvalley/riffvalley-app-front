// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { computed, defineComponent, h, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getRandomDiscs } = vi.hoisted(() => ({ getRandomDiscs: vi.fn() }));

vi.mock("@services/discs/discs", () => ({ getRandomDiscs }));
vi.mock("@components/DiscCardComponent.vue", () => ({
  default: {
    name: "DiscCard",
    props: [
      "id",
      "ep",
      "image",
      "name",
      "releaseDate",
      "artistName",
      "genreName",
      "genreColor",
      "link",
      "averageRate",
      "averageCover",
      "rate",
      "cover",
      "isNew",
      "userDiscRate",
      "favoriteId",
      "pendingId",
      "commentCount",
      "rateCount",
      "artistCountry",
      "debut",
    ],
    emits: ["rating-saved"],
    template: '<article data-test="disc-card">{{ artistName }} — {{ name }}</article>',
  },
}));

import { useAuthStore } from "@/modules/identity/auth";
import type { DashboardModule } from "@/app/dashboardWidgetRegistry";
import DashboardWidgetGrid from "../../../components/DashboardWidgetGrid.vue";
import DashboardCemeteryWidget from "./DashboardCemeteryWidget.vue";
import type { Disc } from "@services/discs/discs";

const firstDisc = (id: string): Disc => ({
  id,
  name: `Disco ${id}`,
  description: "Descripción",
  image: `https://images.test/${id}.jpg`,
  releaseDate: "2020-01-01",
  artist: {
    id: "artist-1",
    name: "Artista",
    description: "",
    image: "",
    country: { id: "country-1", name: "España", isoCode: "es" },
  },
  verified: true,
  EP: false,
  ep: false,
  debut: false,
  link: `https://music.test/${id}`,
  genre: { id: "genre-1", name: "Rock", color: "#123456" },
  averageRate: null,
  averageCover: 8,
  voteCount: 0,
  commentCount: 3,
  favoriteId: "favorite-1",
  pendingId: "pending-1",
  userRate: { id: "rate-1", rate: null, cover: "8" },
});

function mountWidget() {
  setActivePinia(createPinia());
  const authStore = useAuthStore();
  authStore.$patch({
    token: "session-token",
    userId: "user-1",
    authStatus: "authenticated",
    authSessionGeneration: 1,
  });
  const wrapper = mount(DashboardCemeteryWidget);
  return { authStore, wrapper };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("DashboardCemeteryWidget", () => {
  beforeEach(() => {
    getRandomDiscs.mockReset().mockResolvedValue([firstDisc("a"), firstDisc("b")]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads once on mount from the array endpoint and renders two fully identified cards", async () => {
    const { wrapper } = mountWidget();
    await flushPromises();

    expect(getRandomDiscs).toHaveBeenCalledOnce();
    expect(getRandomDiscs).toHaveBeenCalledWith(
      { unratedByCommunity: true, limit: 2 },
      { signal: expect.any(AbortSignal) },
    );
    expect(wrapper.findAll('[data-test="disc-card"]')).toHaveLength(2);
    expect(wrapper.findAllComponents({ name: "DiscCard" }).map((card) => card.props("id"))).toEqual([
      "a",
      "b",
    ]);
    expect(wrapper.findComponent({ name: "DiscCard" }).props()).toMatchObject({
      favoriteId: "favorite-1",
      pendingId: "pending-1",
      rate: null,
      cover: 8,
      artistName: "Artista",
    });
    wrapper.unmount();
  });

  it("renders one result without duplicating it and only treats an empty array as empty", async () => {
    getRandomDiscs.mockResolvedValueOnce([firstDisc("only")]);
    const { wrapper } = mountWidget();
    await flushPromises();

    expect(wrapper.findAll('[data-test="disc-card"]')).toHaveLength(1);
    expect(wrapper.find('[data-test="cemetery-empty"]').exists()).toBe(false);
    wrapper.unmount();

    getRandomDiscs.mockResolvedValueOnce([]);
    const empty = mountWidget().wrapper;
    await flushPromises();
    expect(empty.find('[data-test="cemetery-empty"]').text()).toBe(
      "No quedan discos sin valoraciones musicales en el catálogo.",
    );
    empty.unmount();
  });

  it("shows HTTP and malformed-ID errors instead of claiming the catalogue is empty", async () => {
    getRandomDiscs.mockRejectedValueOnce(new Error("offline"));
    const { wrapper } = mountWidget();
    await flushPromises();

    expect(wrapper.get('[data-test="cemetery-error"]').text()).toContain("No se pudieron cargar");
    expect(wrapper.find('[data-test="cemetery-empty"]').exists()).toBe(false);
    getRandomDiscs.mockResolvedValueOnce([{ ...firstDisc(""), id: " " }]);
    await wrapper.get('[data-test="cemetery-shuffle"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-test="cemetery-error"]').text()).toContain("identificador válido");
    expect(wrapper.find('[data-test="cemetery-empty"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("retries errors and makes one request per shuffle while preventing overlap", async () => {
    getRandomDiscs.mockRejectedValueOnce(new Error("offline"));
    const { wrapper } = mountWidget();
    await flushPromises();

    const pending = deferred<Disc[]>();
    getRandomDiscs.mockReturnValueOnce(pending.promise);
    await wrapper.get('[data-test="cemetery-shuffle"]').trigger("click");
    await wrapper.get('[data-test="cemetery-shuffle"]').trigger("click");
    expect(getRandomDiscs).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-test="cemetery-shuffle"]').attributes("disabled")).toBeDefined();
    pending.resolve([firstDisc("c"), firstDisc("d")]);
    await flushPromises();
    expect(wrapper.findAllComponents({ name: "DiscCard" }).map((card) => card.props("id"))).toEqual([
      "c",
      "d",
    ]);
    wrapper.unmount();
  });

  it("prefers a non-repeating result from the single response without sending unsupported previousDiscId", async () => {
    const { wrapper } = mountWidget();
    await flushPromises();
    getRandomDiscs.mockResolvedValueOnce([firstDisc("b"), firstDisc("c")]);

    await wrapper.get('[data-test="cemetery-shuffle"]').trigger("click");
    await flushPromises();

    expect(getRandomDiscs).toHaveBeenCalledTimes(2);
    expect(getRandomDiscs).toHaveBeenLastCalledWith(
      { unratedByCommunity: true, limit: 2 },
      { signal: expect.any(AbortSignal) },
    );
    expect(wrapper.findAllComponents({ name: "DiscCard" }).map((card) => card.props("id"))).toEqual([
      "c",
    ]);
    wrapper.unmount();
  });

  it.each([
    ["created", "a"],
    ["updated", "a"],
  ] as const)("replaces a confirmed %s musical rating and preserves the other card", async (action, discId) => {
    const { wrapper } = mountWidget();
    await flushPromises();
    const replacement = deferred<Disc[]>();
    getRandomDiscs.mockReturnValueOnce(replacement.promise);

    wrapper.findComponent({ name: "DiscCard" }).vm.$emit("rating-saved", {
      discId,
      action,
      musicalRateChanged: true,
      hasMusicalRate: true,
      coverChanged: false,
    });
    await flushPromises();
    expect(wrapper.findAllComponents({ name: "DiscCard" }).map((card) => card.props("id"))).toEqual([
      "b",
    ]);
    expect(getRandomDiscs).toHaveBeenCalledTimes(2);
    wrapper.findComponent({ name: "DiscCard" }).vm.$emit("rating-saved", {
      discId,
      action,
      musicalRateChanged: true,
      hasMusicalRate: true,
      coverChanged: false,
    });
    await flushPromises();
    expect(getRandomDiscs).toHaveBeenCalledTimes(2);

    replacement.resolve([firstDisc("b"), firstDisc("c")]);
    await flushPromises();
    expect(wrapper.findAllComponents({ name: "DiscCard" }).map((card) => card.props("id"))).toEqual([
      "b",
      "c",
    ]);
    wrapper.unmount();
  });

  it("does not select a replacement for a cover-only edit or an unsuccessful save", async () => {
    const { wrapper } = mountWidget();
    await flushPromises();

    wrapper.findComponent({ name: "DiscCard" }).vm.$emit("rating-saved", {
      discId: "a",
      action: "updated",
      musicalRateChanged: false,
      hasMusicalRate: true,
      coverChanged: true,
    });
    expect(getRandomDiscs).toHaveBeenCalledOnce();
    expect(wrapper.findAllComponents({ name: "DiscCard" })).toHaveLength(2);
    wrapper.unmount();
  });

  it("aborts on unmount and discards old-session responses before loading the new account", async () => {
    const oldRequest = deferred<Disc[]>();
    getRandomDiscs.mockReturnValueOnce(oldRequest.promise);
    const { authStore, wrapper } = mountWidget();
    const oldSignal = getRandomDiscs.mock.calls[0][1].signal as AbortSignal;

    authStore.$patch({ userId: "user-2", authSessionGeneration: 2 });
    await flushPromises();
    expect(oldSignal.aborted).toBe(true);
    expect(getRandomDiscs).toHaveBeenCalledTimes(2);
    oldRequest.resolve([firstDisc("old-session")]);
    await flushPromises();
    expect(wrapper.findAllComponents({ name: "DiscCard" }).map((card) => card.props("id"))).toEqual([
      "a",
      "b",
    ]);

    wrapper.unmount();
  });

  it("aborts an active request when the widget unmounts", async () => {
    const pending = deferred<Disc[]>();
    getRandomDiscs.mockReturnValueOnce(pending.promise);
    const { wrapper } = mountWidget();
    const signal = getRandomDiscs.mock.calls[0][1].signal as AbortSignal;

    wrapper.unmount();

    expect(signal.aborted).toBe(true);
  });

  it("does not request while the grid slot is disabled and loads again when reactivated", async () => {
    const enabled = ref(false);
    const Parent = defineComponent({
      setup() {
        const modules = computed<DashboardModule[]>(() => [
          {
            id: "cementerio",
            label: "Cementerio",
            icon: "fa-solid fa-skull",
            size: "half",
            enabled: enabled.value,
          },
        ]);
        return () =>
          h(
            DashboardWidgetGrid,
            { modules: modules.value },
            { cementerio: () => h(DashboardCemeteryWidget) },
          );
      },
    });
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.$patch({ token: "session-token", userId: "user-1", authStatus: "authenticated" });
    const wrapper = mount(Parent);
    expect(getRandomDiscs).not.toHaveBeenCalled();

    const pending = deferred<Disc[]>();
    getRandomDiscs.mockReturnValueOnce(pending.promise);
    enabled.value = true;
    await flushPromises();
    expect(getRandomDiscs).toHaveBeenCalledOnce();
    const signal = getRandomDiscs.mock.calls[0][1].signal as AbortSignal;
    enabled.value = false;
    await flushPromises();
    expect(wrapper.find('[data-test="cemetery-widget"]').exists()).toBe(false);
    expect(signal.aborted).toBe(true);

    getRandomDiscs.mockResolvedValueOnce([firstDisc("reactivated")]);
    enabled.value = true;
    await flushPromises();
    expect(getRandomDiscs).toHaveBeenCalledTimes(2);
    expect(wrapper.findComponent({ name: "DiscCard" }).props("id")).toBe("reactivated");
    wrapper.unmount();
  });
});
