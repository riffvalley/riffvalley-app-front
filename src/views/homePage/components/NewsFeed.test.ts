// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getNewsFeed, getSourceFeed, routerPush } = vi.hoisted(() => ({
  getNewsFeed: vi.fn(),
  getSourceFeed: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock("@services/news/news", () => ({ getNewsFeed, getSourceFeed }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: routerPush }) }));

import { dashboardWidgetDefaults, dashboardWidgetRegistry } from "@/app/dashboardWidgetRegistry";
import DashboardWidgetGrid from "@/modules/dashboard/components/DashboardWidgetGrid.vue";
import NewsFeed from "./NewsFeed.vue";

const basePosts = [
  {
    id: "app-1",
    title: "Novedad de la aplicación",
    link: null,
    image: null,
    date: "2026-10-27T10:00:00.000Z",
    source: "app" as const,
    type: "new_feature" as const,
    body: '<p>Texto de la novedad <a href="/news">Abrir noticias</a></p>',
  },
  {
    id: "web-1",
    title: "Noticia &amp; crónica",
    link: "https://riffvalley.es/noticia",
    image: "https://riffvalley.es/image.jpg",
    date: "2026-10-26T10:00:00.000Z",
    source: "riffvalley.es" as const,
    type: null,
    body: null,
  },
  {
    id: "telegram-1",
    title: "Concierto anunciado",
    link: "https://t.me/riffvalley/1",
    image: null,
    date: "2026-10-25T10:00:00.000Z",
    source: "telegram" as const,
    type: null,
    body: null,
  },
];

function mountNewsFeed() {
  return mount(NewsFeed, { attachTo: document.body, global: { stubs: { Teleport: true } } });
}

