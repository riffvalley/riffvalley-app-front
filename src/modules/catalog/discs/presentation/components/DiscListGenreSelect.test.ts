// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import DiscListGenreSelect from "./DiscListGenreSelect.vue";

const options = [
  { id: "genre-a", name: "Black Metal", color: "#123456" },
  { id: "genre-b", name: "Death Metal", color: "#654321" },
];

describe("DiscListGenreSelect", () => {
  it("supports keyboard search, multi-selection, and individual deselection", async () => {
    const wrapper = mount(DiscListGenreSelect, {
      attachTo: document.body,
      props: { modelValue: [], options },
    });
    const trigger = wrapper.get("button");
    expect(trigger.text()).toContain("Todos los géneros");
    await trigger.trigger("keydown", { key: "ArrowDown" });
    await flushPromises();

    const input = wrapper.get('input[role="combobox"]');
    expect(document.activeElement).toBe(input.element);
    await input.setValue("death");
    await input.trigger("keydown", { key: "ArrowDown" });
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")).toEqual([[["genre-b"]]]);

    await input.setValue("");
    await flushPromises();
    await input.trigger("keydown", { key: "Enter" });
    const selected = wrapper.emitted("update:modelValue")?.at(-1)?.[0] as string[];
    expect(selected).toEqual(["genre-a"]);
    await wrapper.setProps({ modelValue: selected });
    await input.setValue("black");
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")?.at(-1)?.[0]).toEqual([]);
    expect(wrapper.get('[role="listbox"]').attributes("aria-multiselectable")).toBe("true");
    wrapper.unmount();
  });

  it("shows loading and empty option states without hiding the no-filter meaning", async () => {
    const wrapper = mount(DiscListGenreSelect, {
      props: { modelValue: [], options: [], loading: true },
    });
    expect(wrapper.text()).toContain("Todos los géneros");
    await wrapper.get("button").trigger("click");
    expect(wrapper.text()).toContain("Cargando géneros...");
    expect(wrapper.text()).toContain("No se aplicará filtro de género");
  });

  it("keeps a seven-genre selection on a fixed-height single-line trigger", () => {
    const wrapper = mount(DiscListGenreSelect, {
      props: { modelValue: Array.from({ length: 7 }, (_, index) => `genre-${index}`), options },
    });
    const trigger = wrapper.get("button");
    expect(trigger.text()).toContain("7 géneros seleccionados");
    expect(trigger.classes()).toContain("h-11");
    expect(trigger.classes()).toContain("whitespace-nowrap");
  });
});
