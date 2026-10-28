// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardWidgetDefaults } from "@/app/dashboardWidgetRegistry";
import { useAuthStore } from "@/modules/identity/auth";
import type {
  RatesDashboardRecentRateDto,
  RatesDashboardSummaryDto,
} from "@services/rates/rates";

const { getRatesDashboardSummary, resolveSpotifyAlbum, getSpotifyAlbumDetails } = vi.hoisted(() => ({
  getRatesDashboardSummary: vi.fn(),
  resolveSpotifyAlbum: vi.fn(),
  getSpotifyAlbumDetails: vi.fn(),
}));

vi.mock("@services/rates/rates", async (importOriginal) => {
  const original = await importOriginal<typeof import("@services/rates/rates")>();
  return { ...original, getRatesDashboardSummary };
});
vi.mock("@services/spotify/spotifyLookup", () => ({ resolveSpotifyAlbum, getSpotifyAlbumDetails }));

import DashboardLatestVotesWidget from "./DashboardLatestVotesWidget.vue";
import DashboardWidgetGrid from "../../../components/DashboardWidgetGrid.vue";

const discId = (digit: string) => `00000000-0000-4000-8000-00000000000${digit}`;

function recentRate(
  id: string,
  overrides: Partial<RatesDashboardRecentRateDto> = {},
): RatesDashboardRecentRateDto {
  return {
    id: `rate-${id}`,
    discId: discId(id),
    discName: `Disco ${id}`,
    artist: { id: `artist-${id}`, name: `Artista ${id}` },
    coverImage: `https://images.test/${id}.jpg`,
    rate: 8,
    cover: 7,
    lastActivityAt: "2026-10-27T18:30:00.000Z",
    ...overrides,
  };
}

function summary(overrides: {
  metrics?: Partial<RatesDashboardSummaryDto["metrics"]>;
  recentRates?: RatesDashboardRecentRateDto[];
} = {}): RatesDashboardSummaryDto {
  return {
    period: {
      start: "2026-10-25T23:00:00.000Z",
      endExclusive: "2026-11-01T23:00:00.000Z",
      timezone: "Europe/Madrid",
    },
    metrics: {
      activeRates: 3,
      averageMusicalRate: 8.15,
      distinctGenres: 2,
      bestRatedDisc: {
        rateId: "best-rate",
        discId: discId("9"),
        discName: "Mejor disco",
        artist: { id: "artist-best", name: "Mejor artista" },
        coverImage: null,
        rate: 9.5,
      },
      dominantGenre: { id: "genre-1", name: "Rock", activeRates: 2 },
      weekOverWeek: {
        currentRates: 3,
        previousRates: 1,
        difference: 2,
        percentageChange: 200,
      },
      ...overrides.metrics,
    },
    recentRates: overrides.recentRates ?? [recentRate("1"), recentRate("2"), recentRate("3")],
  };
}

const DiscDetailStub = defineComponent({
  name: "DiscDetail",
  props: { disc: { type: Object, required: true } },
  emits: ["close"],
  setup(_props, { emit }) {
    return () => h("button", { type: "button", onClick: () => emit("close") }, "Cerrar detalle");
  },
});

function authenticatedPinia(userId = "user-a") {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore(pinia).$patch({
    token: "test-token",
    userId,
    authStatus: "authenticated",
    role: "user",
  });
  return pinia;
}

function mountWidget(pinia = authenticatedPinia(), useRealDiscDetail = false) {
  return mount(DashboardLatestVotesWidget, {
    attachTo: useRealDiscDetail ? document.body : undefined,
    global: { plugins: [pinia], stubs: useRealDiscDetail ? {} : { DiscDetail: DiscDetailStub } },
  });
}

