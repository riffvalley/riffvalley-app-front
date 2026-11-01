import { afterEach, describe, expect, it, vi } from "vitest";
import type { Content } from "@services/contents/contents";
import {
  createReconnectDelay,
  deduplicateEditorialEvents,
  formatEditorialBatchToast,
  formatEditorialToast,
  getVisibleChangedContentIds,
  haveVisibleContentChanges,
} from "./contentCalendarRealtime";
import { consumeContentsEvents, contentCalendarClientId } from "./contentsEventsClient";
import type { ContentsInvalidateChangeEvent } from "./contentsInvalidateParser";

const content = (overrides: Partial<Content> = {}): Content => ({
  id: "content-1",
  type: "article",
  name: "Editorial",
  ready: false,
  backlog: false,
  publicationDate: "2026-11-01T00:00:00.000Z",
  author: { id: "user-1", username: "Editor" },
  ...overrides,
});

const editorialEvent = (
  overrides: Partial<ContentsInvalidateChangeEvent> = {}
): ContentsInvalidateChangeEvent => ({
  type: "contents.invalidate",
  version: 2,
  reason: "change",
  action: "moved",
  actor: { kind: "user", id: "user-1", displayName: "María" },
  content: { id: "content-1", title: "Radar semanal" },
  changes: { previousDate: "2026-10-30", newDate: "2026-11-01" },
  ...overrides,
});

