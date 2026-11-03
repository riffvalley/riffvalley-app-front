<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { computed, nextTick, shallowRef, watch } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import EventImportTable from "../components/EventImportTable.vue";
import EventImportCountrySelector from "../components/EventImportCountrySelector.vue";
import { useEventImportRows, type EventImportRow } from "../../application/useEventImportRows";
import { useEventImportGeography } from "../../application/useEventImportGeography";
import {
  createEventImportPreparer,
  type ImportPreparation,
} from "../../application/eventImportPreparation";
import {
  eventImportErrorCanRetry,
  eventImportGlobalErrorMessage,
  useEventImportBatchMutation,
} from "../../application/useEventImportBatchMutation";
import {
  countDistinctCreatedEvents,
  reconcileEventImportResults,
} from "../../application/eventImportReconciliation";
import type { ImportBatchResponse } from "../../api/eventImport";
import {
  createEventImportConflictPresentation,
  type EventImportConflictPresentation,
} from "../../application/eventImportConflicts";
import { createEventLineupExpansionPreparer } from "../../application/eventLineupExpansionPreparation";
import type { CorrelatedImportResult } from "../../api/eventImport";
import { existingEventDetailQueryOptions } from "../../api/eventImport";
import SwalService from "@/services/swal/SwalService";
import {
  authorizeLineupExpansion,
  lineupExpansionErrorMessage,
  lineupExpansionFailureKind,
  useEventLineupExpansionMutation,
  type ConfirmedLineupExpansion,
  type EventLineupExpansionExecution,
} from "../../application/useEventLineupExpansionMutation";
import {
  lineupExpansionOperationKey,
  reconcileLineupExpansionResult,
} from "../../application/eventLineupExpansionReconciliation";
import { lineupExpansionConfirmationSignature } from "../../application/eventLineupExpansionPreparation";
import type { EventLineupExpansionResponse } from "../../api/eventLineupExpansion";
import { useEventImportSession } from "../../application/useEventImportSession";
import { createEventImportSessionPayload } from "../../application/eventImportSessionPayload";
import { EVENT_IMPORT_SESSION_FORMAT_VERSION } from "../../infrastructure/eventImportSessionStorage";

const queryClient = useQueryClient();
const auth = useAuthStore();
const eventImport = useEventImportRows(queryClient);
const { rows, lineupStates, geographyStates, tourStates, addRow, removeRow } = eventImport;
const geography = useEventImportGeography(eventImport.invalidateGeographicAssociations);
const preparer = createEventImportPreparer();
const lineupExpansionPreparer = createEventLineupExpansionPreparer();
const initialPreparation: ImportPreparation = {
  payload: null,
  snapshot: null,
  eligibleRows: [],
  pendingRows: [],
  errors: [],
  correlation: {},
};
const preparation = shallowRef(initialPreparation);
const batchMutation = useEventImportBatchMutation();
const expansionMutation = useEventLineupExpansionMutation();
const uncertainSnapshots = shallowRef<NonNullable<ImportPreparation["snapshot"]>[]>([]);
const handledOperations = new Set<string>();
const handledOperationOrder: string[] = [];
const createdDrafts = shallowRef<Record<string, { eventId: string; operationRowId: string }>>({});
const lastImport = shallowRef<{
  response: ImportBatchResponse;
  rows: ReturnType<typeof reconcileEventImportResults>["results"];
} | null>(null);
const conflictOperation = shallowRef<{
  snapshot: NonNullable<ImportPreparation["snapshot"]>;
  results: CorrelatedImportResult[];
} | null>(null);
const selectedRowKeys = shallowRef<Set<string>>(new Set());
const discardInProgress = shallowRef(false);
const confirmedExpansionSignatures = shallowRef<Record<string, string>>({});
const selectedExpansionEventIds = shallowRef<Record<string, string>>({});
const expansionExecutions = shallowRef<Record<string, EventLineupExpansionExecution>>({});
const expansionAuthorizations = shallowRef<Record<string, ConfirmedLineupExpansion>>({});
const handledExpansionOperations = new Set<string>();
const appliedExpansionsByRow = shallowRef<
  Record<string, { eventId: string; operationKey: string }>
>({});
const expansionHistory = shallowRef<
  Array<{
    operationKey: string;
    rowKey: string;
    eventId: string;
    startDate: string;
    result: EventLineupExpansionResponse;
    reconciliation: "removed" | "kept" | "already-handled";
  }>
>([]);
const session = useEventImportSession();
const recoverySession = shallowRef<unknown | null>(null);
const recoveryError = shallowRef("");
const identityReady = shallowRef(false);
const criticalStorageError = shallowRef("");
const protectedSnapshots = shallowRef<NonNullable<ImportPreparation["snapshot"]>[]>([]);
const pendingSnapshotBatchIds = shallowRef<Set<string>>(new Set());
const protectedExpansionSnapshots = shallowRef<
  Record<
    string,
    import("../../application/eventLineupExpansionPreparation").LineupExpansionSnapshot
  >
>({});
const sessionOwnerId = computed(() =>
  auth.authStatus === "authenticated" && auth.userId && isUuid(auth.userId) ? auth.userId : null
);
const previousSessionOwnerId = shallowRef<string | null>(null);
const saveStatusLabel = computed(
  () =>
    ({
      saved: "Guardado",
      dirty: "Cambios pendientes",
      saving: "Guardando…",
      error: "Error al guardar",
    })[session.status.value]
);
const lastSavedLabel = computed(() =>
  session.lastSavedAt.value ? new Date(session.lastSavedAt.value).toLocaleString("es-ES") : ""
);
const recoveryStats = computed(() => {
  const payload = session.storedSession.value?.payload;
  if (!isRecoverablePayload(payload)) return null;
  return {
    rows: payload.rows.length,
    uncertain:
      (Array.isArray(payload.uncertainSnapshots) ? payload.uncertainSnapshots.length : 0) +
      (isRecord(payload.protectedExpansionSnapshots)
        ? Object.keys(payload.protectedExpansionSnapshots).length
        : 0),
  };
});

function rowHasDraftContent(row: (typeof rows.value)[number]): boolean {
  const lineupState = lineupStates[row.id];
  return Boolean(
    row.event.trim() ||
    row.lineup.length ||
    lineupState?.draft.trim() ||
    row.startDateDraft.trim() ||
    row.endDateDraft.trim() ||
    row.city.trim() ||
    row.province.trim() ||
    row.venue.name.trim() ||
    row.price.trim() ||
    row.otherInfo.trim() ||
    row.administrativeRegionId ||
    row.type !== "concert"
  );
}

function sessionPayload() {
  return createEventImportSessionPayload({
    countryId: geography.selectedCountryId.value,
    rows: rows.value,
    lineupStates: Object.fromEntries(
      rows.value.map(({ id }) => [id, { draft: lineupStates[id]?.draft ?? "" }])
    ),
    tourStates: Object.fromEntries(
      rows.value.map(({ id }) => [
        id,
        {
          confirmedTourId: tourStates[id]?.confirmedTourId ?? null,
          selectedCandidateId: tourStates[id]?.selectedCandidateId ?? null,
        },
      ])
    ),
    uncertainSnapshots: protectedSnapshots.value,
    createdDrafts: createdDrafts.value,
    appliedExpansionsByRow: appliedExpansionsByRow.value,
    protectedExpansionSnapshots: protectedExpansionSnapshots.value,
    conflictOperation: conflictOperation.value,
    lastImport: lastImport.value,
  });
}

function sessionHasWork(): boolean {
  return (
    rows.value.some(rowHasDraftContent) ||
    protectedSnapshots.value.length > 0 ||
    Object.keys(createdDrafts.value).length > 0 ||
    Object.keys(appliedExpansionsByRow.value).length > 0 ||
    Object.keys(protectedExpansionSnapshots.value).length > 0
  );
}

session.configure(sessionPayload, sessionHasWork);
session.startAutosave();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function isValidImportRow(value: unknown): value is EventImportRow {
  if (!isRecord(value) || !/^event-row-[1-9]\d*$/u.test(String(value.id))) return false;
  if (!["concert", "festival", "tour"].includes(String(value.type))) return false;
  if (
    !["event", "price", "otherInfo", "city", "province", "startDateDraft", "endDateDraft"].every(
      (key) => typeof value[key] === "string"
    )
  )
    return false;
  if (
    !["startDate", "endDate"].every((key) => value[key] === null || typeof value[key] === "string")
  )
    return false;
  if (!isRecord(value.venue) || typeof value.venue.name !== "string") return false;
  if (
    ![value.venue.venueId, value.venue.localityId, value.administrativeRegionId].every(
      (id) => id === null || (typeof id === "string" && isUuid(id))
    )
  )
    return false;
  if (!Array.isArray(value.lineup)) return false;
  return value.lineup.every(
    (item) =>
      isRecord(item) &&
      /^lineup-item-[1-9]\d*$/u.test(String(item.key)) &&
      typeof item.name === "string" &&
      (item.artistId === null || (typeof item.artistId === "string" && isUuid(item.artistId)))
  );
}

