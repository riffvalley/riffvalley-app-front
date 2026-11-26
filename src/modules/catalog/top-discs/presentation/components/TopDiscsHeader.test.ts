// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { describe, expect, it } from "vitest";
import TopDiscsHeader from "./TopDiscsHeader.vue";

const CountrySelectStub = defineComponent({
  name: "DiscListCountrySelect",
  props: {
    modelValue: { type: String, required: true },
    options: { type: Array, required: true },
  },
  emits: ["update:modelValue"],
  setup() {
    return () => h("div", { "data-testid": "country-select" });
  },
});

const GenreSelectStub = defineComponent({
  name: "DiscListGenreSelect",
  props: {
    modelValue: { type: Array, required: true },
    options: { type: Array, required: true },
    loading: { type: Boolean, default: false },
    multiple: { type: Boolean, default: true },
  },
  emits: ["update:modelValue"],
  setup() {
    return () => h("div", { "data-testid": "genre-select" });
  },
});

const stubs = { DiscListCountrySelect: CountrySelectStub, DiscListGenreSelect: GenreSelectStub };

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
      global: { stubs },
    });
    const [temporalRow, catalogRow] = wrapper.findAll('[role="group"]');
    const country = wrapper.findComponent(CountrySelectStub);
    const genre = wrapper.findComponent(GenreSelectStub);

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
    expect(country.props("options")).toEqual(props.countries);
    expect(genre.props("options")).toEqual(props.genres);
    // El Top solo filtra por un género: mismo selector que Discos, en modo de uno.
    expect(genre.props("multiple")).toBe(false);
    expect(genre.props("modelValue")).toEqual(["genre-1"]);
  });

  it("renders period controls and available range/year choices, then emits typed intents", async () => {
    const wrapper = mount(TopDiscsHeader, {
      props,
      global: { stubs },
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
      global: { stubs },
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
        global: { stubs },
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
      global: { stubs },
    });
    const country = wrapper.findComponent(CountrySelectStub);
    const genre = wrapper.findComponent(GenreSelectStub);

    await country.vm.$emit("update:modelValue", "country-2");
    // El selector devuelve ids en minúsculas: el Top recupera el id original.
    await wrapper.setProps({
      genres: [...props.genres, { id: "Genre-2", name: "Jazz", color: null }],
    });
    await genre.vm.$emit("update:modelValue", ["genre-2"]);
    await genre.vm.$emit("update:modelValue", []);
    await wrapper.setProps({ selectedPeriod: "all", selectedCountry: "country-2", selectedGenre: "" });

    expect(wrapper.emitted("country-change")).toEqual([["country-2"]]);
    expect(wrapper.emitted("genre-change")).toEqual([["Genre-2"], [""]]);
    expect(country.props("modelValue")).toBe("country-2");
    expect(genre.props("modelValue")).toEqual([]);
    expect(wrapper.findAll("select")).toHaveLength(0);
  });

  it("shows loading, error/retry, and empty option states from props", async () => {
    const wrapper = mount(TopDiscsHeader, {
      props: { ...props, optionsLoading: true },
      global: { stubs },
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
