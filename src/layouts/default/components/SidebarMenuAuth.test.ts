// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const { logout, errorNotification } = vi.hoisted(() => ({
  logout: vi.fn(),
  errorNotification: vi.fn(),
}));

vi.mock("@/modules/identity/auth/api/sessionAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/auth/api/sessionAuth")>();
  return { ...actual, sessionAuthTransport: { logout, login: vi.fn(), refresh: vi.fn() } };
});
vi.mock("@services/swal/SwalService", () => ({ default: { error: errorNotification } }));
vi.mock("@services/versions/versions", () => ({ getLatestPublicVersion: vi.fn() }));
vi.mock("@services/requests/requests", () => ({ getAllRequests: vi.fn() }));
vi.mock("@services/suggestions/suggestions", () => ({ getSuggestions: vi.fn() }));

import { useAuthStore } from "@/modules/identity/auth/stores/auth";
import { SessionAuthError } from "@/modules/identity/auth/api/sessionAuth";
import router from "/src/router";
import SidebarMenu from "./SidebarMenu.vue";

describe("SidebarMenu renewable logout", () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    logout.mockReset();
    errorNotification.mockReset();
    useAuthStore().$patch({
      token: "access-token",
      username: "Mara",
      userId: "42",
      role: "riffvalley",
      authStatus: "authenticated",
      sessionMode: "renewable",
    });
    await router.push("/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("navigates to Login after clearing locally and warns if backend revocation is unconfirmed", async () => {
    let finishLogout!: (error: SessionAuthError) => void;
    logout.mockReturnValue(new Promise((_resolve, reject) => { finishLogout = reject; }));
    const replace = vi.spyOn(router, "replace").mockResolvedValue(undefined);
    const wrapper = mount(SidebarMenu, {
      props: { menuVisible: true, isDark: false },
      global: { plugins: [router] },
    });

    const pendingLogout = wrapper.vm.handleLogout();
    expect(useAuthStore().authStatus).toBe("anonymous");
    expect(useAuthStore().token).toBeNull();
    await flushPromises();
    expect(replace).toHaveBeenCalledWith({ name: "Login" });

    finishLogout(new SessionAuthError("Unavailable", "unavailable", 503));
    await pendingLogout;
    expect(errorNotification).toHaveBeenCalledWith(
      "Cerraste la sesión en esta App, pero el servidor no confirmó la revocación. La sesión podría seguir activa.",
    );
    wrapper.unmount();
  });

  it("does not show a revocation warning after confirmed logout", async () => {
    logout.mockResolvedValue({ revocation: "confirmed" });
    vi.spyOn(router, "replace").mockResolvedValue(undefined);
    const wrapper = mount(SidebarMenu, {
      props: { menuVisible: true, isDark: false },
      global: { plugins: [router] },
    });

    await wrapper.vm.handleLogout();

    expect(errorNotification).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
