// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getDiscs, getRandomDiscs, getDiscRates } = vi.hoisted(() => ({
  getDiscs: vi.fn(),
  getRandomDiscs: vi.fn(),
  getDiscRates: vi.fn(),
}));

vi.mock("@services/discs/discs", () => ({ getDiscs, getRandomDiscs }));
vi.mock("@services/rates/rates", () => ({
  getDiscRates,
  postRateService: vi.fn(),
  updateRateService: vi.fn(),
}));
vi.mock("@services/favorites/favorites", () => ({
  postFavoriteService: vi.fn(),
  deleteFavoriteService: vi.fn(),
}));
vi.mock("@services/pendings/pendings", () => ({
  postPendingService: vi.fn(),
  deletePendingService: vi.fn(),
}));
vi.mock("@helpers/SpotifyFunctions", () => ({
  obtenerTrackMasPopularAlbum: vi.fn(),
}));

import type { Disc } from "@services/discs/discs";
import RandomDiscWidget from "./RandomDiscWidget.vue";

const discId = "e7a17dc1-3aa5-4a8f-8712-b4bd98c418ed";
const serializedRandomResponse = JSON.parse(
  JSON.stringify([
    {
      id: discId,
      name: "Disco aleatorio de prueba",
      description: "",
      image: "https://images.test/disc.jpg",
      releaseDate: "2020-01-01",
      artist: {
        id: "c9ac2738-6ccf-4f87-b5bb-bf40f3993d69",
        name: "Artista de prueba",
        description: "",
        image: "",
        country: null,
      },
      verified: true,
      EP: false,
      ep: false,
      debut: false,
      link: "https://riffvalley.es/disc/test",
      genre: { id: "c0c45c9a-045e-4580-9b58-85f1be6ba425", name: "Rock", color: "#123456" },
      averageRate: 7,
      averageCover: 8,
      voteCount: 3,
      commentCount: 0,
      userRate: null,
      favoriteId: null,
      pendingId: null,
    },
  ]),
) as Disc[];

function mountWidget() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return mount(RandomDiscWidget, {
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient }]],
      stubs: {
        ArtistDetail: true,
        CircleFlags: true,
        ComentsModal: true,
        DiscCalendar: true,
        DiscDetail: true,
        VotesModal: true,
      },
    },
  });
}

describe("RandomDiscWidget and DiscCard vote action contract", () => {
  beforeEach(() => {
    getDiscs.mockReset().mockResolvedValue({ totalItems: 0, data: [] });
    getRandomDiscs.mockReset().mockResolvedValue(serializedRandomResponse);
    getDiscRates.mockReset().mockResolvedValue([
      { id: "rate-a", user: { id: "user-a", username: "Ada" }, rate: "0", cover: null },
      { id: "rate-a-duplicate", user: { id: "user-a", username: "Ada" }, rate: "0", cover: null },
      { id: "rate-b", user: { id: "user-b", username: "Bea" }, rate: "8", cover: null },
      { id: "cover-only", user: { id: "user-c", username: "Cora" }, rate: null, cover: "9" },
    ]);
  });

  afterEach(() => vi.clearAllMocks());

  it("opens Votos for a difficulty result using its serialized ID and keeps the musical voter count", async () => {
    const wrapper = mountWidget();
    await wrapper.findAll("button").find((button) => button.text() === "Normal")!.trigger("click");
    await wrapper.get('[data-test="roll-dice"]').trigger("click");
    await flushPromises();

    expect(wrapper.find(".card").exists()).toBe(true);
    await wrapper.get("h2").trigger("click");
    expect(wrapper.findComponent({ name: "DiscDetail" }).props("disc")).toMatchObject({ id: discId });
    const votesButton = wrapper.findAll("button").find((button) => button.text().includes("Votos"));
    expect(votesButton?.text()).toContain("3");
    await votesButton!.trigger("click");
    await flushPromises();

    expect(getDiscRates).toHaveBeenCalledOnce();
    expect(getDiscRates).toHaveBeenCalledWith(discId);
    expect(wrapper.findComponent({ name: "VotesModal" }).exists()).toBe(true);
    expect(wrapper.findAll("button").find((button) => button.text().includes("Ocultar"))?.text()).toContain("2");
    wrapper.unmount();
  });

  it("refuses to render an actionable card when a serialized result has no ID", async () => {
    const { id: _id, ...discWithoutId } = serializedRandomResponse[0];
    getRandomDiscs.mockResolvedValueOnce([discWithoutId as Disc]);
    const wrapper = mountWidget();
    await wrapper.findAll("button").find((button) => button.text() === "Normal")!.trigger("click");
    await wrapper.get('[data-test="roll-dice"]').trigger("click");
    await flushPromises();

    expect(wrapper.find(".card").exists()).toBe(false);
    expect(wrapper.get('[data-test="random-disc-error"]').exists()).toBe(true);
    expect(getDiscRates).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
