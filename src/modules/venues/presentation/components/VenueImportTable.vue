<script setup lang="ts">
import { parsePastedVenueNames, venueTypes } from "../../application/useVenueImport";
import type { VenueImportRow, VenueType } from "../../types/venueImport";

defineProps<{ rows: VenueImportRow[]; importing: boolean }>();

const emit = defineEmits<{
  updateName: [id: string, name: string];
  updateType: [id: string, type: VenueType];
  updateLocality: [id: string, locality: string];
  pasteNames: [index: number, names: string[]];
  removeRow: [id: string];
}>();

function handlePaste(event: ClipboardEvent, index: number) {
  const text = event.clipboardData?.getData("text/plain");
  if (text === undefined || (!text.includes("\n") && !text.includes("\r"))) return;
  const names = parsePastedVenueNames(text);
  if (names.length === 0) return;
  event.preventDefault();
  emit("pasteNames", index, names);
}
</script>

<template>
  <div
    class="overflow-auto rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-rv-darkCard"
  >
    <table class="w-full min-w-[58rem] border-collapse text-left">
      <caption class="sr-only">
        Salas que se van a importar en las localidades seleccionadas
      </caption>
      <thead
        class="sticky top-0 bg-gray-100 text-xs uppercase tracking-wide text-gray-600 dark:bg-rv-darkSurface dark:text-gray-300"
      >
        <tr>
          <th
            scope="col"
            class="w-14 border-b border-gray-200 px-3 py-3 text-center dark:border-white/10"
          >
            #
          </th>
          <th scope="col" class="border-b border-gray-200 px-3 py-3 dark:border-white/10">
            Nombre de la sala
          </th>
          <th scope="col" class="w-64 border-b border-gray-200 px-3 py-3 dark:border-white/10">
            Localidad <span class="font-normal normal-case">(opcional)</span>
          </th>
          <th scope="col" class="w-56 border-b border-gray-200 px-3 py-3 dark:border-white/10">
            Tipo
          </th>
          <th scope="col" class="w-14 border-b border-gray-200 px-2 py-3 dark:border-white/10">
            <span class="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in rows"
          :key="row.id"
          class="group hover:bg-gray-50 dark:hover:bg-white/[0.03]"
        >
          <th
            scope="row"
            class="border-b border-r border-gray-200 px-3 py-1 text-center text-xs font-medium tabular-nums text-gray-500 dark:border-white/10 dark:text-gray-400"
          >
            {{ index + 1 }}
          </th>
          <td class="border-b border-gray-200 p-1 dark:border-white/10">
            <input
              :value="row.name"
              type="text"
              maxlength="180"
              autocomplete="off"
              :aria-label="`Nombre de la sala, fila ${index + 1}`"
              :aria-invalid="row.result?.status === 'failed' || undefined"
              :aria-describedby="row.result?.error ? `venue-row-error-${row.id}` : undefined"
              class="min-h-10 w-full rounded-sm border border-transparent bg-transparent px-3 text-sm text-gray-900 focus-visible:border-rv-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white"
              @input="emit('updateName', row.id, ($event.target as HTMLInputElement).value)"
              @paste="handlePaste($event, index)"
            />
            <p
              v-if="row.result?.error"
              :id="`venue-row-error-${row.id}`"
              class="px-3 pb-1 text-xs text-red-700 dark:text-red-300"
              role="alert"
            >
              {{ row.result.error }}
            </p>
            <p
              v-else-if="row.result?.status"
              class="px-3 pb-1 text-xs text-gray-600 dark:text-gray-300"
            >
              <span v-if="row.result.status === 'created'">Creada</span>
              <span v-else-if="row.result.status === 'existing'">Ya existía</span>
              <span v-else-if="row.result.status === 'duplicate_in_batch'"
                >Repetida en este lote</span
              >
              <span v-else-if="row.result.status === 'pending'">Pendiente de crear</span>
              <span v-if="row.result.status === 'existing'" class="ml-1"
                >· Ya está en PostgreSQL</span
              >
              <span v-if="row.result.venueId" class="ml-1">· ID {{ row.result.venueId }}</span>
            </p>
            <p
              v-else-if="row.name.trim()"
              class="px-3 pb-1 text-xs font-medium text-amber-800 dark:text-amber-200"
            >
              Pendiente de comprobar
            </p>
          </td>
          <td class="border-b border-gray-200 p-1 dark:border-white/10">
            <input
              :value="row.locality"
              type="text"
              maxlength="150"
              autocomplete="off"
              :aria-label="`Localidad opcional, fila ${index + 1}`"
              class="min-h-10 w-full rounded-sm border border-transparent bg-transparent px-3 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:border-rv-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white dark:placeholder:text-gray-400"
              placeholder="Usar localidad principal"
              @input="emit('updateLocality', row.id, ($event.target as HTMLInputElement).value)"
            />
          </td>
          <td class="border-b border-gray-200 p-1 dark:border-white/10">
            <select
              :value="row.type"
              :aria-label="`Tipo de recinto, fila ${index + 1}`"
              class="min-h-10 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
              @change="
                emit('updateType', row.id, ($event.target as HTMLSelectElement).value as VenueType)
              "
            >
              <option v-for="type in venueTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </td>
          <td class="border-b border-gray-200 px-2 py-1 text-center dark:border-white/10">
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
        <tr v-if="rows.length === 0">
          <td colspan="5" class="px-4 py-8 text-center text-sm text-gray-600 dark:text-gray-300">
            No hay filas. Añade una para empezar.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
