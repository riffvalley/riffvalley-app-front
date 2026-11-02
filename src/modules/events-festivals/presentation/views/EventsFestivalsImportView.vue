<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { shallowRef, watch } from "vue";
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
const batchMutation = useEventImportBatchMutation();
const retrySnapshot = shallowRef<ImportPreparation["snapshot"]>(null);

function refreshPreparation() {
  preparation.value = preparer.prepare({
    rows: rows.value,
    countryId: geography.selectedCountryId.value,
    countryAvailable: Boolean(geography.selectedCountry.value),
    lineupStates,
    geographyStates,
    tourStates,
  });
}

watch(
  () => [rows.value, lineupStates, geographyStates, tourStates, geography.selectedCountryId.value],
  refreshPreparation,
  { deep: true, immediate: true }
);

async function sendSnapshot(snapshot: NonNullable<ImportPreparation["snapshot"]>) {
  try {
    await batchMutation.mutateAsync(snapshot);
    retrySnapshot.value = null;
  } catch {
    retrySnapshot.value = snapshot;
  }
}

function importEligibleRows() {
  const snapshot = preparation.value.snapshot;
  if (!snapshot || batchMutation.isPending.value) return;
  retrySnapshot.value = null;
  void sendSnapshot(snapshot);
}

function retrySameBatch() {
  const snapshot = retrySnapshot.value;
  if (!snapshot || batchMutation.isPending.value) return;
  void sendSnapshot(snapshot);
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

function currentRevisionForRow(rowKey: string): number | undefined {
  return (
    preparation.value.eligibleRows.find((row) => row.rowKey === rowKey)?.revision ??
    preparation.value.pendingRows.find((row) => row.rowKey === rowKey)?.revision
  );
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
              v-if="
                retrySnapshot &&
                batchMutation.isError.value &&
                eventImportErrorCanRetry(batchMutation.error.value)
              "
              type="button"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rv-purple px-4 text-sm font-semibold text-rv-purple hover:bg-rv-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:text-purple-200"
              :disabled="batchMutation.isPending.value"
              @click="retrySameBatch"
            >
              Reintentar el mismo lote
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
        <div
          v-if="batchMutation.data.value"
          class="mt-3 border-t border-gray-200 pt-3 dark:border-white/10"
        >
          <p class="font-semibold" role="status">
            Lote completado:
            {{
              batchMutation.data.value.results.filter(({ result }) => result.status === "created")
                .length
            }}
            creadas,
            {{
              batchMutation.data.value.results.filter(({ result }) => result.status === "conflict")
                .length
            }}
            conflictos,
            {{
              batchMutation.data.value.results.filter(({ result }) => result.status === "invalid")
                .length
            }}
            inválidas,
            {{
              batchMutation.data.value.results.filter(({ result }) => result.status === "failed")
                .length
            }}
            fallidas.
          </p>
          <ul class="mt-2 space-y-1">
            <li v-for="item in batchMutation.data.value.results" :key="item.operationRowId">
              Fila {{ item.rowKey }}: {{ rowResultLabel(item.result.status) }}
              <span v-if="item.result.code">({{ item.result.code }})</span>
              <span v-if="item.result.message">— {{ item.result.message }}</span>
              <span v-if="currentRevisionForRow(item.rowKey) !== item.revision">
                · el borrador actual cambió después del envío
              </span>
              <span v-if="item.result.status === 'created' && item.result.replayed">
                · resultado recuperado del lote anterior</span
              >
            </li>
          </ul>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Las filas permanecen en la tabla; la retirada y reconciliación se realizará en una fase
            posterior.
          </p>
        </div>
      </section>

      <EventImportTable
        :rows="rows"
        :lineup-states="lineupStates"
        :geography-states="geographyStates"
        :tour-states="tourStates"
        :regions="geography.regions.value"
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
        @update-lineup-draft="eventImport.updateLineupDraft"
        @commit-lineup-draft="eventImport.commitLineupDraft"
        @retry-lineup-draft="eventImport.retryLineupDraft"
        @update-lineup-item-name="eventImport.updateLineupItemName"
        @commit-lineup-item-name="eventImport.commitLineupItemName"
        @retry-lineup-item="eventImport.retryLineupItem"
        @remove-lineup-item="eventImport.removeLineupItem"
        @remove-row="removeRow"
      />
    </section>
  </div>
</template>
