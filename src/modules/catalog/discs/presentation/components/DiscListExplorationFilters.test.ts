// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import DiscListExplorationFilters from "./DiscListExplorationFilters.vue";

const CountrySelectStub = defineComponent({
  props: ["modelValue", "options"],
  emits: ["update:modelValue"],
  template:
    '<button type="button" @click="$emit(\'update:modelValue\', \'country-a\')">{{ modelValue || "Todos los países" }}</button>',
});

const baseProps = {
  selectedWeek: null,
  selectedCountry: "",
  selectedGenres: [],
  noRatesOnly: false,
  showNoRatesFilter: true,
  countries: [{ id: "country-a", name: "España", isoCode: "ES" }],
  genres: [
    { id: "genre-a", name: "Black Metal", color: null },
    { id: "genre-b", name: "Death Metal", color: null },
  ],
  optionsLoading: false,
  optionsError: false,
  searchQuery: "",
};

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("DiscListExplorationFilters", () => {
  it("shows only the no-votes switch after genres and clears it with exploration", async () => {
    localStorage.setItem("rv_default_year_filter", "all");
    const wrapper = mount(DiscListExplorationFilters, {
      props: { ...baseProps, noRatesOnly: true },
      global: { stubs: { SearchableSelect: CountrySelectStub } },
    });

    const noRatesSwitch = wrapper.get<HTMLInputElement>('input[role="switch"]');
    expect(noRatesSwitch.attributes("aria-label")).toBe("Mostrar solo discos sin votos");
    expect(wrapper.text()).not.toContain("Sin votos");
    const genreControl = wrapper.get(".genre-control");
    expect(genreControl.element.compareDocumentPosition(noRatesSwitch.element) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    const clearButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Limpiar exploración");
    expect(clearButton).toBeDefined();
    await clearButton?.trigger("click");
    expect(wrapper.emitted("update:no-rates")).toEqual([[false]]);
  });

  it("shows two genre chips so the saved status can share the active-filter row", () => {
    localStorage.setItem("rv_default_year_filter", "all");
    const wrapper = mount(DiscListExplorationFilters, {
      props: { ...baseProps, selectedGenres: ["genre-a", "genre-b", "genre-c"] },
      global: { stubs: { SearchableSelect: CountrySelectStub } },
    });

    expect(wrapper.findAll('button[aria-label^="Quitar "]').map((button) => button.attributes("aria-label"))).toEqual([
      "Quitar Black Metal",
      "Quitar Death Metal",
    ]);
    expect(wrapper.text()).toContain("+1 géneros");
  });

  it("places País before Géneros in the exploration controls", () => {
    localStorage.setItem("rv_default_year_filter", "all");
    const wrapper = mount(DiscListExplorationFilters, {
      props: baseProps,
      global: { stubs: { SearchableSelect: CountrySelectStub } },
    });
    const controls = wrapper.findAll(".filter-control");
    const countryIndex = controls.findIndex((control) => control.classes().includes("country-control"));
    const genreIndex = controls.findIndex((control) => control.classes().includes("genre-control"));
    const noRatesIndex = controls.findIndex((control) => control.classes().includes("no-rates-control"));

    expect(countryIndex).toBeGreaterThanOrEqual(0);
    expect(countryIndex).toBeLessThan(genreIndex);
    expect(genreIndex).toBeLessThan(noRatesIndex);
  });

  it("reflects canonical criteria in removable chips and delegates clearing to the parent", async () => {
    localStorage.setItem("rv_default_year_filter", "all");
    const wrapper = mount(DiscListExplorationFilters, {
      props: {
        ...baseProps,
        selectedWeek: ["2025-01-01T00:00:00.000Z", "2025-12-31T23:59:59.999Z"],
        selectedCountry: "country-a",
        selectedGenres: ["genre-a", "genre-b"],
      },
      global: { stubs: { SearchableSelect: CountrySelectStub } },
    });

    expect(wrapper.text()).toContain("España");
    expect(wrapper.text()).toContain("Black Metal");
    expect(wrapper.text()).toContain("Death Metal");
    expect(wrapper.text()).toContain("01-01-2025 – 31-12-2025");
    await wrapper.get('button[aria-label="Quitar Black Metal"]').trigger("click");
    expect(wrapper.emitted("update:genres")?.at(-1)).toEqual([["genre-b"]]);
    await wrapper.get('button[aria-label="Quitar España"]').trigger("click");
    expect(wrapper.emitted("update:country")?.at(-1)).toEqual([""]);
    const clearButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Limpiar exploración");
    await clearButton?.trigger("click");
    expect(wrapper.emitted("update:week")?.at(-1)).toEqual([null]);
    expect(wrapper.emitted("update:genres")?.at(-1)).toEqual([[]]);
  });

  it("keeps the mobile disclosure available and exposes its expanded state", async () => {
    localStorage.setItem("rv_default_year_filter", "all");
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
    const wrapper = mount(DiscListExplorationFilters, {
      props: { ...baseProps, selectedGenres: ["genre-a"] },
      global: { stubs: { SearchableSelect: CountrySelectStub } },
    });
    const toggle = wrapper.get('button[aria-controls="disc-list-exploration-controls"]');
    expect(toggle.attributes("aria-expanded")).toBe("false");
    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(wrapper.get("#disc-list-exploration-controls").isVisible()).toBe(true);
  });

  it("updates year and period ranges through controlled native selects", async () => {
    localStorage.setItem("rv_default_year_filter", "all");
    const wrapper = mount(DiscListExplorationFilters, { props: baseProps });
    await wrapper.get("#disc-list-year").setValue("2025");
    expect(wrapper.emitted("update:week")?.at(-1)?.[0]).toEqual([
      "2025-01-01T00:00:00.000Z",
      "2025-12-31T23:59:59.999Z",
    ]);
    await wrapper.setProps({
      selectedWeek: ["2025-02-01T00:00:00.000Z", "2025-02-28T23:59:59.999Z"],
    });
    await wrapper.get("#disc-list-period").setValue("W-2025-02-07");
    expect(wrapper.emitted("update:week")?.at(-1)?.[0]).toEqual([
      "2025-02-07T00:00:00.000Z",
      "2025-02-13T23:59:59.999Z",
    ]);
  });
});
