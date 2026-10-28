// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/modules/identity/auth";
import { dashboardWidgetDefaults } from "@/app/dashboardWidgetRegistry";
import type {
  RatesGeographyCountryDto,
  RatesGeographyTopResponseDto,
} from "@services/rates/rates";

const { getRatesGeographyTop, getRatesGeographyWorld } = vi.hoisted(() => ({ getRatesGeographyTop: vi.fn(), getRatesGeographyWorld: vi.fn() }));
const CircleFlagsStub = defineComponent({
  props: { country: { type: String, required: true }, showFlagName: Boolean },
  template: '<span data-test="country-flag" :data-flag-country="country"></span>',
});
vi.mock("@services/rates/rates", async (importOriginal) => {
  const original = await importOriginal<typeof import("@services/rates/rates")>();
  return { ...original, getRatesGeographyTop, getRatesGeographyWorld };
});

import DashboardMusicalWorldWidget from "./DashboardMusicalWorldWidget.vue";
import DashboardWidgetGrid from "../../../components/DashboardWidgetGrid.vue";

const country = (isoCode: string, count: number, name = `País ${isoCode}`): RatesGeographyCountryDto => ({
  isoCode,
  name,
  count,
  percentage: count * 3.25,
});
const payload = (countries: RatesGeographyCountryDto[]): RatesGeographyTopResponseDto => ({ countries });

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

function mountWidget(pinia = authenticatedPinia()) {
  return mount(DashboardMusicalWorldWidget, { global: { plugins: [pinia], stubs: { CircleFlags: CircleFlagsStub } } });
}

function mountGrid(pinia: ReturnType<typeof createPinia>, enabled: boolean) {
  const modules = [
    { ...dashboardWidgetDefaults.find(({ id }) => id === "mundoMusical")!, enabled },
  ];
  return mount(DashboardWidgetGrid, {
    props: { modules },
    global: { plugins: [pinia], stubs: { CircleFlags: CircleFlagsStub } },
    slots: { mundoMusical: () => h(DashboardMusicalWorldWidget) },
  });
}

