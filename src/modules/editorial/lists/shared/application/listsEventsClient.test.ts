import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeListsEvents, listsEventsUrl } from "./listsEventsClient";
import type { ListsEvent } from "./listsEventsParser";

const { consume, clientId } = vi.hoisted(() => ({ consume: vi.fn(), clientId: "tab-id" }));
vi.mock("@/shared/realtime/authenticatedEventsClient", () => ({
  consumeAuthenticatedEvents: consume,
}));
vi.mock("@/shared/realtime/editorialClientId", () => ({ editorialClientId: clientId }));

afterEach(() => vi.clearAllMocks());

describe("Lists SSE client", () => {
  it("uses authenticated shared transport, the Lists endpoint, and per-tab source header", async () => {
    consume.mockResolvedValue(undefined);
    const onEvent = vi.fn<(event: ListsEvent) => void>();
    const controller = new AbortController();
    const options = {
      getToken: () => "jwt",
      renewSession: vi.fn(async () => "renewed" as const),
      generation: 12,
      isCurrent: () => true,
      onEvent,
    };

    await consumeListsEvents(options, controller.signal);

    expect(consume).toHaveBeenCalledWith(
      expect.objectContaining({
        url: listsEventsUrl,
        clientIdHeader: "X-Riff-Valley-Client-Id",
        clientId,
        generation: 12,
        onEvent,
        readEvents: expect.any(Function),
      }),
      controller.signal
    );
    expect(listsEventsUrl).toMatch(/\/api\/lists\/events$/);
  });
});
