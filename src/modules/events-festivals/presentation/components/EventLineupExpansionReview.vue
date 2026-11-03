<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useQueries, useQuery } from "@tanstack/vue-query";
import { existingEventDetailQueryOptions } from "../../api/eventImport";
import type { EventImportConflictPresentation } from "../../application/eventImportConflicts";
import type {
  LineupExpansionPreparation,
  LineupExpansionPendingReason,
} from "../../application/eventLineupExpansionPreparation";
import { lineupExpansionConfirmationSignature } from "../../application/eventLineupExpansionPreparation";
import type { EventLineupExpansionExecution } from "../../application/useEventLineupExpansionMutation";

const props = defineProps<{
  conflict: EventImportConflictPresentation;
  prepare: (selectedEventId?: string) => LineupExpansionPreparation | null;
  getConfirmation: () => string | null;
  setConfirmation: (signature: string | null) => void;
  getSelection: () => string | null;
  setSelection: (eventId: string | null) => void;
  getExecution: () => EventLineupExpansionExecution | null;
  execute: (conflict: EventImportConflictPresentation, signature: string) => void;
}>();

function eventIds(conflict: EventImportConflictPresentation): string[] {
  return [...new Set([...conflict.existingEventIds, ...conflict.candidateEventIds])];
}

const knownIds = computed(() => eventIds(props.conflict));
const candidateHelpId = computed(
  () => `lineup-expansion-candidate-help-${props.conflict.operationRowId}`
);
const identifiedIds = computed(() => [...new Set(props.conflict.existingEventIds)]);
const needsSelection = computed(
  () => knownIds.value.length !== 1 || identifiedIds.value.length !== 1
);
const initialSelection = props.getSelection();
const selectedEventId = shallowRef(
  !needsSelection.value && identifiedIds.value[0]
    ? identifiedIds.value[0]
    : initialSelection && knownIds.value.includes(initialSelection)
      ? initialSelection
      : ""
);
const preparation = computed(() => props.prepare(selectedEventId.value || undefined));
const activeEventId = computed(() =>
  preparation.value?.state === "ready" ? preparation.value.snapshot.eventId : selectedEventId.value
);
const eventQuery = useQuery(
  computed(() => ({
    ...existingEventDetailQueryOptions(activeEventId.value),
    enabled: Boolean(activeEventId.value),
  }))
);
const candidateQueries = useQueries({
  queries: computed(() =>
    knownIds.value.map((eventId) => ({
      ...existingEventDetailQueryOptions(eventId),
      enabled: needsSelection.value,
    }))
  ),
});