describe("DashboardLatestVotesWidget", () => {
  beforeEach(() => {
    getRatesDashboardSummary.mockReset().mockResolvedValue(summary());
    resolveSpotifyAlbum.mockReset().mockResolvedValue(null);
    getSpotifyAlbumDetails.mockReset();
  });

  it("requests the summary once, uses the backend week, and renders its metrics", async () => {
    const wrapper = mountWidget();

    await vi.waitFor(() => expect(getRatesDashboardSummary).toHaveBeenCalledOnce());
    await flushPromises();

    expect(wrapper.text()).toContain("Tu semana musical");
    expect(wrapper.text()).toContain("26 oct – 1 nov");
    expect(wrapper.text()).toContain("Rates activos");
    expect(wrapper.text()).toContain("3");
    expect(wrapper.text()).toContain("Media musical");
    expect(wrapper.text()).toContain("8,2");
    expect(wrapper.text()).toContain("Géneros");
    expect(wrapper.text()).toContain("Mejor disco");
    expect(wrapper.text()).toContain("Mejor artista");
    expect(wrapper.text()).toContain("Mejor disco — Mejor artista");
    expect(wrapper.text()).toContain("9,5");
    expect(wrapper.text()).toContain("Género dominante");
    expect(wrapper.text()).toContain("Rock");
    expect(wrapper.text()).toContain("Rock · 2 votos");
    expect(wrapper.find("li").text()).toContain("Disco 1 — Artista 1 (27 oct, 19:30)");
    expect(getRatesDashboardSummary.mock.calls[0]?.[0]).toBeInstanceOf(AbortSignal);

    wrapper.unmount();
  });

  it("opens the best-rated disc from its compact title link", async () => {
    const wrapper = mountWidget();
    await flushPromises();

    const bestDiscLink = wrapper.findAll("button").find((button) => button.text() === "Mejor disco");
    expect(bestDiscLink).toBeDefined();
    expect(wrapper.text()).not.toContain("Ver disco");

    await bestDiscLink!.trigger("click");
    expect(wrapper.findComponent(DiscDetailStub).props("disc")).toMatchObject({
      id: discId("9"),
      name: "Mejor disco",
      artist: { name: "Mejor artista" },
    });

    wrapper.unmount();
  });

  it("opens and closes the real disc dialog with keyboard and restores the triggering link", async () => {
    const wrapper = mountWidget(authenticatedPinia(), true);
    await flushPromises();
    const opener = wrapper.findAll("li button")[0]!.element as HTMLButtonElement;
    opener.focus();
    opener.click();
    await flushPromises();

    const detail = document.body.querySelector<HTMLElement>("[role='dialog'][aria-label='Detalle del disco Disco 1']");
    expect(detail).toBeTruthy();
    const closeButton = detail!.querySelector<HTMLButtonElement>("button[aria-label='Cerrar detalle del disco']");
    expect(closeButton).toBeTruthy();
    closeButton!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await flushPromises();

    expect(document.body.querySelector("[aria-label='Detalle del disco Disco 1']")).toBeNull();
    expect(document.activeElement).toBe(opener);
    wrapper.unmount();
  });

  it("keeps a null musical average neutral and shows current-week zeros with older Rates", async () => {
    getRatesDashboardSummary.mockResolvedValueOnce(summary({
      metrics: {
        activeRates: 0,
        averageMusicalRate: null,
        distinctGenres: 0,
        bestRatedDisc: null,
        dominantGenre: null,
        weekOverWeek: { currentRates: 0, previousRates: 2, difference: -2, percentageChange: -100 },
      },
      recentRates: [recentRate("1")],
    }));
    const wrapper = mountWidget();

    await vi.waitFor(() => expect(wrapper.text()).toContain("Sin actividad esta semana"));

    expect(wrapper.text()).toContain("Rates activos");
    expect(wrapper.text()).toContain("Media musical");
    expect(wrapper.text()).toContain("—");
    expect(wrapper.text()).not.toContain("0,0");
    expect(wrapper.text()).toContain("Sin notas musicales esta semana");
    expect(wrapper.text()).toContain("Sin datos");
    expect(wrapper.text()).toContain("−2 respecto a la semana pasada");
    expect(wrapper.text()).toContain("−100 %");
    expect(wrapper.text()).toContain("Disco 1");

    wrapper.unmount();
  });

  it("formats positive, negative, and unchanged comparisons from the DTO", async () => {
    const wrapper = mountWidget();
    await vi.waitFor(() => expect(wrapper.text()).toContain("+2 respecto a la semana pasada"));
    expect(wrapper.text()).toContain("+200 %");

    getRatesDashboardSummary.mockResolvedValueOnce(summary({
      metrics: { weekOverWeek: { currentRates: 4, previousRates: 4, difference: 0, percentageChange: null } },
    }));
    const pinia = authenticatedPinia("user-b");
    const second = mountWidget(pinia);
    await vi.waitFor(() => expect(second.text()).toContain("Sin cambios respecto a la semana pasada"));
    expect(second.text()).not.toContain("0 %");

    wrapper.unmount();
    second.unmount();
  });

  it("shows at most five recent Rates in the received order, including cover-only entries", async () => {
    const rows = [
      recentRate("1"),
      recentRate("2", { rate: null, cover: 8.5 }),
      recentRate("3"),
      recentRate("4", { rate: 0, cover: null }),
      recentRate("5"),
      recentRate("6"),
    ];
    getRatesDashboardSummary.mockResolvedValueOnce(summary({ recentRates: rows }));
    const wrapper = mountWidget();

    await vi.waitFor(() => expect(wrapper.findAll("li")).toHaveLength(5));

    const renderedRows = wrapper.findAll("li").map((row) => row.text());
    expect(renderedRows[0]).toContain("Disco 1");
    expect(renderedRows[1]).toContain("Disco 2");
    expect(renderedRows[1]).toContain("8,5");
    expect(renderedRows[1]).not.toContain("Nota musical");
    expect(renderedRows[3]).toContain("0");
    expect(renderedRows[4]).toContain("Disco 5");
    expect(wrapper.text()).not.toContain("Disco 6");
    expect(renderedRows[0]).toContain("27 oct");

    wrapper.unmount();
  });

  it("uses the existing cover fallback and avoids detail actions without a valid ID", async () => {
    getRatesDashboardSummary.mockResolvedValueOnce(summary({
      recentRates: [recentRate("1", { coverImage: null }), recentRate("2", { discId: "", artist: null })],
    }));
    const wrapper = mountWidget();

    await vi.waitFor(() => expect(wrapper.findAll("li")).toHaveLength(2));

    expect(wrapper.findAll("li img")[0]?.attributes("src")).toContain("disco.png");
    expect(wrapper.findAll("li button")).toHaveLength(1);
    await wrapper.findAll("li button")[0]!.trigger("click");
    expect(wrapper.findComponent(DiscDetailStub).props("disc")).toMatchObject({
      id: discId("1"),
      name: "Disco 1",
      artist: { name: "Artista 1" },
    });
    await wrapper.findComponent(DiscDetailStub).get("button").trigger("click");
    expect(wrapper.findComponent(DiscDetailStub).exists()).toBe(false);

    wrapper.unmount();
  });

  it("shows a distinct no-Rates message when the user has no current Rates", async () => {
    getRatesDashboardSummary.mockResolvedValueOnce(summary({
      metrics: {
        activeRates: 0,
        averageMusicalRate: null,
        distinctGenres: 0,
        bestRatedDisc: null,
        dominantGenre: null,
        weekOverWeek: { currentRates: 0, previousRates: 0, difference: 0, percentageChange: null },
      },
      recentRates: [],
    }));
    const wrapper = mountWidget();

    await vi.waitFor(() => expect(wrapper.text()).toContain("Aún no tienes Rates guardados"));
    expect(wrapper.text()).toContain("Sin cambios respecto a la semana pasada");
    expect(wrapper.findAll("li")).toHaveLength(0);

    wrapper.unmount();
  });

  it("renders loading, distinguishes HTTP errors, and retries", async () => {
    getRatesDashboardSummary.mockImplementationOnce(() => new Promise(() => undefined));
    const wrapper = mountWidget();
    await vi.waitFor(() => expect(getRatesDashboardSummary).toHaveBeenCalledOnce());
    expect(wrapper.get('[role="status"]').text()).toContain("Cargando");
    expect(wrapper.text()).not.toContain("Rates activos");
    wrapper.unmount();

    getRatesDashboardSummary.mockRejectedValueOnce(new Error("HTTP failure"));
    const failed = mountWidget();
    await vi.waitFor(() => expect(failed.text()).toContain("No se pudo cargar tu semana musical"));
    expect(failed.text()).not.toContain("Aún no tienes Rates guardados");
    getRatesDashboardSummary.mockResolvedValueOnce(summary());
    await failed.get("button").trigger("click");
    await vi.waitFor(() => expect(failed.text()).toContain("Disco 1"));
    expect(getRatesDashboardSummary).toHaveBeenCalledTimes(3);

    failed.unmount();
  });

  it("cancels on unmount, ignores stale session responses, and reloads for the new user", async () => {
    let resolveFirst: ((value: RatesDashboardSummaryDto) => void) | undefined;
    let resolveSecond: ((value: RatesDashboardSummaryDto) => void) | undefined;
    const signals: AbortSignal[] = [];
    getRatesDashboardSummary
      .mockImplementationOnce((signal: AbortSignal) => {
        signals.push(signal);
        return new Promise((resolve) => { resolveFirst = resolve; });
      })
      .mockImplementationOnce((signal: AbortSignal) => {
        signals.push(signal);
        return new Promise((resolve) => { resolveSecond = resolve; });
      });
    const pinia = authenticatedPinia();
    const authStore = useAuthStore(pinia);
    const wrapper = mountWidget(pinia);

    await vi.waitFor(() => expect(getRatesDashboardSummary).toHaveBeenCalledOnce());
    authStore.$patch({ userId: "user-b", authSessionGeneration: authStore.authSessionGeneration + 1 });
    await vi.waitFor(() => expect(getRatesDashboardSummary).toHaveBeenCalledTimes(2));
    expect(signals[0]?.aborted).toBe(true);

    resolveFirst?.(summary({ recentRates: [recentRate("7", { discName: "Old user result" })] }));
    resolveSecond?.(summary({ recentRates: [recentRate("8", { discName: "New user result" })] }));
    await flushPromises();
    expect(wrapper.text()).toContain("New user result");
    expect(wrapper.text()).not.toContain("Old user result");

    wrapper.unmount();
    expect(signals[1]?.aborted).toBe(true);
  });

  it("does not request without an authenticated user and only loads when its grid slot is enabled", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore(pinia).$patch({ authStatus: "anonymous" });
    const anonymous = mountWidget(pinia);
    expect(getRatesDashboardSummary).not.toHaveBeenCalled();
    anonymous.unmount();

    const activePinia = authenticatedPinia();
    const definition = dashboardWidgetDefaults.find(({ id }) => id === "ultimosVotos")!;
    const makeGrid = (enabled: boolean) => mount(DashboardWidgetGrid, {
      props: { modules: [{ ...definition, enabled }] },
      global: { plugins: [activePinia], stubs: { DiscDetail: DiscDetailStub } },
      slots: { ultimosVotos: () => h(DashboardLatestVotesWidget) },
    });
    const grid = makeGrid(false);
    expect(getRatesDashboardSummary).not.toHaveBeenCalled();
    await grid.setProps({ modules: [{ ...definition, enabled: true }] });
    await vi.waitFor(() => expect(getRatesDashboardSummary).toHaveBeenCalledOnce());
    await grid.setProps({ modules: [{ ...definition, enabled: false }] });
    expect(getRatesDashboardSummary.mock.calls[0]?.[0].aborted).toBe(true);
    grid.unmount();
  });
});
