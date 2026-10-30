// @vitest-environment happy-dom
import { defineComponent } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SidebarMenu from "./SidebarMenu.vue";
import { useAuthStore } from "@/modules/identity/auth";
import { useDashboardPreferences } from "@/modules/identity/account";
import { useSupportStore } from "@stores/support/support";
import type { UserRole } from "@/modules/identity/shared";
import router from "@/router";

const { getSidebarSummary } = vi.hoisted(() => ({ getSidebarSummary: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: { get: getSidebarSummary } }));

const RouterLinkStub = defineComponent({
  props: { to: { type: [String, Object], required: true } },
  template: '<a :data-to="to"><slot /></a>',
});

describe("import options in sidebar", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    getSidebarSummary.mockReset().mockResolvedValue({ data: { version: { latest: "1.8.4" } } });
  });

  async function renderAs(role: UserRole, useRealRouterLink = false) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore();
    authStore.token = "test-token";
    authStore.authStatus = "authenticated";
    authStore.userId = "user-1";
    authStore.role = role;
    useDashboardPreferences().dashboardButtonsEnabled = false;
    getSidebarSummary.mockResolvedValue({
      data: {
        version: { latest: "1.8.4" },
        ...(role === "riffvalley" || role === "superadmin" ? { petitions: { pending: 4 } } : {}),
        ...(role === "superadmin" ? { suggestions: { inProgressIds: ["read-id", "unread-a", "unread-b"] } } : {}),
      },
    });
    if (role === "superadmin") useSupportStore().markAsRead("read-id");

    if (useRealRouterLink) await router.push("/calendar");

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = mount(SidebarMenu, {
      props: { menuVisible: true, isDark: false },
      global: {
        plugins: [pinia, [VueQueryPlugin, { queryClient }], ...(useRealRouterLink ? [router] : [])],
        ...(useRealRouterLink ? {} : { stubs: { "router-link": RouterLinkStub } }),
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

  it("offers one administrative entry for the three usage statistics tabs", async () => {
    const wrapper = await renderAs("superadmin");

    const entry = wrapper.findAll('[data-to="/users/stats"]');
    expect(entry).toHaveLength(1);
    expect(entry[0]?.text()).toContain("Estadísticas de uso");
    expect(wrapper.find('[data-to="/users/inactivity"]').exists()).toBe(false);
    expect(wrapper.find('[data-to="/users/activity"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("shows neither import option to user", async () => {
    const wrapper = await renderAs("user");

    expect(wrapper.find('[data-to="/import"]').exists()).toBe(false);
    expect(wrapper.find('[data-to="/import-discs"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it.each(["user", "collaborator", "riffvalley", "superadmin"] as const)(
    "shows exactly one canonical calendar entry for %s",
    async (role) => {
      const wrapper = await renderAs(role);
      const entries = wrapper.findAll('[data-to="/calendar"]');
      expect(entries).toHaveLength(1);
      expect(entries[0]?.text()).toContain("Calendario");
      expect(wrapper.find('[data-to="/calendar-baby"]').exists()).toBe(false);
      wrapper.unmount();
    },
  );

  it("marks the canonical calendar entry active at /calendar", async () => {
    const wrapper = await renderAs("user", true);
    const entry = wrapper.find('a[href="/calendar"]');
    expect(entry.exists()).toBe(true);
    expect(entry.classes()).toContain("bg-gradient-to-r");
    wrapper.unmount();
  });

  it("shows only summary fields authorized for the role and subtracts locally read suggestions", async () => {
    const riffvalley = await renderAs("riffvalley");
    expect(riffvalley.find('[data-to="/admin/disc-requests"]').text()).toContain("4");
    expect(riffvalley.find('[data-to="/admin/feedback"] .bg-red-500').exists()).toBe(false);
    riffvalley.unmount();

    const superadmin = await renderAs("superadmin");
    expect(superadmin.find('[data-to="/admin/disc-requests"]').text()).toContain("4");
    expect(superadmin.find('[data-to="/admin/feedback"]').text()).toContain("2");
    expect(superadmin.find('[data-to="/patch-notes"]').text()).toContain("version 1.8.4");
    superadmin.unmount();
  });

  it("does not treat omitted private fields as authorized zero counts", async () => {
    const wrapper = await renderAs("user");

    expect(wrapper.find('[data-to="/admin/disc-requests"]').exists()).toBe(false);
    expect(wrapper.find('[data-to="/admin/feedback"] .bg-red-500').exists()).toBe(false);
    wrapper.unmount();
  });

  it("uses canonical Requests and Feedback destinations with clear labels", async () => {
    const user = await renderAs("user");
    expect(user.find('[data-to="/disc-requests"]').text()).toContain("Solicitar discos");
    expect(user.find('[data-to="/feedback"]').text()).toContain("Feedback");
    expect(user.find('[data-to="/suggest"]').exists()).toBe(false);
    expect(user.find('[data-to="/suggestions"]').exists()).toBe(false);
    user.unmount();

    const riffvalley = await renderAs("riffvalley");
    expect(riffvalley.find('[data-to="/admin/disc-requests"]').text()).toContain("Solicitudes de discos");
    expect(riffvalley.find('[data-to="/petitions"]').exists()).toBe(false);
    riffvalley.unmount();
  });
});