function isValidImportSnapshot(value: unknown): boolean {
  return (
    isRecord(value) &&
    isUuid(String(value.batchId)) &&
    isUuid(String(value.countryId)) &&
    isRecord(value.payload) &&
    value.payload.batchId === value.batchId &&
    Array.isArray(value.rows) &&
    value.rows.length > 0 &&
    value.rows.length <= 100 &&
    value.rows.every(
      (row) =>
        isRecord(row) &&
        typeof row.rowKey === "string" &&
        isUuid(String(row.operationRowId)) &&
        Number.isInteger(row.revision) &&
        isRecord(row.dto) &&
        row.dto.rowId === row.operationRowId
    ) &&
    Array.isArray(value.payload.rows) &&
    value.payload.rows.length === value.rows.length &&
    value.rows.every((row, index) => {
      const dto = value.payload.rows[index];
      return isRecord(dto) && dto.rowId === row.operationRowId;
    })
  );
}

function isValidExpansionSnapshot(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.kind === "event-lineup-expansion" &&
    isUuid(String(value.eventId)) &&
    isRecord(value.operation) &&
    isUuid(String(value.operation.batchId)) &&
    isUuid(String(value.operation.rowId)) &&
    isRecord(value.payload) &&
    value.payload.batchId === value.operation.batchId &&
    value.payload.rowId === value.operation.rowId &&
    isRecord(value.payload.sourceRow) &&
    isRecord(value.correlation) &&
    value.payload.sourceRow.rowId === value.operation.rowId &&
    typeof value.correlation.sourceRowKey === "string" &&
    isUuid(String(value.correlation.sourceOperationRowId)) &&
    isUuid(String(value.correlation.sourceBatchId)) &&
    isRecord(value.correlation.sourceSnapshot) &&
    Array.isArray(value.payload.artists) &&
    value.payload.artists.length > 0 &&
    value.payload.artists.length <= 100 &&
    value.payload.artists.every(
      (artist) =>
        isRecord(artist) &&
        typeof artist.name === "string" &&
        (artist.artistId === undefined || isUuid(String(artist.artistId)))
    )
  );
}

function isRecoverablePayload(value: unknown): value is ReturnType<typeof sessionPayload> {
  if (
    !isRecord(value) ||
    (value.countryId !== "" && (typeof value.countryId !== "string" || !isUuid(value.countryId))) ||
    !Array.isArray(value.rows)
  )
    return false;
  const rowIds = new Set<string>();
  const lineupKeys = new Set<string>();
  const validRows = value.rows.every((row) => {
    if (!isValidImportRow(row) || rowIds.has(row.id)) return false;
    rowIds.add(row.id);
    for (const item of row.lineup) {
      if (lineupKeys.has(item.key)) return false;
      lineupKeys.add(item.key);
    }
    return true;
  });
  const validLineupStates =
    isRecord(value.lineupStates) &&
    Object.values(value.lineupStates).every(
      (state) => isRecord(state) && typeof state.draft === "string"
    );
  const validTourStates =
    isRecord(value.tourStates) &&
    Object.values(value.tourStates).every(
      (state) =>
        isRecord(state) &&
        [state.confirmedTourId, state.selectedCandidateId].every(
          (id) => id === null || (typeof id === "string" && isUuid(id))
        )
    );
  const validCreatedDrafts =
    isRecord(value.createdDrafts) &&
    Object.values(value.createdDrafts).every(
      (draft) =>
        isRecord(draft) && isUuid(String(draft.eventId)) && isUuid(String(draft.operationRowId))
    );
  const validAppliedExpansions =
    isRecord(value.appliedExpansionsByRow) &&
    Object.values(value.appliedExpansionsByRow).every(
      (applied) =>
        isRecord(applied) &&
        isUuid(String(applied.eventId)) &&
        typeof applied.operationKey === "string"
    );
  return (
    validRows &&
    validLineupStates &&
    validTourStates &&
    Array.isArray(value.uncertainSnapshots) &&
    value.uncertainSnapshots.every(isValidImportSnapshot) &&
    validCreatedDrafts &&
    validAppliedExpansions &&
    isRecord(value.protectedExpansionSnapshots) &&
    Object.values(value.protectedExpansionSnapshots).every(isValidExpansionSnapshot) &&
    (value.conflictOperation === null || isRecord(value.conflictOperation)) &&
    (value.lastImport === null || isRecord(value.lastImport))
  );
}

function payloadHasRecoverableWork(payload: ReturnType<typeof sessionPayload>): boolean {
  return (
    payload.rows.some(rowHasDraftContent) ||
    payload.uncertainSnapshots.length > 0 ||
    Object.keys(payload.createdDrafts).length > 0 ||
    Object.keys(payload.appliedExpansionsByRow).length > 0 ||
    Object.keys(payload.protectedExpansionSnapshots).length > 0
  );
}

watch(
  () => [
    rows.value,
    rows.value.map(({ id }) => lineupStates[id]?.draft ?? ""),
    rows.value.map(({ id }) => tourStates[id]?.confirmedTourId ?? null),
    geography.selectedCountryId.value,
    protectedSnapshots.value,
    createdDrafts.value,
    appliedExpansionsByRow.value,
    protectedExpansionSnapshots.value,
    conflictOperation.value,
    lastImport.value,
  ],
  () => {
    if (identityReady.value) session.markDirty();
  },
  { deep: true }
);

watch(
  sessionOwnerId,
  async (ownerId) => {
    const shouldClearPreviousAccount =
      previousSessionOwnerId.value !== null && previousSessionOwnerId.value !== ownerId;
    previousSessionOwnerId.value = ownerId;
    identityReady.value = false;
    recoverySession.value = null;
    recoveryError.value = "";
    if (shouldClearPreviousAccount) {
      eventImport.resetRows();
      geography.selectedCountryId.value = "";
      uncertainSnapshots.value = [];
      protectedSnapshots.value = [];
      pendingSnapshotBatchIds.value = new Set();
      protectedExpansionSnapshots.value = {};
      createdDrafts.value = {};
      appliedExpansionsByRow.value = {};
      conflictOperation.value = null;
      lastImport.value = null;
      expansionHistory.value = [];
      expansionExecutions.value = {};
      handledOperations.clear();
      handledOperationOrder.splice(0);
      handledExpansionOperations.clear();
    }
    if (!ownerId) {
      session.changeOwner(null);
      return;
    }
    session.changeOwner(ownerId);
    try {
      const saved = await session.load(ownerId);
      if (sessionOwnerId.value !== ownerId) return;
      if (saved) {
        if (saved.formatVersion !== EVENT_IMPORT_SESSION_FORMAT_VERSION) {
          recoveryError.value =
            "El borrador se creó con otra versión y no se puede restaurar. Puedes descartarlo.";
          recoverySession.value = saved;
        } else if (!isRecoverablePayload(saved.payload)) {
          recoveryError.value =
            "El borrador local no supera la validación. No se ha restaurado y puedes descartarlo.";
          recoverySession.value = saved;
        } else if (payloadHasRecoverableWork(saved.payload)) {
          recoverySession.value = saved;
        }
      } else if (shouldClearPreviousAccount) {
        if (!geography.countryOptions.value.length) await geography.countriesQuery.refetch();
        if (sessionOwnerId.value !== ownerId) return;
        const defaultCountry = geography.countryOptions.value.find(
          ({ isoCode }) => isoCode === "ES"
        );
        if (defaultCountry) geography.restoreCountry(defaultCountry.id);
      }
    } catch {
      recoveryError.value =
        "No se pudo leer el borrador local. Los datos no se han eliminado; puedes reintentar desde el indicador de guardado.";
    } finally {
      if (sessionOwnerId.value === ownerId) {
        identityReady.value = true;
        if (sessionHasWork()) session.markDirty();
      }
    }
  },
  { immediate: true }
);

