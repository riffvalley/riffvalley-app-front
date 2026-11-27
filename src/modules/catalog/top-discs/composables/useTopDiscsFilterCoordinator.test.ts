// @vitest-environment happy-dom
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, getAllCountries, getAllGenres } = vi.hoisted(() => ({
  get: vi.fn(),
  getAllCountries: vi.fn(),
  getAllGenres: vi.fn(),
}));
vi.mock("@services/api/api", () => ({ default: { get } }));
vi.mock("@services/countries/countries", () => ({ getAllCountries }));
vi.mock("@services/genres/genres", () => ({ getAllGenres }));

import { useTopDiscsFilterCoordinator } from "./useTopDiscsFilterCoordinator";

const countryOne = { id: "country-1", name: "País 1", isoCode: "P1" };
const countryTwo = { id: "country-2", name: "País 2", isoCode: "P2" };
const countrySpain = { id: "country-es", name: "España", isoCode: "ES" };
const genreOne = { id: "genre-1", name: "Género 1", color: "#111111" };
const genreTwo = { id: "genre-2", name: "Género 2", color: "#222222" };
const genreJazz = { id: "genre-jazz", name: "Jazz", color: "#333333" };

function responseForOptions(params: Record<string, unknown>) {
  const dateRange = params.dateRange as [string, string] | undefined;
  if (dateRange?.[0] === "period-without-selections") {
    return { countries: [countryTwo], genres: [genreTwo] };
  }
  const countries =
    params.genreId === "genre-1"
      ? [countryOne]
      : params.genreId === "genre-2"
        ? [countryTwo]
        : [countryOne, countryTwo];
  const genres =
    params.countryId === "country-1"
      ? [genreOne]
      : params.countryId === "country-2"
        ? [genreTwo]
        : [genreOne, genreTwo];
  return { countries, genres };
}

function createHarness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: Infinity } },
  });
  const Harness = defineComponent({
    setup() {
      const filters = useTopDiscsFilterCoordinator();
      filters.setInitialDateRange(["2026-06-01", "2026-06-07"]);
      return { filters };
    },
    render: () => h("div"),
  });
  const wrapper = mount(Harness, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  });
  return { wrapper, queryClient };
}

