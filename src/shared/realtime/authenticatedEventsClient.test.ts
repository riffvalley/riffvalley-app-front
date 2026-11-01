// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeAuthenticatedEvents } from "./authenticatedEventsClient";

function emptyStream(): ReadableStream<Uint8Array> {
  return new ReadableStream({ start: (controller) => controller.close() });
}

function options(
  controller: AbortController,
  overrides: Partial<Parameters<typeof consumeAuthenticatedEvents<string>>[0]> = {}
) {
  return {
    url: "/api/events",
    clientIdHeader: "X-Riff-Valley-Client-Id",
    clientId: "tab-id",
    getToken: () => "token",
    renewSession: vi.fn(async () => "renewed" as const),
    generation: 4,
    isCurrent: () => true,
    readEvents: async (_body: ReadableStream<Uint8Array>, onEvent: (event: string) => void) => {
      onEvent("event");
      controller.abort();
    },
    onEvent: vi.fn(),
    random: () => 0,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("authenticated SSE transport", () => {
  it("sends Bearer auth and the tab header, renews after 401, then aborts cleanly", async () => {
    let token = "expired";
    const controller = new AbortController();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(emptyStream(), { status: 200 }));
    const config = options(controller, {
      getToken: () => token,
      renewSession: vi.fn(async () => {
        token = "renewed-token";
        return "renewed" as const;
      }),
      fetcher,
    });

    await consumeAuthenticatedEvents(config, controller.signal);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "/api/events",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer expired",
          "X-Riff-Valley-Client-Id": "tab-id",
        }),
        credentials: "omit",
        cache: "no-store",
      })
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/api/events",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer renewed-token" }),
      })
    );
    expect(config.renewSession).toHaveBeenCalledWith(4);
    expect(controller.signal.aborted).toBe(true);
  });

  it("treats EOF as reconnectable and stops the next stream when aborted", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      if (fetcher.mock.calls.length === 2) controller.abort();
      return new Response(emptyStream(), { status: 200 });
    });
    const config = options(controller, {
      fetcher,
      readEvents: vi.fn(async () => undefined),
    });

    const consuming = consumeAuthenticatedEvents(config, controller.signal);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(750);
    await consuming;

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("stops on 403 and reports authorization loss once", async () => {
    const controller = new AbortController();
    const onForbidden = vi.fn();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 403 }));
    await consumeAuthenticatedEvents(
      options(controller, { fetcher, onForbidden }),
      controller.signal
    );
    expect(fetcher).toHaveBeenCalledOnce();
    expect(onForbidden).toHaveBeenCalledOnce();
  });
});
