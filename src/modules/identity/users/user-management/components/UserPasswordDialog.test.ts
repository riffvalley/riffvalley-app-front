// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import UserPasswordDialog from "./UserPasswordDialog.vue";

describe("UserPasswordDialog", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the selected username, password field and existing validation", () => {
    const wrapper = mount(UserPasswordDialog, {
      props: {
        open: true,
        username: "Zed",
        modelValue: "short",
        passwordVisible: false,
        validationError: "Mínimo 6 caracteres",
      },
    });

    expect(document.body.textContent).toContain("Usuario: Zed");
    expect(document.body.querySelector<HTMLInputElement>("input")?.placeholder).toBe("Mínimo 6 caracteres");
    expect(document.body.querySelector<HTMLInputElement>("input")?.type).toBe("password");
    expect(document.body.textContent).toContain("Mínimo 6 caracteres");
    expect(document.body.querySelector<HTMLButtonElement>(".modal-btn-primary")?.disabled).toBe(true);
    wrapper.unmount();
  });

  it("emits edited values, visibility, confirmation and close interactions", async () => {
    const wrapper = mount(UserPasswordDialog, {
      props: {
        open: true,
        username: "Zed",
        modelValue: "",
        passwordVisible: false,
        validationError: "",
      },
    });

    const input = document.body.querySelector<HTMLInputElement>("input");
    if (!input) throw new Error("Missing password input");
    input.value = "Admin123";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("update:modelValue")).toEqual([["Admin123"]]);

    document.body.querySelector<HTMLButtonElement>(".relative button")?.click();
    expect(wrapper.emitted("update:passwordVisible")).toEqual([[true]]);

    document.body.querySelector<HTMLButtonElement>(".modal-btn-primary")?.click();
    expect(wrapper.emitted("submit")).toHaveLength(1);
    document.body.querySelector<HTMLButtonElement>(".modal-btn-cancel")?.click();
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
  });

  it("closes when the overlay itself is clicked", async () => {
    const wrapper = mount(UserPasswordDialog, {
      props: {
        open: true,
        modelValue: "",
        passwordVisible: false,
        validationError: "",
      },
    });

    document.body.querySelector<HTMLElement>(".modal-overlay")?.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
  });

  it("exposes a named modal, labelled password control and keyboard focus behavior", async () => {
    const wrapper = mount(UserPasswordDialog, {
      props: { open: true, username: "Amy", modelValue: "", passwordVisible: false, validationError: "" },
    });
    await nextTick();
    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    const password = document.body.querySelector<HTMLInputElement>("#change-user-password");
    if (!dialog || !password) throw new Error("Missing password dialog controls");
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));

    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("change-user-password-dialog-title");
    expect(document.body.querySelector<HTMLLabelElement>('label[for="change-user-password"]')?.control).toBe(password);
    expect(document.body.querySelector<HTMLButtonElement>(".modal-close")?.getAttribute("aria-label")).toBe("Cerrar diálogo de cambio de contraseña");
    expect(document.body.querySelector<HTMLButtonElement>(".relative button")?.getAttribute("aria-label")).toBe("Mostrar contraseña");
    expect(password).toBe(document.activeElement);

    focusable.at(-1)?.focus();
    const forwardTab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    focusable.at(-1)?.dispatchEvent(forwardTab);
    expect(forwardTab.defaultPrevented).toBe(true);
    expect(focusable[0]).toBe(document.activeElement);
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
  });
});
