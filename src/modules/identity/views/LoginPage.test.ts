// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const { login, push } = vi.hoisted(() => ({
  login: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/modules/identity/stores/auth", () => ({
  useAuthStore: () => ({ login }),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

import { SessionAuthError } from "@/modules/identity/api/sessionAuth";
import LoginPage from "./LoginPage.vue";

describe("LoginPage", () => {
  beforeEach(() => {
    login.mockReset();
    push.mockReset();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
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
    login.mockImplementation(() => new Promise<void>((resolve) => { resolveLogin = resolve; }));
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
});