describe("useTopDiscsFilterCoordinator", () => {
  beforeEach(() => {
    getAllCountries.mockReset().mockResolvedValue([countryTwo, countrySpain, countryOne]);
    getAllGenres.mockReset().mockResolvedValue([genreJazz, genreTwo, genreOne]);
    get
      .mockReset()
      .mockImplementation((url: string, config: { params?: Record<string, unknown> }) => {
        if (url === "/discs/topDiscs/options") {
          return Promise.resolve({ data: responseForOptions(config.params ?? {}) });
        }
        return Promise.resolve({ data: { discs: [] } });
      });
  });

  it("loads initial options and keeps the effective week range", async () => {
    const { wrapper } = createHarness();
    await flushPromises();

    expect(wrapper.vm.filters.period.value).toBe("week");
    expect(wrapper.vm.filters.dateRange.value).toHaveLength(2);
    expect(wrapper.vm.filters.countries.value).toHaveLength(3);
    expect(get).toHaveBeenCalledWith("/discs/topDiscs/options", {
      params: expect.objectContaining({ dateRange: wrapper.vm.filters.dateRange.value }),
      signal: expect.any(AbortSignal),
    });
    wrapper.unmount();
  });

  it.each(["week", "month", "year", "all"] as const)(
    "uses one effective options request for the %s period",
    async (period) => {
      const { wrapper } = createHarness();
      await flushPromises();
      get.mockClear();

      const range: [string, string] | null = period === "all" ? null : ["2026-06-01", "2026-06-30"];
      await wrapper.vm.filters.setPeriod(period, range);
      await flushPromises();

      expect(get).toHaveBeenCalledTimes(1);
      const request = get.mock.calls[0] as [string, { params: Record<string, unknown> }];
      expect(request[0]).toBe("/discs/topDiscs/options");
      expect(request[1].params.dateRange).toEqual(range ?? undefined);
      wrapper.unmount();
    }
  );

  it("keeps valid filters when the period changes", async () => {
    const { wrapper } = createHarness();
    await flushPromises();
    await wrapper.vm.filters.setCountry("country-1");
    await wrapper.vm.filters.setGenre("genre-1");
    await wrapper.vm.filters.setPeriod("month", ["2026-06-01", "2026-06-30"]);

    expect(wrapper.vm.filters.countryId.value).toBe("country-1");
    expect(wrapper.vm.filters.genreId.value).toBe("genre-1");
    wrapper.unmount();
  });

  it("offers the complete country and genre catalog, sorted by name, regardless of the period", async () => {
    const { wrapper } = createHarness();
    await flushPromises();
    await wrapper.vm.filters.setPeriod("month", ["period-without-selections", "2026-06-30"]);
    await flushPromises();

    expect(wrapper.vm.filters.countries.value.map((country: { name: string }) => country.name)).toEqual(
      ["España", "País 1", "País 2"]
    );
    expect(wrapper.vm.filters.genres.value.map((genre: { name: string }) => genre.name)).toEqual([
      "Género 1",
      "Género 2",
      "Jazz",
    ]);
    expect(getAllCountries).toHaveBeenCalledTimes(1);
    expect(getAllGenres).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("keeps filters without discs in the new period and validates a single request", async () => {
    const { wrapper } = createHarness();
    await flushPromises();
    await wrapper.vm.filters.setCountry("country-1");
    await wrapper.vm.filters.setGenre("genre-1");
    get.mockClear();

    await wrapper.vm.filters.setPeriod("month", ["period-without-selections", "2026-06-30"]);

    expect(wrapper.vm.filters.countryId.value).toBe("country-1");
    expect(wrapper.vm.filters.genreId.value).toBe("genre-1");
    expect(wrapper.vm.filters.canLoadRanking.value).toBe(true);
    expect(get).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("keeps the genre when the country changes and the country when the genre changes", async () => {
    const { wrapper } = createHarness();
    await flushPromises();
    await wrapper.vm.filters.setCountry("country-1");
    await wrapper.vm.filters.setGenre("genre-1");
    await wrapper.vm.filters.setCountry("country-es");

    expect(wrapper.vm.filters.countryId.value).toBe("country-es");
    expect(wrapper.vm.filters.genreId.value).toBe("genre-1");

    await wrapper.vm.filters.setGenre("genre-jazz");
    expect(wrapper.vm.filters.countryId.value).toBe("country-es");
    expect(wrapper.vm.filters.genreId.value).toBe("genre-jazz");
    expect(wrapper.vm.filters.genres.value).toHaveLength(3);
    wrapper.unmount();
  });

  it("preserves selection on options errors and allows an explicit retry", async () => {
    const { wrapper } = createHarness();
    await flushPromises();
    get.mockRejectedValueOnce(new Error("offline"));
    await wrapper.vm.filters.setCountry("country-1");

    expect(wrapper.vm.filters.countryId.value).toBe("country-1");
    expect(wrapper.vm.filters.optionsError.value).toBe(true);
    // El catálogo completo sigue disponible aunque falle la validación del periodo.
    expect(wrapper.vm.filters.countries.value).toHaveLength(3);

    await wrapper.vm.filters.retryOptions();
    expect(wrapper.vm.filters.optionsError.value).toBe(false);
    expect(wrapper.vm.filters.countries.value).toHaveLength(3);
    wrapper.unmount();
  });

  it("falls back to the period options when the complete catalog cannot be loaded", async () => {
    getAllCountries.mockRejectedValueOnce(new Error("offline"));
    const { wrapper } = createHarness();
    await flushPromises();

    expect(wrapper.vm.filters.countries.value.map((country: { id: string }) => country.id)).toEqual(
      ["country-1", "country-2"]
    );
    wrapper.unmount();
  });

  it("supports an empty options response without clearing on request failure", async () => {
    getAllCountries.mockRejectedValueOnce(new Error("offline"));
    get.mockResolvedValueOnce({ data: { countries: [], genres: [] } });
    const { wrapper } = createHarness();
    await flushPromises();

    expect(wrapper.vm.filters.optionsEmpty.value).toBe(true);
    expect(wrapper.vm.filters.countries.value).toEqual([]);
    expect(wrapper.vm.filters.genres.value).toEqual([]);
    wrapper.unmount();
  });

  it("does not issue duplicate requests when the same period/range is selected", async () => {
    const { wrapper } = createHarness();
    await flushPromises();
    get.mockClear();

    await wrapper.vm.filters.setPeriod("all", null);
    const countAfterChange = get.mock.calls.length;
    await wrapper.vm.filters.setPeriod("all", null);

    expect(countAfterChange).toBe(1);
    expect(get).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("ignores late option responses from a previous filter revision", async () => {
    let resolveOld:
      | ((value: {
          data: { countries: (typeof countryOne)[]; genres: (typeof genreOne)[] };
        }) => void)
      | undefined;
    get.mockImplementation((url: string, config: { params?: Record<string, unknown> }) => {
      if (url !== "/discs/topDiscs/options") return Promise.resolve({ data: { discs: [] } });
      if (config.params?.countryId === "country-1") {
        return new Promise((resolve) => {
          resolveOld = resolve;
        });
      }
      return Promise.resolve({ data: { countries: [countryTwo], genres: [genreTwo] } });
    });
    const { wrapper } = createHarness();
    await flushPromises();

    const oldAction = wrapper.vm.filters.setCountry("country-1");
    await vi.waitFor(() => expect(resolveOld).toBeTypeOf("function"));
    const oldRequest = get.mock.calls.find(
      ([, config]: [string, { params?: Record<string, unknown> }]) =>
        config.params?.countryId === "country-1"
    ) as [string, { signal: AbortSignal }];
    await wrapper.vm.filters.setCountry("country-2");
    await flushPromises();
    expect(oldRequest[1].signal.aborted).toBe(true);
    resolveOld?.({ data: { countries: [countryOne], genres: [genreOne] } });
    await oldAction;

    expect(wrapper.vm.filters.countryId.value).toBe("country-2");
    expect(wrapper.vm.filters.optionsParams.value.countryId).toBe("country-2");
    expect(wrapper.vm.filters.canLoadRanking.value).toBe(true);
    wrapper.unmount();
  });
});
