// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SearchableSelect from "./SearchableSelect.vue";

describe("SearchableSelect keyboard access", () => {
  it("shows the selected option once it arrives after the value", async () => {
    const wrapper = mount(SearchableSelect, {
      props: {
        modelValue: "country-de",
        options: [{ id: "country-es", name: "España" }],
        triggerPlaceholder: "Todos los países",
        allLabel: "Todos los países",
        title: "name",
        trackby: "id",
        useTeleport: false,
      },
    });
    const trigger = wrapper.get("button.search_input_trigger");
    expect(trigger.text()).toBe("Todos los países");

    await wrapper.setProps({ options: [{ id: "country-de", name: "Alemania" }] });
    expect(trigger.text()).toBe("Alemania");

    await wrapper.setProps({ modelValue: "" });
    expect(trigger.text()).toBe("Todos los países");
    wrapper.unmount();
  });

  it("opens with Arrow Down and selects an option through the search input", async () => {
    const wrapper = mount(SearchableSelect, {
      attachTo: document.body,
      props: {
        options: [{ id: "country-1", name: "Argentina" }],
        triggerPlaceholder: "Selecciona un país",
        allLabel: "Todos los países",
        title: "name",
        trackby: "id",
        useTeleport: false,
      },
    });
    const trigger = wrapper.get("button.search_input_trigger");

    expect(trigger.attributes("type")).toBe("button");
    expect(trigger.attributes("aria-haspopup")).toBe("listbox");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    await trigger.trigger("keydown", { key: "ArrowDown" });
    await flushPromises();

    expect(trigger.attributes("aria-expanded")).toBe("true");
    const input = wrapper.get('input[type="text"]');
    expect(document.activeElement).toBe(input.element);
    expect(wrapper.get('[role="listbox"] [role="option"]').text()).toBe("Todos los países");

    await input.trigger("keydown", { key: "ArrowDown" });
    await input.trigger("keydown", { key: "Enter" });
    await flushPromises();

    expect(wrapper.emitted("update:modelValue")).toEqual([["country-1"]]);
    expect(trigger.attributes("aria-expanded")).toBe("false");
    wrapper.unmount();
  });

  it("supports pointer toggle and closes the list with Escape", async () => {
    const wrapper = mount(SearchableSelect, {
      attachTo: document.body,
      props: { options: [{ id: "genre-1", name: "Rock" }], useTeleport: false },
    });
    const trigger = wrapper.get("button.search_input_trigger");

    await trigger.trigger("click");
    expect(trigger.attributes("aria-expanded")).toBe("true");
    await wrapper.get('input[type="text"]').trigger("keydown", { key: "Escape" });
    expect(trigger.attributes("aria-expanded")).toBe("false");
    wrapper.unmount();
  });

  it("draws the panel variant like the genre selector, marking the selected option", async () => {
    const wrapper = mount(SearchableSelect, {
      attachTo: document.body,
      props: {
        modelValue: "country-es",
        options: [
          { id: "country-de", name: "Alemania" },
          { id: "country-es", name: "España" },
        ],
        allLabel: "Todos los países",
        menuVariant: "panel",
        useTeleport: false,
      },
    });
    await wrapper.get("button.search_input_trigger").trigger("click");
    await flushPromises();

    const options = wrapper.findAll("[role=option]");
    const spain = options.find((option) => option.text() === "España")!;
    expect(wrapper.get("[role=listbox]").classes()).toContain("max-h-64");
    expect(spain.classes()).toContain("bg-rv-pink/10");
    expect(spain.find(".fa-check").exists()).toBe(true);
    expect(options[0]!.find(".fa-check").exists()).toBe(false);
    wrapper.unmount();
  });
});
