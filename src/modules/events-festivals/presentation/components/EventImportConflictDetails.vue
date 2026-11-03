<script setup lang="ts">
import { computed } from "vue";
import { useQueries } from "@tanstack/vue-query";
import { existingEventDetailQueryOptions } from "../../api/eventImport";
import type { EventImportConflictPresentation } from "../../application/eventImportConflicts";
import type { LineupExpansionPreparation } from "../../application/eventLineupExpansionPreparation";
import type { EventLineupExpansionExecution } from "../../application/useEventLineupExpansionMutation";
import EventLineupExpansionReview from "./EventLineupExpansionReview.vue";

const props = defineProps<{
  conflicts: EventImportConflictPresentation[];
  rowNumber: number;
  rowNumbers: Record<string, number>;
  showIndicator: boolean;
  showDetails: boolean;
  expanded: boolean;
  canReviewLineupExpansion: (conflict: EventImportConflictPresentation) => boolean;
  prepareLineupExpansion: (
    conflict: EventImportConflictPresentation,
    selectedEventId?: string
  ) => LineupExpansionPreparation | null;
  getExpansionConfirmation: (conflict: EventImportConflictPresentation) => string | null;
  setExpansionConfirmation: (
    conflict: EventImportConflictPresentation,
    signature: string | null
  ) => void;
  getExpansionSelection: (conflict: EventImportConflictPresentation) => string | null;
  setExpansionSelection: (
    conflict: EventImportConflictPresentation,
    eventId: string | null
  ) => void;
  getExpansionExecution: (
    conflict: EventImportConflictPresentation
  ) => EventLineupExpansionExecution | null;
}>();

const emit = defineEmits<{
  toggle: [];
  navigate: [rowKey: string];
  executeExpansion: [conflict: EventImportConflictPresentation, signature: string];
}>();

const references = computed(() =>
  props.conflicts.flatMap((conflict, conflictIndex) =>
    conflict.eventReferences.map((reference) => ({ conflictIndex, ...reference }))
  )
);
const queries = useQueries({
  queries: computed(() =>
    references.value.map(({ eventId, conflictIndex }) => ({
      ...existingEventDetailQueryOptions(eventId),
      enabled:
        props.showDetails && props.expanded && props.conflicts[conflictIndex]?.status === "current",
    }))
  ),
});
const detailsByConflict = computed(() => {
  let queryIndex = 0;
  return props.conflicts.map((conflict) => ({
    conflict,
    events: conflict.eventReferences.map((reference) => ({
      ...reference,
      query: queries.value[queryIndex++],
    })),
  }));
});

