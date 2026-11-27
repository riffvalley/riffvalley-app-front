<script setup lang="ts">
import type { ListedEvent } from "../../types/eventListing";

defineProps<{ concerts: ListedEvent[]; canManage: boolean }>();
const emit = defineEmits<{ edit: [event: ListedEvent]; delete: [event: ListedEvent] }>();

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
</script>

<template>
  <div
    class="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-rv-darkCard"
  >
    <table class="w-full min-w-[48rem] border-collapse text-left text-sm">
      <caption class="sr-only">
        Listado de conciertos
      </caption>
      <thead
        class="bg-gray-100 text-xs uppercase tracking-wide text-gray-700 dark:bg-rv-darkSurface dark:text-gray-200"
      >
        <tr>
          <th scope="col" class="px-4 py-3">Artistas</th>
          <th scope="col" class="px-4 py-3">Fecha</th>
          <th scope="col" class="px-4 py-3">Sala</th>
          <th scope="col" class="px-4 py-3">Localidad</th>
          <th scope="col" class="px-4 py-3">País</th>
          <th v-if="canManage" scope="col" class="px-4 py-3">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="concert in concerts"
          :key="concert.id"
          class="border-t border-gray-200 text-gray-800 dark:border-white/10 dark:text-gray-100"
        >
          <th scope="row" class="max-w-sm px-4 py-3 font-semibold text-rv-navy dark:text-white">
            <span v-if="concert.lineup.length" class="block">
              <span v-for="(artist, index) in concert.lineup" :key="`${concert.id}-${index}`">
                <span v-if="index > 0" aria-hidden="true"> · </span>{{ artist.name }}
              </span>
            </span>
            <span v-else class="font-normal text-gray-600 dark:text-gray-300"
              >Sin artistas indicados</span
            >
          </th>
          <td class="whitespace-nowrap px-4 py-3">{{ formatDate(concert.startDate) }}</td>
          <td class="px-4 py-3">{{ concert.venue.name }}</td>
          <td class="px-4 py-3">{{ concert.venue.locality.name }}</td>
          <td class="px-4 py-3">{{ concert.venue.locality.administrativeRegion.country.name }}</td>
          <td v-if="canManage" class="whitespace-nowrap px-4 py-3">
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-rv-navy hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:text-white dark:hover:bg-white/10"
                :aria-label="`Editar concierto ${concert.lineup.map(({ name }) => name).join(', ')}`"
                @click="emit('edit', concert)"
              >
                Editar
              </button>
              <button
                type="button"
                class="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 dark:border-red-500/50 dark:text-red-300 dark:hover:bg-red-950/30"
                :aria-label="`Eliminar concierto ${concert.lineup.map(({ name }) => name).join(', ')}`"
                @click="emit('delete', concert)"
              >
                Eliminar
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
