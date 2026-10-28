// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { describe, expect, it } from "vitest";
import TopDiscsHeader from "./TopDiscsHeader.vue";

const DiscFiltersStub = defineComponent({
  props: {
    selectedGenre: { type: String, required: true },
    selectedCountry: { type: String, required: true },
    genres: { type: Array, required: true },
    countries: { type: Array, required: true },
    externalRow1: { type: Boolean, required: true },
  },
  emits: ["update:selectedGenre", "update:selectedCountry"],
  setup(_, { slots }) {
    return () => h("div", { "data-testid": "disc-filters" }, slots.default?.());
  },
});

const props = {
  selectedPeriod: "week" as const,
  selectedRangeKey: "W-2026-06-05",
  selectedYear: 2026,
  selectedCountry: "country-1",
  selectedGenre: "genre-1",
  availableYears: [2026, 2025],
  optionsForSelect: [
    { key: "W-2026-06-05", label: "5-11 junio" },
    { key: "W-2026-05-29", label: "29-4 junio" },
  ],
  countries: [{ id: "country-1", name: "País 1", isoCode: "P1" }],
  genres: [{ id: "genre-1", name: "Rock", color: "#111111" }],
  optionsLoading: false,
  optionsError: false,
  optionsEmpty: false,
};

describe("TopDiscsHeader", () => {
  it("places temporal controls before the balanced catalog-filter row", () => {
    const wrapper = mount(TopDiscsHeader, {
      props,
      global: { stubs: { DiscFilters: DiscFiltersStub } },
    });
    const [temporalRow, catalogRow] = wrapper.findAll('[role="group"]');
    const filters = wrapper.findComponent(DiscFiltersStub);

    expect(temporalRow.attributes("data-testid")).toBe("temporal-controls");
    expect(temporalRow.findAll("button").map((button) => button.text())).toEqual([
      "Semana",
      "Mes",
      "Año",
      "Todos",
    ]);
    expect(catalogRow.attributes("data-testid")).toBe("catalog-controls");
    expect(catalogRow.element.parentElement?.getAttribute("data-testid")).toBe(
      "header-control-rows"
    );
    expect(catalogRow.element.parentElement?.classList.contains("w-fit")).toBe(true);
    expect(catalogRow.classes()).toContain("w-full");
    expect(
      Array.from(wrapper.element.querySelectorAll('[role="group"]')).map((group) =>
        group.getAttribute("data-testid")
      )
    ).toEqual(["temporal-controls", "catalog-controls"]);
    expect(catalogRow.classes()).toContain("md:grid-cols-2");
    expect(catalogRow.classes()).toContain("grid-cols-1");
    expect(filters.props("externalRow1")).toBe(true);
    expect(filters.props("countries")).toEqual(props.countries);
    expect(filters.props("genres")).toEqual(props.genres);
  });

  it("renders period controls and available range/year choices, then emits typed intents", async () => {
    const wrapper = mount(TopDiscsHeader, {
      props,
      global: { stubs: { DiscFilters: DiscFiltersStub } },
    });

    expect(wrapper.findAll("button").map((button) => button.text())).toEqual([
      "Semana",
      "Mes",
      "Año",
      "Todos",
    ]);
    expect(wrapper.find("select").element.value).toBe(props.selectedRangeKey);
    expect(wrapper.findAll("option").map((option) => option.text())).toContain("5-11 junio");
    expect(wrapper.findAll("option").map((option) => option.text())).toContain("2025");

    await wrapper.get("button").trigger("click");
    await wrapper.find("select").setValue("W-2026-05-29");
    await wrapper.findAll("select")[1].setValue("2025");

    expect(wrapper.emitted("period-change")).toEqual([["week"]]);
    expect(wrapper.emitted("range-change")).toEqual([["W-2026-05-29"]]);
    expect(wrapper.emitted("year-change")).toEqual([[2025]]);
  });

  it("shows temporal selectors only when they apply to the selected period", async () => {
    const wrapper = mount(TopDiscsHeader, {
      props,
      global: { stubs: { DiscFilters: DiscFiltersStub } },
    });

    expect(wrapper.findAll("select")).toHaveLength(2);
    await wrapper.setProps({ selectedPeriod: "year" });
    expect(wrapper.findAll("select")).toHaveLength(1);
    expect(wrapper.get('select[aria-label="Rango temporal"]')).toBeTruthy();
    expect(wrapper.find('select[aria-label="Año"]').exists()).toBe(false);
    await wrapper.setProps({ selectedPeriod: "all" });
    expect(wrapper.findAll("select")).toHaveLength(0);
  });

  it.each(["week", "month", "year", "all"] as const)(
    "emits the selected %s period unchanged",
    async (period) => {
      const wrapper = mount(TopDiscsHeader, {
        props,
        global: { stubs: { DiscFilters: DiscFiltersStub } },
      });

      await wrapper
        .findAll("button")
        .find(
          (button) =>
            button.text() === { week: "Semana", month: "Mes", year: "Año", all: "Todos" }[period]
        )
        ?.trigger("click");

      expect(wrapper.emitted("period-change")).toEqual([[period]]);
    }
  );

  it("reflects parent prop changes and emits country and genre filter intents", async () => {
    const wrapper = mount(TopDiscsHeader, {
      props,
      global: { stubs: { DiscFilters: DiscFiltersStub } },
    });
    const filters = wrapper.findComponent(DiscFiltersStub);

    expect(filters.props("countries")).toEqual(props.countries);
    expect(filters.props("genres")).toEqual(props.genres);
    await filters.vm.$emit("update:selectedCountry", "country-2");
    await filters.vm.$emit("update:selectedGenre", "genre-2");
    await wrapper.setProps({ selectedPeriod: "all", selectedCountry: "country-2" });

    expect(wrapper.emitted("country-change")).toEqual([["country-2"]]);
    expect(wrapper.emitted("genre-change")).toEqual([["genre-2"]]);
    expect(filters.props("selectedCountry")).toBe("country-2");
    expect(wrapper.findAll("select")).toHaveLength(0);
  });

  it("shows loading, error/retry, and empty option states from props", async () => {
    const wrapper = mount(TopDiscsHeader, {
      props: { ...props, optionsLoading: true },
      global: { stubs: { DiscFilters: DiscFiltersStub } },
    });

    expect(wrapper.get('[role="status"]').text()).toContain("Cargando filtros");
    await wrapper.setProps({ optionsLoading: false, optionsError: true });
    expect(wrapper.get('[role="alert"]').text()).toContain("No se pudieron cargar");
    await wrapper.get('[role="alert"] button').trigger("click");
    expect(wrapper.emitted("retry-options")).toHaveLength(1);
    await wrapper.setProps({ optionsError: false, optionsEmpty: true });
    expect(wrapper.get('[role="status"]').text()).toContain("No hay filtros disponibles");
  });
});
