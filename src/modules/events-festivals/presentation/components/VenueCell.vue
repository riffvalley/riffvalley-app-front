<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from "vue";
import type { EventImportRow, VenueResolutionStatus } from "../../application/useEventImportRows";

const props = defineProps<{
  row: EventImportRow;
  status: VenueResolutionStatus;
  rowNumber: number;
}>();

const emit = defineEmits<{
  update: [value: string];
  commit: [];
  retry: [];
}>();

const editing = ref(!props.row.venue.venueId);
const input = useTemplateRef<HTMLInputElement>("venueInput");

watch(
  () => props.row.venue.venueId,
  (venueId) => {
    if (venueId) editing.value = false;
  }
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
        :aria-label="`Editar ${row.venue.name}, Venue fila ${rowNumber}`"
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
      :aria-label="`Venue, fila ${rowNumber}`"
      autocomplete="off"
      placeholder="Nombre de la sala…"
      class="min-h-8 min-w-32 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus-visible:border-rv-purple focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white dark:placeholder:text-gray-400"
      @input="emit('update', ($event.target as HTMLInputElement).value)"
      @blur="stopEditing"
      @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
    />
    <span
      v-if="status === 'resolving'"
      class="text-xs text-gray-500 dark:text-gray-400"
      role="status"
    >
      Buscando…
    </span>
    <span
      v-else-if="status === 'ambiguous'"
      class="text-xs text-amber-700 dark:text-amber-300"
      role="status"
    >
      Varias salas; completa City o Province.
    </span>
    <span
      v-else-if="status === 'error'"
      class="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-300"
      role="status"
    >
      No se pudo buscar.
      <button type="button" class="font-semibold underline" @click="emit('retry')">
        Reintentar
      </button>
    </span>
  </div>
</template>