describe("DashboardMusicalWorldWidget", () => {
  beforeEach(() => {
    getRatesGeographyTop.mockReset().mockResolvedValue(payload([]));
    getRatesGeographyWorld.mockReset().mockResolvedValue({ totalRatedDiscs: 0, mappedDiscs: 0, unmappedDiscs: 0, countryCount: 0, countries: [] });
  });

  it("requests the top endpoint on mount and renders five countries in backend order", async () => {
    const entries = Array.from({ length: 10 }, (_, index) => country(String.fromCharCode(65, 65 + index), 20 - index));
    getRatesGeographyTop.mockResolvedValueOnce(payload(entries));
    const wrapper = mountWidget();
    await flushPromises();

    expect(getRatesGeographyTop).toHaveBeenCalledOnce();
    expect(getRatesGeographyTop.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
    expect(wrapper.findAll("[data-country-code]")).toHaveLength(5);
    expect(wrapper.findAll("[data-test='country-flag']")).toHaveLength(5);
    expect(wrapper.get("[data-country-code='AA'] [data-test='country-flag']").attributes("data-flag-country"))
      .toBe("aa");
    expect(wrapper.findAll("[data-country-code]").map((row) => row.attributes("data-country-code")))
      .toEqual(entries.slice(0, 5).map(({ isoCode }) => isoCode));
    expect(wrapper.text()).toContain("Tu mundo musical");
    expect(wrapper.text()).toContain("Los países de tus discos valorados");
    wrapper.unmount();
  });

  it("renders fewer than ten entries and preserves the backend order instead of sorting percentage", async () => {
    getRatesGeographyTop.mockResolvedValueOnce(payload([
      { ...country("ES", 8, "España"), percentage: 2 },
      { ...country("GB", 12, "Reino Unido"), percentage: 99 },
      country("FR", 3, "Francia"),
    ]));
    const wrapper = mountWidget();
    await flushPromises();

    expect(wrapper.findAll("[data-country-code]")).toHaveLength(3);
    expect(wrapper.findAll("[data-country-code]").map((row) => row.attributes("data-country-code")))
      .toEqual(["ES", "GB", "FR"]);
    expect(wrapper.text().indexOf("España")).toBeLessThan(wrapper.text().indexOf("Reino Unido"));
    wrapper.unmount();
  });

  it("scales bars against the largest disc count and does not use percentage", async () => {
    getRatesGeographyTop.mockResolvedValueOnce(payload([
      { ...country("ES", 12), percentage: 1 },
      { ...country("GB", 6), percentage: 99 },
      { ...country("FR", 3), percentage: 50 },
    ]));
    const wrapper = mountWidget();
    await flushPromises();

    expect(wrapper.findAll("[data-bar-width]").map((bar) => bar.attributes("data-bar-width")))
      .toEqual(["100%", "50%", "25%"]);
    const countryRow = wrapper.get("[data-country-code='ES']");
    expect(countryRow.get(".country-statistics [data-bar-width]").exists()).toBe(true);
    expect(countryRow.get(".country-statistics [data-test='disc-count']").text()).toBe("12 discos");
    expect(countryRow.get(".country-label").text()).toContain("País ES");
    expect(wrapper.text()).toContain("12 discos");
    wrapper.unmount();
  });

  it("truncates long names accessibly with their full value available as a title", async () => {
    const name = "República Democrática del Congo y territorios asociados";
    getRatesGeographyTop.mockResolvedValueOnce(payload([country("CD", 4, name)]));
    const wrapper = mountWidget();
    await flushPromises();

    expect(wrapper.get("[data-country-code='CD'] .truncate").attributes("title")).toBe(name);
    expect(wrapper.get("[data-country-code='CD'] .truncate").classes()).toContain("truncate");
    expect(wrapper.get("[data-country-code='CD']").text()).toContain("4 discos");
    wrapper.unmount();
  });

  it("uses singular wording for one disc", async () => {
    getRatesGeographyTop.mockResolvedValueOnce(payload([country("ES", 1, "España")]));
    const wrapper = mountWidget();
    await flushPromises();

    expect(wrapper.get("[data-country-code='ES']").text()).toContain("1 disco");
    expect(wrapper.get("[data-country-code='ES']").text()).not.toContain("1 discos");
    wrapper.unmount();
  });

  it("shows the exact empty state for an empty response", async () => {
    const wrapper = mountWidget();
    await flushPromises();

    expect(wrapper.get("[data-test='musical-world-empty']").text())
      .toBe("Todavía no tienes discos valorados con un país disponible.");
    expect(wrapper.find("[role='alert']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("keeps loading distinct from empty while the request is pending", () => {
    getRatesGeographyTop.mockReturnValueOnce(new Promise(() => undefined));
    const wrapper = mountWidget();

    expect(wrapper.get("[data-test='musical-world-loading']").attributes("aria-busy")).toBe("true");
    expect(wrapper.find("[data-test='musical-world-empty']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("shows an HTTP failure separately and retries after the user activates retry", async () => {
    getRatesGeographyTop.mockRejectedValueOnce(new Error("HTTP 503"));
    getRatesGeographyTop.mockResolvedValueOnce(payload([country("ES", 1, "España")]));
    const wrapper = mountWidget();
    await flushPromises();

    expect(wrapper.get("[role='alert']").text()).toContain("No se pudieron cargar");
    expect(wrapper.find("[data-test='musical-world-empty']").exists()).toBe(false);
    await wrapper.get("[role='alert'] button").trigger("click");
    await flushPromises();

    expect(getRatesGeographyTop).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("España");
    wrapper.unmount();
  });

  it("aborts an in-flight request when the widget unmounts", async () => {
    let signal: AbortSignal | undefined;
    getRatesGeographyTop.mockImplementationOnce((requestSignal: AbortSignal) => {
      signal = requestSignal;
      return new Promise(() => undefined);
    });
    const wrapper = mountWidget();
    await flushPromises();
    wrapper.unmount();

    expect(signal?.aborted).toBe(true);
  });

  it("ignores a delayed response from an earlier session and requests with the new session", async () => {
    let resolveOld: ((value: RatesGeographyTopResponseDto) => void) | undefined;
    getRatesGeographyTop
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce(payload([country("GB", 2, "Reino Unido")]));
    const pinia = authenticatedPinia();
    const authStore = useAuthStore(pinia);
    const wrapper = mountWidget(pinia);
    await flushPromises();

    authStore.$patch({ userId: "user-b", authSessionGeneration: authStore.authSessionGeneration + 1 });
    await flushPromises();
    resolveOld?.(payload([country("ES", 8, "España obsoleta")]));
    await flushPromises();

    expect(getRatesGeographyTop).toHaveBeenCalledTimes(2);
    expect(getRatesGeographyTop.mock.calls[0][0].aborted).toBe(true);
    expect(wrapper.text()).toContain("Reino Unido");
    expect(wrapper.text()).not.toContain("España obsoleta");
    wrapper.unmount();
  });

  it("does not request without an authenticated session", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mountWidget(pinia);
    await flushPromises();

    expect(getRatesGeographyTop).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("does not mount or request while the grid slot is disabled, then requests on activation", async () => {
    const pinia = authenticatedPinia();
    const wrapper = mountGrid(pinia, false);
    await flushPromises();
    expect(getRatesGeographyTop).not.toHaveBeenCalled();

    await wrapper.setProps({
      modules: [{ ...dashboardWidgetDefaults.find(({ id }) => id === "mundoMusical")!, enabled: true }],
    });
    await flushPromises();
    expect(getRatesGeographyTop).toHaveBeenCalledOnce();

    await wrapper.setProps({
      modules: [{ ...dashboardWidgetDefaults.find(({ id }) => id === "mundoMusical")!, enabled: false }],
    });
    expect(getRatesGeographyTop.mock.calls[0][0].aborted).toBe(true);
    wrapper.unmount();
  });


  it("closes the modal and cancels World when its dashboard slot is deactivated", async () => {
    let worldSignal: AbortSignal | undefined;
    getRatesGeographyWorld.mockImplementationOnce((signal: AbortSignal) => {
      worldSignal = signal;
      return new Promise(() => undefined);
    });
    const pinia = authenticatedPinia();
    const wrapper = mountGrid(pinia, true);
    await flushPromises();
    await wrapper.get("[data-test='world-map-open']").trigger("click");
    await vi.dynamicImportSettled();
    await flushPromises();
    expect(getRatesGeographyWorld).toHaveBeenCalledOnce();
    expect(document.body.querySelector("[data-test='musical-world-modal']")).not.toBeNull();

    await wrapper.setProps({
      modules: [{ ...dashboardWidgetDefaults.find(({ id }) => id === "mundoMusical")!, enabled: false }],
    });
    await flushPromises();
    expect(worldSignal?.aborted).toBe(true);
    expect(document.body.querySelector("[data-test='musical-world-modal']")).toBeNull();
    wrapper.unmount();
  });

  it("does not request the world route or load mapping geometry before the button is opened", async () => {
    const wrapper = mountWidget();
    await flushPromises();
    const source = await import("node:fs").then(({ readFileSync }) =>
      readFileSync("src/modules/dashboard/widgets/musical-world/components/DashboardMusicalWorldWidget.vue", "utf8"),
    );

    expect(getRatesGeographyTop).toHaveBeenCalledOnce();
    expect(source).not.toContain("/geography/world");
    expect(source).not.toMatch(/geojson|topojson|d3-geo/i);
    expect(getRatesGeographyWorld).not.toHaveBeenCalled();
    expect(wrapper.get("[data-test='world-map-open']").attributes("disabled")).toBeUndefined();
    await wrapper.get("[data-test='world-map-open']").trigger("click");
    await vi.dynamicImportSettled();
    await flushPromises();
    expect(getRatesGeographyWorld).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
