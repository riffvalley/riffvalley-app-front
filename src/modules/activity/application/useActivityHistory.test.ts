// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick, reactive } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/modules/identity/auth";
import type { ActivityHistoryParams, ActivityHistoryResponse } from "../types/activity";
import { activityHistoryQueryKeyForSession, useActivityHistory } from "./useActivityHistory";

const { getActivityHistory } = vi.hoisted(() => ({ getActivityHistory: vi.fn() }));
vi.mock("../api/activityApi", () => ({ getActivityHistory: (...args: unknown[]) => getActivityHistory(...args) }));

const page = (
  items: ActivityHistoryResponse["items"],
  nextCursor: string | null,
  hasMore: boolean,
  dailySetCounts: Record<string, number> = {},
): ActivityHistoryResponse => ({ items, nextCursor, hasMore, dailySetCounts });

function setup(params: () => ActivityHistoryParams = () => ({})) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const authStore = useAuthStore(pinia);
  authStore.authStatus = "authenticated";
  authStore.token = "token";
  authStore.userId = "user-a";
  authStore.authSessionGeneration = 2;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  let history: ReturnType<typeof useActivityHistory>;
  const Probe = defineComponent({
    setup() {
      history = useActivityHistory(params);
      return () => null;
    },
  });
  const wrapper = mount(Probe, { global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] } });
  return { authStore, history: () => history, queryClient, wrapper };
}

