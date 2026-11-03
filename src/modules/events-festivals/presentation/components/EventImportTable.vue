<script setup lang="ts">
import type {
  EventImportRow,
  EventGeographyState,
  EventTourState,
  LineupCellState,
} from "../../application/useEventImportRows";
import type { AdministrativeRegion } from "@/modules/venues";
import LineupCell from "./LineupCell.vue";
import VenueCell from "./VenueCell.vue";
import { getDateCellError, type EventDateField } from "../../application/eventDate";
import { eventTypes, parseEventType, type EventType } from "../../application/eventType";
import { computed, reactive, shallowRef } from "vue";
import EventImportConflictDetails from "./EventImportConflictDetails.vue";
import type { EventImportConflictPresentation } from "../../application/eventImportConflicts";

type EventTextField = "price" | "otherInfo";

const props = defineProps<{
  rows: EventImportRow[];
  lineupStates: Record<string, LineupCellState>;
  geographyStates: Record<string, EventGeographyState>;
  tourStates: Record<string, EventTourState>;
  regions: AdministrativeRegion[];
  conflictsByRowKey: Record<string, EventImportConflictPresentation[]>;
}>();
const invalidTypePaste = reactive<Record<string, string>>({});
const expandedConflictRowKey = shallowRef<string | null>(null);
const rowNumbers = computed(() =>
  Object.fromEntries(props.rows.map((row, index) => [row.id, index + 1]))
);

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
  retryLineupDraft: [id: string];
  updateLineupItemName: [rowId: string, itemKey: string, value: string];
  commitLineupItemName: [rowId: string, itemKey: string];
  retryLineupItem: [rowId: string, itemKey: string];
  removeLineupItem: [rowId: string, itemKey: string];
  removeRow: [id: string];
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
}
</script>

