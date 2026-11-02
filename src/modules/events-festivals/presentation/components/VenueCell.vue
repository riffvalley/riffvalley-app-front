<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from "vue";
import type { AdministrativeRegion } from "@/modules/venues";
import type { EventGeographyState, EventImportRow } from "../../application/useEventImportRows";

const props = defineProps<{
  row: EventImportRow;
  state: EventGeographyState;
  regions: AdministrativeRegion[];
  rowNumber: number;
}>();

const emit = defineEmits<{
  update: [value: string];
  commit: [];
  retry: [];
  retryLocality: [];
  selectRegion: [regionId: string];
  selectLocality: [localityId: string];
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
      v-if="state.localityStatus === 'resolving' || state.venueStatus === 'resolving'"
      class="text-xs text-gray-500 dark:text-gray-400"
      role="status"
    >
      Buscando…
    </span>
    <span
      v-else-if="state.localityStatus === 'existing'"
      class="text-xs text-emerald-700 dark:text-emerald-300"
      role="status"
    >
      Localidad encontrada
    </span>
    <span
      v-else-if="state.localityStatus === 'new'"
      class="text-xs text-sky-700 dark:text-sky-300"
      role="status"
    >
      Localidad nueva
    </span>
    <span
      v-if="
        state.localityStatus === 'new' &&
        state.localityResult?.status === 'new' &&
        state.localityResult.requiresAdministrativeRegionId
      "
      class="w-full text-xs text-amber-700 dark:text-amber-300"
      role="status"
    >
      Selecciona la región administrativa
      <select
        :value="row.administrativeRegionId ?? ''"
        :aria-label="`Región administrativa, fila ${rowNumber}`"
        class="mt-1 min-h-8 w-full rounded border border-gray-300 bg-white px-2 text-xs text-gray-900 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
        @change="emit('selectRegion', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Seleccionar región…</option>
        <option v-for="region in regions" :key="region.id" :value="region.id">
          {{ region.name }}
        </option>
      </select>
    </span>
    <span
      v-if="state.localityStatus === 'ambiguous'"
      class="w-full text-xs text-amber-700 dark:text-amber-300"
      role="status"
    >
      Localidad ambigua
      <select
        :aria-label="`Candidatos de localidad, fila ${rowNumber}`"
        class="mt-1 min-h-8 w-full rounded border border-gray-300 bg-white px-2 text-xs text-gray-900 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
        @change="emit('selectLocality', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Seleccionar localidad…</option>
        <option
          v-for="candidate in state.localityCandidates"
          :key="candidate.id"
          :value="candidate.id"
        >
          {{ candidate.name }} · {{ candidate.province ?? candidate.administrativeRegion.name }} ·
          {{ candidate.country.name }}
        </option>
      </select>
    </span>
    <span
      v-else-if="state.venueStatus === 'existing'"
      class="text-xs text-emerald-700 dark:text-emerald-300"
      role="status"
      >Recinto encontrado</span
    >
    <span
      v-else-if="state.venueStatus === 'new'"
      class="text-xs text-sky-700 dark:text-sky-300"
      role="status"
      >Recinto nuevo</span
    >
    <span
      v-else-if="state.venueStatus === 'ambiguous'"
      class="text-xs text-amber-700 dark:text-amber-300"
      role="status"
      >Recinto ambiguo</span
    >
    <span
      v-if="
        state.localityStatus === 'invalid' ||
        state.localityStatus === 'error' ||
        state.venueStatus === 'error'
      "
      class="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-300"
      role="status"
    >
      {{
        state.localityStatus === "invalid"
          ? `Localidad no válida (${state.localityResult?.status === "invalid" ? state.localityResult.code : ""}).`
          : "Error de resolución."
      }}
      <button
        v-if="state.localityStatus === 'error' || state.localityStatus === 'invalid'"
        type="button"
        class="font-semibold underline"
        @click="emit('retryLocality')"
      >
        Reintentar
      </button>
      <button v-else type="button" class="font-semibold underline" @click="emit('retry')">
        Reintentar
      </button>
    </span>
  </div>
</template>
