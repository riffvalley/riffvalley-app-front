<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { computed, shallowRef, watch } from "vue";
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
import { createEventImportConflictPresentation } from "../../application/eventImportConflicts";
import type { CorrelatedImportResult } from "../../api/eventImport";

const eventImport = useEventImportRows(useQueryClient());
const { rows, lineupStates, geographyStates, tourStates, addRow, removeRow } = eventImport;
const geography = useEventImportGeography(eventImport.invalidateGeographicAssociations);
const preparer = createEventImportPreparer();
const initialPreparation: ImportPreparation = {
  payload: null,
  snapshot: null,
  eligibleRows: [],
  pendingRows: [],
  errors: [],
  correlation: {},
};
const preparation = shallowRef(initialPreparation);
const visiblePendingReasons = computed(() => {
  const rowNumbers = new Map(rows.value.map((row, index) => [row.id, index + 1]));
  return preparation.value.pendingRows.flatMap((pending) => {
    const reasons = pending.reasons.filter((reason) => reason !== "batch-limit-exceeded");
    return reasons.length
      ? [
          {
            key: `${pending.rowKey}:${pending.reasons.join(",")}`,
            label: `${pending.rowKey ? `Fila ${rowNumbers.get(pending.rowKey) ?? ""}: ` : ""}${reasons.map(preparationReasonLabel).join(" ")}`,
          },
        ]
      : [];
  });
});
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

function removeImportRow(rowKey: string) {
  removeRow(rowKey);
  pruneRemovedCreatedDrafts();
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

function preparationReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    "locality-ambiguous": "Selecciona una Locality candidata.",
    "locality-country-mismatch": "La Locality no pertenece al país seleccionado.",
    "locality-identity-stale": "La identidad de Locality ya no coincide con el contexto.",
    "locality-province-mismatch": "Province no coincide con la Locality seleccionada.",
    "locality-region-mismatch": "La región no coincide con la Locality seleccionada.",
    "administrative-region-invalid": "La región administrativa no tiene un UUID válido.",
    "venue-ambiguous": "Selecciona una Venue candidata.",
    "venue-identity-stale": "La identidad de Venue ya no coincide con el texto o contexto.",
    "venue-locality-mismatch": "La Venue seleccionada pertenece a otra Locality.",
    "venue-name-mismatch": "El texto de Venue contradice la identidad seleccionada.",
  };
  return labels[reason] ?? reason.replaceAll("-", " ");
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
  if (!eventImport.setRowCount(input.valueAsNumber)) input.value = String(rows.value.length);
  else pruneRemovedCreatedDrafts();
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
        <ul
          v-if="visiblePendingReasons.length"
          class="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-200"
          aria-label="Motivos de filas pendientes"
        >
          <li v-for="pending in visiblePendingReasons" :key="pending.key">{{ pending.label }}</li>
        </ul>
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

      <EventImportTable
        :rows="rows"
        :lineup-states="lineupStates"
        :geography-states="geographyStates"
        :tour-states="tourStates"
        :regions="geography.regions.value"
        :conflicts-by-row-key="conflictsByRowKey"
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
      />
    </section>
  </div>
</template>
