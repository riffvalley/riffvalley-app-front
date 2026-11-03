<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useQueries } from "@tanstack/vue-query";
import { existingEventDetailQueryOptions, type ExistingEventDetail } from "../../api/eventImport";
import type { EventImportConflictPresentation } from "../../application/eventImportConflicts";
import type { LineupExpansionPreparation } from "../../application/eventLineupExpansionPreparation";
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
}>();

const emit = defineEmits<{
  toggle: [];
  navigate: [rowKey: string];
}>();

const conflictEventReferences = computed(() =>
  props.conflicts.flatMap((conflict, conflictIndex) =>
    conflict.eventReferences.map((reference) => ({ conflictIndex, ...reference }))
  )
);
const eventQueries = useQueries({
  queries: computed(() =>
    conflictEventReferences.value.map(({ eventId }) => ({
      ...existingEventDetailQueryOptions(eventId),
      enabled: props.showDetails && props.expanded,
    }))
  ),
});
const reviewIdentity = shallowRef<string | null>(null);

function reviewKey(conflict: EventImportConflictPresentation): string {
  return JSON.stringify([
    conflict.operationId,
    conflict.operationRowId,
    conflict.code,
    conflict.existingEventIds,
    conflict.candidateEventIds,
    conflict.relatedRows.map(({ operationRowId }) => operationRowId),
  ]);
}

function openExpansionReview(conflict: EventImportConflictPresentation) {
  const key = reviewKey(conflict);
  reviewIdentity.value = reviewIdentity.value === key ? null : key;
}

const eventDetailsByConflict = computed(() => {
  let queryIndex = 0;
  return props.conflicts.map((conflict) => ({
    conflict,
    events: conflict.eventReferences.map((reference) => ({
      ...reference,
      query: eventQueries.value[queryIndex++],
    })),
  }));
});

function formatType(type: ExistingEventDetail["type"]): string {
  if (type === "concert") return "Concierto";
  if (type === "festival") return "Festival";
  return "No disponible";
}

function importedType(type: "concert" | "festival" | "tour"): string {
  if (type === "tour") return "Concierto importado como gira";
  return type === "concert" ? "Concierto" : "Festival";
}

function comparisonLabel(draft: string | undefined, existing: string | undefined): string {
  if (!draft || !existing) return "No se puede comparar";
  return draft === existing ? "Igual en los datos disponibles" : "Difiere";
}

function dateRange(
  startDate: string | undefined,
  endDate: string | null | undefined
): string | undefined {
  if (!startDate) return undefined;
  return endDate ? `${startDate} – ${endDate}` : startDate;
}

function eventDateRange(event: ExistingEventDetail): string | undefined {
  if (!event.startDate) return undefined;
  if (event.endDate === undefined) return `${event.startDate} – fin no disponible`;
  return dateRange(event.startDate, event.endDate);
}

function comparableEventDateRange(event: ExistingEventDetail): string | undefined {
  if (!event.startDate || event.endDate === undefined) return undefined;
  return dateRange(event.startDate, event.endDate);
}

function eventName(name: string | null | undefined): string {
  if (name === undefined) return "No disponible";
  return name ?? "Sin nombre";
}

function eventTour(tourId: string | null | undefined): string {
  if (tourId === undefined) return "No disponible en el detalle de Events";
  return tourId ?? "Sin gira asociada";
}

function lineupNames(lineup: Array<{ name: string }> | undefined): string {
  if (!lineup) return "No disponible";
  return lineup.length ? lineup.map(({ name }) => name).join(" · ") : "Sin artistas";
}
</script>

