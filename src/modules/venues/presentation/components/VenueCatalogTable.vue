<script setup lang="ts">
import { venueTypes } from "../../application/useVenueImport";
import type { VenueCatalogVenue, VenueStatus } from "../../types/venueCatalog";

defineProps<{
  venues: VenueCatalogVenue[];
  canManage: boolean;
  deletingId: string | null;
}>();

const emit = defineEmits<{
  edit: [venue: VenueCatalogVenue];
  remove: [venue: VenueCatalogVenue];
}>();

const statusLabels: Record<VenueStatus, string> = {
  active: "Activa",
  closed: "Cerrada",
  temporary: "Temporal",
};

function typeLabel(type: string): string {
  return venueTypes.find((item) => item.value === type)?.label ?? type;
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
    <table class="w-full min-w-[58rem] border-collapse text-left text-sm">
      <caption class="sr-only">
        Catálogo de salas y recintos
      </caption>
      <thead
        class="bg-gray-100 text-xs uppercase tracking-wide text-gray-700 dark:bg-rv-darkSurface dark:text-gray-200"
      >
        <tr>
          <th scope="col" class="px-3 py-3">Nombre del recinto</th>
          <th scope="col" class="px-3 py-3">Tipo</th>
          <th scope="col" class="px-3 py-3">Localidad</th>
          <th scope="col" class="px-3 py-3">Comunidad o región</th>
          <th scope="col" class="px-3 py-3">País</th>
          <th scope="col" class="px-3 py-3">Estado</th>
          <th scope="col" class="w-32 px-3 py-3 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="venue in venues"
          :key="venue.id"
          class="border-t border-gray-200 text-gray-800 hover:bg-gray-50 dark:border-white/10 dark:text-gray-100 dark:hover:bg-white/[0.03]"
        >
          <th scope="row" class="px-3 py-3 font-semibold text-rv-navy dark:text-white">
            {{ venue.name }}
          </th>
          <td class="px-3 py-3">{{ typeLabel(venue.type) }}</td>
          <td class="px-3 py-3">{{ venue.locality.name }}</td>
          <td class="px-3 py-3">{{ venue.locality.administrativeRegion.name }}</td>
          <td class="px-3 py-3">{{ venue.locality.administrativeRegion.country.name }}</td>
          <td class="px-3 py-3">
            <span
              class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
              :class="
                venue.status === 'active'
                  ? 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100'
                  : venue.status === 'closed'
                    ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                    : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
              "
            >
              {{ statusLabels[venue.status] }}
            </span>
          </td>
          <td class="px-3 py-2">
            <div v-if="canManage" class="flex justify-end gap-1">
              <button
                type="button"
                class="min-h-9 rounded-md px-2 text-xs font-semibold text-rv-navy hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:text-white dark:hover:bg-white/10"
                :aria-label="`Editar ${venue.name}`"
                @click="emit('edit', venue)"
              >
                Editar
              </button>
              <button
                type="button"
                class="min-h-9 rounded-md px-2 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:cursor-wait disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-950/40"
                :aria-label="`Eliminar ${venue.name}`"
                :disabled="deletingId === venue.id"
                @click="emit('remove', venue)"
              >
                {{ deletingId === venue.id ? "Eliminando…" : "Eliminar" }}
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
