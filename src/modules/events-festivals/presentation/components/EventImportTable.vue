<script setup lang="ts">
import type {
  EventImportRow,
  EventGeographyState,
  EventTourState,
  LineupCellState,
} from "../../application/useEventImportRows";
import type { AdministrativeRegion } from "@/modules/venues";
import LineupCell from "./LineupCell.vue";
import LocalityCell from "./LocalityCell.vue";
import VenueCell from "./VenueCell.vue";
import { getDateCellError, type EventDateField } from "../../application/eventDate";
import { eventTypes, parseEventType, type EventType } from "../../application/eventType";
import { splitLineupNames } from "../../application/lineupText";
import { computed, reactive, shallowRef } from "vue";
import EventImportConflictDetails from "./EventImportConflictDetails.vue";
import type { EventImportConflictPresentation } from "../../application/eventImportConflicts";
import type { LineupExpansionPreparation } from "../../application/eventLineupExpansionPreparation";
import type { EventLineupExpansionExecution } from "../../application/useEventLineupExpansionMutation";

type EventTextField = "price" | "otherInfo";

const props = defineProps<{
  rows: EventImportRow[];
  lineupStates: Record<string, LineupCellState>;
  geographyStates: Record<string, EventGeographyState>;
  tourStates: Record<string, EventTourState>;
  regions: AdministrativeRegion[];
  conflictsByRowKey: Record<string, EventImportConflictPresentation[]>;
  selectedRowKeys: ReadonlySet<string>;
  discardDisabled: boolean;
  rowProblems: Record<string, { label: string; fields: string[]; historical?: boolean }>;
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
const invalidTypePaste = reactive<Record<string, string>>({});
const expandedConflictRowKey = shallowRef<string | null>(null);
const rowNumbers = computed(() =>
  Object.fromEntries(props.rows.map((row, index) => [row.id, index + 1]))
);

function rowStatusSummary(problem: { label: string; fields: string[]; historical?: boolean }) {
  if (problem.label === "Lista para importar") return "Lista para importar";
  if (problem.label.toLocaleLowerCase("und").includes("conflicto"))
    return "Conflicto · revisar coincidencias";
  if (problem.label.toLocaleLowerCase("und").includes("no sabemos si la operación terminó"))
    return "No se conoce el resultado · comprobar antes de reintentar";
  if (problem.historical) return "Conflicto anterior · revisar la fila actual";
  if (problem.label.includes("50 filas por operación"))
    return "Pendiente · máximo de 50 filas por operación";
  if (problem.label.toLocaleLowerCase("und").includes("error al resolver"))
    return "Error · revisar resolución";
  if (
    problem.label.startsWith("Hay información que debes corregir") ||
    problem.label.startsWith("No se pudo completar la operación")
  )
    return "Error · revisar resultado de importación";
  return `Pendiente · ${problem.label}`;
}

function conflictContext(conflicts: EventImportConflictPresentation[]): string {
  const conflict = conflicts[0];
  if (!conflict) return "Conflicto detectado";
  if (conflict.status === "historical")
    return "Conflicto anterior — La fila cambió desde la última importación.";
  if (conflict.relatedRows.length) {
    const availableRows = conflict.relatedRows
      .filter(({ available, rowKey }) => available && rowKey && rowNumbers.value[rowKey])
      .map(({ rowKey }) => rowNumbers.value[rowKey as string]);
    if (availableRows.length === 1)
      return `Este concierto entra en conflicto con la fila ${availableRows[0]}`;
    return conflicts.length > 1 ? "Conflicto entre filas" : "Conflicto con otra fila";
  }

  const identifiedConcert =
    conflict.snapshot.type === "concert" &&
    conflict.eventReferences.some(({ status }) => status === "identified");
  if (conflict.code === "FESTIVAL_DUPLICATE") return "Este festival ya existe";
  if (conflict.kind === "participation" && conflict.status === "current" && identifiedConcert)
    return "Este concierto ya existe";
  if (conflict.kind === "participation") {
    if (
      conflict.matchingArtists.length > 0 &&
      conflict.matchingArtists.every(({ artistId }) => !artistId)
    )
      return "Posible conflicto de participación";
    return "Este artista ya participa en un concierto";
  }
  if (conflict.code === "CONCERT_DUPLICATE" && identifiedConcert) return "Este concierto ya existe";
  return "Conflicto detectado";
}

const emit = defineEmits<{
  updateEvent: [id: string, value: string];
  confirmTour: [id: string];
  retryTour: [id: string];
  selectTourCandidate: [id: string, candidateId: string];
  updateType: [id: string, value: EventType];
  updateTypeRange: [startIndex: number, values: (EventType | null)[]];
  updateTextField: [id: string, field: EventTextField, value: string];
  updateTextRange: [startIndex: number, field: EventTextField, values: string[][]];
  updateDate: [id: string, field: EventDateField, value: string];
  updateDateRange: [startIndex: number, field: EventDateField, values: string[][]];
  updateVenue: [id: string, value: string];
  updateCity: [id: string, value: string];
  updateProvince: [id: string, value: string];
  commitVenue: [id: string];
  retryVenue: [id: string];
  retryLocality: [id: string];
  selectRegion: [id: string, regionId: string];
  selectLocality: [id: string, localityId: string];
  selectVenue: [id: string, venueId: string];
  selectArtist: [rowId: string, itemKey: string, artistId: string];
  updateLineupDraft: [id: string, value: string];
  commitLineupDraft: [id: string];
  pasteLineupRange: [startIndex: number, values: string[][]];
  updateLineupItemName: [rowId: string, itemKey: string, value: string];
  commitLineupItemName: [rowId: string, itemKey: string];
  retryLineupItem: [rowId: string, itemKey: string];
  removeLineupItem: [rowId: string, itemKey: string];
  toggleRowSelection: [id: string, selected: boolean];
  executeExpansion: [conflict: EventImportConflictPresentation, signature: string];
  criticalEdit: [];
}>();

function handleTypePaste(event: ClipboardEvent, rowIndex: number) {
  const text = event.clipboardData?.getData("text/plain");
  if (text === undefined) return;
  event.preventDefault();
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines.length === 0) lines.push("");
  const parsed = lines.map((line) => parseEventType(line.split("\t")[0] ?? ""));
  emit("updateTypeRange", rowIndex, parsed);
  emit("criticalEdit");
  parsed.forEach((type, offset) => {
    const targetIndex = rowIndex + offset;
    const rowId = props.rows[targetIndex]?.id;
    if (!rowId) return;
    if (type) delete invalidTypePaste[rowId];
    else invalidTypePaste[rowId] = lines[offset]?.split("\t")[0] ?? "";
  });
}

