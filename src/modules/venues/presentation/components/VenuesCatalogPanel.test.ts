// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VenuesCatalogPanel from "./VenuesCatalogPanel.vue";

const {
  catalogMock,
  countriesMock,
  regionsMock,
  localitiesMock,
  updateMock,
  deleteMock,
  confirmMock,
  roleMock,
} = vi.hoisted(() => ({
  catalogMock: vi.fn(),
  countriesMock: vi.fn(),
  regionsMock: vi.fn(),
  localitiesMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  confirmMock: vi.fn(),
  roleMock: vi.fn(() => "riffvalley"),
}));

vi.mock("../../api/venueCatalog", () => ({
  getVenueCatalog: catalogMock,
  getVenueLocalityOptions: localitiesMock,
  updateVenueCatalog: updateMock,
  deleteVenueCatalog: deleteMock,
  VENUE_CATALOG_PAGE_SIZE: 20,
}));
vi.mock("../../api/venueImport", () => ({
  getVenueImportCountries: countriesMock,
  getAdministrativeRegions: regionsMock,
  resolveVenueLocality: vi.fn(),
  resolveVenueBatch: vi.fn(),
  importVenueBatch: vi.fn(),
}));
vi.mock("@/modules/identity/auth", () => ({
  useAuthStore: () => ({
    get role() {
      return roleMock();
    },
  }),
}));
vi.mock("@/services/swal/SwalService", () => ({ default: { confirm: confirmMock } }));

const venue = {
  id: "venue-1",
  name: "Sala Norte",
  type: "concert_hall",
  status: "active",
  locality: {
    id: "locality-1",
    name: "Santander",
    administrativeRegion: {
      id: "region-1",
      name: "Cantabria",
      country: { id: "country-1", name: "España" },
    },
  },
};
const countries = [
  { id: "country-1", name: "España", isoCode: "ES" },
  { id: "country-2", name: "Francia", isoCode: "FR" },
];
const regions = [{ id: "region-1", name: "Cantabria", countryId: "country-1" }];