describe("useActivityHistory", () => {
  beforeEach(() => getActivityHistory.mockReset());

  it("waits for Identity initialization and requests the first page with limit 30", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore(pinia);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Probe = defineComponent({ setup: () => useActivityHistory(), render: () => null });
    const wrapper = mount(Probe, { global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] } });
    await flushPromises();
    expect(getActivityHistory).not.toHaveBeenCalled();

    authStore.authStatus = "authenticated";
    authStore.token = "token";
    authStore.userId = "user-a";
    getActivityHistory.mockResolvedValue(page([], null, false));
    await flushPromises();
    expect(getActivityHistory).toHaveBeenCalledWith({ limit: 30 }, expect.any(AbortSignal));
    wrapper.unmount();
    queryClient.clear();
  });

  it("continues with the opaque next cursor and stops at the end", async () => {
    getActivityHistory
      .mockResolvedValueOnce(page([{ id: "one", type: "set", occurredAt: "2026-10-29T00:00:00.123456Z", previousValue: null, newValue: 4, disc: null }], "signed.cursor", true))
      .mockResolvedValueOnce(page([{ id: "two", type: "change", occurredAt: "2026-10-28T00:00:00.123456Z", previousValue: 4, newValue: 5, disc: null }], null, false));
    const client = setup();
    await flushPromises();
    expect(client.history().events.value.map((event) => event.id)).toEqual(["one"]);

    await client.history().loadMore();
    await flushPromises();
    expect(getActivityHistory).toHaveBeenLastCalledWith({ limit: 30, cursor: "signed.cursor" }, expect.any(AbortSignal));
    expect(client.history().events.value.map((event) => event.id)).toEqual(["one", "two"]);
    expect(client.history().hasMore.value).toBe(false);
    const callCount = getActivityHistory.mock.calls.length;
    await client.history().loadMore();
    expect(getActivityHistory).toHaveBeenCalledTimes(callCount);
    client.wrapper.unmount();
    client.queryClient.clear();
  });

  it("keeps backend daily totals across pages and uses the latest full-day value without counting events", async () => {
    const sameDay = "2026-10-29";
    const manySetEvents = Array.from({ length: 12 }, (_, index) => ({
      id: `set-${index}`,
      type: "set" as const,
      occurredAt: `2026-10-29T${String(index).padStart(2, "0")}:00:00Z`,
      previousValue: null,
      newValue: index,
      disc: null,
    }));
    getActivityHistory
      .mockResolvedValueOnce(page(manySetEvents, "cursor-1", true, { [sameDay]: 7, "2026-10-28": 0 }))
      .mockResolvedValueOnce(page([
        { id: "change", type: "change", occurredAt: "2026-10-29T23:00:00Z", previousValue: 1, newValue: 2, disc: null },
      ], null, false, { [sameDay]: 8 }));
    const client = setup();
    await flushPromises();

    expect(client.history().dailySetCounts.value).toEqual({ [sameDay]: 7, "2026-10-28": 0 });
    await client.history().loadMore();
    await flushPromises();

    expect(client.history().dailySetCounts.value).toEqual({ [sameDay]: 8, "2026-10-28": 0 });
    expect(client.history().events.value).toHaveLength(13);
    client.wrapper.unmount();
    client.queryClient.clear();
  });

  it("preserves missing daily totals and returns an empty map for empty pages", async () => {
    getActivityHistory.mockResolvedValueOnce(page([], null, false));
    const client = setup();
    await flushPromises();
    expect(client.history().pages.value[0]?.items).toEqual([]);
    expect(client.history().dailySetCounts.value).toEqual({});
    client.wrapper.unmount();
    client.queryClient.clear();
  });

  it("does not duplicate a page request while one is pending", async () => {
    let resolveNext: ((response: ActivityHistoryResponse) => void) | undefined;
    getActivityHistory
      .mockResolvedValueOnce(page([], "cursor-1", true))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNext = resolve; }));
    const client = setup();
    await flushPromises();
    const first = client.history().loadMore();
    const second = client.history().loadMore();
    await nextTick();
    expect(getActivityHistory).toHaveBeenCalledTimes(2);
    resolveNext?.(page([], null, false));
    await Promise.all([first, second]);
    client.wrapper.unmount();
    client.queryClient.clear();
  });

  it("stops if the backend repeats a cursor already used for a page", async () => {
    getActivityHistory
      .mockResolvedValueOnce(page([], "cursor-1", true))
      .mockResolvedValueOnce(page([], "cursor-1", true));
    const client = setup();
    await flushPromises();
    await client.history().loadMore();
    await flushPromises();
    expect(client.history().hasMore.value).toBe(false);
    const requestCount = getActivityHistory.mock.calls.length;
    await client.history().loadMore();
    expect(getActivityHistory).toHaveBeenCalledTimes(requestCount);
    client.wrapper.unmount();
    client.queryClient.clear();
  });

  it("keeps prior pages after a later-page failure and allows retry", async () => {
    getActivityHistory
      .mockResolvedValueOnce(page([
        { id: "kept", type: "set", occurredAt: "2026-10-29T00:00:00Z", previousValue: null, newValue: 7, disc: null },
      ], "cursor-1", true, { "2026-10-29": 5 }))
      .mockRejectedValueOnce(new Error("temporarily unavailable"))
      .mockResolvedValueOnce(page([
        { id: "added", type: "change", occurredAt: "2026-10-28T00:00:00Z", previousValue: 7, newValue: 8, disc: null },
      ], null, false));
    const client = setup();
    await flushPromises();
    await client.history().loadMore();
    await flushPromises();
    expect(client.history().events.value.map(({ id }) => id)).toEqual(["kept"]);
    expect(client.history().dailySetCounts.value).toEqual({ "2026-10-29": 5 });
    expect(client.history().isFetchNextPageError.value).toBe(true);

    await client.history().loadMore();
    await flushPromises();
    expect(client.history().events.value.map(({ id }) => id)).toEqual(["kept", "added"]);
    client.wrapper.unmount();
    client.queryClient.clear();
  });

  it("restarts from page one after explicit reset and resets when filters change", async () => {
    const params = reactive<ActivityHistoryParams>({ type: "set" });
    getActivityHistory.mockResolvedValue(page([], "cursor-old", true));
    const client = setup(() => params);
    await flushPromises();
    expect(getActivityHistory).toHaveBeenLastCalledWith({ type: "set", limit: 30 }, expect.any(AbortSignal));
    await client.history().resetPagination();
    await flushPromises();
    expect(getActivityHistory).toHaveBeenLastCalledWith({ type: "set", limit: 30 }, expect.any(AbortSignal));
    params.type = "change";
    await nextTick();
    await flushPromises();
    expect(getActivityHistory).toHaveBeenLastCalledWith({ type: "change", limit: 30 }, expect.any(AbortSignal));
    client.wrapper.unmount();
    client.queryClient.clear();
  });

  it("starts filtered queries at page one and aborts an obsolete date query", async () => {
    const params = reactive<ActivityHistoryParams>({
      from: "2026-10-29",
      to: "2026-10-29",
      timeZone: "Europe/Madrid",
    });
    let resolveOld: ((response: ActivityHistoryResponse) => void) | undefined;
    getActivityHistory
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce(page([], null, false));
    const client = setup(() => params);
    const oldSignal = getActivityHistory.mock.calls[0]?.[1] as AbortSignal;
    expect(getActivityHistory).toHaveBeenCalledWith({
      from: "2026-10-29", to: "2026-10-29", timeZone: "Europe/Madrid", limit: 30,
    }, expect.any(AbortSignal));

    params.from = "2026-10-01";
    params.to = "2026-10-31";
    await nextTick();
    await flushPromises();
    expect(oldSignal.aborted).toBe(true);
    expect(getActivityHistory).toHaveBeenLastCalledWith({
      from: "2026-10-01", to: "2026-10-31", timeZone: "Europe/Madrid", limit: 30,
    }, expect.any(AbortSignal));
    resolveOld?.(page([{ id: "stale", type: "set", occurredAt: "2026-10-29T12:00:00Z", previousValue: null, newValue: 4, disc: null }], null, false));
    await flushPromises();
    expect(client.history().events.value).toEqual([]);

    params.timeZone = "America/Los_Angeles";
    getActivityHistory.mockResolvedValueOnce(page([], null, false));
    await nextTick();
    await flushPromises();
    expect(getActivityHistory).toHaveBeenLastCalledWith({
      from: "2026-10-01", to: "2026-10-31", timeZone: "America/Los_Angeles", limit: 30,
    }, expect.any(AbortSignal));
    client.wrapper.unmount();
    client.queryClient.clear();
  });

  it("resets daily totals when the date or time zone changes", async () => {
    const params = reactive<ActivityHistoryParams>({ timeZone: "Europe/Madrid", from: "2026-10-29" });
    getActivityHistory
      .mockResolvedValueOnce(page([], null, false, { "2026-10-29": 4 }))
      .mockResolvedValueOnce(page([], null, false, { "2026-10-28": 3 }))
      .mockResolvedValueOnce(page([], null, false, { "2026-10-27": 2 }));
    const client = setup(() => params);
    await flushPromises();
    expect(client.history().dailySetCounts.value).toEqual({ "2026-10-29": 4 });

    params.from = "2026-10-28";
    await nextTick();
    await flushPromises();
    expect(client.history().dailySetCounts.value).toEqual({ "2026-10-28": 3 });

    params.timeZone = "America/Los_Angeles";
    await nextTick();
    await flushPromises();
    expect(client.history().dailySetCounts.value).toEqual({ "2026-10-27": 2 });
    client.wrapper.unmount();
    client.queryClient.clear();
  });

  it("sends the IANA time zone even when all dates are selected", async () => {
    getActivityHistory.mockResolvedValueOnce(page([], null, false));
    const client = setup(() => ({ timeZone: "Europe/Madrid" }));
    await flushPromises();
    expect(getActivityHistory).toHaveBeenCalledWith({
      timeZone: "Europe/Madrid",
      limit: 30,
    }, expect.any(AbortSignal));
    client.wrapper.unmount();
    client.queryClient.clear();
  });

  it("isolates data by user and session generation and discards stale responses", async () => {
    let resolveOld: ((response: ActivityHistoryResponse) => void) | undefined;
    getActivityHistory.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    const client = setup();
    await flushPromises();
    const oldSignal = getActivityHistory.mock.calls[0]?.[1] as AbortSignal;
    client.authStore.userId = "user-b";
    client.authStore.authSessionGeneration = 3;
    getActivityHistory.mockResolvedValueOnce(page([], null, false));
    await nextTick();
    await flushPromises();
    resolveOld?.(page(
      [{ id: "private-a", type: "set", occurredAt: "2026-10-29T00:00:00Z", previousValue: null, newValue: 6, disc: null }],
      null,
      false,
      { "2026-10-29": 99 },
    ));
    await flushPromises();
    expect(oldSignal.aborted).toBe(true);
    expect(client.history().events.value).toEqual([]);
    expect(client.history().dailySetCounts.value).toEqual({});
    expect(activityHistoryQueryKeyForSession({}, "user-a", 2)).not.toEqual(
      activityHistoryQueryKeyForSession({}, "user-b", 3),
    );
    client.wrapper.unmount();
    client.queryClient.clear();
  });

  it("exposes network errors and restarts after an invalid/expired cursor", async () => {
    const networkError = new Error("network down");
    getActivityHistory.mockRejectedValueOnce(networkError);
    const failed = setup();
    await flushPromises();
    expect(failed.history().isError.value).toBe(true);
    expect(failed.history().error.value).toBe(networkError);
    failed.wrapper.unmount();
    failed.queryClient.clear();

    getActivityHistory
      .mockResolvedValueOnce(page([], "expired.cursor", true))
      .mockRejectedValueOnce({ response: { status: 400 } })
      .mockResolvedValueOnce(page([], null, false));
    const cursorCase = setup();
    await flushPromises();
    await cursorCase.history().loadMore();
    await flushPromises();
    expect(getActivityHistory).toHaveBeenCalledTimes(4);
    expect(getActivityHistory).toHaveBeenLastCalledWith({ limit: 30 }, expect.any(AbortSignal));
    cursorCase.wrapper.unmount();
    cursorCase.queryClient.clear();
  });
});