function clearTypePasteError(rowId: string) {
  delete invalidTypePaste[rowId];
}

function toggleConflictDetails(rowKey: string) {
  expandedConflictRowKey.value = expandedConflictRowKey.value === rowKey ? null : rowKey;
}

function navigateToRow(rowKey: string) {
  const target = document.getElementById(`event-import-row-${rowKey}`);
  if (!(target instanceof HTMLTableRowElement)) return;
  target.scrollIntoView?.({ block: "center", behavior: "smooth" });
  const firstControl = target.querySelector<HTMLElement>("input, select, button, textarea");
  if (firstControl) firstControl.focus();
  else target.focus();
}

function handleDatePaste(event: ClipboardEvent, rowIndex: number, field: EventDateField) {
  const text = event.clipboardData?.getData("text/plain");
  if (text === undefined) return;
  event.preventDefault();
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines.length === 0) lines.push("");
  const values = lines.map((line) => line.split("\t").slice(0, field === "startDate" ? 2 : 1));
  emit("updateDateRange", rowIndex, field, values);
  emit("criticalEdit");
}

function handleTextPaste(event: ClipboardEvent, rowIndex: number, field: EventTextField) {
  const text = event.clipboardData?.getData("text/plain");
  if (text === undefined) return;
  event.preventDefault();
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines.length === 0) lines.push("");
  const columnCount = field === "price" ? 2 : 1;
  const values = lines.map((line) => line.split("\t").slice(0, columnCount));
  emit("updateTextRange", rowIndex, field, values);
  emit("criticalEdit");
}

