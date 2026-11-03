<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useQuery } from "@tanstack/vue-query";
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

function uniqueEventIds(conflict: EventImportConflictPresentation): string[] {
  return [...new Set([...conflict.existingEventIds, ...conflict.candidateEventIds])];
}

const knownIds = computed(() => uniqueEventIds(props.conflict));
const identifiedIds = computed(() => [...new Set(props.conflict.existingEventIds)]);
const needsExplicitSelection = computed(
  () => knownIds.value.length > 1 || identifiedIds.value.length === 0
);
const identifiedEventId =
  identifiedIds.value.length === 1 &&
  knownIds.value.every((eventId) => eventId === identifiedIds.value[0])
    ? identifiedIds.value[0]!
    : null;
const rememberedSelection = props.getSelection();
const selectedEventId = shallowRef(
  identifiedEventId ??
    (rememberedSelection && knownIds.value.includes(rememberedSelection) ? rememberedSelection : "")
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
const reviewedSignature = shallowRef<string | null>(null);
const isReviewed = computed(
  () =>
    confirmationSignature.value !== null && reviewedSignature.value === confirmationSignature.value
);
const isConfirmed = computed(
  () =>
    confirmationSignature.value !== null && props.getConfirmation() === confirmationSignature.value
);
const execution = computed(() => props.getExecution());
const currentOperationKey = computed(() =>
  preparation.value?.state === "ready"
    ? JSON.stringify([
        preparation.value.snapshot.eventId,
        preparation.value.snapshot.operation.batchId,
        preparation.value.snapshot.operation.rowId,
      ])
    : null
);
const canExecute = computed(
  () =>
    !["sending", "updated"].includes(execution.value?.state ?? "") &&
    (execution.value?.state === "uncertain"
      ? currentOperationKey.value === execution.value.operationKey
      : execution.value?.state === "conflict"
        ? isConfirmed.value && currentOperationKey.value !== execution.value.operationKey
        : isConfirmed.value)
);

const addableNames = computed(() =>
  preparation.value?.state === "ready"
    ? preparation.value.snapshot.payload.artists.map(({ name, artistId }) => ({ name, artistId }))
    : []
);

const reasonText: Record<LineupExpansionPendingReason, string> = {
  "conflict-historical": "El conflicto pertenece a una revisión anterior del borrador.",
  "source-row-missing": "No se pudo recuperar la revisión actual del borrador.",
  "source-row-changed": "La fila cambió desde que se envió el snapshot del conflicto.",
  "event-target-missing": "Selecciona un evento identificado para continuar.",
  "event-target-ambiguous": "Selecciona expresamente uno de los eventos candidatos.",
  "event-target-invalid": "El evento seleccionado no pertenece a este conflicto.",
  "artist-ambiguous": "Resuelve los artistas ambiguos en el lineup de la fila.",
  "artist-invalid": "Corrige la identidad inválida en el lineup de la fila.",
  "artist-resolution-error": "Reintenta la consulta de Artist desde la celda del lineup.",
  "artist-resolution-pending": "Espera o completa la resolución de Artist en el lineup.",
  "artist-identity-uncertain": "Hay una coincidencia textual sin identidad de artista confirmada.",
  "required-source-data-missing": "Faltan datos requeridos en el snapshot enviado.",
  "row-created": "La fila ya produjo un evento; no puede ampliar desde este conflicto.",
  "creation-operation-uncertain": "Resuelve primero la operación de creación incierta.",
  "row-discarded": "El borrador ya no está disponible.",
  "event-not-supported": "Este tipo de fila no admite revisión de ampliación.",
  "conflict-not-expandable": "El conflicto no identifica artistas adicionales para revisar.",
};

const lineupContextAvailable = computed(() =>
  Boolean(eventQuery.data.value && Array.isArray(eventQuery.data.value.lineup))
);
const eventTypeVerified = computed(() => {
  const eventType = eventQuery.data.value?.type;
  if (!eventType) return false;
  return props.conflict.snapshot.type === "festival"
    ? eventType === "festival"
    : eventType === "concert";
});
const eventContextVerified = computed(
  () =>
    lineupContextAvailable.value &&
    eventTypeVerified.value &&
    !eventQuery.isError.value &&
    !eventQuery.isFetching.value
);

function comparisonFor(artist: { name: string; artistId?: string | null }) {
  const currentLineup = eventQuery.data.value?.lineup ?? [];
  if (artist.artistId) {
    const byId = currentLineup.find((current) => current.artistId === artist.artistId);
    if (byId) return { label: "Identidad coincidente por UUID", uncertain: false };
  }
  const byText = currentLineup.find((current) => current.name === artist.name);
  if (byText) return { label: "Coincidencia textual; identidad no confirmada", uncertain: true };
  return { label: "Sin coincidencia exacta en los datos disponibles", uncertain: false };
}

const importedComparisons = computed(() =>
  (props.conflict.snapshot.lineup ?? []).map((artist, index) => ({
    ...artist,
    index,
    comparison: comparisonFor(artist),
  }))
);

function selectEvent(event: Event) {
  selectedEventId.value = (event.currentTarget as HTMLSelectElement).value;
  props.setSelection(selectedEventId.value || null);
  reviewedSignature.value = null;
  props.setConfirmation(null);
}

function setReviewed(event: Event) {
  reviewedSignature.value = (event.currentTarget as HTMLInputElement).checked
    ? confirmationSignature.value
    : null;
}

function confirmProposal() {
  if (!confirmationSignature.value) return;
  props.setConfirmation(confirmationSignature.value);
}

function cancelConfirmation() {
  props.setConfirmation(null);
}
</script>

<template>
  <section
    class="space-y-3 rounded-md border border-rv-purple/40 bg-white p-3 text-sm text-gray-800 dark:border-purple-300/30 dark:bg-rv-darkSurface dark:text-gray-100"
    :aria-labelledby="`lineup-expansion-title-${conflict.operationRowId}`"
  >
    <div>
      <h4 :id="`lineup-expansion-title-${conflict.operationRowId}`" class="font-semibold">
        Revisar ampliación de lineup
      </h4>
      <p class="mt-1">La revisión no modifica el evento ni ejecuta una petición de escritura.</p>
    </div>

    <div v-if="knownIds.length" class="space-y-2">
      <template v-if="needsExplicitSelection">
        <p id="lineup-expansion-target-label" class="block font-medium">
          Selecciona el evento destino
        </p>
        <select
          id="lineup-expansion-target"
          aria-labelledby="lineup-expansion-target-label"
          :value="selectedEventId"
          class="min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkCard dark:text-white"
          @change="selectEvent"
        >
          <option value="">Elige un evento</option>
          <option v-for="eventId in knownIds" :key="eventId" :value="eventId">
            {{ identifiedIds.includes(eventId) ? "Evento identificado" : "Candidato" }} ·
            {{ eventId }}
          </option>
        </select>
      </template>
      <p v-else class="break-all">
        Evento identificado: <code>{{ knownIds[0] }}</code>
      </p>
    </div>
    <p v-else role="status">
      El conflicto no incluye un evento disponible; no se puede preparar una ampliación.
    </p>

    <template v-if="activeEventId">
      <p v-if="eventQuery.isPending.value" role="status">Cargando contexto del evento…</p>
      <div v-else-if="eventQuery.isError.value" class="space-y-1" role="alert">
        <p>No se pudo verificar el contexto. Puedes consultar el conflicto, pero no confirmar.</p>
        <button
          type="button"
          class="font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          @click="eventQuery.refetch()"
        >
          Reintentar consulta del evento
        </button>
      </div>
      <template v-else-if="eventQuery.data.value">
        <p
          v-if="!eventTypeVerified"
          class="font-medium text-amber-900 dark:text-amber-200"
          role="status"
        >
          El tipo del evento no coincide o no está disponible; no se puede confirmar esta propuesta.
        </p>
        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt class="font-medium">Evento</dt>
          <dd>{{ eventQuery.data.value.name ?? "Sin nombre" }}</dd>
          <dt class="font-medium">Tipo</dt>
          <dd>{{ eventQuery.data.value.type ?? "No disponible" }}</dd>
          <dt class="font-medium">Fechas</dt>
          <dd>
            {{ eventQuery.data.value.startDate ?? "No disponible" }}
            <template v-if="eventQuery.data.value.endDate">
              – {{ eventQuery.data.value.endDate }}</template
            >
          </dd>
          <dt class="font-medium">Localidad</dt>
          <dd>{{ eventQuery.data.value.venue?.locality?.name ?? "No disponible" }}</dd>
          <dt class="font-medium">Recinto</dt>
          <dd>{{ eventQuery.data.value.venue?.name ?? "No disponible" }}</dd>
          <dt class="font-medium">UUID del evento</dt>
          <dd class="break-all">
            <code>{{ eventQuery.data.value.id }}</code>
          </dd>
          <dt class="font-medium">UUID de gira</dt>
          <dd class="break-all">
            {{ eventQuery.data.value.tourId ?? "Sin gira asociada" }}
          </dd>
        </dl>

        <section class="space-y-2" aria-label="Comparación de lineups">
          <h5 class="font-semibold">Lineup actual</h5>
          <p v-if="!lineupContextAvailable" role="status">
            El detalle no incluye lineup; no se puede verificar la propuesta.
          </p>
          <ul v-else-if="eventQuery.data.value.lineup?.length" class="list-disc space-y-1 pl-5">
            <li
              v-for="(artist, index) in eventQuery.data.value.lineup"
              :key="`${artist.artistId}-${index}`"
            >
              {{ artist.name }}
              <span v-if="artist.artistId" class="text-gray-600 dark:text-gray-300">
                · UUID {{ artist.artistId }}
              </span>
            </li>
          </ul>
          <p v-else>Sin artistas.</p>

          <h5 class="font-semibold">Artistas que el conflicto identifica como ya presentes</h5>
          <ul v-if="conflict.matchingArtists.length" class="list-disc space-y-1 pl-5">
            <li
              v-for="(artist, index) in conflict.matchingArtists"
              :key="`${artist.artistId}-${index}`"
            >
              {{ artist.name }}
              <span v-if="artist.artistId">
                · identidad coincidente por UUID {{ artist.artistId }}</span
              >
              <span v-else> · coincidencia textual; identidad no confirmada</span>
            </li>
          </ul>
          <p v-else>No hay artistas identificados como presentes por el conflicto.</p>

          <h5 class="font-semibold">Lineup del snapshot importado</h5>
          <ol class="list-decimal space-y-1 pl-5">
            <li v-for="artist in importedComparisons" :key="`${artist.index}-${artist.name}`">
              {{ artist.name }}
              <span v-if="artist.artistId"> · UUID {{ artist.artistId }}</span>
              <span class="text-gray-600 dark:text-gray-300"> · {{ artist.comparison.label }}</span>
            </li>
          </ol>
          <p class="text-gray-700 dark:text-gray-200">
            Las coincidencias textuales se muestran como inciertas; no se usan para deducir
            identidad.
          </p>
        </section>
      </template>
      <p v-else role="status">El detalle del evento todavía no está disponible.</p>
    </template>

    <section class="space-y-2" aria-label="Estado de la propuesta">
      <h5 class="font-semibold">Propuesta</h5>
      <p v-if="preparation?.state === 'ready'">
        Lista para revisar: artistas que el backend clasificó como adicionales.
      </p>
      <p v-else-if="preparation?.state === 'obsolete'" role="status">
        Obsoleta: pertenece a un snapshot anterior y no puede confirmarse.
      </p>
      <p v-else-if="preparation?.state === 'inapplicable'" role="status">
        No aplicable: no hay artistas potencialmente añadibles.
      </p>
      <p v-else-if="preparation?.state === 'pending'" role="status">Propuesta pendiente.</p>
      <p v-else role="status">No se pudo preparar la propuesta actual.</p>
      <ul
        v-if="preparation?.state === 'ready' && addableNames.length"
        class="list-disc space-y-1 pl-5"
        aria-label="Artistas propuestos para añadir"
      >
        <li v-for="(artist, index) in addableNames" :key="`${artist.artistId}-${index}`">
          {{ artist.name }}<span v-if="artist.artistId"> · UUID {{ artist.artistId }}</span>
          <span v-else> · artista nuevo sin UUID</span>
        </li>
      </ul>
      <ul v-if="preparation?.state === 'pending'" class="list-disc space-y-1 pl-5">
        <li v-for="reason in preparation.pendingReasons" :key="reason">{{ reasonText[reason] }}</li>
      </ul>
    </section>

    <div
      v-if="preparation?.state === 'ready'"
      class="space-y-2 rounded border border-gray-200 p-3 dark:border-white/15"
    >
      <p>
        Solo se propone añadir estos artistas al evento
        <code class="break-all">{{ preparation.snapshot.eventId }}</code
        >. No se cambiarán fechas, nombre, localidad, recinto ni otros datos. El backend debe
        validar definitivamente cada artista al ejecutar la operación.
      </p>
      <p v-if="!eventContextVerified" role="status">
        Falta contexto actual verificado (tipo y lineup); la propuesta todavía no puede confirmarse.
      </p>
      <p v-else-if="isReviewed && !isConfirmed" role="status">
        Propuesta revisada; falta la confirmación explícita.
      </p>
      <p v-else-if="isConfirmed" role="status" class="font-semibold">
        Propuesta confirmada localmente para esta identidad de operación y snapshot. No se ha
        ejecutado.
      </p>
      <label v-if="!isConfirmed" for="lineup-expansion-reviewed" class="flex items-start gap-2">
        <input
          id="lineup-expansion-reviewed"
          type="checkbox"
          :checked="isReviewed"
          :disabled="!eventContextVerified"
          class="mt-1 h-4 w-4 rounded border-gray-400 text-rv-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          @change="setReviewed"
        />
        <span>He revisado el destino y la lista de artistas propuesta.</span>
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-if="!isConfirmed"
          type="button"
          class="min-h-10 rounded-lg bg-rv-navy px-4 text-sm font-semibold text-white hover:bg-rv-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-white"
          :disabled="!isReviewed || !eventContextVerified"
          :aria-label="`Confirmar ampliación de lineup para ${eventQuery.data.value?.name ?? preparation.snapshot.eventId}`"
          @click="confirmProposal"
        >
          Confirmar ampliación de lineup
        </button>
        <button
          v-else
          type="button"
          class="min-h-10 rounded-lg border border-gray-400 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:border-white/30 dark:text-white dark:hover:bg-white/10"
          @click="cancelConfirmation"
        >
          Cancelar confirmación
        </button>
        <button
          v-if="(isConfirmed || execution?.state === 'uncertain') && execution?.state !== 'updated'"
          type="button"
          class="min-h-10 rounded-lg bg-rv-purple px-4 text-sm font-semibold text-white hover:bg-rv-purple/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canExecute"
          @click="
            execute(
              conflict,
              execution?.state === 'uncertain'
                ? (getConfirmation() ?? '')
                : (confirmationSignature ?? '')
            )
          "
        >
          <i
            v-if="execution?.state === 'sending'"
            class="fa-solid fa-spinner fa-spin"
            aria-hidden="true"
          ></i>
          {{
            execution?.state === "sending"
              ? "Ampliando…"
              : execution?.state === "uncertain"
                ? "Reintentar el mismo snapshot"
                : "Ejecutar ampliación confirmada"
          }}
        </button>
      </div>
      <p v-if="execution?.state === 'sending'" role="status">
        La ampliación está en curso; el borrador puede seguir editándose.
      </p>
      <p
        v-if="execution?.state === 'invalid'"
        class="text-amber-900 dark:text-amber-200"
        role="alert"
      >
        {{ execution.message }}
      </p>
      <p
        v-if="execution?.state === 'uncertain'"
        class="text-amber-900 dark:text-amber-200"
        role="alert"
      >
        Resultado incierto. No se generará otra identidad; reintenta el snapshot original.
        {{ execution.message }}
      </p>
      <p
        v-if="execution?.state === 'conflict' || execution?.state === 'failed'"
        class="text-red-800 dark:text-red-200"
        role="alert"
      >
        {{ execution.message }}
      </p>
      <section
        v-if="execution?.state === 'updated'"
        class="space-y-1 rounded bg-green-50 p-3 text-green-900 dark:bg-green-950/30 dark:text-green-100"
        role="status"
      >
        <p class="font-semibold">Lineup ampliado en el evento {{ execution.result.eventId }}.</p>
        <p>
          Artistas añadidos:
          {{ execution.result.addedArtists.map(({ name }) => name).join(", ") || "ninguno" }}.
        </p>
        <p>
          Artistas ya existentes:
          {{ execution.result.existingArtists.map(({ name }) => name).join(", ") || "ninguno" }}.
        </p>
        <p v-if="execution.reconciliation === 'kept'">
          La fila cambió durante el envío y se conserva el borrador actual; su versión anterior ya
          fue ampliada.
        </p>
        <p v-else-if="execution.reconciliation === 'removed'">
          La fila autorizada se retiró del editor.
        </p>
      </section>
    </div>
  </section>
</template>