describe("content calendar realtime support", () => {
  afterEach(() => vi.useRealTimers());

  it("compares visible fields by value and ignores equivalent object identities", () => {
    expect(haveVisibleContentChanges([content()], [content()])).toBe(false);
    expect(haveVisibleContentChanges([content()], [content({ name: "Nuevo nombre" })])).toBe(true);
    expect(haveVisibleContentChanges([content()], [])).toBe(true);
  });

  it("compares only the calendar day for scheduled items, not hidden timestamp precision", () => {
    expect(
      haveVisibleContentChanges(
        [content({ publicationDate: "2026-11-01T00:00:00.000Z" })],
        [content({ publicationDate: "2026-11-01T18:30:00.000Z" })]
      )
    ).toBe(false);
  });

  it("does not report a difference for changes hidden by the caller's author filter", () => {
    const userOnly = [content()];
    const afterFilter = [content()];
    expect(haveVisibleContentChanges(userOnly, afterFilter)).toBe(false);
  });

  it("returns only IDs whose visible projection changed, including additions and removals", () => {
    expect(
      getVisibleChangedContentIds(
        [content(), content({ id: "removed" })],
        [content({ name: "Changed" }), content({ id: "added" })]
      )
    ).toEqual(new Set(["content-1", "removed", "added"]));
  });

  it.each([
    ["created", "María ha creado Radar semanal"],
    ["scheduled", "María ha programado Radar semanal para el 01/11/2026"],
    ["moved", "María ha movido Radar semanal del 30/10 al 01/11"],
    ["unscheduled", "María ha enviado Radar semanal al backlog"],
    ["updated", "María ha actualizado Radar semanal"],
    ["deleted", "María ha eliminado Radar semanal"],
  ] as const)("formats action %s descriptively", (action, expected) => {
    const changes =
      action === "scheduled"
        ? { newDate: "2026-11-01" }
        : action === "moved"
          ? { previousDate: "2026-10-30", newDate: "2026-11-01" }
          : action === "unscheduled" || action === "deleted"
            ? { previousDate: "2026-10-30" }
            : {};
    expect(formatEditorialToast(editorialEvent({ action, changes }))).toBe(expected);
  });

  it("formats year changes fully and system actors without mutating civil dates", () => {
    expect(
      formatEditorialToast(
        editorialEvent({
          actor: { kind: "system", id: "system", displayName: "Proceso automático" },
          changes: { previousDate: "2026-12-31", newDate: "2027-01-01" },
        })
      )
    ).toBe("Proceso automático ha movido Radar semanal del 31/12/2026 al 01/01/2027");
    expect(
      formatEditorialToast(
        editorialEvent({ action: "scheduled", changes: { newDate: "2026-11-01" } })
      )
    ).toContain("01/11/2026");
  });

  it("uses a generic v2 fallback without inventing missing actor or title", () => {
    expect(formatEditorialToast(editorialEvent({ content: undefined }))).toBe(
      "María ha realizado cambios editoriales en el calendario."
    );
    expect(formatEditorialToast(editorialEvent({ actor: undefined }))).toBe(
      "Hay cambios editoriales en el calendario."
    );
  });

  it("deduplicates repeated events and describes mixed batches without false attribution", () => {
    const first = editorialEvent();
    const second = editorialEvent({
      actor: { kind: "user", id: "user-2", displayName: "Lucía" },
      content: { id: "content-2", title: "Agenda" },
    });
    expect(deduplicateEditorialEvents([first, first, second])).toEqual([first, second]);
    expect(formatEditorialBatchToast([first, second])).toBe(
      "María y Lucía han realizado varios cambios visibles en el calendario."
    );
  });

  it("uses capped exponential reconnect delay with jitter", () => {
    expect(createReconnectDelay(0, () => 0)).toBe(375);
    expect(createReconnectDelay(20, () => 1)).toBe(37_500);
  });

  it("sends Bearer auth and tab origin, and handles 403 as terminal", async () => {
    const controller = new AbortController();
    const invalidations = vi.fn();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 403 }));
    const onForbidden = vi.fn();
    await consumeContentsEvents(
      {
        getToken: () => "access-token",
        renewSession: vi.fn(),
        generation: 1,
        isCurrent: () => true,
        onInvalidate: invalidations,
        fetcher,
        onForbidden,
      },
      controller.signal
    );
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringMatching(/\/contents\/events$/),
      expect.objectContaining({
        headers: {
          Authorization: "Bearer access-token",
          Accept: "text/event-stream",
          "X-Content-Calendar-Client-Id": contentCalendarClientId,
        },
        credentials: "omit",
      })
    );
    expect(onForbidden).toHaveBeenCalledOnce();
    expect(invalidations).not.toHaveBeenCalled();
  });

  it("passes initial and editorial events through for separate orchestration", async () => {
    const controller = new AbortController();
    let invalidations = 0;
    const body = new ReadableStream<Uint8Array>({
      start(stream) {
        const encoder = new TextEncoder();
        stream.enqueue(
          encoder.encode(
            'event: contents.invalidate\ndata: {"type":"contents.invalidate","version":2,"reason":"initial"}\n\nevent: contents.invalidate\ndata: {"type":"contents.invalidate","version":2,"reason":"change"}\n\n'
          )
        );
      },
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status: 200 }));
    await consumeContentsEvents(
      {
        getToken: () => "access-token",
        renewSession: vi.fn(),
        generation: 1,
        isCurrent: () => true,
        onInvalidate: () => {
          invalidations += 1;
          if (invalidations === 2) controller.abort();
        },
        fetcher,
      },
      controller.signal
    );
    expect(invalidations).toBe(2);
  });

  it("renews once after 401 and retries with the current token", async () => {
    const controller = new AbortController();
    let token: string | null = "old-token";
    let fetchCount = 0;
    const fetcher = vi.fn<typeof fetch>(async () => {
      fetchCount += 1;
      if (fetchCount === 1) return new Response(null, { status: 401 });
      controller.abort();
      return new Response(new ReadableStream({ start: (stream) => stream.close() }), {
        status: 200,
      });
    });
    const renewSession = vi.fn(async () => {
      token = "new-token";
      return "renewed" as const;
    });
    await consumeContentsEvents(
      {
        getToken: () => token,
        renewSession,
        generation: 8,
        isCurrent: () => true,
        onInvalidate: vi.fn(),
        fetcher,
      },
      controller.signal
    );
    expect(renewSession).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      headers: {
        Authorization: "Bearer new-token",
        Accept: "text/event-stream",
        "X-Content-Calendar-Client-Id": contentCalendarClientId,
      },
    });
  });

  it("reconnects after a normal EOF using the backoff", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let requests = 0;
    const fetcher = vi.fn<typeof fetch>(async () => {
      requests += 1;
      if (requests === 2) controller.abort();
      return new Response(new ReadableStream({ start: (stream) => stream.close() }), {
        status: 200,
      });
    });
    const running = consumeContentsEvents(
      {
        getToken: () => "access-token",
        renewSession: vi.fn(),
        generation: 1,
        isCurrent: () => true,
        onInvalidate: vi.fn(),
        fetcher,
        random: () => 0,
      },
      controller.signal
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(requests).toBe(1);
    await vi.advanceTimersByTimeAsync(800);
    await running;
    expect(requests).toBe(2);
  });
});