async function recoverSession() {
  const saved = session.storedSession.value;
  if (
    !saved ||
    saved.formatVersion !== EVENT_IMPORT_SESSION_FORMAT_VERSION ||
    !isRecoverablePayload(saved.payload)
  )
    return;
  const payload = saved.payload;
  if (geography.countriesQuery.isPending.value) await geography.countriesQuery.refetch();
  if (sessionOwnerId.value !== saved.ownerId) return;
  if (payload.countryId && !geography.restoreCountry(payload.countryId)) {
    recoveryError.value =
      "El país del borrador ya no está disponible en el catálogo. No se ha restaurado para evitar resolver entidades con otro país.";
    return;
  }
  eventImport.restoreRows(
    payload.rows as typeof rows.value,
    (payload.lineupStates ?? {}) as typeof lineupStates,
    (payload.tourStates ?? {}) as typeof tourStates
  );
  protectedSnapshots.value = Array.isArray(payload.uncertainSnapshots)
    ? (payload.uncertainSnapshots.map((snapshot) =>
        deepFreeze(snapshot)
      ) as typeof protectedSnapshots.value)
    : [];
  uncertainSnapshots.value = protectedSnapshots.value;
  createdDrafts.value = isRecord(payload.createdDrafts)
    ? (payload.createdDrafts as typeof createdDrafts.value)
    : {};
  appliedExpansionsByRow.value = isRecord(payload.appliedExpansionsByRow)
    ? (payload.appliedExpansionsByRow as typeof appliedExpansionsByRow.value)
    : {};
  protectedExpansionSnapshots.value = isRecord(payload.protectedExpansionSnapshots)
    ? (Object.fromEntries(
        Object.entries(payload.protectedExpansionSnapshots).map(([key, snapshot]) => [
          key,
          deepFreeze(snapshot),
        ])
      ) as typeof protectedExpansionSnapshots.value)
    : {};
  conflictOperation.value = isRecord(payload.conflictOperation)
    ? (payload.conflictOperation as typeof conflictOperation.value)
    : null;
  lastImport.value = isRecord(payload.lastImport)
    ? (payload.lastImport as typeof lastImport.value)
    : null;
  recoverySession.value = null;
  recoveryError.value = "";
  session.markDirty();
}

async function retryStorageRead() {
  const ownerId = sessionOwnerId.value;
  if (!ownerId) return;
  try {
    const saved = await session.load(ownerId);
    if (sessionOwnerId.value !== ownerId) return;
    recoveryError.value = "";
    if (saved) {
      recoverySession.value = saved;
      if (saved.formatVersion !== EVENT_IMPORT_SESSION_FORMAT_VERSION) {
        recoveryError.value =
          "El borrador se creó con otra versión y no se puede restaurar. Puedes descartarlo.";
      } else if (!isRecoverablePayload(saved.payload)) {
        recoveryError.value =
          "El borrador local no supera la validación. No se ha restaurado y puedes descartarlo.";
      } else if (!payloadHasRecoverableWork(saved.payload)) {
        recoverySession.value = null;
      }
    }
  } catch {
    recoveryError.value = "No se pudo leer el borrador local. No se han eliminado datos.";
  }
}

async function discardSession() {
  const saved = session.storedSession.value;
  const operationOwner = sessionOwnerId.value;
  if (!saved || !operationOwner || saved.ownerId !== operationOwner) return;
  const hasUncertain =
    protectedSnapshots.value.length > 0 ||
    Object.keys(protectedExpansionSnapshots.value).length > 0 ||
    (isRecoverablePayload(saved.payload) &&
      ((saved.payload.uncertainSnapshots?.length ?? 0) > 0 ||
        Object.keys(saved.payload.protectedExpansionSnapshots).length > 0));
  const result = await SwalService.confirm(
    "¿Descartar la sesión local?",
    `Se eliminarán los borradores locales. Los eventos ya guardados no se eliminarán.${hasUncertain ? " Una operación puede haberse completado; al descartar el borrador ya no podrás comprobar su resultado." : ""}`,
    "Descartar sesión",
    "Cancelar"
  );
  if (!result.isConfirmed) return;
  if (sessionOwnerId.value !== operationOwner) return;
  await session.discard(saved.ownerId);
  recoverySession.value = null;
  recoveryError.value = "";
  eventImport.resetRows();
  uncertainSnapshots.value = [];
  protectedSnapshots.value = [];
  createdDrafts.value = {};
  appliedExpansionsByRow.value = {};
  protectedExpansionSnapshots.value = {};
}

function retrySessionSave() {
  if (!identityReady.value) {
    criticalStorageError.value =
      "Espera a que termine la comprobación del borrador local antes de guardar.";
    return;
  }
  void session
    .saveNow()
    .then(() => {
      criticalStorageError.value = "";
    })
    .catch(() => {
      criticalStorageError.value =
        "El almacenamiento local sigue sin responder. El borrador permanece en memoria y la operación crítica no se enviará.";
    });
}
const expansionExecutionCounts = computed(() => {
  const executions = Object.values(expansionExecutions.value);
  return {
    uncertain: executions.filter(({ state }) => state === "uncertain").length,
    conflicts: executions.filter(({ state }) => state === "conflict").length,
    failures: executions.filter(({ state }) => state === "failed").length,
  };
});

function expansionConfirmationKey(conflict: EventImportConflictPresentation): string {
  return JSON.stringify([
    conflict.operationId,
    conflict.operationRowId,
    conflict.code,
    conflict.existingEventIds,
    conflict.candidateEventIds,
    conflict.relatedRows.map(({ operationRowId }) => operationRowId),
  ]);
}

function expansionExecutionKey(conflict: EventImportConflictPresentation): string {
  return expansionConfirmationKey(conflict);
}

function getExpansionExecution(
  conflict: EventImportConflictPresentation
): EventLineupExpansionExecution | null {
  return expansionExecutions.value[expansionExecutionKey(conflict)] ?? null;
}

function getExpansionConfirmation(conflict: EventImportConflictPresentation): string | null {
  return confirmedExpansionSignatures.value[expansionConfirmationKey(conflict)] ?? null;
}

function setExpansionConfirmation(
  conflict: EventImportConflictPresentation,
  signature: string | null
) {
  const key = expansionConfirmationKey(conflict);
  const next = { ...confirmedExpansionSignatures.value };
  if (signature) next[key] = signature;
  else delete next[key];
  confirmedExpansionSignatures.value = next;
}

function getExpansionSelection(conflict: EventImportConflictPresentation): string | null {
  return selectedExpansionEventIds.value[expansionConfirmationKey(conflict)] ?? null;
}

function setExpansionSelection(conflict: EventImportConflictPresentation, eventId: string | null) {
  const key = expansionConfirmationKey(conflict);
  const next = { ...selectedExpansionEventIds.value };
  if (eventId) next[key] = eventId;
  else delete next[key];
  selectedExpansionEventIds.value = next;
}

const conflictsByRowKey = computed(() => {
  const operation = conflictOperation.value;
  if (!operation) return {};
  const existingRowKeys = new Set(rows.value.map(({ id }) => id));
  const presentations = createEventImportConflictPresentation(
    operation.snapshot,
    operation.results,
    existingRowKeys,
    (rowKey) =>
      existingRowKeys.has(rowKey) && preparer.isCurrent(operation.snapshot, rowKey, currentInput())
  );
  return presentations.reduce<Record<string, typeof presentations>>((groups, conflict) => {
    (groups[conflict.rowKey] ??= []).push(conflict);
    return groups;
  }, {});
});

function prepareLineupExpansionForConflict(
  rowKey: string,
  operationRowId: string,
  selectedEventId?: string
) {
  const conflict = conflictsByRowKey.value[rowKey]?.find(
    (candidate) => candidate.operationRowId === operationRowId
  );
  if (!conflict) return null;
  const currentRows = new Map(rows.value.map((row) => [row.id, row]));
  const revisions = new Map([
    ...preparation.value.eligibleRows.map(({ rowKey, revision }) => [rowKey, revision] as const),
    ...preparation.value.pendingRows.map(({ rowKey, revision }) => [rowKey, revision] as const),
  ]);
  return lineupExpansionPreparer.prepare({
    conflict,
    currentRow: currentRows.get(conflict.rowKey),
    lineupState: lineupStates[conflict.rowKey],
    currentRevision: revisions.get(conflict.rowKey),
    rowCreated: Boolean(createdDrafts.value[conflict.rowKey]),
    creationUncertain: uncertainSnapshots.value.some((snapshot) =>
      snapshot.rows.some(({ rowKey: snapshotRowKey }) => snapshotRowKey === conflict.rowKey)
    ),
    selectedEventId,
  });
}

function prepareLineupExpansion(
  conflict: EventImportConflictPresentation,
  selectedEventId?: string
) {
  return prepareLineupExpansionForConflict(
    conflict.rowKey,
    conflict.operationRowId,
    selectedEventId
  );
}

