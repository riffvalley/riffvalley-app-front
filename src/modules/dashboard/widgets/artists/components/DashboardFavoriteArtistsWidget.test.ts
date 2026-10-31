// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { h } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardWidgetDefaults } from "@/app/dashboardWidgetRegistry";
import { useAuthStore } from "@/modules/identity/auth";
import type { RatesTopArtistDto } from "@services/rates/rates";

const { getRatesTopArtists, getRatesArtistSummary, getRatesArtistLastfm } = vi.hoisted(() => ({
  getRatesTopArtists: vi.fn(),
  getRatesArtistSummary: vi.fn(),
  getRatesArtistLastfm: vi.fn(),
}));
const getArtistDetails = vi.hoisted(() => vi.fn());
vi.mock("@services/rates/rates", async (importOriginal) => {
  const original = await importOriginal<typeof import("@services/rates/rates")>();
  return { ...original, getRatesTopArtists, getRatesArtistSummary, getRatesArtistLastfm };
});
vi.mock("@/modules/catalog/artists/api/artistDetails", () => ({ getArtistDetails }));

import DashboardFavoriteArtistsWidget from "./DashboardFavoriteArtistsWidget.vue";
import DashboardWidgetGrid from "../../../components/DashboardWidgetGrid.vue";
import type { ArtistDetailsDto } from "@/modules/catalog/artists/types/artistApi";

const artists: RatesTopArtistDto[] = Array.from({ length: 8 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  name: `Artista ${index + 1}`,
  image: index === 1 ? null : `https://images.example/${index + 1}.jpg`,
  ratingCount: index + 1,
  averageRate: 8.45 - index / 10,
}));
const wrappers: Array<{ unmount: () => void }> = [];

function authenticatedPinia() {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore(pinia).$patch({
    token: "token",
    userId: "user-a",
    authStatus: "authenticated",
    role: "user",
  });
  return pinia;
}

function mountWidget() {
  const wrapper = mount(DashboardFavoriteArtistsWidget, {
    attachTo: document.body,
    global: { plugins: [authenticatedPinia()] },
  });
  wrappers.push(wrapper);
  return wrapper;
}

function modalElement<T extends HTMLElement>(selector: string): T {
  const element = document.body.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}

