// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { EventGeographyState, EventImportRow } from "../../application/useEventImportRows";
import LocalityCell from "./LocalityCell.vue";

const row: EventImportRow = {
  id: "event-row-stable",
  type: "concert",
  event: "",
  lineup: [],
  startDate: null,
  startDateDraft: "",
  endDate: null,
  endDateDraft: "",
  venue: { name: "Sala", venueId: null, localityId: null },
  price: "",
  otherInfo: "",
  city: "San Sebastián",
  province: "Gipuzkoa",
  administrativeRegionId: null,
};

function geography(overrides: Partial<EventGeographyState> = {}): EventGeographyState {
  return {
    localityStatus: "idle",
    localityCandidates: [],
    selectedLocality: null,
    localitySelectionOriginalContext: null,
    localityResult: null,
    localityError: null,
    venueStatus: "idle",
    venueCandidates: [],
    selectedVenueCandidateId: null,
    venueError: null,
    ...overrides,
  };
}

const candidates = [
  {
    id: "locality-a",
    name: "Donostia",
    province: "Gipuzkoa",
    country: { id: "country-a", name: "España" },
    administrativeRegion: { id: "region-a", name: "País Vasco" },
  },
  {
    id: "locality-b",
    name: "Donostia",
    province: "Gipuzkoa",
    country: { id: "country-b", name: "España" },
    administrativeRegion: { id: "region-b", name: "Otra región" },
  },
];

describe("LocalityCell", () => {
  it("edits City and selects an ambiguous locality by ID", async () => {
    const wrapper = mount(LocalityCell, {
      props: {
        row,
        rowNumber: 2,
        regions: [],
        state: geography({
          localityStatus: "ambiguous",
          localityCandidates: candidates,
          localityResult: {
            index: 0,
            input: { name: "Donostia", countryId: "country-a" },
            status: "ambiguous",
            code: "LOCALITY_AMBIGUOUS",
            candidates,
          },
        }),
      },
    });

    await wrapper.get('input[aria-label="Ciudad, fila 2"]').setValue("Donostia");
    await wrapper
      .get('select[aria-label="Candidatas de localidad, fila 2"]')
      .setValue("locality-b");
    expect(wrapper.emitted("update")).toEqual([["Donostia"]]);
    expect(wrapper.emitted("selectLocality")).toEqual([["locality-b"]]);
    expect(wrapper.text()).toContain("Seleccionar localidad");
  });

  it("shows new/existing locality states and places required region selection next to City", async () => {
    const regions = [{ id: "region-a", name: "Navarra" }] as never[];
    const newLocality = mount(LocalityCell, {
      props: {
        row,
        rowNumber: 1,
        regions,
        state: geography({
          localityStatus: "new",
          localityResult: {
            index: 0,
            input: { name: row.city, countryId: "country-a" },
            status: "new",
            requiresAdministrativeRegionId: true,
            candidates: [],
          },
        }),
      },
    });

    expect(newLocality.text()).toContain("Localidad nueva");
    await newLocality
      .get('select[aria-label="Región administrativa, fila 1"]')
      .setValue("region-a");
    expect(newLocality.emitted("selectRegion")).toEqual([["region-a"]]);

    const existingLocality = mount(LocalityCell, {
      props: {
        row,
        rowNumber: 1,
        regions: [],
        state: geography({ localityStatus: "existing" }),
      },
    });
    expect(existingLocality.text()).toContain("Localidad existente");
  });

  it("announces locality resolution errors in Spanish and keeps retry available", async () => {
    const wrapper = mount(LocalityCell, {
      props: {
        row,
        rowNumber: 3,
        regions: [],
        state: geography({ localityStatus: "error", localityError: "network error" }),
      },
    });
    await wrapper.get("button").trigger("click");
    expect(wrapper.text()).toContain("Error al buscar la localidad");
    expect(wrapper.text()).not.toContain("network error");
    expect(wrapper.emitted("retry")).toHaveLength(1);
    expect(wrapper.get('[role="alert"]').text()).toContain("Error al buscar la localidad");
    expect(wrapper.text()).not.toContain("LOCALITY_");
  });

  it("announces invalid city feedback as an error and keeps its input labelled", () => {
    const wrapper = mount(LocalityCell, {
      props: {
        row,
        rowNumber: 3,
        regions: [],
        state: geography({ localityStatus: "invalid", localityError: "INVALID_LOCALITY" }),
      },
    });

    const input = wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 3"]');
    expect(input.attributes("aria-describedby")).toBe("locality-status-event-row-stable");
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(wrapper.get('[role="status"]').text()).toContain("Ciudad no válida.");
    expect(wrapper.text()).not.toContain("INVALID_LOCALITY");
  });
});
