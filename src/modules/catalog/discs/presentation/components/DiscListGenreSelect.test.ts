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

  it("collapses when clicking outside but stays open when clicking inside", async () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const wrapper = mount(DiscListGenreSelect, {
      attachTo: document.body,
      props: { modelValue: [], options },
    });
    await wrapper.get("button").trigger("click");
    await flushPromises();

    wrapper.get('[role="option"]').element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await flushPromises();
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true);

    outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await flushPromises();
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("false");
    wrapper.unmount();
    outside.remove();
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

  it("in single mode replaces the genre, closes the list and offers «Todos los géneros» to clear it", async () => {
    const wrapper = mount(DiscListGenreSelect, {
      attachTo: document.body,
      props: { modelValue: ["genre-a"], options, multiple: false },
    });
    const trigger = wrapper.get("button");
    expect(trigger.text()).toBe("Black Metal");
    expect(trigger.attributes("aria-label")).toBe("Género: Black Metal");

    await trigger.trigger("click");
    await flushPromises();
    const listbox = wrapper.get('[role="listbox"]');
    expect(listbox.attributes("aria-multiselectable")).toBe("false");
    const optionTexts = wrapper.findAll('[role="option"]').map((option) => option.text());
    expect(optionTexts).toEqual(["Todos los géneros", "Black Metal", "Death Metal"]);

    await wrapper.findAll('[role="option"]')[2]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([["genre-b"]]);
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);

    await trigger.trigger("click");
    await flushPromises();
    await wrapper.findAll('[role="option"]')[0]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([[]]);
    wrapper.unmount();
  });

  it("keeps a seven-genre selection on a fixed-height single-line trigger", () => {
    const wrapper = mount(DiscListGenreSelect, {
      props: { modelValue: Array.from({ length: 7 }, (_, index) => `genre-${index}`), options },
    });
    const trigger = wrapper.get("button");
    expect(trigger.text()).toContain("7 géneros seleccionados");
    expect(trigger.classes()).toContain("h-[50px]");
    expect(trigger.classes()).toContain("whitespace-nowrap");
  });
});
