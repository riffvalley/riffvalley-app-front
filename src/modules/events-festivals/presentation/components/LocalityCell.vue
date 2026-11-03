<script setup lang="ts">
import { computed } from "vue";
import type { AdministrativeRegion } from "@/modules/venues";
import type { EventGeographyState, EventImportRow } from "../../application/useEventImportRows";
import { geographyContextKey } from "../../application/entityResolutionIdentity";

const props = defineProps<{
  row: EventImportRow;
  state: EventGeographyState;
  regions: AdministrativeRegion[];
  rowNumber: number;
}>();

const emit = defineEmits<{
  update: [value: string];
  retry: [];
  selectRegion: [regionId: string];
  selectLocality: [localityId: string];
}>();

const localityStatusId = `locality-status-${props.row.id}`;
const localityContextErrorId = `locality-context-error-${props.row.id}`;

const selectedLocality = computed(() => {
  if (props.state.localityResult?.status === "existing") return props.state.localityResult.locality;
  if (props.state.localityResult?.status === "ambiguous") return props.state.selectedLocality;
  return null;
});

const localityContextMismatch = computed(() =>
  Boolean(
    selectedLocality.value &&
    ((props.row.administrativeRegionId &&
      props.row.administrativeRegionId !== selectedLocality.value.administrativeRegion.id) ||
      (props.row.province.trim() &&
        selectedLocality.value.province?.trim() &&
        geographyContextKey(props.row.province) !==
          geographyContextKey(selectedLocality.value.province)))
  )
);
</script>

<template>
  <div class="flex min-h-10 min-w-0 flex-col items-stretch gap-1 px-1 py-0.5">
    <input
      :value="row.city"
      type="text"
      :aria-label="`Ciudad, fila ${rowNumber}`"
      :aria-describedby="
        [
          state.localityStatus !== 'idle' ? localityStatusId : '',
          localityContextMismatch ? localityContextErrorId : '',
        ]
          .filter(Boolean)
          .join(' ') || undefined
      "
      :aria-invalid="state.localityStatus === 'invalid' ? 'true' : undefined"
      autocomplete="off"
      placeholder="Nombre de la ciudad…"
      class="min-h-8 w-full min-w-28 rounded-sm border border-transparent bg-transparent px-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus-visible:border-rv-purple focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white dark:placeholder:text-gray-400"
      @input="emit('update', ($event.target as HTMLInputElement).value)"
    />

    <span
      v-if="state.localityStatus === 'resolving'"
      :id="localityStatusId"
      class="text-xs text-gray-600 dark:text-gray-300"
      role="status"
    >
      Resolviendo ciudad…
    </span>
    <span
      v-else-if="state.localityStatus === 'existing'"
      :id="localityStatusId"
      class="text-xs text-emerald-800 dark:text-emerald-200"
      role="status"
    >
      {{ state.selectedLocality ? "Localidad seleccionada" : "Localidad existente" }}
    </span>
    <span
      v-else-if="state.localityStatus === 'new'"
      :id="localityStatusId"
      class="text-xs text-sky-800 dark:text-sky-200"
      role="status"
    >
      Localidad nueva
    </span>

    <div
      v-if="
        state.localityStatus === 'new' &&
        state.localityResult?.status === 'new' &&
        state.localityResult.requiresAdministrativeRegionId
      "
      class="block text-xs text-amber-900 dark:text-amber-100"
    >
      Región administrativa
      <select
        :value="row.administrativeRegionId ?? ''"
        :aria-label="`Región administrativa, fila ${rowNumber}`"
        class="mt-1 min-h-8 w-full rounded border border-gray-300 bg-white px-2 text-xs text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
        @change="emit('selectRegion', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Seleccionar región…</option>
        <option v-for="region in regions" :key="region.id" :value="region.id">
          {{ region.name }}
        </option>
      </select>
    </div>

    <div
      v-if="state.localityResult?.status === 'ambiguous'"
      class="block text-xs text-amber-900 dark:text-amber-100"
    >
      <p :id="localityStatusId" role="status">
        {{ state.selectedLocality ? "Localidad seleccionada" : "Seleccionar localidad" }}
      </p>
      <select
        :value="state.selectedLocality?.id ?? ''"
        :aria-label="`Candidatas de localidad, fila ${rowNumber}`"
        class="mt-1 min-h-8 w-full rounded border border-gray-300 bg-white px-2 text-xs text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
        @change="emit('selectLocality', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Seleccionar localidad…</option>
        <option
          v-for="candidate in state.localityResult.candidates"
          :key="candidate.id"
          :value="candidate.id"
        >
          {{ candidate.name }} · {{ candidate.province ?? candidate.administrativeRegion.name }} ·
          {{ candidate.country.name }}
        </option>
      </select>
    </div>

    <span
      v-if="localityContextMismatch"
      :id="localityContextErrorId"
      class="text-xs text-red-800 dark:text-red-200"
      role="alert"
    >
      La provincia o región no coincide con la localidad seleccionada. Corrige los datos o cambia la
      selección.
    </span>
    <div
      v-if="state.localityStatus === 'invalid' || state.localityStatus === 'error'"
      :id="localityStatusId"
      class="flex flex-wrap items-center gap-x-2 text-xs text-red-800 dark:text-red-200"
      :role="state.localityStatus === 'error' ? 'alert' : 'status'"
    >
      <span>
        {{
          state.localityStatus === "invalid" ? "Ciudad no válida." : "Error al buscar la localidad."
        }}
      </span>
      <button
        type="button"
        class="font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
        @click="emit('retry')"
      >
        Reintentar
      </button>
    </div>
  </div>
</template>
