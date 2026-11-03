import { afterEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";
import { createEventImportSessionPayload } from "../application/eventImportSessionPayload";
import { createEventImportPreparer } from "../application/eventImportPreparation";
import type { EventGeographyState, LineupCellState } from "../application/useEventImportRows";
import {
  deleteEventImportSession,
  EventImportSessionStorageError,
  getEventImportSession,
  saveEventImportSession,
  type StoredEventImportSession,
} from "./eventImportSessionStorage";

const USER_A = "123e4567-e89b-42d3-a456-426614174001";
const USER_B = "123e4567-e89b-42d3-a456-426614174002";

function installIndexedDbMock() {
  const records = new Map<string, StoredEventImportSession>();
  const stores = new Set<string>();
  let shouldFail = false;

  const database = {
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore: (name: string) => stores.add(name),
    close: vi.fn(),
    transaction: () => {
      const transaction: {
        onabort: ((event: Event) => void) | null;
        oncomplete: ((event: Event) => void) | null;
        onerror: ((event: Event) => void) | null;
        error: Error | null;
        objectStore: () => unknown;
      } = {
        onabort: null,
        oncomplete: null,
        onerror: null,
        error: null,
        objectStore: () => ({
          get: (ownerId: string) => makeRequest(structuredClone(records.get(ownerId))),
          put: (record: StoredEventImportSession) => {
            const cloned = structuredClone(record);
            records.set(record.ownerId, cloned);
            return makeRequest(cloned.ownerId);
          },
          delete: (ownerId: string) => {
            records.delete(ownerId);
            return makeRequest(undefined);
          },
        }),
      };

      function makeRequest<T>(result: T) {
        const request: {
          onsuccess: ((event: Event) => void) | null;
          onerror: ((event: Event) => void) | null;
          result: T;
          error: Error | null;
        } = { onsuccess: null, onerror: null, result, error: null };
        setTimeout(() => {
          if (shouldFail) {
            request.error = new Error("quota exceeded");
            request.onerror?.(new Event("error"));
            transaction.error = request.error;
            transaction.onabort?.(new Event("abort"));
            return;
          }
          request.onsuccess?.(new Event("success"));
          transaction.oncomplete?.(new Event("complete"));
        }, 0);
        return request;
      }

      return transaction;
    },
  };

  const indexedDb = {
    open: () => {
      const request: {
        onupgradeneeded: (() => void) | null;
        onsuccess: (() => void) | null;
        onerror: (() => void) | null;
        onblocked: (() => void) | null;
        result: typeof database;
        error: Error | null;
      } = {
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null,
        result: database,
        error: null,
      };
      setTimeout(() => {
        if (!stores.has("sessions")) request.onupgradeneeded?.();
        request.onsuccess?.();
      }, 0);
      return request;
    },
  };

  vi.stubGlobal("indexedDB", indexedDb);
  return {
    records,
    failNextTransaction() {
      shouldFail = true;
    },
  };
}

describe("eventImportSessionStorage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("saves, reads and deletes sessions under separate UUID owners", async () => {
    installIndexedDbMock();
    const record: StoredEventImportSession = {
      ownerId: USER_A,
      formatVersion: 1,
      savedAt: "2026-11-01T12:00:00.000Z",
      payload: { rows: ["draft"] },
    };
    await saveEventImportSession(record);
    expect(await getEventImportSession(USER_A)).toEqual(record);
    expect(await getEventImportSession(USER_B)).toBeNull();
    await deleteEventImportSession(USER_A);
    expect(await getEventImportSession(USER_A)).toBeNull();
  });

  it("records a repeatable 50-row IndexedDB adapter write without a time threshold", async () => {
    installIndexedDbMock();
    const session: StoredEventImportSession = {
      ownerId: USER_A,
      formatVersion: 1,
      savedAt: "2026-11-03T12:00:00.000Z",
      payload: {
        rows: Array.from({ length: 50 }, (_, rowIndex) => ({
          id: `event-row-${rowIndex + 1}`,
          city: `City ${rowIndex + 1}`,
          lineup: Array.from({ length: 3 }, (_, artistIndex) => ({
            key: `lineup-item-${rowIndex}-${artistIndex}`,
            name: `Artist ${rowIndex}-${artistIndex}`,
          })),
        })),
      },
    };
    const startedAt = performance.now();
    await saveEventImportSession(session);
    const saveMs = Number((performance.now() - startedAt).toFixed(1));

    expect(await getEventImportSession(USER_A)).toEqual(session);
    console.info("EVENT_IMPORT_INDEXEDDB_PERFORMANCE", JSON.stringify({ rows: 50, saveMs }));
  });

  it("rejects malformed owner UUIDs and surfaces IndexedDB write errors", async () => {
    const mock = installIndexedDbMock();
    await expect(getEventImportSession("username")).rejects.toBeInstanceOf(
      EventImportSessionStorageError
    );
    mock.failNextTransaction();
    await expect(
      saveEventImportSession({
        ownerId: USER_A,
        formatVersion: 1,
        savedAt: "2026-11-01T12:00:00.000Z",
        payload: {},
      })
    ).rejects.toThrow("No se pudo acceder al borrador local.");
  });

  it("does not silently accept a malformed stored record", async () => {
    const mock = installIndexedDbMock();
    mock.records.set(USER_A, { ownerId: USER_B, formatVersion: 1, savedAt: "", payload: {} });
    await expect(getEventImportSession(USER_A)).rejects.toThrow("formato inválido");
  });

  it("reproduces DataCloneError for nested Vue proxies and saves the explicit session projection", async () => {
    const mock = installIndexedDbMock();
    const row = reactive({
      id: "event-row-1",
      type: "concert" as const,
      event: "",
      lineup: [
        { key: "lineup-item-1", name: "Artista existente", artistId: USER_B },
        { key: "lineup-item-2", name: "Artista nuevo", artistId: null },
      ],
      startDate: "2026-11-20",
      startDateDraft: "20/11/2026",
      endDate: null,
      endDateDraft: "",
      venue: { name: "Sala nueva", venueId: null, localityId: USER_A },
      price: "",
      otherInfo: "",
      city: "Santander",
      province: "Cantabria",
      administrativeRegionId: null,
      runtimeOnlyQueryResult: reactive({ promise: Promise.resolve("query") }),
    });
    const raw = {
      ownerId: USER_A,
      formatVersion: 1,
      savedAt: "2026-11-01T12:00:00.000Z",
      payload: { rows: [row] },
    } satisfies StoredEventImportSession;

    let cloneError: unknown;
    try {
      structuredClone(raw);
    } catch (error) {
      cloneError = error;
    }
    expect(cloneError).toMatchObject({ name: "DataCloneError" });
    await expect(saveEventImportSession(raw)).rejects.toMatchObject({
      name: "EventImportSessionStorageError",
      cause: { name: "DataCloneError" },
    });

    const locality = {
      id: USER_A,
      name: "Santander",
      province: "Cantabria",
      country: { id: USER_B, name: "España" },
      administrativeRegion: { id: USER_A, name: "Cantabria" },
    };
    const operationIds = [USER_B, "123e4567-e89b-42d3-a456-426614174003"];
    const preparation = createEventImportPreparer(
      () => operationIds.shift() ?? "123e4567-e89b-42d3-a456-426614174004"
    ).prepare({
      rows: [row],
      countryId: USER_B,
      countryAvailable: true,
      lineupStates: {
        [row.id]: {
          draft: "",
          draftStatus: "idle",
          itemStatus: {},
          draftError: null,
          itemResolution: {
            "lineup-item-1": {
              index: 0,
              name: "Artista existente",
              status: "existing",
              artist: { id: USER_B, name: "Artista existente" },
              candidates: [],
            },
            "lineup-item-2": {
              index: 1,
              name: "Artista nuevo",
              status: "new",
              artist: null,
              candidates: [],
            },
          },
        } satisfies LineupCellState,
      },
      geographyStates: {
        [row.id]: {
          localityStatus: "existing",
          localityCandidates: [],
          selectedLocality: locality,
          localitySelectionOriginalContext: null,
          localityResult: {
            index: 0,
            input: { name: "Santander", countryId: USER_B },
            status: "existing",
            locality,
            candidates: [],
          },
          localityError: null,
          venueStatus: "new",
          venueCandidates: [],
          selectedVenueCandidateId: null,
          venueError: null,
        } satisfies EventGeographyState,
      },
      tourStates: {},
    });
    expect(preparation.snapshot).not.toBeNull();
    expect(preparation.snapshot?.payload.rows[0]).toMatchObject({
      localityId: USER_A,
      venue: "Sala nueva",
      lineup: [{ name: "Artista existente", artistId: USER_B }, { name: "Artista nuevo" }],
    });

    const payload = createEventImportSessionPayload({
      countryId: USER_B,
      rows: [row],
      lineupStates: reactive({ [row.id]: { draft: "" } }),
      tourStates: reactive({ [row.id]: { confirmedTourId: null, selectedCandidateId: null } }),
      uncertainSnapshots: [
        preparation.snapshot,
        Object.freeze({
          batchId: "123e4567-e89b-42d3-a456-426614174003",
          countryId: USER_B,
          rows: Object.freeze([
            Object.freeze({
              rowKey: row.id,
              operationRowId: USER_B,
              revision: 1,
              dto: Object.freeze({
                rowId: USER_B,
                type: "concert",
                city: "Santander",
                startDate: "2026-11-20",
                lineup: Object.freeze([
                  Object.freeze({ name: "Artista existente", artistId: USER_B }),
                  Object.freeze({ name: "Artista nuevo" }),
                ]),
                localityId: USER_A,
              }),
            }),
          ]),
          payload: Object.freeze({
            batchId: USER_A,
            countryId: USER_B,
            rows: Object.freeze([Object.freeze({ rowId: USER_B, city: "Santander" })]),
          }),
        }),
      ],
      createdDrafts: {},
      appliedExpansionsByRow: {},
      protectedExpansionSnapshots: {
        [`${USER_A}:${USER_B}:${USER_A}`]: Object.freeze({
          kind: "event-lineup-expansion",
          eventId: USER_B,
          operation: Object.freeze({ batchId: USER_A, rowId: USER_A }),
          payload: Object.freeze({
            batchId: USER_A,
            rowId: USER_A,
            sourceRow: Object.freeze({ rowId: USER_A, countryId: USER_B }),
            artists: Object.freeze([Object.freeze({ name: "Artista nuevo" })]),
          }),
          correlation: Object.freeze({
            sourceRowKey: row.id,
            sourceOperationRowId: USER_B,
            sourceBatchId: USER_A,
            sourceRevision: 1,
            sourceSnapshot: Object.freeze({ rowId: USER_B, type: "concert" }),
          }),
        }),
      },
      conflictOperation: null,
      lastImport: null,
    });
    const saved = {
      ownerId: USER_A,
      formatVersion: 1,
      savedAt: "2026-11-01T12:00:01.000Z",
      payload,
    } satisfies StoredEventImportSession;
    await saveEventImportSession(saved);
    expect(await getEventImportSession(USER_A)).toEqual(saved);
    expect(mock.records.get(USER_A)?.payload).toMatchObject({
      countryId: USER_B,
      rows: [
        {
          venue: { name: "Sala nueva", localityId: USER_A },
          lineup: [
            { artistId: USER_B, name: "Artista existente" },
            { artistId: null, name: "Artista nuevo" },
          ],
        },
      ],
    });
    expect((payload as { rows: Array<Record<string, unknown>> }).rows[0]).not.toHaveProperty(
      "runtimeOnlyQueryResult"
    );
    expect(
      (payload as { uncertainSnapshots: Array<Record<string, unknown>> }).uncertainSnapshots[0]
    ).toMatchObject({
      batchId: "123e4567-e89b-42d3-a456-426614174003",
      rows: [{ operationRowId: USER_B }],
    });
    expect(
      Object.values(
        (
          payload as {
            protectedExpansionSnapshots: Record<string, { operation: { rowId: string } }>;
          }
        ).protectedExpansionSnapshots
      )[0]?.operation.rowId
    ).toBe(USER_A);
    expect(
      Object.values(
        (
          payload as {
            protectedExpansionSnapshots: Record<string, Record<string, unknown>>;
          }
        ).protectedExpansionSnapshots
      )[0]
    ).toMatchObject({
      eventId: USER_B,
      operation: { batchId: USER_A, rowId: USER_A },
      payload: {
        sourceRow: { rowId: USER_A, countryId: USER_B },
        artists: [{ name: "Artista nuevo" }],
      },
      correlation: {
        sourceRowKey: row.id,
        sourceBatchId: USER_A,
        sourceOperationRowId: USER_B,
      },
    });
  });
});