function canReviewLineupExpansion(conflict: EventImportConflictPresentation): boolean {
  if (
    Object.values(protectedExpansionSnapshots.value).some(
      (snapshot) => snapshot.correlation.sourceRowKey === conflict.rowKey
    )
  )
    return false;
  if (
    conflict.status !== "current" ||
    (!conflict.existingEventIds.length && !conflict.candidateEventIds.length) ||
    !conflict.matchingArtists.length
  )
    return false;
  const isApplicableConflict =
    (conflict.snapshot.type === "festival" && conflict.code === "FESTIVAL_DUPLICATE") ||
    (conflict.snapshot.type !== "festival" &&
      (conflict.code === "CONCERT_DUPLICATE" ||
        conflict.code === "CONCERT_ARTIST_DATE_LOCALITY_CONFLICT"));
  if (!isApplicableConflict) return false;
  const prepared = prepareLineupExpansion(conflict);
  if (!prepared || prepared.state === "obsolete") return false;
  if (
    prepared.state === "pending" &&
    prepared.pendingReasons.some((reason) =>
      [
        "source-row-missing",
        "source-row-changed",
        "row-created",
        "creation-operation-uncertain",
        "row-discarded",
      ].includes(reason)
    )
  )
    return false;
  return true;
}

async function executeConfirmedExpansion(
  conflict: EventImportConflictPresentation,
  confirmationSignature: string
) {
  const operationOwner = sessionOwnerId.value;
  if (!identityReady.value || !operationOwner) return;
  const uiKey = expansionExecutionKey(conflict);
  if (expansionMutation.isPending.value || getExpansionExecution(conflict)?.state === "sending")
    return;
  if (getExpansionConfirmation(conflict) !== confirmationSignature) {
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: "invalid",
        message:
          "La autorización ya no coincide con la propuesta revisada. Revisa y confirma de nuevo.",
      },
    };
    return;
  }

  const currentConflict = conflictsByRowKey.value[conflict.rowKey]?.find(
    (candidate) =>
      candidate.operationId === conflict.operationId &&
      candidate.operationRowId === conflict.operationRowId &&
      candidate.code === conflict.code
  );
  const selectedEventId = getExpansionSelection(conflict) ?? undefined;
  const currentPreparation = currentConflict
    ? prepareLineupExpansion(currentConflict, selectedEventId)
    : null;
  if (
    !currentConflict ||
    currentConflict.status !== "current" ||
    currentPreparation?.state !== "ready"
  ) {
    setExpansionConfirmation(conflict, null);
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: "invalid",
        message: "La fila o el conflicto cambió. Vuelve a revisar la propuesta actual.",
      },
    };
    return;
  }
  const snapshot = currentPreparation.snapshot;
  const previousAuthorization = expansionAuthorizations.value[uiKey];
  if (
    previousAuthorization &&
    getExpansionExecution(conflict)?.state === "uncertain" &&
    JSON.stringify(previousAuthorization.snapshot) !== JSON.stringify(snapshot)
  ) {
    setExpansionConfirmation(conflict, null);
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: "invalid",
        message:
          "La propuesta ya no coincide con la operación autorizada. Revísala y confirma una nueva propuesta.",
      },
    };
    return;
  }
  const operationKey = lineupExpansionOperationKey(snapshot);
  if (handledExpansionOperations.has(operationKey)) return;
  if (
    uncertainSnapshots.value.some((pending) =>
      pending.rows.some(({ rowKey }) => rowKey === conflict.rowKey)
    )
  ) {
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: "invalid",
        message: "La creación original sigue incierta y bloquea esta ampliación.",
      },
    };
    return;
  }

  try {
    const eventContext = await queryClient.fetchQuery({
      ...existingEventDetailQueryOptions(snapshot.eventId),
      staleTime: 0,
    });
    if (sessionOwnerId.value !== operationOwner) return;
    const freshSignature = lineupExpansionConfirmationSignature(
      snapshot,
      currentConflict,
      eventContext
    );
    const retryingUncertainOperation = getExpansionExecution(conflict)?.state === "uncertain";
    if (
      (!retryingUncertainOperation && freshSignature !== confirmationSignature) ||
      getExpansionConfirmation(currentConflict) !== confirmationSignature
    ) {
      setExpansionConfirmation(currentConflict, null);
      expansionExecutions.value = {
        ...expansionExecutions.value,
        [uiKey]: {
          state: "invalid",
          message:
            "El destino cambió desde la revisión. Inspecciona de nuevo el evento y confirma la propuesta actual.",
        },
      };
      return;
    }
  } catch {
    if (sessionOwnerId.value !== operationOwner) return;
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: "failed",
        operationKey,
        message: "No se pudo completar la operación. Comprueba la conexión y vuelve a intentarlo.",
      },
    };
    return;
  }

  const authorization =
    previousAuthorization &&
    JSON.stringify(previousAuthorization.snapshot) === JSON.stringify(snapshot)
      ? previousAuthorization
      : authorizeLineupExpansion(snapshot, confirmationSignature);
  expansionAuthorizations.value = { ...expansionAuthorizations.value, [uiKey]: authorization };
  expansionExecutions.value = { ...expansionExecutions.value, [uiKey]: { state: "sending" } };
  protectedExpansionSnapshots.value = {
    ...protectedExpansionSnapshots.value,
    [operationKey]: snapshot,
  };
  try {
    await session.saveNow();
    if (sessionOwnerId.value !== operationOwner) return;
    criticalStorageError.value = "";
  } catch {
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: "failed",
        operationKey,
        message: "No se pudo guardar la propuesta. Reintenta el guardado antes de continuar.",
      },
    };
    criticalStorageError.value = "No se pudo guardar la propuesta. La operación no se ha enviado.";
    return;
  }
  try {
    const response = await expansionMutation.mutateAsync(authorization);
    if (sessionOwnerId.value !== operationOwner) return;
    const reconciliation = reconcileLineupExpansionResult(
      snapshot,
      response,
      (authorizedSnapshot) => {
        const latestConflict = conflictsByRowKey.value[
          authorizedSnapshot.correlation.sourceRowKey
        ]?.find(
          (candidate) =>
            candidate.operationId === authorizedSnapshot.correlation.sourceBatchId &&
            candidate.operationRowId === authorizedSnapshot.correlation.sourceOperationRowId &&
            candidate.code === authorizedSnapshot.correlation.sourceConflictCode
        );
        const latestPreparation = latestConflict
          ? prepareLineupExpansion(latestConflict, authorizedSnapshot.eventId)
          : null;
        return (
          latestConflict?.status === "current" &&
          latestPreparation?.state === "ready" &&
          JSON.stringify(latestPreparation.snapshot) === JSON.stringify(authorizedSnapshot)
        );
      },
      (rowKey) => rows.value.some((row) => row.id === rowKey),
      handledExpansionOperations
    );
    if (reconciliation.action !== "already-handled") {
      if (reconciliation.action === "removed") removeRow(reconciliation.rowKey);
      else if (reconciliation.rowPresent) {
        appliedExpansionsByRow.value = {
          ...appliedExpansionsByRow.value,
          [reconciliation.rowKey]: { eventId: response.eventId, operationKey },
        };
      }
      expansionHistory.value = [
        ...expansionHistory.value,
        {
          operationKey,
          rowKey: reconciliation.rowKey,
          eventId: response.eventId,
          startDate: snapshot.payload.sourceRow.startDate,
          result: response,
          reconciliation: reconciliation.action,
        },
      ];
    }
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: "updated",
        result: response,
        reconciliation: reconciliation.action,
      },
    };
    const remainingProtected = { ...protectedExpansionSnapshots.value };
    delete remainingProtected[operationKey];
    protectedExpansionSnapshots.value = remainingProtected;
    refreshPreparation();
    await session.saveNow().catch(() => undefined);
  } catch (error) {
    if (sessionOwnerId.value !== operationOwner) return;
    const failureKind = lineupExpansionFailureKind(error);
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: failureKind === "global" ? "failed" : failureKind,
        operationKey,
        message: lineupExpansionErrorMessage(error),
        technicalDetail: error,
      },
    };
    if (failureKind !== "uncertain") {
      const remainingProtected = { ...protectedExpansionSnapshots.value };
      delete remainingProtected[operationKey];
      protectedExpansionSnapshots.value = remainingProtected;
    } else void session.saveNow().catch(() => undefined);
  }
}

