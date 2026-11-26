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
  it("labels the no-votes switch after genres and clears it with exploration", async () => {
    localStorage.setItem("rv_default_year_filter", "all");
    const wrapper = mount(DiscListExplorationFilters, {
      props: { ...baseProps, noRatesOnly: true },
      global: { stubs: { SearchableSelect: CountrySelectStub } },
    });

    const noRatesSwitch = wrapper.get<HTMLInputElement>('input[role="switch"]');
    expect(noRatesSwitch.attributes("aria-label")).toBe("Mostrar solo discos sin votos");
    expect(wrapper.get(".no-rates-switch").attributes("title")).toBe("Mostrar solo discos sin votos");
    const noRatesControl = wrapper.get(".no-rates-control");
    expect(noRatesControl.text()).toContain("Sin votos");
    expect(noRatesControl.attributes("aria-labelledby")).toBe("disc-list-no-rates-label");
    expect(noRatesControl.find("#disc-list-no-rates-label").text()).toBe("Sin votos");
    expect(noRatesControl.element.parentElement).toBe(wrapper.get(".exploration-grid").element);
    const genreControl = wrapper.get(".genre-control");
    expect(genreControl.element.compareDocumentPosition(noRatesSwitch.element) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    const clearButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Limpiar");
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
    expect(controls.every((control) => control.element.parentElement === wrapper.get(".exploration-grid").element)).toBe(true);
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
      .find((button) => button.text() === "Limpiar");
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

  it("names the mobile disclosure after its content and counts only what it holds", () => {
    localStorage.setItem("rv_default_year_filter", "all");
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
    const wrapper = mount(DiscListExplorationFilters, {
      props: { ...baseProps, selectedCountry: "country-a", selectedGenres: ["genre-a"], noRatesOnly: true },
      global: { stubs: { SearchableSelect: CountrySelectStub } },
    });
    const toggle = wrapper.get('button[aria-controls="disc-list-exploration-controls"]');
    // «Sin votos» va fuera del desplegable, así que no suma: país + 1 género = 2.
    expect(toggle.text()).toBe("Fecha, país y género2 activos");
  });

  it("keeps Sin votos visible on mobile, after the collapsible filters", async () => {
    localStorage.setItem("rv_default_year_filter", "all");
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
    const wrapper = mount(DiscListExplorationFilters, {
      props: baseProps,
      global: { stubs: { SearchableSelect: CountrySelectStub } },
    });
    const toggle = wrapper.get('button[aria-controls="disc-list-exploration-controls"]');
    const noRates = wrapper.get(".no-rates-control");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    // Fuera del desplegable (se ve aunque esté cerrado) y justo después de él,
    // para que los filtros se abran pegados al botón «Fecha, país y género».
    const controls = wrapper.get("#disc-list-exploration-controls").element;
    expect(controls.contains(noRates.element)).toBe(false);
    expect(controls.nextElementSibling).toBe(noRates.element);
    expect(wrapper.findAll(".no-rates-control")).toHaveLength(1);
    await noRates.get('input[role="switch"]').setValue(true);
    expect(wrapper.emitted("update:no-rates")?.at(-1)).toEqual([true]);
  });

  it("always shows month and week, disabled until a year and a month are chosen", async () => {
    localStorage.setItem("rv_default_year_filter", "all");
    const wrapper = mount(DiscListExplorationFilters, { props: baseProps });
    const month = wrapper.get<HTMLButtonElement>("#disc-list-month");
    const period = wrapper.get<HTMLButtonElement>("#disc-list-period");
    expect(month.element.disabled).toBe(true);
    expect(month.text()).toBe("Todos los meses");
    expect(period.element.disabled).toBe(true);
    expect(period.text()).toBe("Todas las semanas");

    await wrapper.setProps({ selectedWeek: ["2025-01-01T00:00:00.000Z", "2025-12-31T23:59:59.999Z"] });
    expect(month.element.disabled).toBe(false);
    expect(month.text()).toBe("Año completo");
    expect(period.element.disabled).toBe(true);

    await wrapper.setProps({ selectedWeek: ["2025-02-01T00:00:00.000Z", "2025-02-28T23:59:59.999Z"] });
    expect(period.element.disabled).toBe(false);
  });

  it("updates year and period ranges through the custom selects", async () => {
    localStorage.setItem("rv_default_year_filter", "all");
    const wrapper = mount(DiscListExplorationFilters, { props: baseProps });
    await wrapper.get("#disc-list-year").trigger("click");
    await wrapper.get('#disc-list-year-listbox [data-value="2025"]').trigger("click");
    expect(wrapper.emitted("update:week")?.at(-1)?.[0]).toEqual([
      "2025-01-01T00:00:00.000Z",
      "2025-12-31T23:59:59.999Z",
    ]);
    await wrapper.setProps({
      selectedWeek: ["2025-02-01T00:00:00.000Z", "2025-02-28T23:59:59.999Z"],
    });
    await wrapper.get("#disc-list-period").trigger("click");
    await wrapper.get('#disc-list-period-listbox [data-value="W-2025-02-07"]').trigger("click");
    expect(wrapper.emitted("update:week")?.at(-1)?.[0]).toEqual([
      "2025-02-07T00:00:00.000Z",
      "2025-02-13T23:59:59.999Z",
    ]);
  });
});