function formatDate(date: string | undefined): string | undefined {
  if (!date) return undefined;
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}` : date;
}

function dateRange(event: { startDate?: string; endDate?: string | null }): string | undefined {
  const start = formatDate(event.startDate);
  if (!start) return undefined;
  const end = formatDate(event.endDate ?? undefined);
  return end && end !== start ? `${start} – ${end}` : start;
}

function eventSummary(event: {
  name?: string | null;
  type?: string;
  startDate?: string;
  endDate?: string | null;
  venue?: { name?: string; locality?: { name?: string } };
  lineup?: Array<{ name: string }>;
}): string[] {
  const venue = [event.venue?.name, event.venue?.locality?.name].filter(Boolean).join(", ");
  return [
    event.type === "festival" ? "Festival" : undefined,
    event.name ?? undefined,
    dateRange(event),
    venue || undefined,
  ].filter((part): part is string => Boolean(part));
}

function candidatesAreIndistinguishable(
  events: Array<{
    status: "identified" | "candidate";
    query?: {
      data?: {
        name?: string | null;
        startDate?: string;
        endDate?: string | null;
        type?: string;
        venue?: { name?: string; locality?: { name?: string } };
        lineup?: Array<{ name: string }>;
      };
    };
  }>
): boolean {
  const candidates = events.filter(({ status }) => status === "candidate");
  if (candidates.length < 2) return false;
  const signatures = candidates.map(({ query }) => {
    const event = query?.data;
    if (!event) return "detail-unavailable";
    return JSON.stringify([
      eventSummary(event),
      event.name ?? null,
      event.lineup?.map(({ name }) => name) ?? null,
    ]);
  });
  return new Set(signatures).size !== signatures.length;
}

function visibleEventDetails(events: (typeof detailsByConflict.value)[number]["events"]) {
  if (!candidatesAreIndistinguishable(events)) return events;
  return events.filter(({ status }) => status === "identified");
}
</script>

<template>
  <div v-if="conflicts.length">
    <button
      v-if="showIndicator"
      type="button"
      class="inline-flex min-h-9 items-center rounded px-2 text-xs font-semibold text-amber-900 underline underline-offset-2 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-purple dark:text-amber-200 dark:hover:bg-white/10"
      :aria-expanded="expanded"
      :aria-controls="`event-import-conflicts-${conflicts[0]?.rowKey}`"
      :aria-label="`Revisar conflicto de la fila ${rowNumber}`"
      @click="emit('toggle')"
    >
      Revisar
    </button>

    <div
      v-if="showDetails"
      :id="`event-import-conflicts-${conflicts[0]?.rowKey}`"
      class="min-w-0 max-w-4xl space-y-2 rounded-md border border-gray-200 bg-white p-3 text-sm leading-relaxed text-gray-800 dark:border-white/10 dark:bg-rv-darkSurface dark:text-gray-100"
      :hidden="!expanded"
      role="region"
      :aria-label="`Detalle de conflictos de la fila ${rowNumber}`"
    >
      <ul class="space-y-3">
        <li
          v-for="({ conflict, events }, index) in detailsByConflict"
          :key="`${conflict.rowKey}-${index}`"
          class="min-w-0 space-y-2 break-words"
        >
          <p v-if="conflict.status === 'historical'" role="status">
            Esta propuesta anterior no permite ampliar el lineup.
          </p>

          <template v-if="conflict.relatedRows.length">
            <p v-if="conflict.relatedRows.length > 1" class="font-medium">Filas relacionadas</p>
            <p v-else class="font-medium">Este concierto entra en conflicto con</p>
            <ul class="flex flex-wrap gap-x-3 gap-y-1">
              <li v-for="(related, relatedIndex) in conflict.relatedRows" :key="relatedIndex">
                <button
                  v-if="related.available && related.rowKey && rowNumbers[related.rowKey]"
                  type="button"
                  class="font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-purple"
                  :aria-label="`Ir a la fila ${rowNumbers[related.rowKey]}`"
                  @click="emit('navigate', related.rowKey)"
                >
                  Ir a la fila {{ rowNumbers[related.rowKey] }}
                </button>
                <span v-else>La fila relacionada ya no está disponible.</span>
              </li>
            </ul>
          </template>

          <EventLineupExpansionReview
            v-if="canReviewLineupExpansion(conflict)"
            :conflict="conflict"
            :prepare="(selectedEventId) => prepareLineupExpansion(conflict, selectedEventId)"
            :get-confirmation="() => getExpansionConfirmation(conflict)"
            :set-confirmation="(signature) => setExpansionConfirmation(conflict, signature)"
            :get-selection="() => getExpansionSelection(conflict)"
            :set-selection="(eventId) => setExpansionSelection(conflict, eventId)"
            :get-execution="() => getExpansionExecution(conflict)"
            :execute="
              (expandedConflict, signature) => emit('executeExpansion', expandedConflict, signature)
            "
          />

          <template v-else-if="conflict.status === 'current' && conflict.eventReferences.length">
            <p v-if="candidatesAreIndistinguishable(events)" role="status">
              No hay información suficiente para distinguir algunos conciertos posibles.
            </p>
            <article
              v-for="entry in visibleEventDetails(events)"
              :key="entry.eventId"
              class="min-w-0 space-y-1"
            >
              <p v-if="entry.query?.isLoading" role="status">Cargando los datos del concierto…</p>
              <div v-else-if="entry.query?.isError" class="space-y-1 break-words" role="alert">
                <p>No se pudieron consultar los datos del concierto.</p>
                <button
                  type="button"
                  class="rounded font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
                  @click="entry.query?.refetch()"
                >
                  Reintentar
                </button>
              </div>
              <template v-else-if="entry.query?.data">
                <p v-if="entry.status === 'candidate'" class="font-medium">Posible concierto</p>
                <p class="font-medium">
                  {{
                    eventSummary(entry.query.data).join(" · ") || "Concierto sin datos descriptivos"
                  }}
                </p>
                <div v-if="entry.query.data.lineup" class="space-y-1">
                  <p>
                    <span class="font-semibold">Ya participan:</span>
                    {{
                      entry.query.data.lineup.map(({ name }) => name).join(" · ") ||
                      "Todavía no hay artistas"
                    }}
                  </p>
                </div>
                <p v-if="conflict.addableArtists.length">
                  <span class="font-semibold">Añadir:</span>
                  {{ conflict.addableArtists.map(({ name }) => name).join(" · ") }}
                </p>
              </template>
              <p v-else role="status">Los datos del concierto todavía no se han consultado.</p>
            </article>
          </template>
          <p v-else-if="conflict.status === 'current'" role="status">
            No hay un concierto identificado con la información disponible.
          </p>
        </li>
      </ul>
    </div>
  </div>
</template>