async function retryRecoveredExpansion(
  snapshot: import("../../application/eventLineupExpansionPreparation").LineupExpansionSnapshot
) {
  const operationOwner = sessionOwnerId.value;
  if (!operationOwner || !identityReady.value) return;
  const operationKey = lineupExpansionOperationKey(snapshot);
  if (
    !Object.values(protectedExpansionSnapshots.value).some(
      (item) => lineupExpansionOperationKey(item) === operationKey
    ) ||
    expansionMutation.isPending.value
  )
    return;
  const confirmation = await SwalService.confirm(
    "Reintentar ampliación incierta",
    `Se volverá a intentar añadir ${snapshot.payload.artists.map(({ name }) => name).join(", ")} al concierto del ${formatImportDate(snapshot.payload.sourceRow.startDate)}. Puede que la operación ya se haya completado.`,
    "Reintentar operación",
    "Cancelar"
  );
  if (!confirmation.isConfirmed) return;
  try {
    await session.saveNow();
    if (sessionOwnerId.value !== operationOwner) return;
  } catch {
    if (sessionOwnerId.value !== operationOwner) return;
    criticalStorageError.value =
      "No se pudo asegurar el guardado local, así que la operación no se ha enviado.";
    return;
  }
  try {
    const response = await expansionMutation.mutateAsync(
      authorizeLineupExpansion(snapshot, `restored-retry:${operationKey}`)
    );
    if (sessionOwnerId.value !== operationOwner) return;
    const reconciliation = reconcileLineupExpansionResult(
      snapshot,
      response,
      () => false,
      (rowKey) => rows.value.some(({ id }) => id === rowKey),
      handledExpansionOperations
    );
    if (reconciliation.rowPresent) {
      appliedExpansionsByRow.value = {
        ...appliedExpansionsByRow.value,
        [reconciliation.rowKey]: { eventId: response.eventId, operationKey },
      };
    }
    expansionHistory.value = [
      ...expansionHistory.value,
      {
        operationKey,
        rowKey: reconciliation.rowKey,
        eventId: response.eventId,
        result: response,
        reconciliation: reconciliation.rowPresent ? "kept" : "already-handled",
      },
    ];
    const remaining = { ...protectedExpansionSnapshots.value };
    delete remaining[operationKey];
    protectedExpansionSnapshots.value = remaining;
    await session.saveNow().catch(() => undefined);
  } catch (error) {
    if (sessionOwnerId.value !== operationOwner) return;
    if (lineupExpansionFailureKind(error) === "uncertain")
      await session.saveNow().catch(() => undefined);
    else {
      const remaining = { ...protectedExpansionSnapshots.value };
      delete remaining[operationKey];
      protectedExpansionSnapshots.value = remaining;
      await session.saveNow().catch(() => undefined);
    }
  }
}

defineExpose({ prepareLineupExpansionForConflict });

const rowProblems = computed(() => {
  const problems: Record<string, { label: string; fields: string[]; historical?: boolean }> = {};
  const currentRows = new Map(rows.value.map((row) => [row.id, row]));
  const latestResults = new Map(
    (lastImport.value?.rows ?? []).map((result) => [result.item.rowKey, result])
  );
  const resolutionErrors = new Set<string>();

  for (const row of rows.value) {
    const pending = preparation.value.pendingRows.find(({ rowKey }) => rowKey === row.id);
    const reasons = pending?.reasons.filter((reason) => reason !== "batch-limit-exceeded") ?? [];
    const result = latestResults.get(row.id);
    const conflicts = conflictsByRowKey.value[row.id] ?? [];
    if (
      Object.keys(lineupStates[row.id]?.itemStatus ?? {}).some(
        (key) => lineupStates[row.id]?.itemStatus[key] === "error"
      ) ||
      geographyStates[row.id]?.localityStatus === "error" ||
      geographyStates[row.id]?.venueStatus === "error" ||
      tourStates[row.id]?.status === "error"
    )
      resolutionErrors.add(row.id);

    if (createdDrafts.value[row.id]) {
      problems[row.id] = {
        label: "Este evento ya se creó. Revisa el borrador actual antes de continuar.",
        fields: [],
      };
      continue;
    }
    if (appliedExpansionsByRow.value[row.id]) {
      problems[row.id] = {
        label:
          "La fila cambió después de actualizar el lineup. Revisa el borrador antes de continuar.",
        fields: [],
        historical: true,
      };
      continue;
    }
    if (
      uncertainSnapshots.value.some((snapshot) =>
        snapshot.rows.some(({ rowKey }) => rowKey === row.id)
      )
    ) {
      problems[row.id] = {
        label:
          "No sabemos si la operación terminó. Comprueba el resultado reintentando la misma operación.",
        fields: [],
      };
      continue;
    }
    if (conflicts.length) {
      problems[row.id] = {
        label: "Conflicto detectado. Consulta el detalle y las filas relacionadas.",
        fields: [],
        historical: conflicts.every(({ status }) => status === "historical"),
      };
      continue;
    }
    if (result?.item.result.status === "invalid" || result?.item.result.status === "failed") {
      const status = result.item.result.status;
      problems[row.id] = {
        label:
          status === "invalid"
            ? "Hay información que debes corregir antes de continuar."
            : "No se pudo completar la operación. Puedes reintentarlo.",
        fields: [],
        historical: !result.current,
      };
      continue;
    }
    if (resolutionErrors.has(row.id)) {
      problems[row.id] = {
        label: "Error técnico durante la resolución. Revisa el detalle de la celda y reintenta.",
        fields: [],
      };
      continue;
    }
    if (reasons.length && hasRowContent(row.id)) {
      const labels: string[] = [];
      const fields = new Set<string>();
      for (const reason of reasons) {
        if (reason.startsWith("artist-")) {
          const itemKey = reason.split(":")[1];
          const index = row.lineup.findIndex(({ key }) => key === itemKey);
          fields.add(
            index >= 0 ? `Artistas / Lineup, aparición ${index + 1}` : "Artistas / Lineup"
          );
          if (reason === "artist-draft-unconfirmed") labels.push("Confirma el artista pendiente");
          else if (reason.includes("ambiguous")) labels.push("artistas pendientes de seleccionar");
          else if (reason.includes("invalid")) labels.push("artistas no válidos");
          else if (reason.includes("error")) labels.push("error al resolver artistas");
          else labels.push("artistas pendientes de resolver");
        } else if (reason === "lineup-required") {
          labels.push("faltan artistas");
          fields.add("Artistas / Lineup");
        } else if (reason.includes("date") || reason === "end-date-before-start-date") {
          labels.push(
            reason === "start-date-invalid"
              ? row.startDateDraft.trim()
                ? "fecha de inicio no válida"
                : "falta fecha de inicio"
              : reason === "end-date-before-start-date"
                ? "fecha de fin anterior a la de inicio"
                : "fecha de fin no válida"
          );
          fields.add(
            reason === "end-date-before-start-date" || reason.startsWith("start-date")
              ? "Fecha de inicio"
              : "Fecha de fin"
          );
          if (reason === "end-date-before-start-date") fields.add("Fecha de fin");
        } else if (reason.includes("locality-ambiguous")) {
          labels.push("localidad pendiente de seleccionar");
          fields.add("Ciudad / Provincia");
        } else if (reason.includes("locality") || reason.includes("administrative-region")) {
          labels.push("localidad pendiente de completar o corregir");
          fields.add("Ciudad / Provincia / región administrativa");
        } else if (reason.includes("venue-ambiguous")) {
          labels.push("recinto pendiente de seleccionar");
          fields.add("Recinto / localidad");
        } else if (reason.includes("venue")) {
          labels.push("recinto pendiente de corregir o resolver");
          fields.add("Recinto / localidad");
        } else if (
          reason.includes("tour-confirmation-required") ||
          reason.includes("tour-ambiguous")
        ) {
          labels.push("gira pendiente de confirmar");
          fields.add("Nombre / confirmación de gira");
        } else if (reason.includes("tour")) {
          labels.push("gira pendiente de resolver");
          fields.add("Nombre de gira");
        } else if (reason === "city-required") {
          labels.push("falta ciudad");
          fields.add("Ciudad");
        } else if (reason === "name-required") {
          labels.push("falta el nombre del evento");
          fields.add("Nombre del evento");
        } else if (reason === "country-unavailable") {
          labels.push("selecciona un país");
          fields.add("País");
        } else {
          labels.push("Fila pendiente de completar");
        }
      }
      problems[row.id] = { label: [...new Set(labels)].join("; "), fields: [...fields] };
    } else if (pending?.reasons.includes("batch-limit-exceeded")) {
      problems[row.id] = {
        label: "Fila pendiente de otro envío; el máximo operativo es de 50 filas por operación.",
        fields: [],
      };
    } else if (
      hasRowContent(row.id) &&
      preparation.value.eligibleRows.some(({ rowKey }) => rowKey === row.id)
    ) {
      problems[row.id] = { label: "Lista para importar", fields: [] };
    }
  }
  // Preserve historical result context for rows that remain in the editor after an edit.
  for (const [rowKey, result] of latestResults) {
    if (
      currentRows.has(rowKey) &&
      !result.current &&
      !problems[rowKey] &&
      result.item.result.status !== "created"
    ) {
      problems[rowKey] = {
        label: `Resultado anterior: ${result.item.result.status}. La fila fue editada después del envío.`,
        fields: [],
        historical: true,
      };
    }
  }
  return problems;
});

function currentInput() {
  return {
    rows: rows.value,
    countryId: geography.selectedCountryId.value,
    countryAvailable: Boolean(geography.selectedCountry.value),
    lineupStates,
    geographyStates,
    tourStates,
  };
}

