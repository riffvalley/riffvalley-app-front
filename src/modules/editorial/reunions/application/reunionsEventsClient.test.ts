import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReunionsEvent } from "../types/reunions";
import { consumeReunionsEvents, reunionsEventsUrl } from "./reunionsEventsClient";

const { consume, clientId } = vi.hoisted(() => ({ consume: vi.fn(), clientId: "tab-id" }));
vi.mock("@/shared/realtime/authenticatedEventsClient", () => ({
  consumeAuthenticatedEvents: consume,
}));
vi.mock("@/shared/realtime/editorialClientId", () => ({ editorialClientId: clientId }));

afterEach(() => vi.clearAllMocks());

describe("Reunions event stream client", () => {
  it("uses the protected endpoint, Bearer transport contract, and shared tab origin", async () => {
    consume.mockResolvedValue(undefined);
    const onEvent = vi.fn<(event: ReunionsEvent) => void>();
    const controller = new AbortController();
    const options = {
      getToken: () => "access-token",
      renewSession: vi.fn(async () => "renewed" as const),
      generation: 7,
      isCurrent: () => true,
      onEvent,
    };
    await consumeReunionsEvents(options, controller.signal);
    expect(consume).toHaveBeenCalledOnce();
    expect(consume).toHaveBeenCalledWith(
      expect.objectContaining({
        url: reunionsEventsUrl,
        clientIdHeader: "X-Riff-Valley-Client-Id",
        clientId,
        generation: 7,
        onEvent,
        readEvents: expect.any(Function),
      }),
      controller.signal
    );
    expect(reunionsEventsUrl).toMatch(/\/api\/reunions\/events$/);
  });
});
