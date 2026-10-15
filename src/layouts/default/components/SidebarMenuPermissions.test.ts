// @vitest-environment happy-dom
import { defineComponent } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SidebarMenu from "./SidebarMenu.vue";
import { useAuthStore } from "@stores/auth/auth";
import type { UserRole } from "@interfaces/auth";

vi.mock("@services/versions/versions", () => ({
  getLatestPublicVersion: vi.fn().mockResolvedValue(null),
}));
vi.mock("@services/requests/requests", () => ({
  getAllRequests: vi.fn().mockResolvedValue([]),
}));
vi.mock("@services/suggestions/suggestions", () => ({
  getSuggestions: vi.fn().mockResolvedValue([]),
}));

const RouterLinkStub = defineComponent({
  props: { to: { type: [String, Object], required: true } },
  template: '<a :data-to="to"><slot /></a>',
});

describe("import options in sidebar", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  async function renderAs(role: UserRole) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore();
    authStore.token = "test-token";
    authStore.role = role;
    authStore.dashboardButtonsEnabled = false;

    const wrapper = mount(SidebarMenu, {
      props: { menuVisible: true, isDark: false },
      global: {
        plugins: [pinia],
        stubs: { "router-link": RouterLinkStub },
      },
    });
    await flushPromises();
    return wrapper;
  }

  it("shows Excel but not Manual to riffvalley", async () => {
    const wrapper = await renderAs("riffvalley");

    expect(wrapper.find('[data-to="/import"]').exists()).toBe(false);
    expect(wrapper.find('[data-to="/import-discs"]').text()).toContain(
      "Importar Discos",
    );
    wrapper.unmount();
  });

  it("shows both authorized options to superadmin", async () => {
    const wrapper = await renderAs("superadmin");

    expect(wrapper.find('[data-to="/import"]').text()).toContain(
      "Añadir Discos",
    );
    expect(wrapper.find('[data-to="/import-discs"]').text()).toContain(
      "Importar Discos",
    );
    wrapper.unmount();
  });

  it("shows neither import option to user", async () => {
    const wrapper = await renderAs("user");

    expect(wrapper.find('[data-to="/import"]').exists()).toBe(false);
    expect(wrapper.find('[data-to="/import-discs"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