function handleLineupPaste(text: string, rowIndex: number) {
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  const groups = lines.map((line) => splitLineupNames(line.split("\t")[0] ?? ""));
  emit("pasteLineupRange", rowIndex, groups);
  emit("criticalEdit");
}
</script>

<template>
  <div
    class="min-h-0 flex-1 overflow-auto rounded-lg border-2 border-gray-300 bg-white dark:border-white/20 dark:bg-rv-darkCard"
  >
    <table class="w-full min-w-[84rem] table-fixed border-collapse text-left">
      <colgroup>
        <col class="w-[4%]" />
        <col class="w-[4%]" />
        <col class="w-[6%]" />
        <col class="w-[10%]" />
        <col class="w-[20%]" />
        <col class="w-[8%]" />
        <col class="w-[8%]" />
        <col class="w-[9%]" />
        <col class="w-[8%]" />
        <col class="w-[10%]" />
        <col class="w-[6%]" />
        <col class="w-[7%]" />
      </colgroup>
      <caption class="sr-only">
        Filas de conciertos y festivales pendientes de definir
      </caption>
      <thead
        class="sticky top-0 z-10 bg-gray-100 text-xs uppercase tracking-wide text-gray-600 dark:bg-rv-darkSurface dark:text-gray-300"
      >
        <tr>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-1 py-2 text-center dark:border-white/20"
          >
            <span class="sr-only">Seleccionar fila</span>
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-1 py-2 text-center dark:border-white/20"
          >
            Fila
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-2 py-2 dark:border-white/20"
          >
            Tipo
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-2 py-2 dark:border-white/20"
          >
            Nombre del evento
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-2 py-2 dark:border-white/20"
          >
            Artistas / Lineup <span aria-hidden="true">*</span>
            <span class="sr-only">obligatorio</span>
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-2 py-2 dark:border-white/20"
          >
            Fecha de inicio
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-2 py-2 dark:border-white/20"
          >
            Fecha de fin
            <span class="font-normal normal-case text-gray-500 dark:text-gray-300">(opcional)</span>
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-2 py-2 dark:border-white/20"
          >
            Ciudad
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-2 py-2 dark:border-white/20"
          >
            Provincia
            <span class="font-normal normal-case text-gray-500 dark:text-gray-300">(opcional)</span>
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-2 py-2 dark:border-white/20"
          >
            Recinto
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-2 py-2 dark:border-white/20"
          >
            Precio
            <span class="font-normal normal-case text-gray-500 dark:text-gray-300">(opcional)</span>
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-2 py-2 dark:border-white/20"
          >
            Otra información
            <span class="font-normal normal-case text-gray-500 dark:text-gray-300">(opcional)</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(row, index) in rows" :key="row.id">
          <tr
            :id="`event-import-row-${row.id}`"
            :aria-describedby="rowProblems[row.id] ? `event-import-status-${row.id}` : undefined"
            tabindex="-1"
            class="group hover:bg-gray-50 dark:hover:bg-white/[0.03]"
          >
            <td
              class="border-b-2 border-r-2 border-gray-300 px-2 py-1 text-center dark:border-white/20"
            >
              <input
                type="checkbox"
                :checked="selectedRowKeys.has(row.id)"
                :disabled="discardDisabled"
                :aria-label="`Seleccionar fila ${index + 1} para descartar`"
                class="h-4 w-4 rounded border-gray-400 text-rv-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
                @change="
                  emit('toggleRowSelection', row.id, ($event.target as HTMLInputElement).checked)
                "
              />
            </td>
            <th
              scope="row"
              class="border-b-2 border-r-2 border-gray-300 px-3 py-1 text-center text-xs font-medium tabular-nums text-gray-500 focus:outline focus:outline-2 focus:outline-rv-purple dark:border-white/20 dark:text-gray-400"
            >
              {{ index + 1 }}
            </th>
            <td class="border-b-2 border-r-2 border-gray-300 p-1 dark:border-white/20">
              <div>
                <select
                  :value="row.type"
                  :aria-label="`Tipo, fila ${index + 1}`"
                  :aria-invalid="invalidTypePaste[row.id] !== undefined"
                  :aria-describedby="
                    invalidTypePaste[row.id] !== undefined ? `type-error-${row.id}` : undefined
                  "
                  class="min-h-10 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
                  @change="
                    clearTypePasteError(row.id);
                    emit(
                      'updateType',
                      row.id,
                      ($event.target as HTMLSelectElement).value as EventType
                    );
                  "
                  @paste="handleTypePaste($event, index)"
                >
                  <option v-for="type in eventTypes" :key="type.value" :value="type.value">
                    {{ type.label }}
                  </option>
                </select>
                <p
                  v-if="invalidTypePaste[row.id] !== undefined"
                  :id="`type-error-${row.id}`"
                  class="px-1 pt-1 text-xs text-red-700 dark:text-red-300"
                  role="alert"
                >
                  Tipo inválido «{{ invalidTypePaste[row.id] }}». Usa Concierto, Festival o Tour.
                </p>
              </div>
            </td>
            <td class="border-b-2 border-r-2 border-gray-300 p-1 dark:border-white/20">
              <input
                :value="row.event"
                type="text"
                :aria-label="
                  row.type === 'tour'
                    ? `Nombre de gira, fila ${index + 1}`
                    : `Evento, fila ${index + 1}`
                "
                :aria-required="row.type !== 'concert'"
                :placeholder="row.type === 'concert' ? 'Opcional' : 'Obligatorio'"
                autocomplete="off"
                class="min-h-10 w-full rounded-sm border border-transparent bg-transparent px-3 text-sm text-gray-900 outline-none transition focus-visible:border-rv-purple focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white"
                @input="emit('updateEvent', row.id, ($event.target as HTMLInputElement).value)"
              />
              <div
                v-if="row.type === 'tour' && tourStates[row.id]?.status !== 'idle'"
                class="space-y-1 px-2 pb-1 text-xs"
              >
                <p
                  v-if="tourStates[row.id]?.status === 'resolving'"
                  role="status"
                  class="text-gray-600 dark:text-gray-300"
                >
                  Resolviendo gira…
                </p>
                <template v-else-if="tourStates[row.id]?.status === 'existing'">
                  <p class="text-amber-800 dark:text-amber-200">
                    {{ tourStates[row.id]?.confirmedTourId ? "Gira confirmada" : "Gira existente" }}
                  </p>
                  <button
                    v-if="!tourStates[row.id]?.confirmedTourId"
                    type="button"
                    class="rounded font-semibold text-rv-navy underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:text-gray-200"
                    @click="emit('confirmTour', row.id)"
                  >
                    Utilizar esta gira
                  </button>
                </template>
                <template v-else-if="tourStates[row.id]?.status === 'ambiguous'">
                  <p class="block text-amber-800 dark:text-amber-200">
                    {{
                      tourStates[row.id]?.confirmedTourId ? "Gira confirmada" : "Seleccionar gira"
                    }}
                  </p>
                  <template v-if="!tourStates[row.id]?.confirmedTourId">
                    <select
                      :value="tourStates[row.id]?.selectedCandidateId ?? ''"
                      :aria-label="`Candidata de gira, fila ${index + 1}`"
                      class="min-h-9 max-w-full rounded border border-gray-300 bg-white px-2 text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
                      @change="
                        emit(
                          'selectTourCandidate',
                          row.id,
                          ($event.target as HTMLSelectElement).value
                        )
                      "
                    >
                      <option value="">Selecciona una candidata</option>
                      <template v-if="tourStates[row.id]?.result?.status === 'ambiguous'">
                        <option
                          v-for="candidate in tourStates[row.id].result.candidates"
                          :key="candidate.id"
                          :value="candidate.id"
                        >
                          {{ candidate.name }}
                        </option>
                      </template>
                    </select>
                    <button
                      type="button"
                      :disabled="!tourStates[row.id]?.selectedCandidateId"
                      class="rounded font-semibold text-rv-navy underline enabled:focus-visible:outline enabled:focus-visible:outline-2 enabled:focus-visible:outline-rv-purple disabled:opacity-50 dark:text-gray-200"
                      @click="emit('confirmTour', row.id)"
                    >
                      Utilizar esta gira
                    </button>
                  </template>
                </template>
                <p
                  v-else-if="tourStates[row.id]?.status === 'new'"
                  role="status"
                  class="text-gray-600 dark:text-gray-300"
                >
                  Gira nueva
                </p>
                <p
                  v-else-if="tourStates[row.id]?.status === 'invalid'"
                  role="alert"
                  class="text-red-700 dark:text-red-300"
                >
                  Nombre de gira no válido.
                </p>
                <div
                  v-else-if="tourStates[row.id]?.status === 'error'"
                  role="alert"
                  class="text-red-700 dark:text-red-300"
                >
                  <p>Error al buscar la gira.</p>
                  <button
                    type="button"
                    class="font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple"
                    @click="emit('retryTour', row.id)"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </td>
            <td class="border-b-2 border-r-2 border-gray-300 p-1 dark:border-white/20">
              <LineupCell
                :row-id="row.id"
                :items="row.lineup"
                :state="lineupStates[row.id]"
                :row-number="index + 1"
                @update-draft="emit('updateLineupDraft', row.id, $event)"
                @commit-draft="emit('commitLineupDraft', row.id)"
                @paste-draft="handleLineupPaste($event, index)"
                @update-item-name="
                  (itemKey, value) => emit('updateLineupItemName', row.id, itemKey, value)
                "
                @commit-item-name="emit('commitLineupItemName', row.id, $event)"
                @retry-item="emit('retryLineupItem', row.id, $event)"
                @remove-item="emit('removeLineupItem', row.id, $event)"
                @select-artist="
                  (rowId, itemKey, artistId) => emit('selectArtist', rowId, itemKey, artistId)
                "
              />
            </td>
            <td class="border-b-2 border-r-2 border-gray-300 p-1 dark:border-white/20">
              <div>
                <input
                  :value="row.startDateDraft"
                  type="text"
                  inputmode="numeric"
                  placeholder="DD/MM/AAAA"
                  :aria-label="`Fecha de inicio, fila ${index + 1}`"
                  :aria-invalid="Boolean(getDateCellError(row, 'startDate'))"
                  :aria-describedby="
                    getDateCellError(row, 'startDate') ? `start-date-error-${row.id}` : undefined
                  "
                  autocomplete="off"
                  class="min-h-10 w-full rounded-sm border border-transparent bg-transparent px-2 text-sm tabular-nums text-gray-900 outline-none transition placeholder:text-gray-500 focus-visible:border-rv-purple focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white dark:placeholder:text-gray-300"
                  @input="
                    emit(
                      'updateDate',
                      row.id,
                      'startDate',
                      ($event.target as HTMLInputElement).value
                    )
                  "
                  @paste="handleDatePaste($event, index, 'startDate')"
                />
                <p
                  v-if="getDateCellError(row, 'startDate')"
                  :id="`start-date-error-${row.id}`"
                  class="px-2 pb-1 text-xs text-red-700 dark:text-red-300"
                  role="alert"
                >
                  {{ getDateCellError(row, "startDate") }}
                </p>
              </div>
            </td>
            <td class="border-b-2 border-r-2 border-gray-300 p-1 dark:border-white/20">
              <div>
                <input
                  :value="row.endDateDraft"
                  type="text"
                  inputmode="numeric"
                  placeholder="DD/MM/AAAA"
                  :aria-label="`Fecha de fin, fila ${index + 1} (opcional)`"
                  :aria-invalid="Boolean(getDateCellError(row, 'endDate'))"
                  :aria-describedby="
                    getDateCellError(row, 'endDate') ? `end-date-error-${row.id}` : undefined
                  "
                  autocomplete="off"
                  class="min-h-10 w-full rounded-sm border border-transparent bg-transparent px-2 text-sm tabular-nums text-gray-900 outline-none transition placeholder:text-gray-500 focus-visible:border-rv-purple focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white dark:placeholder:text-gray-300"
                  @input="
                    emit('updateDate', row.id, 'endDate', ($event.target as HTMLInputElement).value)
                  "
                  @paste="handleDatePaste($event, index, 'endDate')"
                />
                <p
                  v-if="getDateCellError(row, 'endDate')"
                  :id="`end-date-error-${row.id}`"
                  class="px-2 pb-1 text-xs text-red-700 dark:text-red-300"
                  role="alert"
                >
                  {{ getDateCellError(row, "endDate") }}
                </p>
              </div>
            </td>
            <td class="border-b-2 border-r-2 border-gray-300 p-1 align-top dark:border-white/20">
              <LocalityCell
                :row="row"
                :state="geographyStates[row.id]!"
                :regions="regions"
                :row-number="index + 1"
                @update="emit('updateCity', row.id, $event)"
                @retry="emit('retryLocality', row.id)"
                @select-region="emit('selectRegion', row.id, $event)"
                @select-locality="emit('selectLocality', row.id, $event)"
              />
            </td>
            <td class="border-b-2 border-r-2 border-gray-300 p-1 align-top dark:border-white/20">
              <input
                :value="row.province"
                type="text"
                :aria-label="`Provincia, fila ${index + 1}`"
                autocomplete="off"
                class="min-h-10 w-full rounded-sm border border-transparent bg-transparent px-2 text-sm text-gray-900 outline-none transition focus-visible:border-rv-purple focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white"
                @input="emit('updateProvince', row.id, ($event.target as HTMLInputElement).value)"
              />
            </td>
            <td class="border-b-2 border-r-2 border-gray-300 p-1 align-top dark:border-white/20">
              <VenueCell
                :row="row"
                :state="geographyStates[row.id]!"
                :row-number="index + 1"
                @update="emit('updateVenue', row.id, $event)"
                @commit="emit('commitVenue', row.id)"
                @retry="emit('retryVenue', row.id)"
                @select-venue="emit('selectVenue', row.id, $event)"
              />
            </td>
            <td class="border-b-2 border-r-2 border-gray-300 p-1 dark:border-white/20">
              <input
                :value="row.price"
                type="text"
                :aria-label="`Precio, fila ${index + 1} (opcional)`"
                autocomplete="off"
                class="min-h-10 w-full rounded-sm border border-transparent bg-transparent px-2 text-sm text-gray-900 outline-none transition focus-visible:border-rv-purple focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white"
                @input="
                  emit(
                    'updateTextField',
                    row.id,
                    'price',
                    ($event.target as HTMLInputElement).value
                  )
                "
                @paste="handleTextPaste($event, index, 'price')"
              />
            </td>
            <td class="border-b-2 border-r-2 border-gray-300 p-1 dark:border-white/20">
              <input
                :value="row.otherInfo"
                type="text"
                :aria-label="`Otra información, fila ${index + 1} (opcional)`"
                autocomplete="off"
                class="min-h-10 w-full rounded-sm border border-transparent bg-transparent px-3 text-sm text-gray-900 outline-none transition focus-visible:border-rv-purple focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white"
                @input="
                  emit(
                    'updateTextField',
                    row.id,
                    'otherInfo',
                    ($event.target as HTMLInputElement).value
                  )
                "
                @paste="handleTextPaste($event, index, 'otherInfo')"
              />
            </td>
          </tr>
          <tr
            v-if="rowProblems[row.id]"
            :id="`event-import-status-${row.id}`"
            class="border-b border-gray-200 bg-amber-50/60 text-xs text-gray-800 dark:border-white/10 dark:bg-amber-950/15 dark:text-gray-100"
          >
            <td colspan="12" class="px-3 py-1">
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="font-medium" role="status">
                  {{
                    conflictsByRowKey[row.id]?.length
                      ? conflictContext(conflictsByRowKey[row.id])
                      : rowStatusSummary(rowProblems[row.id])
                  }}
                </span>
                <EventImportConflictDetails
                  v-if="conflictsByRowKey[row.id]?.length"
                  :conflicts="conflictsByRowKey[row.id]"
                  :row-number="index + 1"
                  :row-numbers="rowNumbers"
                  :show-indicator="true"
                  :show-details="false"
                  :expanded="expandedConflictRowKey === row.id"
                  :can-review-lineup-expansion="canReviewLineupExpansion"
                  :prepare-lineup-expansion="prepareLineupExpansion"
                  :get-expansion-confirmation="getExpansionConfirmation"
                  :set-expansion-confirmation="setExpansionConfirmation"
                  :get-expansion-selection="getExpansionSelection"
                  :set-expansion-selection="setExpansionSelection"
                  :get-expansion-execution="getExpansionExecution"
                  @toggle="toggleConflictDetails(row.id)"
                  @execute-expansion="
                    (conflict, signature) => emit('executeExpansion', conflict, signature)
                  "
                />
                <details
                  v-if="
                    !conflictsByRowKey[row.id]?.length &&
                    (rowProblems[row.id].fields.length || rowProblems[row.id].label.length > 64)
                  "
                >
                  <summary
                    class="cursor-pointer rounded underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
                  >
                    Más información
                  </summary>
                  <span class="ml-1">{{ rowProblems[row.id].label }}</span>
                  <span v-if="rowProblems[row.id].fields.length">
                    Revisar: {{ rowProblems[row.id].fields.join(", ") }}.
                  </span>
                </details>
              </div>
            </td>
          </tr>
          <tr
            v-if="conflictsByRowKey[row.id]?.length"
            v-show="expandedConflictRowKey === row.id"
            class="border-b border-gray-200 dark:border-white/10"
          >
            <td colspan="12" class="px-3 py-2">
              <div class="ml-[8%] min-w-0 max-w-4xl">
                <EventImportConflictDetails
                  :conflicts="conflictsByRowKey[row.id]"
                  :row-number="index + 1"
                  :row-numbers="rowNumbers"
                  :show-indicator="false"
                  :show-details="true"
                  :expanded="expandedConflictRowKey === row.id"
                  :can-review-lineup-expansion="canReviewLineupExpansion"
                  :prepare-lineup-expansion="prepareLineupExpansion"
                  :get-expansion-confirmation="getExpansionConfirmation"
                  :set-expansion-confirmation="setExpansionConfirmation"
                  :get-expansion-selection="getExpansionSelection"
                  :set-expansion-selection="setExpansionSelection"
                  :get-expansion-execution="getExpansionExecution"
                  @toggle="toggleConflictDetails(row.id)"
                  @navigate="navigateToRow"
                  @execute-expansion="
                    (conflict, signature) => emit('executeExpansion', conflict, signature)
                  "
                />
              </div>
            </td>
          </tr>
        </template>
        <tr v-if="rows.length === 0">
          <td colspan="12" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No hay filas. Añade una para empezar.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
