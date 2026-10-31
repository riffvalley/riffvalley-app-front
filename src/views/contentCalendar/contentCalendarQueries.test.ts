// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { computed, defineComponent, h, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getContents, getContentsByMonth, type Content } from "@services/contents/contents";
import {
  contentCalendarQueryKeys,
  mergeContentsById,
  useContentCalendarQueries,
} from "./contentCalendarQueries";
import { contentFixtures } from "./contentFixtures";

vi.mock("@services/contents/contents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@services/contents/contents")>();
  return {
    ...actual,
    getContents: vi.fn(),
    getContentsByMonth: vi.fn(),
  };
});

const one = contentFixtures[0]!;
const two = contentFixtures[1]!;

function createHarness(client = createQueryClient()) {
  const year = ref(2026);
  const month = ref(10);
  const userId = ref<string | null>("author-1");
  const generation = ref(3);
  const role = ref<string | null>("riffvalley");
  let queries!: ReturnType<typeof useContentCalendarQueries>;
  const Probe = defineComponent({
    setup() {
      queries = useContentCalendarQueries(year, month, userId, generation, role);
      const state = computed(() => {
        const ids = queries.allContents.value.map((content) => content.id).join(",");
        return `${year.value}-${month.value}|${queries.monthQuery.isPending.value}|${queries.monthQuery.isError.value}|${ids}`;
      });
      return () => h("div", { "data-testid": "state" }, state.value);
    },
  });
  const wrapper = mount(Probe, {
    global: { plugins: [[VueQueryPlugin, { queryClient: client }]] },
  });

  return { client, generation, month, queries, role, userId, wrapper, year };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("Content Calendar queries", () => {
  it("uses year and month in monthly keys while backlog identity is period independent", () => {
    expect(contentCalendarQueryKeys.month("author-1", 3, "riffvalley", 2026, 10)).toEqual([
      "editorial",
      "contents",
      "content-calendar",
      "author-1",
      3,
      "riffvalley",
      "month",
      2026,
      10,
    ]);
    expect(contentCalendarQueryKeys.month("author-1", 3, "riffvalley", 2026, 11)).not.toEqual(
      contentCalendarQueryKeys.month("author-1", 3, "riffvalley", 2026, 10)
    );
    expect(contentCalendarQueryKeys.month("author-2", 3, "riffvalley", 2026, 10)).not.toEqual(
      contentCalendarQueryKeys.month("author-1", 3, "riffvalley", 2026, 10)
    );
    expect(contentCalendarQueryKeys.month("author-1", 4, "riffvalley", 2026, 10)).not.toEqual(
      contentCalendarQueryKeys.month("author-1", 3, "riffvalley", 2026, 10)
    );
    expect(contentCalendarQueryKeys.month("author-1", 3, "superadmin", 2026, 10)).not.toEqual(
      contentCalendarQueryKeys.month("author-1", 3, "riffvalley", 2026, 10)
    );
    expect(contentCalendarQueryKeys.backlog("author-1", 3, "riffvalley")).toEqual([
      "editorial",
      "contents",
      "content-calendar",
      "author-1",
      3,
      "riffvalley",
      "backlog",
    ]);
  });

  it("uses cached period data and reuses it when navigating back", async () => {
    const client = createQueryClient();
    const octoberKey = contentCalendarQueryKeys.month("author-1", 3, "riffvalley", 2026, 10);
    client.setQueryData(octoberKey, [one]);
    vi.mocked(getContentsByMonth).mockResolvedValue([two]);
    vi.mocked(getContents).mockResolvedValue([]);
    const harness = createHarness(client);
    await flushPromises();

    expect(getContentsByMonth).not.toHaveBeenCalled();
    expect(client.getQueryData(octoberKey)).toEqual([one]);
    harness.month.value = 11;
    await flushPromises();
    expect(getContentsByMonth).toHaveBeenCalledWith(2026, 11, expect.any(AbortSignal));
    harness.month.value = 10;
    await flushPromises();
    expect(getContentsByMonth).toHaveBeenCalledTimes(1);
    expect(harness.wrapper.get('[data-testid="state"]').text()).toContain(one.id);
    harness.wrapper.unmount();
    client.clear();
  });

  it("keeps loaded data available while a stale period refreshes", async () => {
    const client = createQueryClient();
    const monthKey = contentCalendarQueryKeys.month("author-1", 3, "riffvalley", 2026, 10);
    client.setQueryData(monthKey, [one]);
    client.setQueryData(contentCalendarQueryKeys.backlog("author-1", 3, "riffvalley"), []);
    let resolveRefresh!: (contents: Content[]) => void;
    vi.mocked(getContentsByMonth).mockImplementation(
      () =>
        new Promise<Content[]>((resolve) => {
          resolveRefresh = resolve;
        })
    );
    const harness = createHarness(client);
    await flushPromises();

    void client.invalidateQueries({ queryKey: monthKey });
    await flushPromises();

    expect(harness.queries.monthQuery.data.value).toEqual([one]);
    expect(harness.queries.monthQuery.isFetching.value).toBe(true);
    resolveRefresh([two]);
    await flushPromises();
    expect(harness.queries.monthQuery.data.value).toEqual([two]);
    harness.wrapper.unmount();
    client.clear();
  });

  it("keeps backlog independent from month changes", async () => {
    vi.mocked(getContentsByMonth).mockResolvedValue([]);
    vi.mocked(getContents).mockResolvedValue([one]);
    const harness = createHarness();
    await flushPromises();

    harness.month.value = 11;
    await flushPromises();

    expect(getContents).toHaveBeenCalledTimes(1);
    expect(getContents).toHaveBeenCalledWith(true, expect.any(AbortSignal));
    harness.wrapper.unmount();
    harness.client.clear();
  });

  it("owns remote calendar and backlog results in Query without a Pinia plugin", async () => {
    vi.mocked(getContentsByMonth).mockResolvedValue([two]);
    vi.mocked(getContents).mockResolvedValue([one]);
    const harness = createHarness();
    await flushPromises();

    expect(
      harness.client.getQueryData(
        contentCalendarQueryKeys.month("author-1", 3, "riffvalley", 2026, 10)
      )
    ).toEqual([two]);
    expect(
      harness.client.getQueryData(contentCalendarQueryKeys.backlog("author-1", 3, "riffvalley"))
    ).toEqual([one]);
    harness.wrapper.unmount();
    harness.client.clear();
  });

  it("shows the initial loading state, query errors, and supports a successful retry", async () => {
    vi.mocked(getContentsByMonth)
      .mockRejectedValueOnce(new Error("HTTP unavailable"))
      .mockResolvedValueOnce([two]);
    vi.mocked(getContents).mockResolvedValue([]);
    const harness = createHarness();

    expect(harness.wrapper.get('[data-testid="state"]').text()).toContain("2026-10|true|false|");
    await flushPromises();
    expect(harness.wrapper.get('[data-testid="state"]').text()).toContain("2026-10|false|true|");

    await harness.queries.monthQuery.refetch();
    await flushPromises();
    expect(harness.wrapper.get('[data-testid="state"]').text()).toContain(
      `2026-10|false|false|${two.id}`
    );
    harness.wrapper.unmount();
    harness.client.clear();
  });

  it("cancels an obsolete month request and does not let out-of-order data replace the selected month", async () => {
    const pending: Array<{
      month: number;
      resolve: (contents: typeof contentFixtures) => void;
      signal: AbortSignal;
    }> = [];
    vi.mocked(getContentsByMonth).mockImplementation(
      (year, month, signal) =>
        new Promise((resolve) => {
          pending.push({
            month,
            resolve: resolve as (contents: typeof contentFixtures) => void,
            signal: signal!,
          });
        })
    );
    vi.mocked(getContents).mockResolvedValue([]);
    const harness = createHarness();
    await flushPromises();
    harness.month.value = 11;
    await flushPromises();

    expect(pending).toHaveLength(2);
    expect(pending[0]!.signal.aborted).toBe(true);
    pending[1]!.resolve([two]);
    pending[0]!.resolve([one]);
    await flushPromises();

    expect(harness.wrapper.get('[data-testid="state"]').text()).toContain(
      `2026-11|false|false|${two.id}`
    );
    harness.wrapper.unmount();
    harness.client.clear();
  });

  it("derives deterministic ID deduplication without changing cached records", () => {
    const monthlyDuplicate = { ...one, name: "Versión mensual" };
    const backlog = [one, two];
    const month = [monthlyDuplicate];
    const merged = mergeContentsById(backlog, month);

    expect(merged).toEqual([monthlyDuplicate, two]);
    expect(backlog).toEqual([one, two]);
    expect(month).toEqual([monthlyDuplicate]);
  });
});
