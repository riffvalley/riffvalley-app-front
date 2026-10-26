// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PasswordChange from "./PasswordChangeView.vue";

const mocks = vi.hoisted(() => ({
  updateUserStore: vi.fn(),
  setImage: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  preferences: {
    dashboardButtonsEnabled: false,
    setDashboardButtonsEnabled: vi.fn(),
  },
}));

vi.mock("@stores/user/users", () => ({
  useUserStore: () => ({ updateUserStore: mocks.updateUserStore }),
}));

vi.mock("@/modules/identity/auth", () => ({
  useAuthStore: () => ({
    role: "riffvalley",
    avatarUrl: "/avatar/avatar1.png",
    setImage: mocks.setImage,
  }),
}));

vi.mock("@/modules/identity/account/preferences/composables/useDashboardPreferences", () => ({
  useDashboardPreferences: () => mocks.preferences,
}));

vi.mock("@services/swal/SwalService", () => ({
  default: { success: mocks.success, error: mocks.error },
}));

async function mountPasswordChange() {
  const wrapper = mount(PasswordChange, {
    attachTo: document.body,
    global: { stubs: { DashboardBuilder: true, Teleport: true, Transition: false } },
  });
  await wrapper.vm.$nextTick();
  return wrapper;
}

describe("Identity password and profile page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateUserStore.mockResolvedValue(undefined);
    mocks.preferences.dashboardButtonsEnabled = false;
    localStorage.clear();
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("validates password and confirmation before updating the account", async () => {
    const wrapper = await mountPasswordChange();

    expect(document.querySelector('label[for="password"]')?.control).toBe(
      wrapper.get("#password").element
    );
    expect(document.querySelector('label[for="confirmPassword"]')?.control).toBe(
      wrapper.get("#confirmPassword").element
    );

    await wrapper.find("#password").setValue("STRONG1");
    await wrapper.find("#confirmPassword").setValue("STRONG1");
    const requirements = wrapper.findAll("form ul li");
    expect(requirements.map((requirement) => requirement.text().trim())).toEqual([
      "Mínimo 6 caracteres",
      "Al menos una mayúscula",
      "Al menos una minúscula",
      "Al menos un número",
    ]);
    expect(requirements[2].classes()).toContain("text-red-500");
    await wrapper.find("form").trigger("submit");
    expect(mocks.updateUserStore).not.toHaveBeenCalled();

    await wrapper.find("#password").setValue("weak");
    await wrapper.find("#confirmPassword").setValue("different");
    await wrapper.find("form").trigger("submit");
    expect(wrapper.text()).toContain("Las contraseñas no coinciden");
    expect(mocks.updateUserStore).not.toHaveBeenCalled();

    await wrapper.find("#password").setValue("Strong1");
    await wrapper.find("#confirmPassword").setValue("Strong1");
    expect(
      wrapper
        .findAll("form ul li")
        .every((requirement) => requirement.classes().includes("text-green-600"))
    ).toBe(true);
    await wrapper.find("form").trigger("submit");
    expect(mocks.updateUserStore).toHaveBeenCalledWith({ password: "Strong1" });
    expect(mocks.success).toHaveBeenCalledWith("Contraseña cambiada correctamente");
    expect((wrapper.find("#password").element as HTMLInputElement).value).toBe("");
    wrapper.unmount();
  });

  it("opens the dashboard dialog with focus, closes on Escape, and restores focus", async () => {
    const wrapper = await mountPasswordChange();
    const openButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Personalizar"));
    expect(openButton).toBeDefined();
    openButton!.element.focus();
    await openButton!.trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[role="dialog"]').attributes("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(wrapper.get('[role="dialog"] button').element);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wrapper.vm.$nextTick();
    await vi.waitFor(() => expect(wrapper.find('[role="dialog"]').exists()).toBe(false));
    expect(document.activeElement).toBe(openButton!.element);
    wrapper.unmount();
  });

  it("saves the selected avatar through the existing profile update flow", async () => {
    const wrapper = await mountPasswordChange();
    const saveAvatar = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Guardar avatar"));
    await saveAvatar?.trigger("click");

    expect(mocks.updateUserStore).toHaveBeenCalledWith({ image: "/avatar/avatar1.png" });
    expect(mocks.setImage).toHaveBeenCalledWith("/avatar/avatar1.png");
    expect(mocks.success).toHaveBeenCalledWith("Avatar actualizado correctamente");
    wrapper.unmount();
  });

  it("keeps dashboard button preferences separate and reports update failures", async () => {
    mocks.updateUserStore.mockRejectedValueOnce({
      response: { data: { message: "Falló el guardado" } },
    });
    const wrapper = await mountPasswordChange();
    const toggle = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Activar botones del menú"));
    await toggle?.trigger("click");

    expect(mocks.updateUserStore).toHaveBeenCalledWith({ dashboardButtonsEnabled: true });
    expect(mocks.preferences.setDashboardButtonsEnabled).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith("Falló el guardado");
    wrapper.unmount();
  });
});
