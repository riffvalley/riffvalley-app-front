<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { computed, nextTick, shallowRef, watch } from "vue";
import EventImportTable from "../components/EventImportTable.vue";
import EventImportCountrySelector from "../components/EventImportCountrySelector.vue";
import { useEventImportRows } from "../../application/useEventImportRows";
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
import SwalService from "@/services/swal/SwalService";

const eventImport = useEventImportRows(useQueryClient());
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
        label: `El evento ya existe (ID ${createdDrafts.value[row.id]!.eventId}); este borrador posterior no se puede importar como evento nuevo.`,
        fields: [],
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
          "Operación incierta. El reintento usa el snapshot original; el resultado backend todavía puede incluir la creación del evento.",
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
        label: `${status === "invalid" ? "Datos rechazados por el backend" : "Falló la importación"}${result.item.result.code ? ` (${result.item.result.code})` : ""}${result.item.result.message ? `: ${result.item.result.message}` : "."}`,
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
    if (reasons.length) {
      const labels: string[] = [];
      const fields = new Set<string>();
      for (const reason of reasons) {
        if (reason.startsWith("artist-")) {
          const itemKey = reason.split(":")[1];
          const index = row.lineup.findIndex(({ key }) => key === itemKey);
          fields.add(index >= 0 ? `Lineup, aparición ${index + 1}` : "Lineup");
          if (reason.includes("ambiguous")) labels.push("Artista pendiente de seleccionar");
          else if (reason.includes("invalid")) labels.push("Artista inválido");
          else if (reason.includes("error")) labels.push("Error técnico al resolver Artist");
          else labels.push("Artist pendiente de resolver");
        } else if (reason.includes("date") || reason === "end-date-before-start-date") {
          labels.push("Fecha pendiente de corregir");
          fields.add(
            reason === "end-date-before-start-date" || reason.startsWith("start-date")
              ? "Start Date"
              : "End Date"
          );
          if (reason === "end-date-before-start-date") fields.add("End Date");
        } else if (reason.includes("locality-ambiguous")) {
          labels.push("Locality pendiente de seleccionar");
          fields.add("City / Province / Locality");
        } else if (reason.includes("locality") || reason.includes("administrative-region")) {
          labels.push("Locality pendiente de completar o corregir");
          fields.add("City / Province / región administrativa");
        } else if (reason.includes("venue-ambiguous")) {
          labels.push("Venue pendiente de seleccionar");
          fields.add("Venue / Locality");
        } else if (reason.includes("venue")) {
          labels.push("Venue pendiente de corregir o resolver");
          fields.add("Venue / Locality");
        } else if (
          reason.includes("tour-confirmation-required") ||
          reason.includes("tour-ambiguous")
        ) {
          labels.push("Gira pendiente de confirmar");
          fields.add("Name / confirmación Tour");
        } else if (reason.includes("tour")) {
          labels.push("Gira pendiente de resolver");
          fields.add("Name");
        } else if (reason === "city-required") {
          labels.push("Falta un dato obligatorio");
          fields.add("City");
        } else if (reason === "name-required") {
          labels.push("Falta un dato obligatorio");
          fields.add("Name");
        } else if (reason === "country-unavailable") {
          labels.push("Selecciona un país");
          fields.add("Country");
        } else {
          labels.push("Fila pendiente de completar");
        }
      }
      problems[row.id] = { label: [...new Set(labels)].join("; "), fields: [...fields] };
    } else if (pending?.reasons.includes("batch-limit-exceeded")) {
      problems[row.id] = {
        label: "Fila pendiente del siguiente lote; se procesan hasta 100 filas por operación.",
        fields: [],
      };
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
  uncertainSnapshots.value.forEach((snapshot) => {
    snapshot.rows.forEach(({ rowKey }) => {
      if (rows.value.some((row) => row.id === rowKey)) blockedRows[rowKey] = "operation-uncertain";
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
  try {
    const response = await batchMutation.mutateAsync(snapshot);
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
    refreshPreparation();
  } catch (error) {
    if (
      eventImportErrorCanRetry(error) &&
      !uncertainSnapshots.value.some((pending) => pending.batchId === snapshot.batchId)
    ) {
      uncertainSnapshots.value = [...uncertainSnapshots.value, snapshot];
    }
    refreshPreparation();
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
        ? "El resultado backend es incierto y podría haberse creado el evento; se conservará el snapshot para reintentar la misma operación."
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
  rowKeys.forEach((rowKey) => removeRow(rowKey));
  selectedRowKeys.value = new Set(
    [...selectedRowKeys.value].filter((key) => !rowKeys.includes(key))
  );
  pruneRemovedCreatedDrafts();
  discardInProgress.value = false;
  await nextTick();
  const focusRow = rows.value[Math.min(firstIndex, rows.value.length - 1)];
  const target = focusRow ? document.getElementById(`event-import-row-${focusRow.id}`) : null;
  const nextControl = target?.querySelector<HTMLElement>("input, select, button, textarea");
  (nextControl ?? document.getElementById("event-row-count"))?.focus();
}

function removeImportRow(rowKey: string) {
  void discardRows([rowKey]);
}

function discardSelectedRows() {
  void discardRows([...selectedRowKeys.value]);
}

function rowResultLabel(status: string): string {
  return (
    {
      created: "creada",
      conflict: "conflicto",
      invalid: "inválida",
      failed: "fallida",
    }[status] ?? "desconocida"
  );
}

function resultLabel(status: string): string {
  return rowResultLabel(status);
}

function createdSummary(response: ImportBatchResponse): string {
  const count = countDistinctCreatedEvents(response);
  return count === 1 ? "1 evento creado" : `${count} eventos creados`;
}

function quantity(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
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
  <div class="flex h-[calc(100dvh-3rem)] min-h-[24rem] flex-col gap-5">
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
            Introduce varios conciertos o festivales en una tabla editable. Los datos se mantienen
            en esta vista mientras permanezca abierta.
          </p>
        </div>
      </div>
      <div class="mt-4">
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
    </header>

    <section class="flex min-h-0 flex-1 flex-col gap-3" aria-label="Editor de eventos">
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
        class="shrink-0 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-200"
        aria-label="Estado de importación"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p>
            <span class="font-semibold">{{ preparation.eligibleRows.length }} filas listas</span>
            · {{ preparation.pendingRows.length }} pendientes
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="snapshot in uncertainSnapshots"
              :key="snapshot.batchId"
              type="button"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rv-purple px-4 text-sm font-semibold text-rv-purple hover:bg-rv-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:text-purple-200"
              :disabled="batchMutation.isPending.value"
              @click="retrySameBatch(snapshot)"
            >
              Reintentar {{ snapshot.rows.length }} filas inciertas
            </button>
            <button
              type="button"
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
          {{ uncertainSnapshots.length }} operación(es) siguen inciertas. Reintenta cada snapshot
          original; sus filas no se preparan como eventos nuevos.
        </p>
        <div v-if="lastImport" class="mt-3 border-t border-gray-200 pt-3 dark:border-white/10">
          <p class="font-semibold" role="status">
            Importación finalizada: {{ createdSummary(lastImport.response) }},
            {{
              quantity(
                lastImport.rows.filter(({ item }) => item.result.status === "conflict").length,
                "conflicto",
                "conflictos"
              )
            }},
            {{
              quantity(
                lastImport.rows.filter(({ item }) => item.result.status === "invalid").length,
                "fila inválida",
                "filas inválidas"
              )
            }},
            {{
              quantity(
                lastImport.rows.filter(({ item }) => item.result.status === "failed").length,
                "fila fallida",
                "filas fallidas"
              )
            }},
            {{
              quantity(
                lastImport.rows.filter(({ rowPresent, current }) => rowPresent && !current).length,
                "fila conservada porque cambió durante el envío",
                "filas conservadas porque cambiaron durante el envío"
              )
            }},
            {{
              quantity(
                lastImport.rows.filter(({ action }) => action === "stale-created").length,
                "borrador conservado tras su creación",
                "borradores conservados tras su creación"
              )
            }}.
          </p>
          <ul class="mt-2 space-y-1">
            <li v-for="entry in lastImport.rows" :key="entry.item.operationRowId">
              Fila {{ entry.item.rowKey }}: {{ resultLabel(entry.item.result.status) }}
              <span v-if="entry.item.result.code">({{ entry.item.result.code }})</span>
              <span v-if="entry.item.result.message">— {{ entry.item.result.message }}</span>
              <span v-if="entry.action === 'stale-created'">
                · se creó la versión enviada (evento {{ entry.item.result.eventId }}); el borrador
                actual se conserva y no se puede volver a importar como nuevo
              </span>
              <span v-else-if="entry.action === 'removed'">· retirada de la tabla</span>
              <span v-else-if="entry.action === 'kept' && !entry.current">
                · resultado histórico; la fila cambió o fue eliminada
              </span>
              <span v-if="entry.item.result.status === 'created'">
                · evento {{ entry.item.result.eventId }}; el descarte de la fila solo afecta al
                borrador local
              </span>
              <span v-if="entry.item.result.status === 'created' && entry.item.result.replayed">
                · replay idempotente</span
              >
            </li>
          </ul>
          <p
            v-for="(created, rowKey) in createdDrafts"
            :key="rowKey"
            class="mt-2 text-amber-800 dark:text-amber-200"
            role="status"
          >
            {{ rowKey }}: su versión anterior creó el evento {{ created.eventId }}. Este borrador
            divergente está excluido de nuevas importaciones.
          </p>
        </div>
      </section>

      <div class="flex shrink-0 items-center justify-between gap-3" aria-label="Acciones de filas">
        <p class="text-sm text-gray-600 dark:text-gray-300" role="status">
          {{ selectedRowKeys.size }}
          {{ selectedRowKeys.size === 1 ? "fila seleccionada" : "filas seleccionadas" }} para
          descartar
        </p>
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
        @retry-lineup-draft="eventImport.retryLineupDraft"
        @update-lineup-item-name="eventImport.updateLineupItemName"
        @commit-lineup-item-name="eventImport.commitLineupItemName"
        @retry-lineup-item="eventImport.retryLineupItem"
        @remove-lineup-item="eventImport.removeLineupItem"
        @remove-row="removeImportRow"
        @toggle-row-selection="toggleRowSelection"
      />
    </section>
  </div>
</template>
