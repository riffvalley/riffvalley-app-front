// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import UserNotesDialog from "./UserNotesDialog.vue";

describe("UserNotesDialog", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the selected username and notes field with its initial value", () => {
    const wrapper = mount(UserNotesDialog, {
      props: { open: true, username: "Amy", modelValue: "Existing note" },
    });

    expect(document.body.textContent).toContain("Usuario: Amy");
    expect(document.body.querySelector<HTMLTextAreaElement>("textarea")?.value).toBe("Existing note");
    expect(document.body.querySelector<HTMLTextAreaElement>("textarea")?.placeholder).toBe("Escribe notas sobre este usuario...");
    wrapper.unmount();
  });

  it("emits edited notes, confirmation and cancel or overlay close interactions", async () => {
    const wrapper = mount(UserNotesDialog, {
      props: { open: true, username: "Amy", modelValue: "" },
    });

    const textarea = document.body.querySelector<HTMLTextAreaElement>("textarea");
    if (!textarea) throw new Error("Missing notes field");
    textarea.value = "Internal note";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("update:modelValue")).toEqual([["Internal note"]]);

    document.body.querySelector<HTMLButtonElement>(".modal-btn-primary")?.click();
    expect(wrapper.emitted("submit")).toHaveLength(1);
    document.body.querySelector<HTMLButtonElement>(".modal-btn-cancel")?.click();
    expect(wrapper.emitted("close")).toHaveLength(1);

    document.body.querySelector<HTMLElement>(".modal-overlay")?.click();
    expect(wrapper.emitted("close")).toHaveLength(2);
    wrapper.unmount();
  });
});
