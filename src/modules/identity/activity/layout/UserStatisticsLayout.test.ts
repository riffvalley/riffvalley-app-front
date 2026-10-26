// @vitest-environment happy-dom
import { defineComponent, h, onMounted, onUnmounted } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { beforeEach, describe, expect, it } from "vitest";
import UserStatisticsLayout from "./UserStatisticsLayout.vue";

const mountedViews: string[] = [];
const unmountedViews: string[] = [];

function tabView(name: string) {
  return defineComponent({
    name,
    setup() {
      onMounted(() => mountedViews.push(name));
      onUnmounted(() => unmountedViews.push(name));
      return () => h("div", { "data-view": name }, name);
    },
  });
}

const app = defineComponent({ setup: () => () => h(RouterView) });

describe("UserStatisticsLayout", () => {
  beforeEach(() => {
    mountedViews.length = 0;
    unmountedViews.length = 0;
  });

  async function setup(path = "/users/stats") {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/users/stats",
          component: UserStatisticsLayout,
          children: [
            { path: "", name: "UserStats", component: tabView("General") },
            { path: "users", name: "UserStatsUsers", component: tabView("Usuarios") },
            { path: "inactivity", name: "UserStatsInactivity", component: tabView("Inactividad") },
          ],
        },
      ],
    });
    await router.push(path);
    await router.isReady();
    const wrapper = mount(app, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();
    return { router, wrapper };
  }

  it("renders one active view and synchronizes tab selection with the route", async () => {
    const { router, wrapper } = await setup();

    expect(wrapper.findAll('[role="tab"][aria-selected="true"]').map((tab) => tab.text())).toEqual([
      "General",
    ]);
    expect(wrapper.findAll("[data-view]").map((view) => view.text())).toEqual(["General"]);
    expect(mountedViews).toEqual(["General"]);

    await wrapper
      .findAll('[role="tab"]')
      .find((tab) => tab.text() === "Usuarios")!
      .trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/users/stats/users");
    expect(wrapper.findAll('[role="tab"][aria-selected="true"]').map((tab) => tab.text())).toEqual([
      "Usuarios",
    ]);
    expect(wrapper.findAll("[data-view]").map((view) => view.text())).toEqual(["Usuarios"]);
    expect(unmountedViews).toEqual(["General"]);

    await wrapper
      .findAll('[role="tab"]')
      .find((tab) => tab.text() === "Inactividad")!
      .trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("UserStatsInactivity");
    expect(wrapper.findAll("[data-view]").map((view) => view.text())).toEqual(["Inactividad"]);
    expect(mountedViews).toEqual(["General", "Usuarios", "Inactividad"]);
    expect(unmountedViews).toEqual(["General", "Usuarios"]);

    wrapper.unmount();
  });

  it.each([
    ["/users/stats", "General", "UserStats"],
    ["/users/stats/users", "Usuarios", "UserStatsUsers"],
    ["/users/stats/inactivity", "Inactividad", "UserStatsInactivity"],
  ])("opens %s directly on the %s tab", async (path, label, routeName) => {
    const { router, wrapper } = await setup(path);

    expect(router.currentRoute.value.name).toBe(routeName);
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe(label);
    expect(wrapper.findAll("[data-view]").map((view) => view.text())).toEqual([label]);

    wrapper.unmount();
  });

  it("supports tab arrow-key navigation and preserves user selection query", async () => {
    const { router, wrapper } = await setup("/users/stats/users?userId=member-1");
    const usersTab = wrapper.find('[role="tab"][aria-selected="true"]');

    await usersTab.trigger("keydown", { key: "ArrowRight" });
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("UserStatsInactivity");
    expect(router.currentRoute.value.query.userId).toBe("member-1");
    expect(document.activeElement?.id).toBe("usage-tab-inactivity");

    await wrapper
      .find('[role="tab"][aria-selected="true"]')
      .trigger("keydown", { key: "ArrowLeft" });
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("UserStatsUsers");
    expect(router.currentRoute.value.query.userId).toBe("member-1");

    wrapper.unmount();
  });
});
