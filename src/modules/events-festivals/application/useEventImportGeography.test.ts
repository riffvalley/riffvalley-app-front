// @vitest-environment happy-dom
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEventImportGeography } from "./useEventImportGeography";

const { countriesMock, regionsMock } = vi.hoisted(() => ({
  countriesMock: vi.fn(),
  regionsMock: vi.fn(),
}));

vi.mock("@/modules/venues", () => ({
  getVenueImportCountries: countriesMock,
  getAdministrativeRegions: regionsMock,
  venueCatalogCountriesQueryKey: ["venues", "import", "countries"],
  venueCatalogRegionsQueryKey: (countryId: string) => ["venues", "import", "regions", countryId],
}));

const countries = [
  { id: "country-ES", isoCode: "ES", name: "España" },
  { id: "country-PT", isoCode: "PT", name: "Portugal" },
];

describe("useEventImportGeography", () => {
  beforeEach(() => {
    countriesMock.mockReset().mockResolvedValue(countries);
    regionsMock
      .mockReset()
      .mockResolvedValue([{ id: "region-PT", name: "Lisboa", countryId: "country-PT" }]);
  });

  function mountGeography() {
    let geography: ReturnType<typeof useEventImportGeography> | undefined;
    const Host = defineComponent({
      setup() {
        geography = useEventImportGeography(vi.fn());
        return () => h("div");
      },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = mount(Host, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
    return { wrapper, queryClient, geography: () => geography };
  }

  it("loads the shared full-country catalog once and selects Spain by its real ID", async () => {
    const mounted = mountGeography();
    await flushPromises();

    const geography = mounted.geography();
    expect(countriesMock).toHaveBeenCalledTimes(1);
    expect(geography?.selectedCountryId.value).toBe("country-ES");
    expect(geography?.countryOptions.value.map(({ isoCode }) => isoCode)).toEqual(["ES", "PT"]);
    expect(regionsMock).not.toHaveBeenCalled();
    mounted.wrapper.unmount();
  });

  it("loads administrative regions only on request and for the selected country's UUID", async () => {
    const mounted = mountGeography();
    await flushPromises();
    const geography = mounted.geography();
    geography?.selectCountry("country-PT");

    const regions = await geography?.loadRegions();
    await geography?.loadRegions();

    expect(regionsMock).toHaveBeenCalledTimes(1);
    expect(regionsMock).toHaveBeenCalledWith("country-PT", expect.any(AbortSignal));
    expect(regions).toEqual([{ id: "region-PT", name: "Lisboa", countryId: "country-PT" }]);
    mounted.wrapper.unmount();
  });

  it("does not overwrite a user's selection after a catalog refetch", async () => {
    const mounted = mountGeography();
    await flushPromises();
    const geography = mounted.geography();
    geography?.selectCountry("country-PT");
    countriesMock.mockResolvedValueOnce([...countries].reverse());

    await mounted.queryClient.invalidateQueries({
      queryKey: ["venues", "import", "countries"],
    });
    await flushPromises();

    expect(geography?.selectedCountryId.value).toBe("country-PT");
    mounted.wrapper.unmount();
  });

  it("exposes missing permitted countries without fabricating options or IDs", async () => {
    countriesMock.mockResolvedValueOnce([{ id: "country-PT", isoCode: "PT", name: "Portugal" }]);
    const mounted = mountGeography();
    await flushPromises();
    const geography = mounted.geography();

    expect(geography?.selectedCountryId.value).toBe("");
    expect(geography?.countryOptions.value).toEqual([
      { id: "country-PT", isoCode: "PT", label: "Portugal" },
    ]);
    expect(geography?.countryCatalogIssues.value[0]).toContain("España (ES)");
    expect(geography?.selectCountry("fake-country-id")).toBeUndefined();
    expect(geography?.selectedCountryId.value).toBe("");
    mounted.wrapper.unmount();
  });
});
