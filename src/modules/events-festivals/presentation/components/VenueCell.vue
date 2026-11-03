<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from "vue";
import type { EventGeographyState, EventImportRow } from "../../application/useEventImportRows";
import { geographyContextKey } from "../../application/entityResolutionIdentity";

const props = defineProps<{
  row: EventImportRow;
  state: EventGeographyState;
  rowNumber: number;
}>();

const emit = defineEmits<{
  update: [value: string];
  commit: [];
  retry: [];
  selectVenue: [venueId: string];
}>();

const venueStatusId = `venue-status-${props.row.id}`;
const venueTextMismatchId = `venue-text-mismatch-${props.row.id}`;

const editing = ref(!props.row.venue.venueId);
const input = useTemplateRef<HTMLInputElement>("venueInput");
const selectedVenue = computed(() => {
  if (props.state.venueStatus === "existing") return props.state.venueCandidates[0] ?? null;
  if (props.state.venueStatus === "ambiguous")
    return props.state.venueCandidates.find(
      ({ id }) => id === props.state.selectedVenueCandidateId
    );
  return null;
});
const venueTextMismatch = computed(() =>
  Boolean(
    selectedVenue.value &&
    props.row.venue.name.trim() &&
    geographyContextKey(props.row.venue.name) !== geographyContextKey(selectedVenue.value.name)
  )
);

function beginEdit() {
  editing.value = true;
  void nextTick(() => input.value?.focus());
}

function stopEditing() {
  emit("commit");
  if (props.row.venue.venueId) editing.value = false;
}
</script>

<template>
  <div class="flex min-h-10 min-w-0 flex-wrap items-center gap-1 px-2 py-1">
    <span
      v-if="row.venue.venueId && !editing"
      class="inline-flex max-w-full items-center gap-1 rounded-full border border-blue-300 bg-blue-100 py-1 pl-2.5 pr-1 text-xs font-semibold text-blue-950 dark:border-blue-400/30 dark:bg-blue-400/15 dark:text-blue-100"
    >
      <span class="max-w-48 truncate">{{ row.venue.name }}</span>
      <button
        type="button"
        :aria-label="`Editar ${row.venue.name}, recinto fila ${rowNumber}`"
        class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-white/70 hover:text-rv-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white"
        @click="beginEdit"
      >
        <i class="fa-solid fa-pen text-[10px]" aria-hidden="true"></i>
      </button>
    </span>
    <input
      v-else
      ref="venueInput"
      :value="row.venue.name"
      type="text"
      :aria-label="`Recinto, fila ${rowNumber}`"
      :aria-describedby="
        [
          state.venueStatus !== 'idle' ? venueStatusId : '',
          venueTextMismatch ? venueTextMismatchId : '',
        ]
          .filter(Boolean)
          .join(' ') || undefined
      "
      autocomplete="off"
      placeholder="Nombre del recinto…"
      class="min-h-8 min-w-32 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus-visible:border-rv-purple focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white dark:placeholder:text-gray-400"
      @input="emit('update', ($event.target as HTMLInputElement).value)"
      @blur="stopEditing"
      @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
    />
    <span
      v-if="state.venueStatus === 'resolving'"
      :id="venueStatusId"
      class="text-xs text-gray-500 dark:text-gray-400"
      role="status"
    >
      Resolviendo recinto…
    </span>
    <span
      v-if="state.venueStatus === 'existing'"
      :id="venueStatusId"
      class="text-xs text-emerald-700 dark:text-emerald-300"
      role="status"
      >{{ row.venue.venueId ? "Recinto seleccionado" : "Recinto existente" }}</span
    >
    <span
      v-else-if="state.venueStatus === 'new'"
      :id="venueStatusId"
      class="text-xs text-sky-700 dark:text-sky-300"
      role="status"
      >Recinto nuevo</span
    >
    <span
      v-else-if="state.venueStatus === 'ambiguous'"
      :id="venueStatusId"
      class="w-full text-xs text-amber-700 dark:text-amber-300"
      role="status"
    >
      <span>{{
        state.selectedVenueCandidateId ? "Recinto seleccionado" : "Seleccionar recinto"
      }}</span>
      <select
        :value="state.selectedVenueCandidateId ?? ''"
        :aria-label="`Candidatos de recinto, fila ${rowNumber}`"
        class="mt-1 min-h-8 w-full rounded border border-gray-300 bg-white px-2 text-xs text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
        @change="emit('selectVenue', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Seleccionar recinto…</option>
        <option
          v-for="candidate in state.venueCandidates"
          :key="candidate.id"
          :value="candidate.id"
        >
          {{ candidate.name }}
        </option>
      </select>
    </span>
    <span
      v-if="venueTextMismatch"
      :id="venueTextMismatchId"
      class="w-full text-xs text-red-700 dark:text-red-300"
      role="alert"
    >
      El nombre del recinto no coincide con la identidad seleccionada. Corrige el texto o cambia la
      selección.
    </span>
    <span
      v-if="state.venueStatus === 'error'"
      :id="venueStatusId"
      class="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-300"
      role="alert"
    >
      No se pudo resolver el recinto.
      <button
        type="button"
        class="font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
        @click="emit('retry')"
      >
        Reintentar
      </button>
    </span>
  </div>
</template>