describe("VenuesCatalogPanel", () => {
  let queryClient: QueryClient;
  let wrapper: VueWrapper | undefined;

  function mountPanel() {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    wrapper = mount(VenuesCatalogPanel, {
      attachTo: document.body,
      global: { plugins: [[VueQueryPlugin, { queryClient }]] },
    });
    return wrapper;
  }

  async function settle() {
    await flushPromises();
    await flushPromises();
  }

  beforeEach(() => {
    catalogMock.mockReset().mockResolvedValue({
      data: [venue],
      totalItems: 41,
      totalPages: 3,
      currentPage: 1,
      limit: 20,
    });
    countriesMock.mockReset().mockResolvedValue(countries);
    regionsMock.mockReset().mockResolvedValue(regions);
    localitiesMock.mockReset().mockResolvedValue([{ id: "locality-1", name: "Santander" }]);
    updateMock.mockReset().mockResolvedValue(venue);
    deleteMock.mockReset().mockResolvedValue(undefined);
    confirmMock.mockReset().mockResolvedValue({ isConfirmed: true });
    roleMock.mockReturnValue("riffvalley");
  });

  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = "";
    wrapper = undefined;
    queryClient?.clear();
    vi.restoreAllMocks();
  });

  it("renders venue details without UUIDs and uses the paginated API", async () => {
    const panel = mountPanel();
    await settle();

    expect(panel.text()).toContain("Sala Norte");
    expect(panel.text()).toContain("Sala de conciertos");
    expect(panel.text()).toContain("Santander");
    expect(panel.text()).toContain("Cantabria");
    expect(panel.text()).toContain("España");
    expect(panel.text()).toContain("Activa");
    expect(panel.text()).not.toContain("venue-1");
    expect(catalogMock).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 }),
      expect.any(AbortSignal)
    );
  });

  it("sends name search and filters to the server, resetting to the first page", async () => {
    const panel = mountPanel();
    await settle();
    await panel.get("#venue-filter-query").setValue("Norte");
    await settle();
    await panel.get("#venue-filter-type").setValue("arena");
    await settle();
    await panel.get("#venue-filter-status").setValue("closed");
    await settle();

    expect(catalogMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "Norte", type: "arena", status: "closed", offset: 0 }),
      expect.any(AbortSignal)
    );
  });

  it("resets region and locality when the country changes and locality when region changes", async () => {
    const panel = mountPanel();
    await settle();
    await panel.get("#venue-filter-country").setValue("country-1");
    await settle();
    await panel.get("#venue-filter-region").setValue("region-1");
    await settle();
    await panel.get("#venue-filter-locality").setValue("locality-1");
    await settle();
    await panel.get("#venue-filter-country").setValue("country-2");
    await settle();

    expect(panel.get("#venue-filter-region").element.value).toBe("");
    expect(panel.get("#venue-filter-locality").element.value).toBe("");
    expect(catalogMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        countryId: "country-2",
        administrativeRegionId: "",
        localityId: "",
        offset: 0,
      }),
      expect.any(AbortSignal)
    );

    await panel.get("#venue-filter-region").setValue("region-1");
    await settle();
    await panel.get("#venue-filter-locality").setValue("locality-1");
    await settle();
    await panel.get("#venue-filter-region").setValue("");
    await settle();
    expect(panel.get("#venue-filter-locality").element.value).toBe("");
  });

  it("keeps filters while navigating pages and requests the next offset", async () => {
    const panel = mountPanel();
    await settle();
    await panel.get("#venue-filter-query").setValue("Sala");
    await settle();
    await panel.get("nav[aria-label='Paginación del catálogo'] button:last-child").trigger("click");
    await settle();

    expect(catalogMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "Sala", offset: 20, limit: 20 }),
      expect.any(AbortSignal)
    );
  });

  it("edits name, type and status explicitly and invalidates catalog queries", async () => {
    const panel = mountPanel();
    await settle();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await panel.get("[aria-label='Editar Sala Norte']").trigger("click");
    await panel.get("#venue-edit-name").setValue("Sala Sur");
    await panel.get("#venue-edit-type").setValue("arena");
    await panel.get("#venue-edit-status").setValue("temporary");
    await panel.get("button[type='submit']").trigger("submit");
    await settle();

    expect(updateMock).toHaveBeenCalledWith("venue-1", {
      name: "Sala Sur",
      type: "arena",
      status: "temporary",
    });
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["venues", "catalog"] })
    );
    expect(panel.text()).toContain("Los cambios del recinto se han guardado.");
  });

  it("keeps the edit dialog open and explains a failed update", async () => {
    updateMock.mockRejectedValueOnce(new Error("conflict"));
    const panel = mountPanel();
    await settle();
    await panel.get("[aria-label='Editar Sala Norte']").trigger("click");
    await panel.get("button[type='submit']").trigger("submit");
    await settle();

    expect(panel.get('[role="dialog"]').text()).toContain("No se pudieron guardar los cambios");
    expect(panel.text()).toContain("Editar recinto");
  });

  it("closes the edit dialog with Escape and restores focus to its row action", async () => {
    const panel = mountPanel();
    await settle();
    const editButton = panel.get("[aria-label='Editar Sala Norte']");
    (editButton.element as HTMLButtonElement).focus();
    await editButton.trigger("click");
    await panel.get("#venue-edit-name").trigger("keydown", { key: "Escape" });
    await settle();

    expect(panel.find('[role="dialog"]').exists()).toBe(false);
    expect(document.activeElement).toBe(editButton.element);
  });

  it("confirms deletion by name, preserves the row on integrity errors, and invalidates on success", async () => {
    const panel = mountPanel();
    await settle();
    confirmMock.mockResolvedValueOnce({ isConfirmed: false });
    await panel.get("[aria-label='Eliminar Sala Norte']").trigger("click");
    await settle();
    expect(confirmMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("Sala Norte"),
      expect.any(String),
      expect.any(String)
    );
    expect(deleteMock).not.toHaveBeenCalled();

    const integrityError = new axios.AxiosError(
      "constraint",
      "ERR_BAD_RESPONSE",
      undefined,
      undefined,
      { status: 409, statusText: "Conflict", headers: {}, config: {}, data: {} }
    );
    deleteMock.mockRejectedValueOnce(integrityError);
    await panel.get("[aria-label='Eliminar Sala Norte']").trigger("click");
    await settle();
    expect(panel.text()).toContain("Puede tener datos relacionados");
    expect(panel.text()).toContain("Sala Norte");

    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await panel.get("[aria-label='Eliminar Sala Norte']").trigger("click");
    await settle();
    expect(deleteMock).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["venues", "catalog"] })
    );
  });

  it("shows distinct empty and query-error states", async () => {
    catalogMock.mockResolvedValueOnce({
      data: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      limit: 20,
    });
    const panel = mountPanel();
    await settle();
    expect(panel.text()).toContain("Todavía no hay salas registradas.");

    catalogMock.mockResolvedValueOnce({
      data: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      limit: 20,
    });
    await panel.get("#venue-filter-query").setValue("missing");
    await settle();
    expect(panel.text()).toContain("No hay recintos que coincidan con estos filtros.");

    catalogMock.mockRejectedValueOnce(new Error("offline"));
    await panel.get("#venue-filter-query").setValue("nothing");
    await settle();
    expect(panel.text()).toContain("No se pudo cargar el catálogo.");
    expect(panel.text()).toContain("Reintentar");
  });

  it("moves back to the last available page after deleting its final venue", async () => {
    let deleted = false;
    catalogMock.mockImplementation(async (request: { offset: number }) => {
      if (deleted) {
        return { data: [venue], totalItems: 20, totalPages: 1, currentPage: 1, limit: 20 };
      }
      return request.offset === 20
        ? { data: [venue], totalItems: 21, totalPages: 2, currentPage: 2, limit: 20 }
        : {
            data: Array.from({ length: 20 }, (_, index) => ({ ...venue, id: `venue-${index}` })),
            totalItems: 21,
            totalPages: 2,
            currentPage: 1,
            limit: 20,
          };
    });
    const panel = mountPanel();
    await settle();
    await panel.get("nav[aria-label='Paginación del catálogo'] button:last-child").trigger("click");
    await settle();
    deleteMock.mockImplementationOnce(async () => {
      deleted = true;
    });
    await panel.get("[aria-label='Eliminar Sala Norte']").trigger("click");
    await settle();

    expect(catalogMock).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0 }),
      expect.any(AbortSignal)
    );
  });

  it("hides edit and delete operations for roles below riffvalley", async () => {
    roleMock.mockReturnValue("babyUser");
    const panel = mountPanel();
    await settle();
    expect(panel.find("[aria-label='Editar Sala Norte']").exists()).toBe(false);
    expect(panel.find("[aria-label='Eliminar Sala Norte']").exists()).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