function formatDate(date: string | undefined): string | undefined {
  if (!date) return undefined;
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}` : date;
}

function eventDateRange(event: {
  startDate?: string;
  endDate?: string | null;
}): string | undefined {
  const start = formatDate(event.startDate);
  if (!start) return undefined;
  const end = formatDate(event.endDate ?? undefined);
  return end && end !== start ? `${start} – ${end}` : start;
}

function candidateLabel(index: number): string {
  const detail = candidateQueries.value[index]?.data;
  if (!detail) return "Detalles del concierto no disponibles";
  const artists = detail.lineup?.map(({ name }) => name) ?? [];
  const artistSummary = artists.length
    ? `Artistas: ${artists.slice(0, 3).join(" · ")}${artists.length > 3 ? ` +${artists.length - 3}` : ""}`
    : undefined;
  const venue = [detail.venue?.name, detail.venue?.locality?.name].filter(Boolean).join(", ");
  const parts = [eventDateRange(detail), venue || undefined, detail.name, artistSummary].filter(
    (part): part is string => Boolean(part)
  );
  return parts.join(" · ") || "Concierto sin datos suficientes para distinguirlo";
}

const candidateLabels = computed(() =>
  knownIds.value.map((_eventId, index) => candidateLabel(index))
);
const indistinguishableCandidates = computed(() => {
  const labels = candidateLabels.value;
  return needsSelection.value && labels.length > 1 && new Set(labels).size !== labels.length;
});

const confirmationSignature = computed(() => {
  if (
    preparation.value?.state !== "ready" ||
    !eventQuery.data.value ||
    eventQuery.isError.value ||
    eventQuery.isFetching.value
  )
    return null;
  return lineupExpansionConfirmationSignature(
    preparation.value.snapshot,
    props.conflict,
    eventQuery.data.value
  );
});
const isConfirmed = computed(
  () =>
    confirmationSignature.value !== null && props.getConfirmation() === confirmationSignature.value
);
const execution = computed(() => props.getExecution());
const operationKey = computed(() =>
  preparation.value?.state === "ready"
    ? JSON.stringify([
        preparation.value.snapshot.eventId,
        preparation.value.snapshot.operation.batchId,
        preparation.value.snapshot.operation.rowId,
      ])
    : null
);
const canSubmit = computed(
  () =>
    !["sending", "updated"].includes(execution.value?.state ?? "") &&
    (execution.value?.state === "uncertain"
      ? operationKey.value === execution.value.operationKey &&
        props.getConfirmation() === confirmationSignature.value
      : execution.value?.state === "conflict"
        ? operationKey.value !== execution.value.operationKey
        : true)
);

const currentArtists = computed(() => eventQuery.data.value?.lineup?.map(({ name }) => name) ?? []);
const proposedArtists = computed(() =>
  preparation.value?.state === "ready"
    ? preparation.value.snapshot.payload.artists.map(({ name }) => name)
    : []
);

const reasonText: Record<LineupExpansionPendingReason, string> = {
  "conflict-historical": "Este conflicto corresponde a una versión anterior de la fila.",
  "source-row-missing": "No se pudo recuperar la fila actual. No se puede continuar.",
  "source-row-changed": "La fila cambió desde que se detectó el conflicto. Vuelve a importarla.",
  "event-target-missing": "No hay un concierto identificado para esta propuesta.",
  "event-target-ambiguous": "Selecciona el concierto al que quieres añadir artistas.",
  "event-target-invalid": "No se pudo validar el concierto seleccionado.",
  "artist-ambiguous": "Selecciona una coincidencia para cada artista ambiguo.",
  "artist-invalid": "Corrige los datos de los artistas antes de continuar.",
  "artist-resolution-error": "No se pudieron validar los artistas. Reintenta desde la fila.",
  "artist-resolution-pending": "Espera a que termine la validación de los artistas.",
  "artist-identity-uncertain": "Confirma la identidad de los artistas antes de continuar.",
  "required-source-data-missing": "Faltan datos necesarios para preparar la propuesta.",
  "row-created": "Esta fila ya creó un concierto y no puede ampliar desde este conflicto.",
  "creation-operation-uncertain": "Comprueba primero el resultado de la operación pendiente.",
  "row-discarded": "La fila ya no está disponible.",
  "event-not-supported": "Este tipo de evento no permite ampliar el lineup.",
  "conflict-not-expandable": "El conflicto no contiene artistas que se puedan añadir.",
};

const eventTypeVerified = computed(() => {
  const type = eventQuery.data.value?.type;
  if (!type) return false;
  return props.conflict.snapshot.type === "festival" ? type === "festival" : type === "concert";
});
const contextVerified = computed(
  () =>
    Boolean(eventQuery.data.value && Array.isArray(eventQuery.data.value.lineup)) &&
    eventTypeVerified.value &&
    !eventQuery.isError.value &&
    !eventQuery.isFetching.value
);

function selectEvent(event: Event) {
  const value = (event.currentTarget as HTMLSelectElement).value;
  selectedEventId.value = value;
  props.setSelection(value || null);
  props.setConfirmation(null);
}

function addToLineup() {
  if (!confirmationSignature.value || !canSubmit.value) return;
  const signature = confirmationSignature.value;
  props.setConfirmation(signature);
  props.execute(props.conflict, signature);
}

function cancel() {
  props.setConfirmation(null);
}
</script>

<template>
  <section
    class="space-y-2 break-words text-sm text-gray-800 dark:text-gray-100"
    :aria-label="conflict.status === 'historical' ? 'Conflicto anterior' : 'Conflicto de concierto'"
  >
    <template v-if="conflict.status === 'historical'">
      <p role="status">Esta propuesta anterior no permite ampliar el lineup.</p>
    </template>
    <template v-else>
      <div v-if="needsSelection" class="space-y-2">
        <p :id="`lineup-expansion-target-label-${conflict.operationRowId}`" class="font-medium">
          Elige el concierto
        </p>
        <select
          :id="`lineup-expansion-target-${conflict.operationRowId}`"
          :aria-labelledby="`lineup-expansion-target-label-${conflict.operationRowId}`"
          :aria-describedby="indistinguishableCandidates ? candidateHelpId : undefined"
          :value="selectedEventId"
          :disabled="indistinguishableCandidates"
          class="min-h-10 w-full max-w-2xl rounded-md border border-gray-300 bg-white px-3 text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-purple disabled:opacity-60 dark:border-white/20 dark:bg-rv-darkCard dark:text-white"
          @change="selectEvent"
        >
          <option value="">Selecciona un concierto</option>
          <option v-for="(eventId, index) in knownIds" :key="eventId" :value="eventId">
            {{ candidateLabels[index] }}
          </option>
        </select>
        <p v-if="indistinguishableCandidates" :id="candidateHelpId" role="status">
          No hay información suficiente para distinguir estos conciertos. Completa los datos antes
          de continuar.
        </p>
      </div>

      <template v-if="activeEventId && !indistinguishableCandidates">
        <p v-if="eventQuery.isPending.value" role="status">Cargando los datos del concierto…</p>
        <div v-else-if="eventQuery.isError.value" class="space-y-2" role="alert">
          <p>No se pudo consultar el concierto. Reintenta para verificar el destino.</p>
          <button type="button" class="font-semibold underline" @click="eventQuery.refetch()">
            Reintentar
          </button>
        </div>
        <template v-else-if="eventQuery.data.value">
          <p class="break-words font-medium">
            <template v-if="eventDateRange(eventQuery.data.value)">{{
              eventDateRange(eventQuery.data.value)
            }}</template>
            <template v-if="eventQuery.data.value.venue?.name">
              · {{ eventQuery.data.value.venue.name }}</template
            ><template v-if="eventQuery.data.value.venue?.locality?.name">
              , {{ eventQuery.data.value.venue.locality.name }}</template
            >
          </p>
          <p v-if="eventQuery.data.value.name && conflict.snapshot.type !== 'tour'">
            {{ eventQuery.data.value.name }}
          </p>
          <p v-else-if="conflict.snapshot.type === 'tour' && conflict.snapshot.name">
            Gira: {{ conflict.snapshot.name }}
          </p>
          <p v-if="!eventTypeVerified" class="text-amber-900 dark:text-amber-200" role="status">
            No se pudo verificar el tipo de evento. No se puede continuar.
          </p>
          <p v-if="!Array.isArray(eventQuery.data.value.lineup)" role="status">
            No se pudo comprobar el lineup actual.
          </p>
          <div v-else>
            <p class="break-words">
              <span class="font-semibold">Ya participan:</span>
              {{ currentArtists.length ? currentArtists.join(" · ") : "Todavía no hay artistas" }}
            </p>
          </div>
          <p v-if="proposedArtists.length" class="break-words">
            <span class="font-semibold">Añadir:</span> {{ proposedArtists.join(" · ") }}
          </p>
        </template>
      </template>
      <p v-else-if="knownIds.length === 0" role="status">
        No hay un concierto identificado con la información disponible.
      </p>

      <p v-if="preparation?.state === 'obsolete'" role="status">
        Este conflicto corresponde a una versión anterior de la fila.
      </p>
      <p v-else-if="preparation?.state === 'pending'" role="status">
        {{ preparation.pendingReasons.map((reason) => reasonText[reason]).join(" ") }}
      </p>
      <p v-else-if="preparation?.state === 'inapplicable'" role="status">
        No hay artistas adicionales para añadir.
      </p>
      <p v-if="preparation?.state === 'ready' && !contextVerified" role="status">
        Verifica el tipo y el lineup del concierto antes de continuar.
      </p>

      <div v-if="preparation?.state === 'ready'" class="flex flex-wrap gap-2">
        <button
          type="button"
          class="min-h-10 rounded-lg bg-rv-navy px-4 text-sm font-semibold text-white hover:bg-rv-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-white"
          :disabled="!contextVerified || !canSubmit"
          @click="addToLineup"
        >
          <i
            v-if="execution?.state === 'sending'"
            class="fa-solid fa-spinner fa-spin"
            aria-hidden="true"
          ></i>
          {{
            execution?.state === "sending"
              ? "Añadiendo…"
              : execution?.state === "uncertain"
                ? "Reintentar la misma operación"
                : "Añadir al lineup"
          }}
        </button>
        <button
          v-if="isConfirmed && execution?.state !== 'sending' && execution?.state !== 'updated'"
          type="button"
          class="min-h-10 rounded-lg border border-gray-400 px-4 text-sm font-semibold hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:border-white/30 dark:hover:bg-white/10"
          @click="cancel"
        >
          Cancelar
        </button>
      </div>

      <p v-if="execution?.state === 'sending'" role="status">La operación está en curso.</p>
      <p
        v-if="execution?.state === 'invalid'"
        role="alert"
        class="text-amber-900 dark:text-amber-200"
      >
        Hay información que debes corregir antes de continuar.
      </p>
      <p
        v-if="execution?.state === 'uncertain'"
        role="alert"
        class="text-amber-900 dark:text-amber-200"
      >
        No sabemos si la operación terminó. Comprueba el resultado reintentando la misma operación.
      </p>
      <p
        v-if="execution?.state === 'conflict' || execution?.state === 'failed'"
        role="alert"
        class="text-red-800 dark:text-red-200"
      >
        No se pudo completar la operación. Puedes reintentarlo.
      </p>
      <section
        v-if="execution?.state === 'updated'"
        role="status"
        class="text-green-800 dark:text-green-200"
      >
        <p class="font-semibold">Lineup actualizado</p>
        <p v-if="execution.result.addedArtists.length">
          Se ha añadido {{ execution.result.addedArtists.map(({ name }) => name).join(", ")
          }}<template v-if="eventDateRange(eventQuery.data.value)">
            al concierto del {{ eventDateRange(eventQuery.data.value) }}</template
          >.
        </p>
        <p v-else>No había artistas nuevos que añadir.</p>
        <p v-if="execution.reconciliation === 'kept'">
          La fila cambió durante el envío y se conserva el borrador actual.
        </p>
      </section>
    </template>
  </section>
</template>
