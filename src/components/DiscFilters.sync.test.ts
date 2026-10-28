// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { describe, expect, it } from "vitest";
import DiscFilters from "./DiscFilters.vue";

const SelectStub = defineComponent({
  props: {
    modelValue: { type: [String, Number], default: "" },
    options: { type: Array, default: () => [] },
  },
  render() {
    return h("div", { "data-testid": "select" }, String(this.modelValue));
  },
});

const SimpleSelectStub = defineComponent({
  name: "SimpleSelect",
  props: {
    modelValue: { type: [String, Number], default: null },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: "" },
    groupLabel: { type: String, default: "" },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const testId = () =>
      props.placeholder === "Año"
        ? "year-filter"
        : props.placeholder === "Mes"
          ? "month-filter"
          : "period-filter";

    return () =>
      h(
        "select",
        {
          "data-testid": testId(),
          value: String(props.modelValue ?? ""),
          onChange: (event: Event) => {
            const value = (event.target as HTMLSelectElement).value;
            const option = (props.options as Array<{ value: string | number }>).find(
              (candidate) => String(candidate.value) === value
            );
            emit("update:modelValue", option?.value ?? value);
          },
        },
        (props.options as Array<{ value: string | number; label: string }>).map((option) =>
          h("option", { value: String(option.value) }, option.label)
        )
      );
  },
});

describe("DiscFilters controlled selection synchronization", () => {
  it("reflects country and genre changes supplied by the parent", async () => {
    const wrapper = mount(DiscFilters, {
      props: {
        selectedCountry: "country-1",
        selectedGenre: "genre-1",
        showWeekPicker: false,
        showSearchQuery: false,
      },
      global: {
        stubs: { SearchableSelect: SelectStub, SimpleSelect: SimpleSelectStub },
      },
    });

    await wrapper.setProps({ selectedCountry: "country-2", selectedGenre: "genre-2" });
    await flushPromises();

    const selects = wrapper.findAllComponents(SelectStub);
    expect(selects[0]?.props("modelValue")).toBe("country-2");
    expect(selects[1]?.props("modelValue")).toBe("genre-2");
    wrapper.unmount();
  });

  it("emits the selected year's, month's, and week's UTC ranges and clears the range for all years", async () => {
    localStorage.setItem("rv_default_year_filter", "all");
    const wrapper = mount(DiscFilters, {
      global: {
        stubs: { SearchableSelect: SelectStub, SimpleSelect: SimpleSelectStub },
      },
    });

    expect(wrapper.emitted("update:selectedWeek")?.[0]).toEqual([null]);

    await wrapper.get('[data-testid="year-filter"]').setValue("2025");
    await flushPromises();
    expect(wrapper.emitted("update:selectedWeek")?.at(-1)).toEqual([
      ["2025-01-01T00:00:00.000Z", "2025-12-31T23:59:59.999Z"],
    ]);

    await wrapper.get('[data-testid="month-filter"]').setValue("2");
    await flushPromises();
    expect(wrapper.emitted("update:selectedWeek")?.at(-1)).toEqual([
      ["2025-02-01T00:00:00.000Z", "2025-02-28T23:59:59.999Z"],
    ]);

    const period = wrapper.get('[data-testid="period-filter"]');
    const weekValue = period.findAll("option").find((option) => option.text().includes(" – "))
      ?.element.value;
    expect(weekValue).toBeDefined();
    if (!weekValue) throw new Error("No se generó una opción semanal para febrero de 2025");
    await period.setValue(weekValue);
    await flushPromises();
    const selectedWeekRange = wrapper.emitted("update:selectedWeek")?.at(-1)?.[0];
    expect(selectedWeekRange).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^2025-02-\d\dT00:00:00\.000Z$/),
        expect.stringMatching(/^2025-02-\d\dT23:59:59\.999Z$/),
      ])
    );

    await wrapper.get('[data-testid="year-filter"]').setValue("0");
    await flushPromises();
    expect(wrapper.emitted("update:selectedWeek")?.at(-1)).toEqual([null]);
    wrapper.unmount();
    localStorage.clear();
  });
});
