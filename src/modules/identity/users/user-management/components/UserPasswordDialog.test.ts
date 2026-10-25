// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
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

    document.body.querySelector<HTMLButtonElement>('button[type="button"]')?.click();
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
});