<template>
  <div
    class="min-h-0 flex-1 overflow-auto rounded-lg border-2 border-gray-300 bg-white dark:border-white/20 dark:bg-rv-darkCard"
  >
    <table class="w-full min-w-[110rem] table-fixed border-collapse text-left">
      <colgroup>
        <col class="w-16" />
        <col class="w-[9%]" />
        <col class="w-[9%]" />
        <col class="w-[18%]" />
        <col class="w-[9%]" />
        <col class="w-[9%]" />
        <col class="w-[8%]" />
        <col class="w-[12%]" />
        <col class="w-[16%]" />
        <col class="w-[9%]" />
        <col class="w-[9%]" />
        <col class="w-16" />
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
            class="w-16 border-b-2 border-r-2 border-gray-300 px-3 py-3 text-center dark:border-white/20"
          >
            Fila
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-4 py-3 dark:border-white/20"
          >
            Type
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-4 py-3 dark:border-white/20"
          >
            Event / Name
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-4 py-3 dark:border-white/20"
          >
            Lineup
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-4 py-3 dark:border-white/20"
          >
            Start Date
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-4 py-3 dark:border-white/20"
          >
            End Date
            <span class="font-normal normal-case text-gray-500 dark:text-gray-300">(opcional)</span>
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-4 py-3 dark:border-white/20"
          >
            Venue
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-4 py-3 dark:border-white/20"
          >
            Price
            <span class="font-normal normal-case text-gray-500 dark:text-gray-300">(opcional)</span>
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-4 py-3 dark:border-white/20"
          >
            Other Info
            <span class="font-normal normal-case text-gray-500 dark:text-gray-300">(opcional)</span>
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-4 py-3 dark:border-white/20"
          >
            City
          </th>
          <th
            scope="col"
            class="border-b-2 border-r-2 border-gray-300 px-4 py-3 dark:border-white/20"
          >
            Province
            <span class="font-normal normal-case text-gray-500 dark:text-gray-300">(opcional)</span>
          </th>
          <th scope="col" class="w-16 border-b-2 border-gray-300 px-2 py-3 dark:border-white/20">
            <span class="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(row, index) in rows" :key="row.id">
          <tr
            :id="`event-import-row-${row.id}`"
            tabindex="-1"
            class="group hover:bg-gray-50 dark:hover:bg-white/[0.03]"
          >
            <th
              scope="row"
              class="border-b-2 border-r-2 border-gray-300 px-3 py-1 text-center text-xs font-medium tabular-nums text-gray-500 focus:outline focus:outline-2 focus:outline-rv-purple dark:border-white/20 dark:text-gray-400"
            >
              {{ index + 1 }}
              <EventImportConflictDetails
                :conflicts="conflictsByRowKey[row.id] ?? []"
                :row-number="index + 1"
                :row-numbers="rowNumbers"
                :show-indicator="true"
                :show-details="false"
                :expanded="false"
                @toggle="toggleConflictDetails(row.id)"
              />
            </th>
            <td class="border-b-2 border-r-2 border-gray-300 p-1 dark:border-white/20">
              <div>
                <select
                  :value="row.type"
                  :aria-label="`Type, fila ${index + 1}`"
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
                    ? `Name (gira), fila ${index + 1}`
                    : `Event, fila ${index + 1}`
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
                    Gira existente:
                    {{
                      tourStates[row.id]?.result?.status === "existing"
                        ? tourStates[row.id]?.result.entity.name
                        : ""
                    }}
                  </p>
                  <button
                    type="button"
                    class="rounded font-semibold text-rv-navy underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:text-gray-200"
                    @click="emit('confirmTour', row.id)"
                  >
                    Utilizar esta gira
                  </button>
                  <span
                    v-if="tourStates[row.id]?.confirmedTourId"
                    role="status"
                    class="ml-2 text-green-800 dark:text-green-300"
                    >Confirmada</span
                  >
                </template>
                <template v-else-if="tourStates[row.id]?.status === 'ambiguous'">
                  <p class="block text-amber-800 dark:text-amber-200">
                    Hay varias candidatas. Elige una gira:
                  </p>
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
                        {{ candidate.name }} · {{ candidate.id }}
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
                  <span
                    v-if="tourStates[row.id]?.confirmedTourId"
                    role="status"
                    class="ml-2 text-green-800 dark:text-green-300"
                    >Confirmada</span
                  >
                </template>
                <p
                  v-else-if="tourStates[row.id]?.status === 'new'"
                  role="status"
                  class="text-gray-600 dark:text-gray-300"
                >
                  Gira nueva; se preparará para la importación.
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
                  <p>No se pudo resolver la gira: {{ tourStates[row.id]?.error }}</p>
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
                @retry-draft="emit('retryLineupDraft', row.id)"
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
                  placeholder="DD/MM/YYYY"
                  :aria-label="`Start Date, fila ${index + 1}`"
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
                  placeholder="DD/MM/YYYY"
                  :aria-label="`End Date, fila ${index + 1} (opcional)`"
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
                >
                  {{ getDateCellError(row, "endDate") }}
                </p>
              </div>
            </td>
            <td class="border-b-2 border-r-2 border-gray-300 p-1 dark:border-white/20">
              <VenueCell
                :row="row"
                :state="geographyStates[row.id]!"
                :regions="regions"
                :row-number="index + 1"
                @update="emit('updateVenue', row.id, $event)"
                @commit="emit('commitVenue', row.id)"
                @retry="emit('retryVenue', row.id)"
                @retry-locality="emit('retryLocality', row.id)"
                @select-region="emit('selectRegion', row.id, $event)"
                @select-locality="emit('selectLocality', row.id, $event)"
                @select-venue="emit('selectVenue', row.id, $event)"
              />
            </td>
            <td class="border-b-2 border-r-2 border-gray-300 p-1 dark:border-white/20">
              <input
                :value="row.price"
                type="text"
                :aria-label="`Price, fila ${index + 1} (opcional)`"
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
                :aria-label="`Other Info, fila ${index + 1} (opcional)`"
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
            <td class="border-b-2 border-r-2 border-gray-300 p-1 dark:border-white/20">
              <input
                :value="row.city"
                type="text"
                :aria-label="`City, fila ${index + 1}`"
                autocomplete="off"
                class="min-h-10 w-full rounded-sm border border-transparent bg-transparent px-3 text-sm text-gray-900 outline-none transition focus-visible:border-rv-purple focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white"
                @input="emit('updateCity', row.id, ($event.target as HTMLInputElement).value)"
              />
            </td>
            <td class="border-b-2 border-r-2 border-gray-300 p-1 dark:border-white/20">
              <input
                :value="row.province"
                type="text"
                :aria-label="`Province, fila ${index + 1}`"
                autocomplete="off"
                class="min-h-10 w-full rounded-sm border border-transparent bg-transparent px-3 text-sm text-gray-900 outline-none transition focus-visible:border-rv-purple focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white"
                @input="emit('updateProvince', row.id, ($event.target as HTMLInputElement).value)"
              />
            </td>
            <td class="border-b-2 border-gray-300 px-2 py-1 text-center dark:border-white/20">
              <button
                type="button"
                :aria-label="`Eliminar fila ${index + 1}`"
                class="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-purple dark:text-gray-300 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                @click="emit('removeRow', row.id)"
              >
                <i class="fa-solid fa-trash-can text-xs" aria-hidden="true"></i>
              </button>
            </td>
          </tr>
          <tr
            v-if="expandedConflictRowKey === row.id && conflictsByRowKey[row.id]?.length"
            class="border-b-2 border-amber-200 bg-amber-50/40 dark:border-amber-300/20 dark:bg-amber-950/10"
          >
            <td colspan="12" class="px-3 py-2">
              <EventImportConflictDetails
                :conflicts="conflictsByRowKey[row.id]"
                :row-number="index + 1"
                :row-numbers="rowNumbers"
                :show-indicator="false"
                :show-details="true"
                :expanded="true"
                @toggle="toggleConflictDetails(row.id)"
                @navigate="navigateToRow"
              />
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