describe("DashboardFavoriteArtistsWidget", () => {
  beforeEach(() => {
    getArtistDetails.mockReset().mockImplementation(async (artistId: string) => ({
      id: artistId,
      name: artists.find(({ id }) => id === artistId)?.name ?? "Artista",
      image: null,
      description: null,
      country: null,
      genres: [],
      discs: [],
    } satisfies ArtistDetailsDto));
    getRatesTopArtists.mockReset().mockResolvedValue({ artists });
    getRatesArtistSummary.mockReset().mockImplementation(async (artistId: string) => {
      const selectedArtist = artists.find(({ id }) => id === artistId)!;
      return {
        artist: { id: selectedArtist.id, name: selectedArtist.name, image: null, country: null, genres: [] },
        stats: {
          ratedDiscCount: 0,
          averageRate: null,
          highestRatedDisc: null,
          lowestRatedDisc: null,
          firstAvailableActivityAt: null,
          lastAvailableActivityAt: null,
        },
        discs: { data: [], total: 0, page: 1, limit: 10, totalPages: 0 },
      };
    });
    getRatesArtistLastfm.mockReset().mockResolvedValue({
      artistId: artists[0]!.id,
      status: "not_found",
      biography: null,
      tags: [],
      similarArtists: [],
      listeners: null,
      playCount: null,
      lastfmUrl: null,
    });
    document.body.style.overflow = "";
  });

  afterEach(() => {
    for (const wrapper of wrappers.splice(0)) wrapper.unmount();
    document.body.querySelectorAll("[data-test='favorite-artist-dialog']").forEach((element) => element.remove());
    document.body.style.overflow = "";
  });

  it("requests the new endpoint on mount and preserves the existing layout, order, rating, and image fallbacks", async () => {
    const wrapper = mountWidget();
    expect(getRatesTopArtists).toHaveBeenCalledOnce();
    expect(getRatesTopArtists.mock.calls[0]?.[0]).toBeInstanceOf(AbortSignal);
    expect(getRatesTopArtists.mock.calls[0]?.[1]).toBe("all");
    await flushPromises();

    expect(wrapper.text()).toContain("Tus artistas favoritos");
    const cards = wrapper.findAll("button[aria-haspopup='dialog']");
    expect(cards).toHaveLength(7);
    expect(cards.map((card) => card.attributes("aria-label")?.replace("Ver detalles de ", "")))
      .toEqual(artists.slice(0, 7).map(({ name }) => name));
    expect(wrapper.findAll(".grid").some((grid) => grid.classes().includes("sm:grid-cols-3"))).toBe(true);
    expect(wrapper.findAll(".grid").some((grid) => grid.classes().includes("sm:grid-cols-4"))).toBe(true);
    expect(wrapper.find("button[aria-label='Ver detalles de Artista 2'] .fa-music").exists()).toBe(true);
    expect(wrapper.find("button[aria-label='Ver detalles de Artista 1'] img").attributes("src"))
      .toBe("https://images.example/1.jpg");
    expect(wrapper.text()).toContain("8.45");
    expect(wrapper.text()).not.toContain("12 discos");
  });

  it("opens by click with the selected artist name and image, without another request, then closes with Escape and restores focus", async () => {
    const wrapper = mountWidget();
    await flushPromises();
    const card = wrapper.get("button[aria-label='Ver detalles de Artista 1']");
    (card.element as HTMLButtonElement).focus();
    await card.trigger("click");
    await flushPromises();

    expect(getRatesTopArtists).toHaveBeenCalledOnce();
    expect(modalElement("[role='dialog'] h2").textContent).toBe("Artista 1");
    expect(modalElement<HTMLImageElement>("[role='dialog'] img").src).toBe("https://images.example/1.jpg");
    expect(document.activeElement).toBe(modalElement("[role='dialog'] button"));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushPromises();
    expect(document.body.querySelector("[role='dialog']")).toBeNull();
    expect(document.activeElement).toBe(card.element);
  });

  it("opens by keyboard and closes with the modal button", async () => {
    const wrapper = mountWidget();
    await flushPromises();
    await wrapper.get("button[aria-label='Ver detalles de Artista 2']").trigger("keydown", { key: "Enter" });
    await flushPromises();

    expect(modalElement("[role='dialog'] h2").textContent).toBe("Artista 2");
    expect(document.body.querySelector("[role='dialog'] img")).toBeNull();
    await modalElement<HTMLButtonElement>("[role='dialog'] button").click();
    await flushPromises();
    expect(document.body.querySelector("[role='dialog']")).toBeNull();
    expect(getRatesTopArtists).toHaveBeenCalledOnce();
  });

  it("does not request a personal summary until an artist is selected", async () => {
    const wrapper = mountWidget();
    await flushPromises();
    expect(getRatesArtistSummary).not.toHaveBeenCalled();
    expect(getRatesArtistLastfm).not.toHaveBeenCalled();
    await wrapper.get("button[aria-label='Ver detalles de Artista 1']").trigger("click");
    expect(getRatesArtistSummary).toHaveBeenCalledOnce();
    expect(getRatesArtistSummary.mock.calls[0]?.[0]).toBe(artists[0]?.id);
    expect(getRatesArtistSummary.mock.calls[0]?.[1]).toEqual({ page: 1, limit: 100 });
    expect(getRatesArtistSummary.mock.calls[0]?.[2]).toBeInstanceOf(AbortSignal);
    expect(getRatesArtistLastfm).toHaveBeenCalledOnce();
    expect(getRatesArtistLastfm.mock.calls[0]?.[0]).toBe(artists[0]?.id);
    expect(getRatesArtistLastfm.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
  });

  it("opens the shared artist details modal without nesting dialogs", async () => {
    const wrapper = mount(DashboardFavoriteArtistsWidget, {
      attachTo: document.body,
      global: { plugins: [authenticatedPinia()] },
    });
    wrappers.push(wrapper);
    await flushPromises();
    await wrapper.get("button[aria-label='Ver detalles de Artista 1']").trigger("click");
    await flushPromises();
    expect(document.body.querySelector("[role='dialog']")).not.toBeNull();
    expect(document.body.querySelector("[data-test='artist-details-dialog']")).not.toBeNull();
    expect(document.body.querySelectorAll("[role='dialog']")).toHaveLength(1);
    await modalElement<HTMLButtonElement>("button[aria-label='Cerrar ficha del artista']").click();
    await flushPromises();
    expect(document.body.style.overflow).toBe("");
    expect(getRatesArtistLastfm).toHaveBeenCalledOnce();
    expect(getRatesArtistSummary).toHaveBeenCalledOnce();
  });

  it("provides the three accessible periods, marks all selected, and avoids refetching the active option", async () => {
    const wrapper = mountWidget();
    await flushPromises();
    const options = wrapper.findAll("[role='group'][aria-label='Período del ranking de artistas'] button");
    expect(options.map((option) => option.text())).toEqual(["Mes", "Año", "Siempre"]);
    expect(options.map((option) => option.attributes("aria-pressed"))).toEqual(["false", "false", "true"]);
    options[2]?.element.focus();
    expect(document.activeElement).toBe(options[2]?.element);
    await options[2]?.trigger("click");
    expect(getRatesTopArtists).toHaveBeenCalledOnce();
  });

  it("loads month, year, and all-time rankings as selected and reuses the unchanged card layout", async () => {
    const wrapper = mountWidget();
    await flushPromises();
    const selector = () => wrapper.findAll("[role='group'] button");

    await selector()[0]?.trigger("click");
    await flushPromises();
    expect(getRatesTopArtists.mock.calls[1]?.[1]).toBe("month");
    expect(selector().map((option) => option.attributes("aria-pressed"))).toEqual(["true", "false", "false"]);
    expect(wrapper.findAll("button[aria-haspopup='dialog']").map((card) => card.attributes("aria-label")?.replace("Ver detalles de ", "")))
      .toEqual(artists.slice(0, 7).map(({ name }) => name));
    expect(wrapper.findAll(".grid").some((grid) => grid.classes().includes("sm:grid-cols-3"))).toBe(true);
    expect(wrapper.findAll(".grid").some((grid) => grid.classes().includes("sm:grid-cols-4"))).toBe(true);

    await selector()[1]?.trigger("click");
    await flushPromises();
    expect(getRatesTopArtists.mock.calls[2]?.[1]).toBe("year");

    await selector()[2]?.trigger("click");
    await flushPromises();
    expect(getRatesTopArtists.mock.calls[3]?.[1]).toBe("all");
    expect(getRatesTopArtists).toHaveBeenCalledTimes(4);
  });

  it("cancels and ignores an older period response when the user switches quickly", async () => {
    let monthSignal: AbortSignal | undefined;
    let resolveMonth: ((value: { artists: RatesTopArtistDto[] }) => void) | undefined;
    let resolveYear: ((value: { artists: RatesTopArtistDto[] }) => void) | undefined;
    getRatesTopArtists.mockReset()
      .mockResolvedValueOnce({ artists: [artists[0]!] })
      .mockImplementationOnce((signal: AbortSignal) => {
        monthSignal = signal;
        return new Promise((resolve) => { resolveMonth = resolve; });
      })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveYear = resolve; }));
    const wrapper = mountWidget();
    await flushPromises();
    const selector = () => wrapper.findAll("[role='group'] button");
    await selector()[0]?.trigger("click");
    await selector()[1]?.trigger("click");
    expect(monthSignal?.aborted).toBe(true);
    resolveYear?.({ artists: [artists[3]!] });
    await flushPromises();
    resolveMonth?.({ artists: [artists[2]!] });
    await flushPromises();
    expect(wrapper.text()).toContain("Artista 4");
    expect(wrapper.text()).not.toContain("Artista 3");
  });

  it.each([
    ["month", "Todavía no tienes artistas valorados este mes"],
    ["year", "Todavía no tienes artistas valorados este año"],
  ] as const)("shows the contextual empty state for %s", async (period, message) => {
    getRatesTopArtists.mockResolvedValue({ artists: [] });
    const wrapper = mountWidget();
    await flushPromises();
    const optionIndex = period === "month" ? 0 : 1;
    await wrapper.findAll("[role='group'] button")[optionIndex]?.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain(message);
  });

  it("keeps the selected period after a failure and retries that period", async () => {
    getRatesTopArtists.mockResolvedValueOnce({ artists }).mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ artists: [] });
    const wrapper = mountWidget();
    await flushPromises();
    await wrapper.findAll("[role='group'] button")[0]?.trigger("click");
    await flushPromises();
    expect(getRatesTopArtists.mock.calls[1]?.[1]).toBe("month");
    expect(wrapper.get("[role='alert']").text()).toContain("No se pudieron cargar");
    expect(wrapper.findAll("[aria-pressed='true']")[0]?.text()).toBe("Mes");
    await wrapper.get("[role='alert'] button").trigger("click");
    await flushPromises();
    expect(getRatesTopArtists.mock.calls[2]?.[1]).toBe("month");
    expect(wrapper.text()).toContain("Todavía no tienes artistas valorados este mes");
  });

  it.each(["month", "year", "all"] as const)("opens the all-time detail modal from the %s ranking without sending its period", async (period) => {
    const wrapper = mountWidget();
    await flushPromises();
    const periodIndex = period === "month" ? 0 : period === "year" ? 1 : 2;
    await wrapper.findAll("[role='group'] button")[periodIndex]?.trigger("click");
    await flushPromises();
    await wrapper.get("button[aria-label='Ver detalles de Artista 1']").trigger("click");
    await flushPromises();
    expect(getRatesTopArtists.mock.calls.at(-1)?.[1]).toBe(period);
    expect(getRatesArtistSummary.mock.calls[0]?.[0]).toBe(artists[0]?.id);
    expect(getRatesArtistSummary.mock.calls[0]?.[1]).toEqual({ page: 1, limit: 100 });
    expect(getRatesArtistSummary.mock.calls[0]?.[2]).toBeInstanceOf(AbortSignal);
  });

  it("distinguishes errors from empty results and retries the request", async () => {
    getRatesTopArtists.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ artists: [] });
    const wrapper = mountWidget();
    await flushPromises();
    expect(wrapper.get("[role='alert']").text()).toContain("No se pudieron cargar");
    await wrapper.get("[role='alert'] button").trigger("click");
    await flushPromises();
    expect(getRatesTopArtists).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("Vota algún disco para ver tus artistas favoritos");
    expect(wrapper.find("[role='alert']").exists()).toBe(false);
  });

  it("shows an empty response separately from loading and HTTP errors", async () => {
    getRatesTopArtists.mockResolvedValueOnce({ artists: [] });
    const wrapper = mountWidget();
    await flushPromises();
    expect(wrapper.text()).toContain("Vota algún disco para ver tus artistas favoritos");
    expect(wrapper.find("[role='alert']").exists()).toBe(false);
  });

  it("cancels on unmount and reloads with cleared data when the session changes", async () => {
    let firstSignal: AbortSignal | undefined;
    let resolveFirst: ((value: { artists: RatesTopArtistDto[] }) => void) | undefined;
    getRatesTopArtists.mockImplementationOnce((signal: AbortSignal) => {
      firstSignal = signal;
      return new Promise((resolve) => { resolveFirst = resolve; });
    }).mockResolvedValueOnce({ artists: [artists[1]!] });

    const pinia = authenticatedPinia();
    const authStore = useAuthStore(pinia);
    const wrapper = mount(DashboardFavoriteArtistsWidget, { global: { plugins: [pinia] } });
    wrappers.push(wrapper);
    expect(getRatesTopArtists).toHaveBeenCalledOnce();
    authStore.$patch({ userId: "user-b", authSessionGeneration: authStore.authSessionGeneration + 1 });
    await flushPromises();
    resolveFirst?.({ artists });
    await flushPromises();
    expect(firstSignal?.aborted).toBe(true);
    expect(getRatesTopArtists).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("Artista 2");
    expect(wrapper.text()).not.toContain("Artista 1");
    wrapper.unmount();
    expect(getRatesTopArtists.mock.calls[1]?.[0].aborted).toBe(true);
  });

  it("keeps the local period selection when the authenticated session changes", async () => {
    const pinia = authenticatedPinia();
    const authStore = useAuthStore(pinia);
    const wrapper = mount(DashboardFavoriteArtistsWidget, { global: { plugins: [pinia] } });
    wrappers.push(wrapper);
    await flushPromises();
    await wrapper.findAll("[role='group'] button")[1]?.trigger("click");
    await flushPromises();
    expect(getRatesTopArtists.mock.calls[1]?.[1]).toBe("year");

    authStore.$patch({ userId: "user-b", authSessionGeneration: authStore.authSessionGeneration + 1 });
    await flushPromises();
    expect(getRatesTopArtists.mock.calls[2]?.[1]).toBe("year");
    expect(wrapper.findAll("[role='group'] button").map((option) => option.attributes("aria-pressed")))
      .toEqual(["false", "true", "false"]);
  });

  it("does not request while disabled and requests again when the existing grid slot is reactivated", async () => {
    let resolvePending: ((value: { artists: RatesTopArtistDto[] }) => void) | undefined;
    getRatesTopArtists.mockImplementationOnce(() => new Promise((resolve) => { resolvePending = resolve; }))
      .mockResolvedValueOnce({ artists: [artists[0]!] });
    const disabled = { ...dashboardWidgetDefaults.find(({ id }) => id === "artistas")!, enabled: false };
    const enabled = { ...disabled, enabled: true };
    const wrapper = mount(DashboardWidgetGrid, {
      props: { modules: [disabled] },
      slots: { artistas: () => h(DashboardFavoriteArtistsWidget) },
      global: { plugins: [authenticatedPinia()] },
    });
    wrappers.push(wrapper);

    expect(getRatesTopArtists).not.toHaveBeenCalled();
    await wrapper.setProps({ modules: [enabled] });
    expect(getRatesTopArtists).toHaveBeenCalledOnce();
    const signal = getRatesTopArtists.mock.calls[0]?.[0] as AbortSignal;
    await wrapper.setProps({ modules: [disabled] });
    expect(signal.aborted).toBe(true);
    await wrapper.setProps({ modules: [enabled] });
    await flushPromises();
    resolvePending?.({ artists });
    expect(getRatesTopArtists).toHaveBeenCalledTimes(2);
  });

  it("does not request when the session is unavailable", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(DashboardFavoriteArtistsWidget, { global: { plugins: [pinia] } });
    wrappers.push(wrapper);
    await flushPromises();
    expect(getRatesTopArtists).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Tu sesión ya no está disponible");
  });
});
