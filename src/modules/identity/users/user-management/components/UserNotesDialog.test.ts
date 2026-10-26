// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
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
    expect(document.body.querySelector<HTMLTextAreaElement>("textarea")?.value).toBe(
      "Existing note"
    );
    expect(document.body.querySelector<HTMLTextAreaElement>("textarea")?.placeholder).toBe(
      "Escribe notas sobre este usuario..."
    );
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

  it("exposes a named modal, labelled notes field and keyboard focus behavior", async () => {
    const wrapper = mount(UserNotesDialog, {
      props: { open: true, username: "Amy", modelValue: "" },
    });
    await nextTick();
    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    const notes = document.body.querySelector<HTMLTextAreaElement>("#user-notes");
    if (!dialog || !notes) throw new Error("Missing notes dialog controls");
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
    );

    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("user-notes-dialog-title");
    expect(document.body.querySelector<HTMLLabelElement>('label[for="user-notes"]')?.control).toBe(
      notes
    );
    expect(
      document.body.querySelector<HTMLButtonElement>(".modal-close")?.getAttribute("aria-label")
    ).toBe("Cerrar diálogo de notas");
    expect(notes).toBe(document.activeElement);

    focusable[0].focus();
    const backwardsTab = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    focusable[0].dispatchEvent(backwardsTab);
    expect(backwardsTab.defaultPrevented).toBe(true);
    expect(focusable.at(-1)).toBe(document.activeElement);
    dialog.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
    );
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
  });
});
