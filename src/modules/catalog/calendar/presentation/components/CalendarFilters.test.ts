// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import CalendarFilters from "./CalendarFilters.vue";
import { DiscListCountrySelect, DiscListGenreSelect } from "@/modules/catalog/discs";

const props = {
  searchQuery: "",
  year: 2026,
  yearOptions: [
    { value: 2025, label: "2025" },
    { value: 2026, label: "2026" },
  ],
  country: "",
  countries: [{ id: "country-es", name: "España" }],
  genre: "",
  genres: [{ id: "Genre-B", name: "Black Metal", color: "#111111" }],
};

describe("CalendarFilters", () => {
  it("puts search + year in the first row and country + genre in the second", () => {
    const wrapper = mount(CalendarFilters, { props });
    const [firstRow, secondRow] = wrapper.get('[data-test="calendar-filters"]').element.children;

    expect(firstRow!.querySelector('input[type="search"]')).not.toBeNull();
    expect(firstRow!.querySelector('select[aria-label="Año"]')).not.toBeNull();
    expect(secondRow!.querySelector('[data-test="calendar-country"]')).not.toBeNull();
    expect(secondRow!.querySelector('[data-test="calendar-genre"]')).not.toBeNull();
    expect(wrapper.findComponent(DiscListGenreSelect).props("multiple")).toBe(false);
  });

  it("emits search, year, country and the original-case genre id", async () => {
    const wrapper = mount(CalendarFilters, { props });

    await wrapper.get('input[type="search"]').setValue("metal");
    await wrapper.get('select[aria-label="Año"]').setValue("2025");
    wrapper.findComponent(DiscListCountrySelect).vm.$emit("update:modelValue", "country-es");
    wrapper.findComponent(DiscListGenreSelect).vm.$emit("update:modelValue", ["genre-b"]);
    wrapper.findComponent(DiscListGenreSelect).vm.$emit("update:modelValue", []);

    expect(wrapper.emitted("update:searchQuery")).toEqual([["metal"]]);
    expect(wrapper.emitted("update:year")).toEqual([[2025]]);
    expect(wrapper.emitted("update:country")).toEqual([["country-es"]]);
    expect(wrapper.emitted("update:genre")).toEqual([["Genre-B"], [""]]);
  });
});
