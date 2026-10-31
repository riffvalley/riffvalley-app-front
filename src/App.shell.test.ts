// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

const {
  getCatalog,
  getSidebarSummary,
} = vi.hoisted(() => ({
  getCatalog: vi.fn().mockResolvedValue({ genres: [], countries: [] }),
  getSidebarSummary: vi.fn().mockResolvedValue({
    data: {
      version: { latest: "1.8.4" },
      petitions: { pending: 0 },
      suggestions: { inProgressIds: [] },
    },
  }),
}));

vi.mock("@services/catalog/catalog", () => ({ getCatalog }));
vi.mock("@services/api/api", () => ({ default: { get: getSidebarSummary } }));

import App from "./App.vue";
import router from "@/router";
import { useAuthStore } from "@/modules/identity/auth";
import SidebarMenu from "@/layouts/default/components/SidebarMenu.vue";

describe("App shell composition", () => {
  let pinia: ReturnType<typeof createPinia>;
  let scrollTo: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.removeAttribute("style");
    pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore(pinia).$patch({
      token: "test-token",
      userId: "user-1",
      username: "Test User",
      role: "superadmin",
      authStatus: "authenticated",
      sessionMode: "renewable",
    });
    getCatalog.mockClear();
    getSidebarSummary.mockClear();
    scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    await router.push("/");
  });

  afterEach(() => {
    document.body.removeAttribute("style");
    scrollTo.mockRestore();
  });

  function mountApp() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return mount(App, {
      global: {
        plugins: [pinia, router, [VueQueryPlugin, { queryClient }]],
        stubs: { RouterView: true },
      },
    });
  }

  it("mounts one sidebar and requests its summary once on an ordinary route", async () => {
    const wrapper = mountApp();
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("Home");
    expect(wrapper.findAllComponents(SidebarMenu)).toHaveLength(1);
    expect(getSidebarSummary).toHaveBeenCalledTimes(1);
    expect(getSidebarSummary).toHaveBeenCalledWith("/app/sidebar-summary", expect.objectContaining({ signal: expect.any(AbortSignal) }));

    wrapper.unmount();
  });

  it("keeps the standalone public route outside the main shell", async () => {
    await router.push("/national-releases/form");
    const wrapper = mountApp();
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("NationalReleasePublic");
    expect(wrapper.findAllComponents(SidebarMenu)).toHaveLength(0);
    expect(wrapper.find("button.menu-hamburguesa").exists()).toBe(false);

    wrapper.unmount();
  });

  it("keeps password recovery pages visible when session initialization fails", async () => {
    const authStore = useAuthStore(pinia);
    authStore.$patch({ authStatus: "error", authInitializationError: "unavailable" });
    const initializeAuth = vi.spyOn(authStore, "initializeAuth").mockResolvedValue("error");

    for (const path of ["/forgot-password", "/reset-password"]) {
      await router.push(path);
      const wrapper = mountApp();
      await flushPromises();

      expect(wrapper.text()).not.toContain("No hemos podido recuperar tu sesión");
      expect(wrapper.findComponent({ name: "RouterView" }).exists()).toBe(true);

      wrapper.unmount();
    }

    initializeAuth.mockRestore();
  });

  it("uses one overlay and releases the scroll lock when the menu closes", async () => {
    const wrapper = mountApp();
    await flushPromises();

    await wrapper.get("button.menu-hamburguesa").trigger("click");

    expect(wrapper.findAllComponents(SidebarMenu)).toHaveLength(1);
    expect(wrapper.findComponent(SidebarMenu).props("menuVisible")).toBe(true);
    expect(wrapper.findAll(".overlay")).toHaveLength(1);
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.overflow).toBe("hidden");

    await wrapper.get(".overlay").trigger("click");

    expect(wrapper.findAll(".overlay")).toHaveLength(0);
    expect(wrapper.findComponent(SidebarMenu).props("menuVisible")).toBe(false);
    expect(document.body.style.position).toBe("");
    expect(document.body.style.overflow).toBe("");
    expect(scrollTo).toHaveBeenCalledWith(0, 0);

    wrapper.unmount();
  });

  it("releases the scroll lock if the shell unmounts while the menu is open", async () => {
    const wrapper = mountApp();
    await flushPromises();
    await wrapper.get("button.menu-hamburguesa").trigger("click");

    wrapper.unmount();

    expect(document.body.style.position).toBe("");
    expect(document.body.style.overflow).toBe("");
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