function refreshPreparation() {
  const blockedRows: Record<string, string> = {};
  Object.keys(createdDrafts.value).forEach((rowKey) => {
    blockedRows[rowKey] = "event-already-created-draft-diverged";
  });
  Object.keys(appliedExpansionsByRow.value).forEach((rowKey) => {
    blockedRows[rowKey] = "lineup-expansion-already-applied";
  });
  uncertainSnapshots.value.forEach((snapshot) => {
    snapshot.rows.forEach(({ rowKey }) => {
      if (rows.value.some((row) => row.id === rowKey)) blockedRows[rowKey] = "operation-uncertain";
    });
  });
  protectedSnapshots.value.forEach((snapshot) => {
    snapshot.rows.forEach(({ rowKey }) => {
      if (rows.value.some((row) => row.id === rowKey))
        blockedRows[rowKey] = "operation-snapshot-protected";
    });
  });
  preparation.value = preparer.prepare({ ...currentInput(), blockedRows });
}

watch(
  () => [rows.value, lineupStates, geographyStates, tourStates, geography.selectedCountryId.value],
  refreshPreparation,
  { deep: true, immediate: true }
);

async function sendSnapshot(snapshot: NonNullable<ImportPreparation["snapshot"]>) {
  if (pendingSnapshotBatchIds.value.has(snapshot.batchId)) return;
  const operationOwner = sessionOwnerId.value;
  pendingSnapshotBatchIds.value = new Set([...pendingSnapshotBatchIds.value, snapshot.batchId]);
  if (!identityReady.value || !operationOwner) {
    criticalStorageError.value =
      "Espera a que termine la comprobación del borrador local antes de enviar.";
    const pending = new Set(pendingSnapshotBatchIds.value);
    pending.delete(snapshot.batchId);
    pendingSnapshotBatchIds.value = pending;
    return;
  }
  const isRetry = protectedSnapshots.value.some((item) => item.batchId === snapshot.batchId);
  if (!isRetry) protectedSnapshots.value = [...protectedSnapshots.value, snapshot];
  refreshPreparation();
  try {
    await session.saveNow();
    if (sessionOwnerId.value !== operationOwner) return;
    criticalStorageError.value = "";
  } catch {
    if (sessionOwnerId.value !== operationOwner) return;
    criticalStorageError.value =
      "No se pudo guardar la propuesta, así que la importación no se ha enviado.";
    refreshPreparation();
    const pending = new Set(pendingSnapshotBatchIds.value);
    pending.delete(snapshot.batchId);
    pendingSnapshotBatchIds.value = pending;
    return;
  }
  try {
    const response = await batchMutation.mutateAsync(snapshot);
    if (sessionOwnerId.value !== operationOwner) return;
    const reconciliation = reconcileEventImportResults(
      snapshot,
      response,
      (source, rowKey) => preparer.isCurrent(source, rowKey, currentInput()),
      handledOperations,
      (rowKey) => rows.value.some((row) => row.id === rowKey)
    );
    reconciliation.results.forEach(({ item, action }) => {
      if (action === "ignored") return;
      const operationKey = `${snapshot.batchId}:${item.operationRowId}`;
      handledOperations.add(operationKey);
      handledOperationOrder.push(operationKey);
      if (handledOperationOrder.length > 1000) {
        const expiredOperation = handledOperationOrder.shift();
        if (expiredOperation) handledOperations.delete(expiredOperation);
      }
    });
    const nextCreatedDrafts = { ...createdDrafts.value };
    reconciliation.createdDrafts.forEach(({ rowKey, eventId, operationRowId }) => {
      if (rows.value.some((row) => row.id === rowKey)) {
        nextCreatedDrafts[rowKey] = { eventId, operationRowId };
      }
    });
    createdDrafts.value = nextCreatedDrafts;
    reconciliation.rowKeysToRemove.forEach((rowKey) => removeRow(rowKey));
    if (reconciliation.results.some(({ action }) => action !== "ignored")) {
      lastImport.value = { response, rows: reconciliation.results };
      conflictOperation.value = {
        snapshot,
        results: reconciliation.results
          .filter(({ item, action }) => action !== "ignored" && item.result.status === "conflict")
          .map(({ item }) => item),
      };
    }
    uncertainSnapshots.value = uncertainSnapshots.value.filter(
      (pending) => pending.batchId !== snapshot.batchId
    );
    protectedSnapshots.value = protectedSnapshots.value.filter(
      (pending) => pending.batchId !== snapshot.batchId
    );
    refreshPreparation();
    await session.saveNow().catch(() => undefined);
    const pending = new Set(pendingSnapshotBatchIds.value);
    pending.delete(snapshot.batchId);
    pendingSnapshotBatchIds.value = pending;
  } catch (error) {
    if (sessionOwnerId.value !== operationOwner) return;
    if (
      eventImportErrorCanRetry(error) &&
      !uncertainSnapshots.value.some((pending) => pending.batchId === snapshot.batchId)
    ) {
      uncertainSnapshots.value = [...uncertainSnapshots.value, snapshot];
    }
    if (eventImportErrorCanRetry(error)) {
      protectedSnapshots.value = protectedSnapshots.value.some(
        ({ batchId }) => batchId === snapshot.batchId
      )
        ? protectedSnapshots.value
        : [...protectedSnapshots.value, snapshot];
    } else {
      protectedSnapshots.value = protectedSnapshots.value.filter(
        ({ batchId }) => batchId !== snapshot.batchId
      );
    }
    refreshPreparation();
    await session.saveNow().catch(() => undefined);
    const pending = new Set(pendingSnapshotBatchIds.value);
    pending.delete(snapshot.batchId);
    pendingSnapshotBatchIds.value = pending;
  }
}

function importEligibleRows() {
  const snapshot = preparation.value.snapshot;
  if (!snapshot || batchMutation.isPending.value) return;
  void sendSnapshot(snapshot);
}

function retrySameBatch(snapshot: NonNullable<ImportPreparation["snapshot"]>) {
  if (!snapshot || batchMutation.isPending.value) return;
  void sendSnapshot(snapshot);
}

function pruneRemovedCreatedDrafts() {
  const next = Object.fromEntries(
    Object.entries(createdDrafts.value).filter(([rowKey]) =>
      rows.value.some((row) => row.id === rowKey)
    )
  );
  if (Object.keys(next).length !== Object.keys(createdDrafts.value).length) {
    createdDrafts.value = next;
    refreshPreparation();
  }
  appliedExpansionsByRow.value = Object.fromEntries(
    Object.entries(appliedExpansionsByRow.value).filter(([rowKey]) =>
      rows.value.some((row) => row.id === rowKey)
    )
  );
}

function hasRowContent(rowKey: string): boolean {
  const row = rows.value.find(({ id }) => id === rowKey);
  const lineupState = lineupStates[rowKey];
  return Boolean(
    row &&
    (row.event.trim() ||
      row.lineup.length ||
      lineupState?.draft.trim() ||
      row.startDateDraft.trim() ||
      row.endDateDraft.trim() ||
      row.venue.name.trim() ||
      row.price.trim() ||
      row.otherInfo.trim() ||
      row.city.trim() ||
      row.province.trim() ||
      row.administrativeRegionId ||
      row.type !== "concert")
  );
}

function isUncertainRow(rowKey: string): boolean {
  return uncertainSnapshots.value.some((snapshot) =>
    snapshot.rows.some(({ rowKey: key }) => key === rowKey)
  );
}

function toggleRowSelection(rowKey: string, selected: boolean) {
  const next = new Set(selectedRowKeys.value);
  if (selected && rows.value.some(({ id }) => id === rowKey)) next.add(rowKey);
  else next.delete(rowKey);
  selectedRowKeys.value = next;
}

watch(
  () => rows.value.map(({ id }) => id),
  (rowKeys) => {
    const existing = new Set(rowKeys);
    const next = new Set([...selectedRowKeys.value].filter((rowKey) => existing.has(rowKey)));
    if (next.size !== selectedRowKeys.value.size) selectedRowKeys.value = next;
  }
);

