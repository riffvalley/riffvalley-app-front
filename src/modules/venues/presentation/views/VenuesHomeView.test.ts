// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import api from "@/services/api/api";
import VenuesHomeView from "./VenuesHomeView.vue";

const { countriesMock, regionsMock, catalogMock } = vi.hoisted(() => ({
  countriesMock: vi.fn(),
  regionsMock: vi.fn(),
  catalogMock: vi.fn(),
}));
vi.mock("../../api/venueImport", () => ({
  getVenueImportCountries: countriesMock,
  getAdministrativeRegions: regionsMock,
  resolveVenueLocality: vi.fn(),
  importVenueBatch: vi.fn(),
}));
vi.mock("../../api/venueCatalog", () => ({
  getVenueCatalog: catalogMock,
  getVenueLocalityOptions: vi.fn().mockResolvedValue([]),
  updateVenueCatalog: vi.fn(),
  deleteVenueCatalog: vi.fn(),
  VENUE_CATALOG_PAGE_SIZE: 20,
}));
vi.mock("@/modules/identity/auth", () => ({
  useAuthStore: () => ({ role: "riffvalley" }),
}));

describe("VenuesHomeView", () => {
  let queryClient: QueryClient;

  function mountHome() {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return mount(VenuesHomeView, {
      global: { plugins: [[VueQueryPlugin, { queryClient }]] },
    });
  }

  afterEach(() => {
    queryClient?.clear();
    vi.restoreAllMocks();
  });

  it("renders the paginated catalog and its empty state without making HTTP requests", async () => {
    countriesMock.mockResolvedValue([]);
    catalogMock.mockResolvedValue({
      data: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      limit: 20,
    });
    const httpMethods = ["get", "post", "put", "patch", "delete", "request"] as const;
    const httpSpies = httpMethods.map((method) => vi.spyOn(api, method));
    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.get("h1").text()).toBe("Salas y recintos");
    expect(wrapper.get('[role="tablist"]').text()).toContain("Catálogo");
    expect(wrapper.get('[role="tablist"]').text()).toContain("Importar salas");
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toBe("Catálogo");
    expect(wrapper.get('[role="tabpanel"] h2').text()).toBe("Catálogo");
    expect(wrapper.text()).toContain("Todavía no hay salas registradas.");
    httpSpies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
    wrapper.unmount();
  });

  it("switches between the catalog and import placeholders", async () => {
    countriesMock.mockResolvedValue([{ id: "es-id", name: "España", isoCode: "ES" }]);
    regionsMock.mockResolvedValue([]);
    catalogMock.mockResolvedValue({
      data: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      limit: 20,
    });
    const wrapper = mountHome();

    await wrapper.get('[role="tab"]:nth-child(2)').trigger("click");
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toBe("Importar salas");
    expect(wrapper.get('[role="tabpanel"] h2').text()).toBe("Importar salas");
    expect(wrapper.text()).toContain("Puedes pegar una columna desde Excel o Google Sheets");
    expect(wrapper.text()).not.toContain("VEN-F02");

    await wrapper.get('[role="tab"]:first-child').trigger("click");
    expect(wrapper.get('[role="tabpanel"] h2').text()).toBe("Catálogo");
    wrapper.unmount();
  });

  it("supports arrow-key navigation between tabs", async () => {
    countriesMock.mockResolvedValue([]);
    regionsMock.mockResolvedValue([]);
    catalogMock.mockResolvedValue({
      data: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      limit: 20,
    });
    const wrapper = mountHome();
    const catalogTab = wrapper.get('[data-tab="catalog"]');

    await catalogTab.trigger("keydown", { key: "ArrowRight" });

    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toBe("Importar salas");
    wrapper.unmount();
  });
});
