// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const { login, push } = vi.hoisted(() => ({
  login: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/modules/identity/auth/stores/auth", () => ({
  useAuthStore: () => ({ login }),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

import { SessionAuthError } from "@/modules/identity/auth/api/sessionAuth";
import LoginPage from "./LoginView.vue";

describe("LoginPage", () => {
  beforeEach(() => {
    login.mockReset();
    push.mockReset();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1)
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the credential form and submits credentials before navigating home", async () => {
    login.mockResolvedValue(undefined);
    const wrapper = mount(LoginPage);

    expect(wrapper.find("form").exists()).toBe(true);
    await wrapper.get('input[placeholder="Usuario"]').setValue("Mara");
    await wrapper.get('input[placeholder="Contraseña"]').setValue("secret");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(login).toHaveBeenCalledWith({ username: "Mara", password: "secret" });
    expect(push).toHaveBeenCalledWith({ name: "Home" });
    wrapper.unmount();
  });

  it("shows the loading state while authentication is pending", async () => {
    let resolveLogin!: () => void;
    login.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        })
    );
    const wrapper = mount(LoginPage);

    await wrapper.get('input[placeholder="Usuario"]').setValue("Mara");
    await wrapper.get('input[placeholder="Contraseña"]').setValue("secret");
    await wrapper.get("form").trigger("submit");

    expect(wrapper.get('button[type="submit"]').text()).toContain("Accediendo...");
    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeDefined();

    resolveLogin();
    await flushPromises();
    wrapper.unmount();
  });

  it("shows the existing invalid-credentials message and stays on login", async () => {
    login.mockRejectedValue(new SessionAuthError("Invalid credentials", "unauthenticated", 401));
    const wrapper = mount(LoginPage);

    await wrapper.get('input[placeholder="Usuario"]').setValue("Mara");
    await wrapper.get('input[placeholder="Contraseña"]').setValue("wrong");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Usuario o contraseña incorrectos.");
    expect(push).not.toHaveBeenCalled();
    expect(wrapper.get('button[type="submit"]').text()).toContain("Login");
    wrapper.unmount();
  });

  it("labels credentials and restores focus after the access dialog closes with Escape", async () => {
    const wrapper = mount(LoginPage, { attachTo: document.body });
    const username = wrapper.get("#login-username").element as HTMLInputElement;
    const password = wrapper.get("#login-password").element as HTMLInputElement;
    expect(document.querySelector('label[for="login-username"]')?.control).toBe(username);
    expect(document.querySelector('label[for="login-password"]')?.control).toBe(password);

    const requestButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Solicita acceso a Riff Valley app"));
    expect(requestButton).toBeDefined();
    requestButton!.element.focus();
    await requestButton!.trigger("click");
    await wrapper.vm.$nextTick();

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(document.querySelector('button[aria-label="Cerrar"]'));
    expect(document.querySelector('label[for="access-request-email"]')?.control).toBe(
      document.querySelector("#access-request-email")
    );
    expect(document.querySelector('label[for="access-request-alias"]')?.control).toBe(
      document.querySelector("#access-request-alias")
    );

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true })
    );
    expect(document.activeElement).toBe(dialog?.querySelector('button[type="submit"]'));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(dialog?.querySelector('button[aria-label="Cerrar"]'));

    username.focus();
    expect(document.activeElement).toBe(dialog?.querySelector('button[aria-label="Cerrar"]'));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(requestButton!.element);
    wrapper.unmount();
  });
});
