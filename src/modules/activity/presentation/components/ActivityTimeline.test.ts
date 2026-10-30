// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { ActivityHistoryEvent } from "../../types/activity";
import ActivityTimeline from "./ActivityTimeline.vue";

const { useActivityHistory } = vi.hoisted(() => ({ useActivityHistory: vi.fn() }));
vi.mock("../../application/useActivityHistory", () => ({ useActivityHistory: (...args: unknown[]) => useActivityHistory(...args) }));

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  private readonly callback: IntersectionObserverCallback;
  private readonly options?: IntersectionObserverInit;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    IntersectionObserverMock.instances.push(this);
  }

  trigger(isIntersecting = true) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }

  get rootMargin() {
    return this.options?.rootMargin;
  }
}

function event(id: string, occurredAt: string): ActivityHistoryEvent {
  return { id, type: "set", occurredAt, previousValue: null, newValue: 8, disc: null };
}

function setup(overrides: Record<string, unknown> = {}, withObserver = true) {
  const history = {
    events: ref<ActivityHistoryEvent[]>([event("one", "2026-10-31T12:00:00Z")]),
    dailySetCounts: ref<Record<string, number>>({ "2026-10-31": 35 }),
    isLoading: ref(false),
    isError: ref(false),
    isFetchingNextPage: ref(false),
    isFetchNextPageError: ref(false),
    hasMore: ref(true),
    loadMore: vi.fn().mockResolvedValue(undefined),
    retry: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  useActivityHistory.mockReturnValue(history);
  IntersectionObserverMock.instances = [];
  vi.stubGlobal("IntersectionObserver", withObserver ? IntersectionObserverMock : undefined);
  const pinia = createPinia();
  setActivePinia(pinia);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = mount(ActivityTimeline, {
    props: { timeZone: "Europe/Madrid", isDateFiltered: false, isDateRange: false },
    global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
  });
  return { history, wrapper };
}

describe("ActivityTimeline", () => {
  it("renders grouped events and requests more when its sentinel intersects", async () => {
    const { history, wrapper } = setup();
    await flushPromises();
    expect(wrapper.text()).toContain("31 de octubre de 2026");
    expect(wrapper.text()).toContain("35 votos");
    expect(wrapper.get('[aria-label="Cronología de valoraciones"]').classes()).toContain("max-w-3xl");
    expect(wrapper.get("h2").classes()).toContain("justify-between");
    expect(wrapper.findAll("article")).toHaveLength(1);
    expect(wrapper.get("article").classes()).toContain("w-full");
    expect(wrapper.get("article").classes()).toContain("sm:grid-cols-[6rem_minmax(0,1fr)_7.5rem]");
    expect(IntersectionObserverMock.instances[0]?.rootMargin).toBe("320px 0px");
    IntersectionObserverMock.instances[0]?.trigger();
    expect(history.loadMore).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    IntersectionObserverMock.instances[0]?.trigger();
    expect(history.loadMore).toHaveBeenCalledTimes(1);
    expect(IntersectionObserverMock.instances[0]?.disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("keeps manual loading available when IntersectionObserver is unavailable", async () => {
    const { history, wrapper } = setup({}, false);
    await flushPromises();
    expect(wrapper.get("button").text()).toContain("Cargar más eventos");
    await wrapper.get("button").trigger("click");
    expect(history.loadMore).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    vi.unstubAllGlobals();
  });

  it("offers a keyboard-accessible load button and stops observing at the end", async () => {
    const { wrapper, history } = setup();
    await flushPromises();
    expect(wrapper.get("button").text()).toContain("Cargar más eventos");
    history.hasMore.value = false;
    await flushPromises();
    expect(IntersectionObserverMock.instances.at(-1)?.disconnect).toHaveBeenCalled();
    expect(wrapper.text()).toContain("Has llegado al final del historial");
    wrapper.unmount();
    vi.unstubAllGlobals();
  });

  it("keeps prior events visible and offers a retry after a page error", async () => {
    const { history, wrapper } = setup({ isFetchNextPageError: ref(true) });
    await flushPromises();
    expect(wrapper.findAll("article")).toHaveLength(1);
    expect(wrapper.text()).toContain("No se pudieron cargar los eventos anteriores");
    await wrapper.get("button").trigger("click");
    expect(history.loadMore).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    vi.unstubAllGlobals();
  });

  it("shows accessible initial loading, empty and error states", async () => {
    const loading = setup({ isLoading: ref(true), events: ref([]) });
    expect(loading.wrapper.get('[role="status"]').attributes("aria-busy")).toBe("true");
    loading.wrapper.unmount();

    const empty = setup({ events: ref([]), hasMore: ref(false) });
    expect(empty.wrapper.text()).toContain("Todavía no hay eventos");
    empty.wrapper.unmount();

    const error = setup({ events: ref([]), isError: ref(true) });
    expect(error.wrapper.get('[role="alert"]').text()).toContain("No se pudo cargar el historial");
    await error.wrapper.get("button").trigger("click");
    expect(error.history.retry).toHaveBeenCalledTimes(1);
    error.wrapper.unmount();
    vi.unstubAllGlobals();
  });

  it("uses the active date and zone for history, keeps infinite loading, and offers clear on an empty result", async () => {
    const { wrapper } = setup({ events: ref([]), hasMore: ref(false) });
    await wrapper.setProps({
      from: "2026-10-29",
      to: "2026-10-29",
      timeZone: "America/Los_Angeles",
      isDateFiltered: true,
      isDateRange: false,
    });
    await flushPromises();
    const params = useActivityHistory.mock.calls.at(-1)?.[0] as () => Record<string, unknown>;
    expect(params()).toEqual({ from: "2026-10-29", to: "2026-10-29", timeZone: "America/Los_Angeles" });
    expect(wrapper.text()).toContain("No hay actividad registrada para esta fecha.");
    await wrapper.setProps({ isDateRange: true });
    expect(wrapper.text()).toContain("No hay actividad registrada para este intervalo.");
    await wrapper.setProps({ isDateRange: false });
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("clearFilter")).toHaveLength(1);
    wrapper.unmount();
    vi.unstubAllGlobals();
  });

  it("always sends the active zone for an unfiltered timeline", async () => {
    const { wrapper } = setup();
    await flushPromises();
    const params = useActivityHistory.mock.calls.at(-1)?.[0] as () => Record<string, unknown>;
    expect(params()).toEqual({ timeZone: "Europe/Madrid" });
    wrapper.unmount();
    vi.unstubAllGlobals();
  });

  it("continues the infinite scroll observer while a date filter is active", async () => {
    const { history, wrapper } = setup();
    await wrapper.setProps({
      from: "2026-10-01",
      to: "2026-10-31",
      timeZone: "Europe/Madrid",
      isDateFiltered: true,
      isDateRange: true,
    });
    await flushPromises();
    const params = useActivityHistory.mock.calls.at(-1)?.[0] as () => Record<string, unknown>;
    expect(params()).toEqual({ from: "2026-10-01", to: "2026-10-31", timeZone: "Europe/Madrid" });
    IntersectionObserverMock.instances.at(-1)?.trigger();
    expect(history.loadMore).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    vi.unstubAllGlobals();
  });
});
