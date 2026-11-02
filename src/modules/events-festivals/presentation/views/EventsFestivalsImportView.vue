<script setup lang="ts">
import EventImportTable from "../components/EventImportTable.vue";
import { useEventImportRows } from "../../application/useEventImportRows";

const eventImport = useEventImportRows();
const { rows, lineupStates, venueStates, addRow, removeRow } = eventImport;
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
    </header>

    <section class="flex min-h-0 flex-1 flex-col gap-3" aria-label="Editor de eventos">
      <div class="flex shrink-0 items-center justify-between gap-3">
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
          {{ rows.length }} {{ rows.length === 1 ? "fila" : "filas" }}
        </p>
        <button
          type="button"
          class="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rv-navy px-4 text-sm font-semibold text-white transition hover:bg-rv-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-white"
          @click="addRow"
        >
          <i class="fa-solid fa-plus text-xs" aria-hidden="true"></i>
          Añadir fila
        </button>
      </div>

      <EventImportTable
        :rows="rows"
        :lineup-states="lineupStates"
        :venue-states="venueStates"
        @update-event="eventImport.updateEvent"
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