async function discardRows(requestedKeys: readonly string[]) {
  if (discardInProgress.value) return;
  const operationOwner = sessionOwnerId.value;
  if (!operationOwner) return;
  discardInProgress.value = true;
  const rowKeys = [...new Set(requestedKeys)].filter((key) =>
    rows.value.some(({ id }) => id === key)
  );
  if (!rowKeys.length) {
    discardInProgress.value = false;
    return;
  }
  const firstIndex = Math.min(
    ...rowKeys.map((key) => rows.value.findIndex(({ id }) => id === key))
  );
  const contentCount = rowKeys.filter(hasRowContent).length;
  const uncertainCount = rowKeys.filter(isUncertainRow).length;
  const createdCount = rowKeys.filter((key) => Boolean(createdDrafts.value[key])).length;
  if (contentCount) {
    const title =
      rowKeys.length === 1 ? "¿Descartar esta fila?" : `¿Descartar ${rowKeys.length} filas?`;
    const details = [
      `${rowKeys.length} borrador${rowKeys.length === 1 ? "" : "es"} local${rowKeys.length === 1 ? "" : "es"} desaparecerá${rowKeys.length === 1 ? "" : "n"} de la tabla.`,
      "No se borrarán eventos ya existentes.",
      createdCount
        ? "El evento creado seguirá existiendo; solo se retirará el borrador local."
        : "",
      uncertainCount
        ? "El resultado todavía no está confirmado. Si descartas la fila, ya no podrás comprobarlo desde aquí."
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    const confirmation = await SwalService.confirm(
      title,
      details,
      "Descartar borrador",
      "Cancelar"
    );
    if (!confirmation.isConfirmed) {
      discardInProgress.value = false;
      return;
    }
  }
  if (sessionOwnerId.value !== operationOwner) {
    discardInProgress.value = false;
    return;
  }
  rowKeys.forEach((rowKey) => removeRow(rowKey));
  selectedRowKeys.value = new Set(
    [...selectedRowKeys.value].filter((key) => !rowKeys.includes(key))
  );
  pruneRemovedCreatedDrafts();
  discardInProgress.value = false;
  await session.saveNow().catch(() => undefined);
  await nextTick();
  const focusRow = rows.value[Math.min(firstIndex, rows.value.length - 1)];
  const target = focusRow ? document.getElementById(`event-import-row-${focusRow.id}`) : null;
  const nextControl = target?.querySelector<HTMLElement>("input, select, button, textarea");
  (nextControl ?? document.getElementById("event-row-count"))?.focus();
}

function discardSelectedRows() {
  void discardRows([...selectedRowKeys.value]);
}

function quantity(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

const lastImportSummary = computed(() => {
  if (!lastImport.value) return "";
  const categories: string[] = [];
  const imported = countDistinctCreatedEvents(lastImport.value.response);
  const conflicts = lastImport.value.rows.filter(
    ({ item }) => item.result.status === "conflict"
  ).length;
  const invalid = lastImport.value.rows.filter(
    ({ item }) => item.result.status === "invalid"
  ).length;
  const failed = lastImport.value.rows.filter(({ item }) => item.result.status === "failed").length;
  const preserved = lastImport.value.rows.filter(
    ({ rowPresent, current }) => rowPresent && !current
  ).length;

  if (imported) categories.push(quantity(imported, "evento importado", "eventos importados"));
  if (conflicts) categories.push(quantity(conflicts, "conflicto", "conflictos"));
  if (invalid) categories.push(quantity(invalid, "fila inválida", "filas inválidas"));
  if (failed) categories.push(quantity(failed, "fila fallida", "filas fallidas"));
  if (preserved)
    categories.push(
      quantity(preserved, "fila conservada tras cambios", "filas conservadas tras cambios")
    );

  return ["Importación finalizada", ...categories].join(" · ");
});

const removedRowImportHistory = computed(() =>
  (lastImport.value?.rows ?? [])
    .filter(({ rowPresent }) => !rowPresent)
    .filter(({ item }) => item.result.status !== "conflict")
    .map(({ item }) =>
      item.result.status === "created"
        ? "Se creó un evento a partir de una fila que ya no está en el borrador."
        : "El resultado corresponde a una fila que ya no está en el borrador."
    )
);

function formatImportDate(date: string): string {
  const [year, month, day] = date.split("-");
  const monthName = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ][Number(month) - 1];
  return year && day && monthName ? `${Number(day)} de ${monthName} de ${year}` : date;
}

watch(
  () =>
    rows.value.some((row) => {
      const state = geographyStates[row.id];
      return (
        state?.localityStatus === "new" &&
        state.localityResult?.status === "new" &&
        state.localityResult.requiresAdministrativeRegionId
      );
    }),
  (required) => {
    if (required) void geography.loadRegions();
  },
  { immediate: true }
);

function updateRowCount(event: Event) {
  const input = event.currentTarget;
  if (!(input instanceof HTMLInputElement)) return;
  const nextCount = input.valueAsNumber;
  if (!Number.isInteger(nextCount) || nextCount < 0) {
    input.value = String(rows.value.length);
    return;
  }
  if (nextCount < rows.value.length) {
    const removedRowKeys = rows.value.slice(nextCount).map(({ id }) => id);
    input.value = String(rows.value.length);
    void discardRows(removedRowKeys);
    return;
  }
  eventImport.setRowCount(nextCount);
}
</script>

<template>
  <div class="flex h-[calc(100dvh-3rem)] min-h-[24rem] flex-col gap-3">
    <header class="shrink-0">
      <div class="flex items-start gap-3">
        <span
          class="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rv-purple/10 text-rv-purple dark:bg-rv-purple/20 dark:text-purple-200"
          aria-hidden="true"
        >
          <i class="fa-solid fa-ticket"></i>
        </span>
        <div>
          <h1 class="text-2xl font-bold leading-tight text-rv-navy dark:text-white md:text-3xl">
            Importador de conciertos y festivales
          </h1>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            Introduce varios conciertos o festivales en una tabla editable. El borrador se guarda
            localmente en este navegador.
          </p>
        </div>
      </div>
      <p v-if="!identityReady" class="mt-4 text-sm text-gray-600 dark:text-gray-300" role="status">
        {{
          geography.countriesQuery.isPending.value
            ? "Cargando catálogo de países…"
            : "Comprobando la sesión local…"
        }}
      </p>
      <div v-else-if="sessionOwnerId && !recoverySession && !recoveryError" class="mt-4">
        <EventImportCountrySelector
          :model-value="geography.selectedCountryId.value"
          :options="geography.countryOptions.value"
          :loading="geography.countriesQuery.isPending.value"
          :error="geography.countriesQuery.isError.value"
          :issues="geography.countryCatalogIssues.value"
          @update:model-value="geography.selectCountry"
          @retry="geography.countriesQuery.refetch()"
        />
      </div>
      <div
        class="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300"
        role="status"
        aria-live="polite"
      >
        <span
          >{{ saveStatusLabel }}<span v-if="lastSavedLabel"> · {{ lastSavedLabel }}</span></span
        >
        <button
          v-if="session.status.value === 'error' && !criticalStorageError"
          type="button"
          class="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          @click="retrySessionSave"
        >
          Reintentar guardado
        </button>
      </div>
      <p
        v-if="criticalStorageError"
        class="mt-2 text-sm text-red-700 dark:text-red-300"
        role="alert"
      >
        {{ criticalStorageError }}
      </p>
      <section
        v-if="recoverySession"
        class="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-200/30 dark:bg-amber-950/30 dark:text-amber-100"
        aria-labelledby="event-import-recovery-title"
      >
        <h2 id="event-import-recovery-title" class="font-semibold">
          {{ recoveryError ? "No se pudo restaurar la sesión" : "Tienes una sesión incompleta" }}
        </h2>
        <p class="mt-1">
          {{
            recoveryError || "Hemos encontrado un borrador guardado de una importación anterior."
          }}
        </p>
        <p v-if="!recoveryError && recoveryStats" class="mt-1">
          {{ recoveryStats.rows }} filas · guardado
          {{ lastSavedLabel || "en una sesión anterior" }} ·
          {{ recoveryStats.uncertain }} operaciones pendientes o inciertas
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-if="!recoveryError"
            type="button"
            class="min-h-10 rounded-lg bg-rv-navy px-4 font-semibold text-white dark:bg-gray-200 dark:text-rv-navy"
            @click="recoverSession"
          >
            Recuperar sesión
          </button>
          <button
            type="button"
            class="min-h-10 rounded-lg border border-amber-700 px-4 font-semibold dark:border-amber-200"
            @click="discardSession"
          >
            Descartar
          </button>
        </div>
      </section>
      <section
        v-if="recoveryError && !recoverySession"
        class="mt-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-200/30 dark:bg-red-950/30 dark:text-red-200"
        role="alert"
      >
        <p>{{ recoveryError }}</p>
        <button
          type="button"
          class="mt-2 min-h-10 rounded-lg border border-current px-4 font-semibold"
          @click="retryStorageRead"
        >
          Reintentar lectura
        </button>
      </section>
    </header>

    <section
      v-if="sessionOwnerId && !recoverySession && !recoveryError"
      class="flex min-h-0 flex-1 flex-col gap-2"
      aria-label="Editor de eventos"
    >
      <div class="flex shrink-0 items-center justify-between gap-3">
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
          {{ rows.length }} {{ rows.length === 1 ? "fila" : "filas" }}
        </p>
        <div class="flex items-center gap-2">
          <label
            for="event-row-count"
            class="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300"
          >
            Número de filas
            <input
              id="event-row-count"
              type="number"
              min="0"
              step="1"
              :value="rows.length"
              aria-label="Número de filas"
              class="min-h-10 w-20 rounded-md border border-gray-300 bg-white px-2 text-sm tabular-nums text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
              @change="updateRowCount"
            />
          </label>
          <button
            type="button"
            class="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rv-navy px-4 text-sm font-semibold text-white transition hover:bg-rv-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-white"
            @click="addRow"
          >
            <i class="fa-solid fa-plus text-xs" aria-hidden="true"></i>
            Añadir fila
          </button>
        </div>
      </div>

      <section
        class="shrink-0 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-200"
        aria-label="Estado de importación"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="font-medium">
            <span class="font-semibold">{{ preparation.eligibleRows.length }} filas listas</span>
            · {{ preparation.pendingRows.length }} pendientes
          </p>
          <div
            class="flex flex-wrap items-center justify-end gap-2"
            role="group"
            aria-label="Acciones de importación y descarte"
          >
            <button
              v-for="snapshot in protectedSnapshots.filter(
                (item) => !uncertainSnapshots.some(({ batchId }) => batchId === item.batchId)
              )"
              :key="snapshot.batchId"
              type="button"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-800 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:text-red-200"
              :disabled="
                batchMutation.isPending.value || pendingSnapshotBatchIds.has(snapshot.batchId)
              "
              @click="sendSnapshot(snapshot)"
            >
              Reintentar guardado y envío de {{ snapshot.rows.length }} filas
            </button>
            <button
              v-for="snapshot in Object.values(protectedExpansionSnapshots)"
              :key="lineupExpansionOperationKey(snapshot)"
              type="button"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-600 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:text-amber-100 dark:hover:bg-amber-950/40"
              :disabled="expansionMutation.isPending.value"
              @click="retryRecoveredExpansion(snapshot)"
            >
              Revisar y reintentar ampliación incierta
            </button>
            <button
              v-for="snapshot in uncertainSnapshots"
              :key="snapshot.batchId"
              type="button"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rv-purple px-4 text-sm font-semibold text-rv-purple hover:bg-rv-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:text-purple-200"
              :disabled="
                batchMutation.isPending.value || pendingSnapshotBatchIds.has(snapshot.batchId)
              "
              @click="retrySameBatch(snapshot)"
            >
              Reintentar {{ snapshot.rows.length }} filas inciertas
            </button>
            <button
              type="button"
              aria-label="Importar filas listas"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rv-navy px-4 text-sm font-semibold text-white transition hover:bg-rv-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-white"
              :disabled="!preparation.snapshot || batchMutation.isPending.value"
              @click="importEligibleRows"
            >
              <i
                v-if="batchMutation.isPending.value"
                class="fa-solid fa-spinner fa-spin"
                aria-hidden="true"
              ></i>
              {{ batchMutation.isPending.value ? "Importando…" : "Importar filas listas" }}
            </button>
            <span class="text-xs text-gray-600 dark:text-gray-300" role="status">
              {{ selectedRowKeys.size }}
              {{ selectedRowKeys.size === 1 ? "fila seleccionada" : "filas seleccionadas" }}
            </span>
            <button
              type="button"
              aria-label="Descartar seleccionadas"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-800 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-300/40 dark:text-red-200 dark:hover:bg-red-950/30"
              :disabled="selectedRowKeys.size === 0 || discardInProgress"
              @click="discardSelectedRows"
            >
              Descartar seleccionadas
            </button>
          </div>
        </div>
        <p v-if="batchMutation.isPending.value" class="mt-2" role="status">
          Enviando {{ batchMutation.variables.value?.rows.length ?? 0 }} filas. Puedes seguir
          editando la tabla.
        </p>
        <p
          v-if="batchMutation.isError.value"
          class="mt-2 text-red-700 dark:text-red-300"
          role="alert"
        >
          {{ eventImportGlobalErrorMessage(batchMutation.error.value) }}
        </p>
        <p
          v-if="uncertainSnapshots.length"
          class="mt-2 text-amber-800 dark:text-amber-200"
          role="status"
        >
          No sabemos si
          {{
            uncertainSnapshots.length === 1 ? "la operación terminó" : "las operaciones terminaron"
          }}. Comprueba el resultado reintentando cada operación.
        </p>
        <p
          v-if="
            expansionExecutionCounts.uncertain ||
            expansionExecutionCounts.conflicts ||
            expansionExecutionCounts.failures
          "
          class="mt-2"
          role="status"
        >
          Hay ampliaciones pendientes: {{ expansionExecutionCounts.conflicts }} requieren revisar el
          concierto, {{ expansionExecutionCounts.uncertain }} no tienen resultado confirmado y
          {{ expansionExecutionCounts.failures }} no se completaron.
        </p>
        <section
          v-if="expansionHistory.length"
          class="mt-3 border-t border-gray-200 pt-3 dark:border-white/10"
        >
          <p class="font-semibold" role="status">Lineup actualizado</p>
          <ul class="mt-2 space-y-1">
            <li v-for="entry in expansionHistory" :key="entry.operationKey">
              <template v-if="entry.result.addedArtists.length">
                Se ha añadido {{ entry.result.addedArtists.map(({ name }) => name).join(", ") }} al
                concierto del {{ formatImportDate(entry.startDate) }}.
              </template>
              <template v-else>No había artistas nuevos que añadir.</template>
            </li>
          </ul>
        </section>
        <div v-if="lastImport" class="mt-3 border-t border-gray-200 pt-3 dark:border-white/10">
          <p class="font-semibold" role="status">{{ lastImportSummary }}</p>
          <ul v-if="removedRowImportHistory.length" class="mt-2 space-y-1 text-sm">
            <li v-for="(note, index) in removedRowImportHistory" :key="index">{{ note }}</li>
          </ul>
        </div>
      </section>

      <EventImportTable
        :rows="rows"
        :lineup-states="lineupStates"
        :geography-states="geographyStates"
        :tour-states="tourStates"
        :regions="geography.regions.value"
        :conflicts-by-row-key="conflictsByRowKey"
        :can-review-lineup-expansion="canReviewLineupExpansion"
        :prepare-lineup-expansion="prepareLineupExpansion"
        :get-expansion-confirmation="getExpansionConfirmation"
        :set-expansion-confirmation="setExpansionConfirmation"
        :get-expansion-selection="getExpansionSelection"
        :set-expansion-selection="setExpansionSelection"
        :get-expansion-execution="getExpansionExecution"
        :row-problems="rowProblems"
        :selected-row-keys="selectedRowKeys"
        :discard-disabled="discardInProgress"
        @update-event="eventImport.updateEvent"
        @confirm-tour="eventImport.confirmTour"
        @retry-tour="eventImport.retryTour"
        @select-tour-candidate="eventImport.selectTourCandidate"
        @update-type="eventImport.updateType"
        @update-type-range="eventImport.updateTypeRange"
        @update-text-field="eventImport.updateTextField"
        @update-text-range="eventImport.updateTextRange"
        @update-date="eventImport.updateDate"
        @update-date-range="eventImport.updateDateRange"
        @update-venue="eventImport.updateVenue"
        @update-city="eventImport.updateCity"
        @update-province="eventImport.updateProvince"
        @commit-venue="eventImport.commitVenue"
        @retry-venue="eventImport.retryVenue"
        @retry-locality="eventImport.retryLocality"
        @select-region="eventImport.selectAdministrativeRegion"
        @select-locality="eventImport.selectLocalityCandidate"
        @select-venue="eventImport.selectVenueCandidate"
        @select-artist="eventImport.selectArtistCandidate"
        @update-lineup-draft="eventImport.updateLineupDraft"
        @commit-lineup-draft="eventImport.commitLineupDraft"
        @paste-lineup-range="eventImport.pasteLineupRange"
        @update-lineup-item-name="eventImport.updateLineupItemName"
        @commit-lineup-item-name="eventImport.commitLineupItemName"
        @retry-lineup-item="eventImport.retryLineupItem"
        @remove-lineup-item="eventImport.removeLineupItem"
        @toggle-row-selection="toggleRowSelection"
        @execute-expansion="executeConfirmedExpansion"
        @critical-edit="retrySessionSave"
      />
    </section>
    <section
      v-else
      class="flex min-h-0 flex-1 items-start rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-200"
      aria-label="Recuperación de sesión"
    >
      <p v-if="!identityReady" role="status">
        El editor estará disponible cuando se confirme la cuenta.
      </p>
      <p v-else-if="recoverySession">Recupera o descarta el borrador local para continuar.</p>
      <p v-else>{{ recoveryError }}</p>
    </section>
  </div>
</template>
