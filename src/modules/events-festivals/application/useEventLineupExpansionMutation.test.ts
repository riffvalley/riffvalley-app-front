// @vitest-environment happy-dom
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EventLineupExpansionAlreadyInFlightError,
  authorizeLineupExpansion,
  lineupExpansionErrorMessage,
  lineupExpansionFailureKind,
  useEventLineupExpansionMutation,
} from "./useEventLineupExpansionMutation";
import { EventLineupExpansionConflictError } from "../api/eventLineupExpansion";
import type { LineupExpansionSnapshot } from "./eventLineupExpansionPreparation";
import type { EventLineupExpansionResponse } from "../api/eventLineupExpansion";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("../api/eventLineupExpansion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/eventLineupExpansion")>()),
  importEventLineupExpansion: sendMock,
}));

const eventId = "44444444-4444-4444-8444-444444444444";
const snapshot = {
  kind: "event-lineup-expansion",
  eventId,
  operation: {
    batchId: "11111111-1111-4111-8111-111111111111",
    rowId: "22222222-2222-4222-8222-222222222222",
  },
  payload: {},
  correlation: {},
} as LineupExpansionSnapshot;
const response: EventLineupExpansionResponse = {
  status: "updated",
  eventId,
  addedArtists: [],
  existingArtists: [{ artistId: "artist-1", name: "Existing Artist" }],
};

let submit: ((authorization?: unknown) => Promise<unknown>) | undefined;
let queryClient: QueryClient;
let wrapper: ReturnType<typeof mount> | undefined;

function mountMutation() {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Host = defineComponent({
    setup() {
      const mutation = useEventLineupExpansionMutation();
      submit = (authorization = authorizeLineupExpansion(snapshot, "confirmed")) =>
        mutation.mutateAsync(authorization as never);
      return () => h("div");
    },
  });
  wrapper = mount(Host, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
  return queryClient;
}

afterEach(() => {
  wrapper?.unmount();
  queryClient?.clear();
  sendMock.mockReset();
  submit = undefined;
});

describe("useEventLineupExpansionMutation", () => {
  it("requires an explicit authorization and never retries automatically", async () => {
    mountMutation();
    sendMock.mockRejectedValue(new Error("network"));
    await expect(submit?.({})).rejects.toThrow("autorización explícita");
    await expect(submit?.()).rejects.toThrow("network");
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(snapshot);
  });

  it("blocks a simultaneous duplicate operation and reuses the exact authorization on retry", async () => {
    const client = mountMutation();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    let resolveSend!: (value: EventLineupExpansionResponse) => void;
    sendMock.mockImplementationOnce(
      () => new Promise<EventLineupExpansionResponse>((resolve) => (resolveSend = resolve))
    );
    sendMock.mockResolvedValueOnce(response);
    const authorization = authorizeLineupExpansion(snapshot, "confirmed");
    const first = submit?.(authorization);
    await Promise.resolve();
    await expect(submit?.(authorization)).rejects.toBeInstanceOf(
      EventLineupExpansionAlreadyInFlightError
    );
    expect(sendMock).toHaveBeenCalledTimes(1);
    resolveSend(response);
    await expect(first).resolves.toEqual(response);
    await submit?.(authorization);
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[0]?.[0]).toBe(snapshot);
    expect(sendMock.mock.calls[1]?.[0]).toBe(snapshot);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["events-festivals", "event-detail", eventId],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["events-festivals", "event-lineup", eventId],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["catalog", "artist-directory"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["events-festivals", "entity-resolution", "artist"],
    });
  });

  it("translates known internal errors and leaves their technical details out of the message", () => {
    const technicalId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const pending = new EventLineupExpansionConflictError(
      `IMPORT_OPERATION_IN_PROGRESS ${technicalId}`,
      "IMPORT_OPERATION_IN_PROGRESS",
      { eventId: technicalId }
    );
    const changedIdentity = new EventLineupExpansionConflictError(
      `IMPORT_OPERATION_ID_REUSED ${technicalId}`,
      "IMPORT_OPERATION_ID_REUSED",
      { eventId: technicalId }
    );

    expect(lineupExpansionErrorMessage(pending)).toBe(
      "No sabemos si la operación terminó. Comprueba el resultado reintentando la misma operación."
    );
    expect(lineupExpansionErrorMessage(changedIdentity)).toBe(
      "Esta operación ya no coincide con la solicitud original. No se puede reintentar con datos diferentes."
    );
    expect(lineupExpansionErrorMessage(changedIdentity)).not.toContain(technicalId);
    expect(lineupExpansionErrorMessage(changedIdentity)).not.toContain(
      "IMPORT_OPERATION_ID_REUSED"
    );
    expect(lineupExpansionFailureKind(changedIdentity)).toBe("global");
  });
});
