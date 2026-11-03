// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { EventGeographyState, EventImportRow } from "../../application/useEventImportRows";
import VenueCell from "./VenueCell.vue";

const row: EventImportRow = {
  id: "row-stable-key",
  type: "concert",
  event: "",
  lineup: [],
  startDate: null,
  startDateDraft: "",
  endDate: null,
  endDateDraft: "",
  venue: { name: "Sala escrita", venueId: null, localityId: "locality-a" },
  price: "",
  otherInfo: "",
  city: "City written",
  province: "Province written",
  administrativeRegionId: null,
};

describe("VenueCell geographic identity selection", () => {
  it("shows contextual candidates, preserves text, and exposes explicit identities", async () => {
    const state: EventGeographyState = {
      localityStatus: "existing",
      localityCandidates: [
        {
          id: "locality-a",
          name: "City written",
          province: "Province written",
          country: { id: "country-a", name: "Country" },
          administrativeRegion: { id: "region-a", name: "Region A" },
        },
        {
          id: "locality-b",
          name: "City written",
          province: "Province written",
          country: { id: "country-a", name: "Country" },
          administrativeRegion: { id: "region-b", name: "Region B" },
        },
      ],
      selectedLocality: null,
      localitySelectionOriginalContext: null,
      localityResult: {
        index: 0,
        input: { name: "City written", countryId: "country-a" },
        status: "ambiguous",
        code: "LOCALITY_AMBIGUOUS",
        candidates: [
          {
            id: "locality-a",
            name: "City written",
            province: "Province written",
            country: { id: "country-a", name: "Country" },
            administrativeRegion: { id: "region-a", name: "Region A" },
          },
          {
            id: "locality-b",
            name: "City written",
            province: "Province written",
            country: { id: "country-a", name: "Country" },
            administrativeRegion: { id: "region-b", name: "Region B" },
          },
        ],
      },
      localityError: null,
      venueStatus: "ambiguous",
      venueCandidates: [
        { id: "venue-a", name: "Sala A" },
        { id: "venue-b", name: "Sala B" },
      ],
      selectedVenueCandidateId: null,
      venueError: null,
    };
    const wrapper = mount(VenueCell, { props: { row, state, regions: [], rowNumber: 2 } });

    expect(wrapper.text()).toContain("Province written");
    expect(wrapper.text()).not.toContain("DTO de importación no admite");
    await wrapper
      .get('select[aria-label="Candidatos de localidad, fila 2"]')
      .setValue("locality-b");
    await wrapper.get('select[aria-label="Candidatos de recinto, fila 2"]').setValue("venue-b");
    expect(wrapper.emitted("selectLocality")).toEqual([["locality-b"]]);
    expect(wrapper.emitted("selectVenue")).toEqual([["venue-b"]]);
    expect(wrapper.props("row").city).toBe("City written");
    expect(wrapper.props("row").venue.name).toBe("Sala escrita");
  });

  it("explains a selected Venue whose name contradicts its candidate", () => {
    const wrapper = mount(VenueCell, {
      props: {
        row: { ...row, venue: { ...row.venue, name: "Texto incompatible" } },
        state: {
          ...({} as EventGeographyState),
          localityStatus: "existing",
          localityCandidates: [],
          selectedLocality: null,
          localitySelectionOriginalContext: null,
          localityResult: null,
          localityError: null,
          venueStatus: "ambiguous",
          venueCandidates: [{ id: "venue-a", name: "Sala real" }],
          selectedVenueCandidateId: "venue-a",
          venueError: null,
        },
        regions: [],
        rowNumber: 1,
      },
    });
    expect(wrapper.text()).toContain("Venue no coincide con la identidad seleccionada");
  });
});