describe("NewsFeed dashboard widget", () => {
  beforeEach(() => {
    getNewsFeed.mockReset().mockResolvedValue({ posts: basePosts });
    getSourceFeed.mockReset().mockResolvedValue({ posts: [basePosts[0]] });
    routerPush.mockReset();
  });

  it("keeps the dashboard card, original feed order, links, app modal, and internal navigation", async () => {
    const wrapper = mountNewsFeed();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Novedad de la aplicación"));

    expect(wrapper.text()).toContain("Novedades Riff Valley");
    expect(getNewsFeed).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(wrapper.findAll(".group h4").map((title) => title.text())).toEqual([
      "Novedad de la aplicación",
      "Noticia & crónica",
      "Concierto anunciado",
    ]);
    expect(wrapper.get('a[href="https://riffvalley.es/noticia"]').attributes()).toMatchObject({
      target: "_blank",
      rel: "noopener noreferrer",
    });
    expect(wrapper.get('a[href="https://t.me/riffvalley/1"]').exists()).toBe(true);

    await wrapper.findAll(".group")[0]!.trigger("click");
    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.text()).toContain("Novedad de la aplicación");
    expect(dialog.attributes("aria-labelledby")).toBe("news-dialog-title");
    expect(dialog.attributes("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(dialog.element);
    expect(wrapper.get('[aria-label="Cerrar"]').classes()).toContain("focus-visible:outline");
    await wrapper.get('.news-prose a[href="/news"]').trigger("click");
    expect(routerPush).toHaveBeenCalledWith("/news");
    wrapper.unmount();
  });

  it("exposes keyboard reachable filters and rows with visible focus and selected state", async () => {
    const wrapper = mountNewsFeed();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Novedad de la aplicación"));
    const feedFilter = wrapper.findAll("button").find((button) => button.text().trim() === "Feed")!;
    const teamFilter = wrapper.findAll("button").find((button) => button.text().trim() === "Equipo")!;
    const appPost = wrapper.findAll(".group")[0]!;

    expect(feedFilter.attributes("aria-pressed")).toBe("true");
    expect(teamFilter.attributes("aria-pressed")).toBe("false");
    expect(teamFilter.element).toHaveProperty("tabIndex", 0);
    expect(feedFilter.classes()).toContain("focus-visible:outline");
    expect(teamFilter.classes()).toContain("focus-visible:outline");
    expect(appPost.element.tagName).toBe("BUTTON");
    expect(appPost.element).toHaveProperty("tabIndex", 0);
    expect(appPost.classes()).toContain("focus-visible:outline");
    (teamFilter.element as HTMLButtonElement).focus();
    expect(document.activeElement).toBe(teamFilter.element);

    await teamFilter.trigger("click");
    expect(teamFilter.attributes("aria-pressed")).toBe("true");
    expect(feedFilter.attributes("aria-pressed")).toBe("false");
    await vi.waitFor(() => expect(getSourceFeed).toHaveBeenCalledOnce());
    await wrapper.get('button[aria-pressed="true"]').trigger("click");
    expect(feedFilter.attributes("aria-pressed")).toBe("true");
    expect(wrapper.findAll(".group h4")).toHaveLength(3);
    wrapper.unmount();
  });

  it("traps modal focus, closes with Escape, and restores focus to the selected news row", async () => {
    const wrapper = mountNewsFeed();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Novedad de la aplicación"));
    const appPost = wrapper.findAll(".group")[0]!;
    (appPost.element as HTMLButtonElement).focus();
    await appPost.trigger("click");
    const closeButton = wrapper.get('[aria-label="Cerrar"]');
    const bodyLink = wrapper.get('.news-prose a[href="/news"]');

    expect(document.activeElement).toBe(wrapper.get('[role="dialog"]').element);
    closeButton.element.focus();
    await closeButton.trigger("keydown", { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(bodyLink.element);
    await bodyLink.trigger("keydown", { key: "Tab" });
    expect(document.activeElement).toBe(closeButton.element);
    await closeButton.trigger("keydown", { key: "Escape" });
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(document.activeElement).toBe(appPost.element);
    wrapper.unmount();
  });

  it("distinguishes load errors from empty feeds and retries failed requests", async () => {
    getNewsFeed.mockRejectedValueOnce(new Error("HTTP 500"));
    const wrapper = mountNewsFeed();
    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain("No se pudieron cargar"));
    await wrapper.get('[role="alert"] button').trigger("click");
    await vi.waitFor(() => expect(getNewsFeed).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(wrapper.text()).toContain("Novedad de la aplicación"));
    wrapper.unmount();

    getNewsFeed.mockResolvedValueOnce({ posts: [] });
    const emptyWrapper = mountNewsFeed();
    await vi.waitFor(() => expect(emptyWrapper.get('[role="status"]').text()).toContain("No hay novedades"));
    expect(emptyWrapper.find('[role="alert"]').exists()).toBe(false);
    emptyWrapper.unmount();
  });

  it("keeps a failed source selection selected and retries that source", async () => {
    getSourceFeed.mockRejectedValueOnce(new Error("HTTP 500"));
    const wrapper = mountNewsFeed();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Novedad de la aplicación"));
    const teamFilter = wrapper.findAll("button").find((button) => button.text().trim() === "Equipo")!;
    await teamFilter.trigger("click");
    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain("No se pudieron cargar"));
    expect(teamFilter.attributes("aria-pressed")).toBe("true");

    await wrapper.get('[role="alert"] button').trigger("click");
    await vi.waitFor(() => expect(getSourceFeed).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(false));
    expect(getSourceFeed).toHaveBeenLastCalledWith(
      { source: "app", type: "team_notes" },
      expect.any(AbortSignal),
    );
    wrapper.unmount();
  });

  it("keeps the source-filter query and reset-to-feed interaction", async () => {
    const wrapper = mountNewsFeed();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Novedad de la aplicación"));

    const teamFilter = wrapper.findAll("button").find((button) => button.text().trim() === "Equipo");
    await teamFilter?.trigger("click");
    await vi.waitFor(() => expect(getSourceFeed).toHaveBeenCalledOnce());
    expect(getSourceFeed).toHaveBeenCalledWith(
      { source: "app", type: "team_notes" },
      expect.any(AbortSignal),
    );
    expect(wrapper.findAll(".group h4").map((title) => title.text())).toEqual(["Novedad de la aplicación"]);

    await wrapper.get("button").trigger("click");
    expect(getSourceFeed).toHaveBeenCalledOnce();
    expect(wrapper.findAll(".group h4")).toHaveLength(3);
    wrapper.unmount();
  });

  it("does not mount or request while disabled, then remounts and fetches when re-enabled", async () => {
    const definition = dashboardWidgetDefaults.find(({ id }) => id === "novedades")!;
    const modules = ref([{ ...definition, enabled: false }]);
    const Host = defineComponent({
      setup() {
        return () => h(DashboardWidgetGrid, { modules: modules.value }, {
          novedades: () => h(NewsFeed),
        });
      },
    });
    const wrapper = mount(Host);

    expect(getNewsFeed).not.toHaveBeenCalled();
    modules.value = [{ ...definition, enabled: true }];
    await vi.waitFor(() => expect(getNewsFeed).toHaveBeenCalledOnce());
    expect(wrapper.get('[data-widget-id="novedades"]').text()).toContain("Novedades Riff Valley");
    const firstSignal = getNewsFeed.mock.calls[0]?.[0] as AbortSignal;

    modules.value = [{ ...definition, enabled: false }];
    await vi.waitFor(() => expect(firstSignal.aborted).toBe(true));
    modules.value = [{ ...definition, enabled: true }];
    await vi.waitFor(() => expect(getNewsFeed).toHaveBeenCalledTimes(2));
    expect(dashboardWidgetRegistry.find(({ id }) => id === "novedades")).toMatchObject({
      id: "novedades",
      size: "half",
      order: 0,
    });

    wrapper.unmount();
  });

  it("aborts initial and filtered requests when the widget unmounts", async () => {
    getNewsFeed.mockImplementation(() => new Promise(() => undefined));
    getSourceFeed.mockImplementation(() => new Promise(() => undefined));
    const wrapper = mountNewsFeed();
    await vi.waitFor(() => expect(getNewsFeed).toHaveBeenCalledOnce());
    const initialSignal = getNewsFeed.mock.calls[0]?.[0] as AbortSignal;

    const teamFilter = wrapper.findAll("button").find((button) => button.text().trim() === "Equipo");
    await teamFilter?.trigger("click");
    expect(getSourceFeed).toHaveBeenCalledOnce();
    const sourceSignal = getSourceFeed.mock.calls[0]?.[1] as AbortSignal;

    wrapper.unmount();
    expect(initialSignal.aborted).toBe(true);
    expect(sourceSignal.aborted).toBe(true);
  });
});
