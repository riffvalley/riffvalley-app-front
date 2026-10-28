// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { computed, ref } from "vue";
import type { DashboardModule } from "@/app/dashboardWidgetRegistry";
import { dashboardWidgetDefaults } from "@/app/dashboardWidgetRegistry";
import DashboardBuilder from "./DashboardBuilder.vue";
import ModuleCard from "./ModuleCard.vue";

const mocks = vi.hoisted(() => ({
  useDashboardConfig: vi.fn(),
  desktopMoveModule: vi.fn(),
  desktopMoveGroup: vi.fn(),
  desktopEnableModule: vi.fn(),
  desktopDisableModule: vi.fn(),
  desktopReset: vi.fn(),
  mobileMoveModule: vi.fn(),
  mobileEnableModule: vi.fn(),
  mobileDisableModule: vi.fn(),
  mobileReset: vi.fn(),
}));

vi.mock("@/composables/useDashboardConfig", () => ({
  useDashboardConfig: mocks.useDashboardConfig,
}));

const modules: DashboardModule[] = [
  { id: "novedades", label: "Alfa", icon: "fa-solid fa-a", size: "half", enabled: true },
  { id: "comunidad", label: "Beta", icon: "fa-solid fa-b", size: "half", enabled: true },
  { id: "top3mes", label: "Gamma", icon: "fa-solid fa-c", size: "full", enabled: true },
  { id: "top3semana", label: "Delta", icon: "fa-solid fa-d", size: "half", enabled: false },
];

function makeConfig(target: "desktop" | "mobile", entries = modules) {
  const targetModules = ref(entries.map((module) => ({ ...module })));
  const enabledModules = computed(() => targetModules.value.filter((module) => module.enabled));
  const disabledModules = computed(() => targetModules.value.filter((module) => !module.enabled));
  const isDesktop = target === "desktop";

  return {
    modules: targetModules,
    enabledModules,
    disabledModules,
    moveModule: isDesktop ? mocks.desktopMoveModule : mocks.mobileMoveModule,
    moveGroup: mocks.desktopMoveGroup,
    enableModule: isDesktop ? mocks.desktopEnableModule : mocks.mobileEnableModule,
    disableModule: isDesktop ? mocks.desktopDisableModule : mocks.mobileDisableModule,
    resetToDefault: isDesktop ? mocks.desktopReset : mocks.mobileReset,
  };
}

describe("DashboardBuilder keyboard controls", () => {
  let desktopConfig: ReturnType<typeof makeConfig>;
  let mobileConfig: ReturnType<typeof makeConfig>;

  beforeEach(() => {
    vi.clearAllMocks();
    desktopConfig = makeConfig("desktop");
    mobileConfig = makeConfig("mobile");
    mocks.useDashboardConfig.mockImplementation((target: "desktop" | "mobile") =>
      target === "desktop" ? desktopConfig : mobileConfig
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("moves desktop modules before or after a neighbor from named, focusable controls", async () => {
    const wrapper = mount(DashboardBuilder, { attachTo: document.body });
    const moveBetaUp = wrapper.get('button[aria-label="Mover Beta antes"]');
    const moveAlphaDown = wrapper.get('button[aria-label="Mover Alfa después"]');

    expect(moveBetaUp.attributes("aria-disabled")).toBe("false");
    expect(moveBetaUp.classes()).toContain("focus-visible:outline");
    moveBetaUp.element.focus();
    expect(document.activeElement).toBe(moveBetaUp.element);
    await moveBetaUp.trigger("click");
    expect(mocks.desktopMoveModule).toHaveBeenCalledWith("comunidad", "novedades");

    await moveAlphaDown.trigger("click");
    expect(mocks.desktopMoveModule).toHaveBeenLastCalledWith("novedades", "top3mes");

    const firstModuleUp = wrapper.get('button[aria-label="Mover Alfa antes"]');
    expect(firstModuleUp.attributes("aria-disabled")).toBe("true");
    await firstModuleUp.trigger("click");
    expect(mocks.desktopMoveModule).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it("activates a desktop tray module by button and preserves its draggable affordance", async () => {
    const wrapper = mount(DashboardBuilder, { attachTo: document.body });
    const activateDelta = wrapper.get(
      'button[aria-label="Activar Delta en el dashboard de escritorio"]'
    );

    expect(activateDelta.attributes("draggable")).toBe("true");
    await activateDelta.trigger("click");
    expect(mocks.desktopEnableModule).toHaveBeenCalledWith("top3semana");
    wrapper.unmount();
  });

  it("gives mobile icon buttons accessible names and visible keyboard focus", async () => {
    const wrapper = mount(DashboardBuilder, { attachTo: document.body });
    const controls = [
      wrapper.get('button[aria-label="Subir Beta"]'),
      wrapper.get('button[aria-label="Bajar Alfa"]'),
      wrapper.get('button[aria-label="Desactivar Alfa en el dashboard móvil"]'),
      wrapper.get('button[aria-label="Activar Delta en el dashboard móvil"]'),
    ];

    for (const control of controls) {
      expect(control.classes()).toContain("focus-visible:outline");
      control.element.focus();
      expect(document.activeElement).toBe(control.element);
    }

    await controls[3].trigger("click");
    expect(mocks.mobileEnableModule).toHaveBeenCalledWith("top3semana");

    await wrapper.get('button[aria-label="Subir Beta"]').trigger("click");
    expect(mocks.mobileMoveModule).toHaveBeenCalledWith("comunidad", "novedades");
    await wrapper.get('button[aria-label="Bajar Alfa"]').trigger("click");
    expect(mocks.mobileMoveModule).toHaveBeenCalledWith("novedades", "top3mes");
    wrapper.unmount();
  });

  it("keeps pointer drag/drop on the module card and still inserts on the chosen side", async () => {
    const wrapper = mount(ModuleCard, {
      props: {
        mod: modules[0],
        canMoveUp: false,
        canMoveDown: true,
      },
    });
    const card = wrapper.get(".cursor-grab[draggable='true']");
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 40,
      width: 100,
      height: 40,
      toJSON: () => ({}),
    });

    expect(card.attributes("draggable")).toBe("true");
    await card.trigger("dragstart");
    await card.trigger("dragover", { clientX: 20 });
    await card.trigger("drop", { clientX: 80 });

    expect(wrapper.emitted("dragstart")).toHaveLength(1);
    expect(wrapper.emitted("dragover")).toEqual([["before"]]);
    expect(wrapper.emitted("drop")).toEqual([["after"]]);
    wrapper.unmount();
  });

  it("renders the same registered widget names in the desktop and mobile editors", () => {
    const registeredModules = dashboardWidgetDefaults.map(({ enabled, ...widget }) => ({
      ...widget,
      enabled,
    }));
    desktopConfig = makeConfig("desktop", registeredModules);
    mobileConfig = makeConfig("mobile", registeredModules);
    mocks.useDashboardConfig.mockImplementation((target: "desktop" | "mobile") =>
      target === "desktop" ? desktopConfig : mobileConfig,
    );
    const wrapper = mount(DashboardBuilder);

    for (const widget of dashboardWidgetDefaults) {
      expect(wrapper.text()).toContain(widget.label);
    }
    wrapper.unmount();
  });
});
