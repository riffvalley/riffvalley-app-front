// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SearchableSelect from "./SearchableSelect.vue";

describe("SearchableSelect keyboard access", () => {
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
});