<template>
  <div v-if="conflicts.length" class="px-2 py-1">
    <button
      v-if="showIndicator"
      type="button"
      class="inline-flex min-h-8 items-center gap-2 rounded px-2 text-xs font-semibold text-amber-900 underline decoration-amber-700 underline-offset-2 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-purple dark:text-amber-200 dark:hover:bg-white/10"
      :aria-expanded="expanded"
      :aria-controls="`event-import-conflicts-${conflicts[0]?.rowKey}`"
      :aria-label="`${conflicts.length} ${conflicts.length === 1 ? 'conflicto' : 'conflictos'} en fila ${rowNumber}; consultar detalle`"
      @click="emit('toggle')"
    >
      <span aria-hidden="true">!</span>
      {{ conflicts.length }} {{ conflicts.length === 1 ? "conflicto" : "conflictos" }}
      <span class="font-normal"
        >·
        {{ conflicts.some(({ status }) => status === "current") ? "vigente" : "histórico" }}</span
      >
    </button>

    <div
      v-if="showDetails && expanded"
      :id="`event-import-conflicts-${conflicts[0]?.rowKey}`"
      class="mt-1 rounded-md border border-amber-300 bg-amber-50/70 p-3 text-xs leading-relaxed text-gray-800 dark:border-amber-300/30 dark:bg-amber-950/20 dark:text-gray-100"
      :aria-label="`Detalle de conflictos de la fila ${rowNumber}`"
    >
      <ul class="space-y-4">
        <li
          v-for="(conflict, index) in conflicts"
          :key="`${conflict.operationRowId}-${conflict.code}-${index}`"
          class="space-y-2"
        >
          <div>
            <p class="font-semibold">
              {{ conflict.message }}
              <span class="font-normal">({{ conflict.code }})</span>
            </p>
            <p class="mt-1">
              Estado:
              {{
                conflict.status === "current"
                  ? "vigente para el borrador actual"
                  : "histórico de una revisión anterior"
              }}.
              {{
                conflict.kind === "participation"
                  ? "Conflicto de participación"
                  : "Posible duplicado"
              }}.
            </p>
            <p
              v-if="conflict.status === 'historical'"
              class="font-semibold text-amber-900 dark:text-amber-200"
              role="status"
            >
              Se muestra el snapshot enviado; sus referencias y candidatos no se aplican al borrador
              actual.
            </p>
          </div>

          <div v-if="conflict.relatedRows.length">
            <span class="font-medium">Filas relacionadas: </span>
            <template
              v-for="(related, relatedIndex) in conflict.relatedRows"
              :key="related.operationRowId"
            >
              <span v-if="relatedIndex">, </span>
              <button
                v-if="related.available && related.rowKey"
                type="button"
                class="font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-purple"
                :aria-label="`Ir a fila ${rowNumbers[related.rowKey] ?? related.rowKey}, relacionada`"
                @click="emit('navigate', related.rowKey)"
              >
                {{
                  rowNumbers[related.rowKey] ? `fila ${rowNumbers[related.rowKey]}` : related.rowKey
                }}
              </button>
              <span v-else
                >fila ya no disponible ({{ related.rowKey ?? related.operationRowId }})</span
              >
            </template>
          </div>

          <section v-if="conflict.eventReferences.length" class="space-y-2">
            <h4 class="font-semibold">Evento existente y candidatos del snapshot</h4>
            <p class="text-gray-700 dark:text-gray-200">
              Los candidatos no están seleccionados. Una referencia identificada por UUID se
              distingue de las candidatas posibles.
            </p>
            <article
              v-for="entry in eventDetailsByConflict[index]?.events ?? []"
              :key="entry.eventId"
              class="space-y-2 rounded border border-amber-300/70 bg-white/70 p-2 dark:border-white/15 dark:bg-black/10"
            >
              <div class="flex flex-wrap items-center gap-x-2">
                <strong>{{
                  entry.status === "identified"
                    ? "Evento existente identificado"
                    : "Candidato posible · sin seleccionar"
                }}</strong>
                <code class="break-all">{{ entry.eventId }}</code>
              </div>
              <p v-if="entry.query?.isLoading" role="status">Cargando contexto del evento…</p>
              <div v-else-if="entry.query?.isError" class="space-y-1" role="alert">
                <p>No se pudo cargar el detalle. El conflicto y el UUID siguen disponibles.</p>
                <button
                  type="button"
                  class="font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-purple"
                  @click="entry.query?.refetch()"
                >
                  Reintentar consulta del evento
                </button>
              </div>
              <template v-else-if="entry.query?.data">
                <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <dt class="font-medium">Tipo</dt>
                  <dd>{{ formatType(entry.query.data.type) }}</dd>
                  <dt class="font-medium">Nombre</dt>
                  <dd>{{ eventName(entry.query.data.name) }}</dd>
                  <dt class="font-medium">Fecha</dt>
                  <dd>
                    {{ eventDateRange(entry.query.data) ?? "No disponible" }}
                  </dd>
                  <dt class="font-medium">Ciudad</dt>
                  <dd>{{ entry.query.data.venue?.locality?.name ?? "No disponible" }}</dd>
                  <dt class="font-medium">Recinto</dt>
                  <dd>{{ entry.query.data.venue?.name ?? "No disponible" }}</dd>
                  <dt class="font-medium">Gira (UUID)</dt>
                  <dd>{{ eventTour(entry.query.data.tourId) }}</dd>
                  <dt class="font-medium">Artistas</dt>
                  <dd>{{ lineupNames(entry.query.data.lineup) }}</dd>
                </dl>
                <div class="overflow-x-auto">
                  <table class="min-w-[34rem] border-collapse text-left">
                    <caption class="sr-only">
                      Comparación informativa entre snapshot importado y evento
                      {{
                        entry.eventId
                      }}
                    </caption>
                    <thead>
                      <tr>
                        <th class="pr-3 font-semibold">Campo</th>
                        <th class="pr-3 font-semibold">Borrador enviado</th>
                        <th class="font-semibold">Evento existente</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th scope="row" class="pr-3 font-medium">Tipo</th>
                        <td class="pr-3">{{ importedType(conflict.snapshot.type) }}</td>
                        <td>{{ formatType(entry.query.data.type) }}</td>
                      </tr>
                      <tr>
                        <th scope="row" class="pr-3 font-medium">Nombre / gira</th>
                        <td class="pr-3">
                          {{
                            conflict.snapshot.type === "tour"
                              ? (conflict.snapshot.name ?? "No enviado")
                              : eventName(conflict.snapshot.name)
                          }}
                        </td>
                        <td>
                          {{
                            conflict.snapshot.type === "tour"
                              ? eventTour(entry.query.data.tourId)
                              : eventName(entry.query.data.name)
                          }}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row" class="pr-3 font-medium">Fecha</th>
                        <td class="pr-3">
                          {{ dateRange(conflict.snapshot.startDate, conflict.snapshot.endDate) }}
                        </td>
                        <td>
                          {{ eventDateRange(entry.query.data) ?? "No disponible" }}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row" class="pr-3 font-medium">Ciudad</th>
                        <td class="pr-3">{{ conflict.snapshot.city }}</td>
                        <td>{{ entry.query.data.venue?.locality?.name ?? "No disponible" }}</td>
                      </tr>
                      <tr>
                        <th scope="row" class="pr-3 font-medium">Recinto</th>
                        <td class="pr-3">{{ conflict.snapshot.venue ?? "No enviado" }}</td>
                        <td>{{ entry.query.data.venue?.name ?? "No disponible" }}</td>
                      </tr>
                      <tr>
                        <th scope="row" class="pr-3 font-medium">Lineup</th>
                        <td class="pr-3">
                          {{
                            conflict.snapshot.lineup?.map(({ name }) => name).join(" · ") || "Vacío"
                          }}
                        </td>
                        <td>{{ lineupNames(entry.query.data.lineup) }}</td>
                      </tr>
                      <tr>
                        <th scope="row" class="pr-3 font-medium">Gira</th>
                        <td class="pr-3">
                          {{
                            conflict.snapshot.type === "tour"
                              ? `${conflict.snapshot.name ?? "Nombre no enviado"}${conflict.snapshot.tourId ? ` · UUID ${conflict.snapshot.tourId}` : " · UUID sin confirmar"}`
                              : (conflict.snapshot.tourId ?? "No enviada")
                          }}
                        </td>
                        <td>{{ eventTour(entry.query.data.tourId) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p class="text-gray-700 dark:text-gray-200">
                  Comparación informativa:
                  {{
                    comparisonLabel(
                      dateRange(conflict.snapshot.startDate, conflict.snapshot.endDate),
                      comparableEventDateRange(entry.query.data)
                    )
                  }}
                  para fecha,
                  {{
                    comparisonLabel(conflict.snapshot.city, entry.query.data.venue?.locality?.name)
                  }}
                  para ciudad y
                  {{ comparisonLabel(conflict.snapshot.venue, entry.query.data.venue?.name) }} para
                  recinto. Igualdad textual no confirma identidad del evento.
                </p>
                <p v-if="entry.query.data.venue?.locality?.province">
                  Provincia del evento: {{ entry.query.data.venue.locality.province }}. Provincia
                  del snapshot: {{ conflict.snapshot.province ?? "No enviada" }}.
                </p>
              </template>
              <p v-else role="status">Detalle del evento todavía no consultado.</p>
            </article>
          </section>
          <p v-else class="text-gray-700 dark:text-gray-200">
            No se puede preparar una ampliación: el backend no devolvió un evento identificado ni
            candidatos.
          </p>

          <section
            v-if="conflict.matchingArtists.length || conflict.addableArtists.length"
            class="space-y-1"
          >
            <h4 class="font-semibold">Artistas según el motor de conflictos</h4>
            <p v-if="conflict.matchingArtists.length">
              Artistas que el motor de conflictos clasifica como coincidentes:
              <span
                v-for="(artist, artistIndex) in conflict.matchingArtists"
                :key="`${artist.artistId}-${artist.name}`"
              >
                {{ artistIndex ? " · " : "" }}{{ artist.name
                }}<template v-if="artist.artistId"> (UUID {{ artist.artistId }})</template
                ><template v-else> (coincidencia textual; UUID no confirmado)</template>
              </span>
            </p>
            <p v-if="conflict.addableArtists.length">
              Artistas que el backend clasifica como adicionales:
              <span
                v-for="(artist, artistIndex) in conflict.addableArtists"
                :key="`${artist.artistId}-${artist.name}`"
              >
                {{ artistIndex ? " · " : "" }}{{ artist.name
                }}<template v-if="artist.artistId"> ({{ artist.artistId }})</template
                ><template v-else> (identidad por UUID no confirmada)</template>
              </span>
            </p>
            <p>Esta clasificación no modifica el evento ni autoriza una ampliación de lineup.</p>
          </section>

          <p
            v-if="
              !conflict.eventReferences.length &&
              !conflict.matchingArtists.length &&
              !conflict.addableArtists.length
            "
            class="text-gray-700 dark:text-gray-200"
          >
            El resultado no incluye detalle de evento ni datos estructurados de artistas.
          </p>
          <div v-if="canReviewLineupExpansion(conflict)" class="space-y-2">
            <button
              type="button"
              class="min-h-9 rounded-md border border-rv-purple px-3 font-semibold text-rv-purple underline-offset-2 hover:bg-rv-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:text-purple-200"
              :aria-expanded="reviewIdentity === reviewKey(conflict)"
              :aria-controls="`lineup-expansion-review-${conflict.operationRowId}-${index}`"
              @click="openExpansionReview(conflict)"
            >
              {{
                reviewIdentity === reviewKey(conflict)
                  ? "Cerrar revisión de lineup"
                  : "Revisar ampliación de lineup"
              }}
            </button>
            <EventLineupExpansionReview
              v-if="reviewIdentity === reviewKey(conflict)"
              :id="`lineup-expansion-review-${conflict.operationRowId}-${index}`"
              :conflict="conflict"
              :prepare="(selectedEventId) => prepareLineupExpansion(conflict, selectedEventId)"
              :get-confirmation="() => getExpansionConfirmation(conflict)"
              :set-confirmation="(signature) => setExpansionConfirmation(conflict, signature)"
              :get-selection="() => getExpansionSelection(conflict)"
              :set-selection="(eventId) => setExpansionSelection(conflict, eventId)"
            />
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
