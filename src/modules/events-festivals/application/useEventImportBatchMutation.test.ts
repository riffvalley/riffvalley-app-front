// @vitest-environment happy-dom
import { defineComponent } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportSnapshot } from "./eventImportPreparation";
import type { ImportBatchResponse } from "../api/eventImport";
import {
  eventImportErrorCanRetry,
  eventImportGlobalErrorMessage,
  useEventImportBatchMutation,
} from "./useEventImportBatchMutation";
import { ImportBatchProtocolError } from "../api/eventImport";

const { importEventBatchMock } = vi.hoisted(() => ({ importEventBatchMock: vi.fn() }));
vi.mock("../api/eventImport", () => ({
  importEventBatch: importEventBatchMock,
  ImportBatchProtocolError: class ImportBatchProtocolError extends Error {},
}));
vi.mock("@/modules/catalog/artists", () => ({
  artistDirectoryQueryKey: ["catalog", "artist-directory"],
}));
vi.mock("@/modules/venues", () => ({
  venueCatalogQueryKey: ["venues", "catalog"],
}));

const snapshot = Object.freeze({
  batchId: "batch",
  rows: Object.freeze([]),
}) as unknown as ImportSnapshot;

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  let mutation!: ReturnType<typeof useEventImportBatchMutation>;
  const host = defineComponent({
    setup() {
      mutation = useEventImportBatchMutation();
      return () => null;
    },
  });
  const wrapper = mount(host, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
  return { queryClient, mutation, wrapper };
}

function response(status: "created" | "conflict"): ImportBatchResponse {
  return {
    batchId: "batch",
    results: [
      {
        operationRowId: "row",
        rowKey: "draft-row",
        revision: 3,
        result:
          status === "created"
            ? { rowId: "row", status, eventId: "event" }
            : { rowId: "row", status, code: "DUPLICATE" },
      },
    ],
  };
}

describe("useEventImportBatchMutation", () => {
  beforeEach(() => importEventBatchMock.mockReset());

  it("sends the same immutable snapshot, disables automatic retry, and invalidates catalog lookups only when created", async () => {
    const { queryClient, mutation, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);
    importEventBatchMock.mockResolvedValue(response("conflict"));

    const conflictResult = await mutation.mutateAsync(snapshot);
    expect(importEventBatchMock).toHaveBeenCalledTimes(1);
    expect(importEventBatchMock).toHaveBeenCalledWith(snapshot);
    expect(conflictResult.results[0]?.revision).toBe(3);
    expect(invalidate).not.toHaveBeenCalled();

    importEventBatchMock.mockResolvedValue(response("created"));
    await mutation.mutateAsync(snapshot);
    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["events-festivals"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["catalog", "artist-directory"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["venues", "catalog"] });
    wrapper.unmount();
    queryClient.clear();
  });

  it("blocks a simultaneous request for the same snapshot and leaves a failed network request for explicit retry", async () => {
    const { mutation, wrapper, queryClient } = setup();
    let finish!: (value: ImportBatchResponse) => void;
    importEventBatchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );

    const first = mutation.mutateAsync(snapshot);
    await expect(mutation.mutateAsync(snapshot)).rejects.toMatchObject({
      name: "EventImportBatchAlreadyInFlightError",
    });
    expect(importEventBatchMock).toHaveBeenCalledTimes(1);
    finish(response("created"));
    await first;
    expect(importEventBatchMock).toHaveBeenCalledTimes(1);

    const failure = new Error("network timeout after possible commit");
    importEventBatchMock.mockRejectedValueOnce(failure);
    await expect(mutation.mutateAsync(snapshot)).rejects.toBe(failure);
    expect(importEventBatchMock).toHaveBeenLastCalledWith(snapshot);
    expect(importEventBatchMock).toHaveBeenCalledTimes(2);

    // The caller owns explicit retry and sends the original operation identifiers again.
    importEventBatchMock.mockResolvedValueOnce(response("created"));
    await mutation.mutateAsync(snapshot);
    expect(importEventBatchMock).toHaveBeenCalledTimes(3);
    expect(importEventBatchMock.mock.calls[0]?.[0]).toBe(importEventBatchMock.mock.calls[2]?.[0]);
    wrapper.unmount();
    await flushPromises();
    queryClient.clear();
  });

  it("distinguishes global HTTP errors and allows only explicit retries for recoverable outcomes", () => {
    const httpError = (status: number) =>
      Object.assign(new Error("sensitive server body"), {
        isAxiosError: true,
        response: { status },
      });

    expect(eventImportGlobalErrorMessage(httpError(400))).toContain("estructura");
    expect(eventImportGlobalErrorMessage(httpError(401))).toContain("sesión");
    expect(eventImportGlobalErrorMessage(httpError(403))).toContain("permisos");
    expect(eventImportGlobalErrorMessage(httpError(404))).toContain("no está disponible");
    expect(eventImportGlobalErrorMessage(httpError(503))).toContain(
      "No se pudo completar la operación"
    );
    expect(eventImportGlobalErrorMessage(httpError(503))).not.toContain("sensitive server body");
    expect(eventImportErrorCanRetry(httpError(400))).toBe(false);
    expect(eventImportErrorCanRetry(httpError(401))).toBe(false);
    expect(eventImportErrorCanRetry(httpError(503))).toBe(true);
    expect(eventImportErrorCanRetry(new Error("network timeout"))).toBe(true);
    expect(eventImportErrorCanRetry(new ImportBatchProtocolError("malformed"))).toBe(true);
  });
});
