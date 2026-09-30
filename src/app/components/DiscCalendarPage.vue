<script setup lang="ts">
import { computed } from "vue";
import { DiscCalendarView, exportCalendarHtml, type CalendarGroup } from "@/modules/catalog";
import DiscComponent from "@views/discsCalendar/components/DiscComponent.vue";
import { useCatalogStore } from "@stores/catalog/catalog";
import { useAuthStore } from "@stores/auth/auth";
import { calendarPort, enrichCalendarDiscs, searchCalendarImages } from "../dependencies/discCalendar";
import { createAndAssociateCalendarArtist, updateCalendarArtist } from "../dependencies/catalog";
import type { UpdateArtistInput } from "@/modules/catalog/application/artistManagementPort";
import { showErrorToast } from "@/shared/ui/errorToast";

withDefaults(defineProps<{ embedded?: boolean; initialDate?: string; focusDiscId?: string }>(), {
  embedded: false, initialDate: "", focusDiscId: "",
});
defineEmits<{ close: [] }>();
// Preserve the existing app-shell-owned catalog cache during this vertical cut.
const catalog = useCatalogStore();
const auth = useAuthStore();
const isSuperUser = computed(() => auth.hasRole("superUser"));
const buscarEnlacesSpotify = enrichCalendarDiscs;
const buscarImagenesLastFm = searchCalendarImages;
const loadError = () => showErrorToast("Error al cargar los discos");
function exportarHtml(group: CalendarGroup) {
  const blob = new Blob([exportCalendarHtml(group, catalog.genres)], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `discs_${group.releaseDate}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
}
async function persistCalendarArtistUpdate(
  artistId: string,
  update: Pick<UpdateArtistInput, "name" | "countryId">,
  applyArtistUpdate: (id: string, data: { name?: string; countryId?: string | null }) => void,
) {
  await updateCalendarArtist(artistId, update);
  applyArtistUpdate(artistId, update);
}
function applyCalendarArtistCreation(
  discId: string,
  artistId: string,
  artistName: string,
  applyArtistCreation: (id: string, artist: { id: string; name: string }) => void,
) {
  applyArtistCreation(discId, { id: artistId, name: artistName });
}
</script>

<template>
  <DiscCalendarView :calendar-port="calendarPort" :genres="catalog.genres" :countries="catalog.countries"
    :options-ready="catalog.loaded" :embedded="embedded" :initial-date="initialDate" :focus-disc-id="focusDiscId"
    @load-error="loadError">
    <template #disc="{ disc, removeDisc, dateChanged, applyArtistUpdate, applyArtistCreation }">
      <DiscComponent :disc="disc" :genres="catalog.genres" :countries="catalog.countries" :focus-disc-id="focusDiscId"
        :persist-artist-update="(artistId, update) => persistCalendarArtistUpdate(artistId, update, applyArtistUpdate)"
        :persist-artist-creation="(discId, name) => createAndAssociateCalendarArtist(discId, name)"
        @artist-created="(artistId, artistName) => applyCalendarArtistCreation(disc.id, artistId, artistName, applyArtistCreation)"
        @disc-deleted="removeDisc" @date-changed="dateChanged" />
    </template>
    <template #group-tools="{ group }">
              <button v-if="isSuperUser" @click="buscarImagenesLastFm(group.releaseDate)"
                class="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold
                       hover:bg-red-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] active:translate-y-0
                       w-full max-w-[300px] sm:max-w-none sm:w-auto justify-center self-center shadow-md">
                <i class="fa-brands fa-lastfm"></i> Last.fm búsqueda
              </button>

              <button v-if="new Date(group.releaseDate) < new Date()" @click="buscarEnlacesSpotify(group.discs)"
                class="inline-flex items-center gap-2 bg-[#1DB954] text-white px-4 py-2 rounded-full text-sm font-semibold
                       hover:bg-[#1aa34a] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] active:translate-y-0
                       w-full max-w-[300px] sm:max-w-none sm:w-auto justify-center self-center shadow-md">
                <i class="fa-brands fa-spotify"></i> Buscar en Spotify
              </button>

              <button @click="exportarHtml(group)"
                class="inline-flex items-center gap-2 bg-rv-navy dark:bg-rv-purple text-white px-4 py-2 rounded-full text-sm font-semibold
                       hover:opacity-80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] active:translate-y-0
                       w-full max-w-[300px] sm:max-w-none sm:w-auto justify-center self-center shadow-md">
                <i class="fa-solid fa-code"></i> Exportar HTML
              </button>    </template>
  </DiscCalendarView>
</template>
