// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import DiscListSelect from "./DiscListSelect.vue";

const options = [
  { value: "", label: "Todos" },
  { value: 2024, label: "2024" },
  { value: 2025, label: "2025" },
];

let wrapper: VueWrapper | undefined;

function mountSelect(modelValue: string | number = "") {
  wrapper = mount(DiscListSelect, {
    props: { id: "test-select", ariaLabel: "Año", modelValue, options },
    attachTo: document.body,
  });
  return wrapper;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe("DiscListSelect", () => {
  it("exposes the combobox pattern and shows the selected label", () => {
    const w = mountSelect(2024);
    const trigger = w.get("#test-select");
    expect(trigger.attributes("role")).toBe("combobox");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(trigger.attributes("aria-controls")).toBe("test-select-listbox");
    expect(trigger.text()).toBe("2024");
  });

  it("marks the applied option with a green check and announces it", async () => {
    wrapper = mount(DiscListSelect, {
      props: {
        id: "test-select",
        ariaLabel: "Mis filtros",
        modelValue: "a",
        options: [
          { value: "", label: "Sin filtros activos" },
          { value: "a", label: "Filtro - Metal", applied: true },
        ],
      },
      attachTo: document.body,
    });
    const trigger = wrapper.get("#test-select");
    expect(trigger.text()).toBe("Filtro - Metal · aplicado");
    expect(trigger.find(".fa-check.text-green-600").exists()).toBe(true);
    expect(wrapper.find('#test-select-listbox [data-value="a"] .fa-check.text-green-600').exists()).toBe(true);
    expect(wrapper.find('#test-select-listbox [data-value=""] .fa-check.text-green-600').exists()).toBe(false);
  });

  it("chooses an option with the mouse and emits it as text", async () => {
    const w = mountSelect();
    await w.get("#test-select").trigger("click");
    expect(w.get("#test-select").attributes("aria-expanded")).toBe("true");
    await w.get('#test-select-listbox [data-value="2025"]').trigger("click");
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual(["2025"]);
    expect(w.get("#test-select").attributes("aria-expanded")).toBe("false");
  });

  it("supports the keyboard: arrows, Enter and Escape", async () => {
    const w = mountSelect();
    const trigger = w.get("#test-select");
    await trigger.trigger("keydown", { key: "ArrowDown" });
    expect(trigger.attributes("aria-expanded")).toBe("true");
    await trigger.trigger("keydown", { key: "ArrowDown" });
    expect(trigger.attributes("aria-activedescendant")).toBe("test-select-option-2024");
    await trigger.trigger("keydown", { key: "Enter" });
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual(["2024"]);

    await trigger.trigger("keydown", { key: "ArrowDown" });
    await trigger.trigger("keydown", { key: "Escape" });
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(w.emitted("update:modelValue")).toHaveLength(1);
  });

  it("collapses when clicking outside but stays open when clicking inside", async () => {
    const w = mountSelect();
    await w.get("#test-select").trigger("click");
    w.get("#test-select-listbox").element.dispatchEvent(
      new Event("pointerdown", { bubbles: true })
    );
    await w.vm.$nextTick();
    expect(w.get("#test-select").attributes("aria-expanded")).toBe("true");

    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await w.vm.$nextTick();
    expect(w.get("#test-select").attributes("aria-expanded")).toBe("false");
  });
});
