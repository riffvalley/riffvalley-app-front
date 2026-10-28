// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent, h, onMounted, onUnmounted, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { dashboardWidgetDefaults } from "@/app/dashboardWidgetRegistry";
import DashboardWidgetGrid from "./DashboardWidgetGrid.vue";

describe("DashboardWidgetGrid", () => {
  it("renders only enabled slots in the configured order with registry layout sizes", () => {
    const modules = [
      { ...dashboardWidgetDefaults.find(({ id }) => id === "top3mes")!, enabled: true },
      { ...dashboardWidgetDefaults.find(({ id }) => id === "novedades")!, enabled: true },
      { ...dashboardWidgetDefaults.find(({ id }) => id === "comunidad")!, enabled: false },
    ];
    const wrapper = mount(DashboardWidgetGrid, {
      props: { modules },
      slots: {
        top3mes: "<p>Top mensual</p>",
        novedades: "<p>Novedades</p>",
        comunidad: "<p>Comunidad</p>",
      },
    });

    expect(wrapper.findAll("[data-widget-id]").map((node) => node.attributes("data-widget-id"))).toEqual([
      "top3mes",
      "novedades",
    ]);
    expect(wrapper.find("[data-widget-id='top3mes']").classes()).toContain("w-full");
    expect(wrapper.find("[data-widget-id='novedades']").classes()).toContain("lg:w-[calc(50%-12px)]");
    expect(wrapper.text()).toContain("Top mensual");
    expect(wrapper.text()).toContain("Novedades");
    expect(wrapper.text()).not.toContain("Comunidad");
  });

  it("switches between independent desktop and mobile configurations", async () => {
    const desktop = [
      { ...dashboardWidgetDefaults.find(({ id }) => id === "novedades")!, enabled: true },
      { ...dashboardWidgetDefaults.find(({ id }) => id === "comunidad")!, enabled: false },
    ];
    const mobile = [
      { ...dashboardWidgetDefaults.find(({ id }) => id === "comunidad")!, enabled: true },
      { ...dashboardWidgetDefaults.find(({ id }) => id === "novedades")!, enabled: true },
    ];
    const wrapper = mount(DashboardWidgetGrid, {
      props: { modules: desktop },
      slots: { novedades: "Novedades", comunidad: "Comunidad" },
    });

    expect(wrapper.findAll("[data-widget-id]").map((node) => node.attributes("data-widget-id"))).toEqual([
      "novedades",
    ]);
    await wrapper.setProps({ modules: mobile });
    expect(wrapper.findAll("[data-widget-id]").map((node) => node.attributes("data-widget-id"))).toEqual([
      "comunidad",
      "novedades",
    ]);
  });

  it("keeps keyed widget instances while reordering and unmounts a disabled widget", async () => {
    const mounted = vi.fn();
    const unmounted = vi.fn();
    const makeWidget = (label: string) =>
      defineComponent({
        setup() {
          onMounted(mounted);
          onUnmounted(unmounted);
          return () => h("p", label);
        },
      });
    const firstWidget = makeWidget("Novedades");
    const secondWidget = makeWidget("Comunidad");
    const first = { ...dashboardWidgetDefaults.find(({ id }) => id === "novedades")!, enabled: true };
    const second = { ...dashboardWidgetDefaults.find(({ id }) => id === "comunidad")!, enabled: true };
    const modules = ref([first, second]);
    const wrapper = mount(DashboardWidgetGrid, {
      props: { modules: modules.value },
      slots: { novedades: () => h(firstWidget), comunidad: () => h(secondWidget) },
    });

    const firstElement = wrapper.find("[data-widget-id='novedades']").element;
    const secondElement = wrapper.find("[data-widget-id='comunidad']").element;
    expect(mounted).toHaveBeenCalledTimes(2);

    modules.value = [second, first];
    await wrapper.setProps({ modules: modules.value });
    expect(wrapper.findAll("[data-widget-id]").map((node) => node.attributes("data-widget-id"))).toEqual([
      "comunidad",
      "novedades",
    ]);
    expect(wrapper.find("[data-widget-id='novedades']").element).toBe(firstElement);
    expect(wrapper.find("[data-widget-id='comunidad']").element).toBe(secondElement);
    expect(mounted).toHaveBeenCalledTimes(2);
    expect(unmounted).not.toHaveBeenCalled();

    await wrapper.setProps({ modules: [{ ...first, enabled: false }, second] });
    expect(wrapper.find("[data-widget-id='novedades']").exists()).toBe(false);
    expect(unmounted).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("preserves widget callbacks declared by the parent slot", async () => {
    const onAction = vi.fn();
    const wrapper = mount(DashboardWidgetGrid, {
      props: { modules: [{ ...dashboardWidgetDefaults.find(({ id }) => id === "aventura")!, enabled: true }] },
      slots: { aventura: () => h("button", { onClick: onAction }, "Elegir disco") },
    });

    await wrapper.get("button").trigger("click");
    expect(onAction).toHaveBeenCalledOnce();
  });
});
