// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const mocks = vi.hoisted(() => ({ resetPassword: vi.fn(), login: vi.fn() }));
vi.mock("./api/passwordRecovery", () => ({ resetPassword: mocks.resetPassword }));
vi.mock("@/modules/identity/auth", () => ({
  useAuthStore: () => ({ login: mocks.login }),
}));

import ResetPasswordView from "./ResetPasswordView.vue";

function setResetUrl(hash: string): void {
  window.history.replaceState(null, "", `/reset-password${hash}`);
}

function mountResetPassword() {
  return mount(ResetPasswordView, {
    global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
  });
}

describe("ResetPasswordView", () => {
  beforeEach(() => {
    mocks.resetPassword.mockReset();
    mocks.login.mockReset();
    localStorage.clear();
    sessionStorage.clear();
    setResetUrl("#token=one-time-token");
  });

  afterEach(() => {
    setResetUrl("");
    vi.restoreAllMocks();
  });

  it("captures and immediately removes the fragment without adding a history entry", async () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const wrapper = mountResetPassword();

    expect(window.location.hash).toBe("");
    expect(pushState).not.toHaveBeenCalled();
    expect(wrapper.get("#reset-password-new").attributes("autocomplete")).toBe("new-password");
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    wrapper.unmount();
  });

  it("validates policy and confirmation before making the reset request", async () => {
    const wrapper = mountResetPassword();
    await wrapper.get("#reset-password-new").setValue("short");
    await wrapper.get("#reset-password-confirmation").setValue("different");
    await wrapper.get("form").trigger("submit");
    expect(wrapper.get('[role="alert"]').text()).toContain("al menos 6 caracteres");
    expect(mocks.resetPassword).not.toHaveBeenCalled();

    await wrapper.get("#reset-password-new").setValue("Strong!");
    await wrapper.get("#reset-password-confirmation").setValue("Strong?");
    await wrapper.get("form").trigger("submit");
    expect(wrapper.get('[role="alert"]').text()).toContain("no coinciden");
    expect(mocks.resetPassword).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("allows showing both passwords and clears sensitive values after 204 without logging in", async () => {
    mocks.resetPassword.mockResolvedValue(undefined);
    const wrapper = mountResetPassword();
    await wrapper.get("#reset-password-new").setValue("Strong!");
    await wrapper.get("#reset-password-confirmation").setValue("Strong!");
    await wrapper.get('button[aria-label="Mostrar contraseña"]').trigger("click");
    await wrapper.get('button[aria-label="Mostrar confirmación"]').trigger("click");
    expect(wrapper.get("#reset-password-new").attributes("type")).toBe("text");
    expect(wrapper.get("#reset-password-confirmation").attributes("type")).toBe("text");

    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(mocks.resetPassword).toHaveBeenCalledWith({
      token: "one-time-token",
      password: "Strong!",
    });
    expect(wrapper.get('[role="status"]').text()).toContain("La recuperación se ha completado");
    const state = wrapper.vm.$.setupState as {
      password: string;
      confirmation: string;
      token: string | null;
    };
    expect(state.password).toBe("");
    expect(state.confirmation).toBe("");
    expect(state.token).toBeNull();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(mocks.login).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("prevents duplicate reset requests while a submission is pending", async () => {
    let resolveReset!: () => void;
    mocks.resetPassword.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveReset = resolve;
      })
    );
    const wrapper = mountResetPassword();
    await wrapper.get("#reset-password-new").setValue("Strong1");
    await wrapper.get("#reset-password-confirmation").setValue("Strong1");

    await wrapper.get("form").trigger("submit");
    await wrapper.get("form").trigger("submit");

    expect(mocks.resetPassword).toHaveBeenCalledTimes(1);
    expect(wrapper.get('button[type="submit"]').text()).toContain("Actualizando");
    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeDefined();
    resolveReset();
    await flushPromises();
    wrapper.unmount();
  });

  it.each([
    [{ response: { status: 429 } }, "demasiados intentos"],
    [{ response: { status: 503 } }, "no está disponible temporalmente"],
    [new TypeError("offline"), "Comprueba tu conexión"],
  ])("shows a retryable message for service and network failures", async (failure, message) => {
    mocks.resetPassword.mockRejectedValue(failure);
    const wrapper = mountResetPassword();
    await wrapper.get("#reset-password-new").setValue("Strong1");
    await wrapper.get("#reset-password-confirmation").setValue("Strong1");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain(message);
    expect(wrapper.text()).not.toContain("invalid token");
    expect(wrapper.find("form").exists()).toBe(true);
    wrapper.unmount();
  });

  it("uses the same generic message for rejected, expired, or consumed token errors", async () => {
    mocks.resetPassword.mockRejectedValue({
      response: { status: 400, data: { message: "invalid token" } },
    });
    const wrapper = mountResetPassword();
    await wrapper.get("#reset-password-new").setValue("Strong1");
    await wrapper.get("#reset-password-confirmation").setValue("Strong1");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe(
      "El enlace no es válido, ha caducado o ya se ha utilizado. Solicita uno nuevo para continuar."
    );
    expect(wrapper.text()).not.toContain("invalid token");
    wrapper.unmount();
  });

  it("does not offer a reset form when the token is missing", () => {
    setResetUrl("");
    const wrapper = mountResetPassword();

    expect(wrapper.find("form").exists()).toBe(false);
    expect(wrapper.get('[role="alert"]').text()).toContain("El enlace no es válido, ha caducado");
    expect(mocks.resetPassword).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
