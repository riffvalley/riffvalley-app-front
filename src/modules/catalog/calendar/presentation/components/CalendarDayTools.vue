<script setup lang="ts">
import { computed } from "vue";
import { updateDisc } from "@services/discs/discs";
import { fillImages } from "@services/lastfm/lastfm.ts";
import { resolveSpotifyAlbum } from "@services/spotify/spotifyLookup";
import { useAuthStore } from "@/modules/identity/auth";
import { hasMinimumRole } from "@/modules/identity/shared";

/**
 * Herramientas de un día del Calendario (solo roles altos): buscar imágenes en
 * Last.fm, buscar enlaces de Spotify y exportar el día en HTML. Las comparten
 * el Calendario y el modal «Novedades de hoy» del Dashboard.
 */
const props = defineProps<{
  group: { releaseDate: string; discs: any[] };
  genres: Array<{ id: string | number; name?: string | null }>;
}>();

const authStore = useAuthStore();
const canEditCatalog = computed(() => hasMinimumRole(authStore.role, "riffvalley"));
const canFillImages = computed(() => hasMinimumRole(authStore.role, "superadmin"));

const buscarEnlacesSpotify = async () => {
  for (const disc of props.group.discs) {
    try {
      const album = await resolveSpotifyAlbum(disc.name, disc.artist.name);
      if (!album) {
        disc.link = "No se encontró el álbum";
        continue;
      }
      disc.link = album.listenUrl ?? "No se encontró el álbum";
      disc.image = album.coverUrl;
      await updateDisc(disc.id, {
        link: disc.link,
        image: disc.image,
        verified: true,
        genreId: disc.genreId ?? disc.genre?.id ?? null,
      });
    } catch (error) {
      console.error(`Error al buscar el álbum ${disc.name}:`, error);
      disc.link = "Error al realizar la búsqueda";
    }
  }
};

const exportarHtml = () => {
  const genreById = new Map(props.genres.map((g) => [String(g.id), g.name || "(Sin nombre)"]));
  let html = `
  <figure class="wp-block-table is-style-stripes">
    <table>
      <tbody>`;
  props.group.discs.forEach((disc: any) => {
    const genreName =
      genreById.get(String(disc.genreId ?? disc.genre?.id ?? "")) || disc.genre?.name || "Sin género";
    if (disc.link) {
      html += `
        <tr>
          <td class="has-text-align-left" data-align="left">${genreName}</td>
          <td><strong><a href="${disc.link}" target="_blank" rel="noreferrer noopener">${disc.artist.name} - ${disc.name}</a></strong></td>
        </tr>`;
    } else {
      html += `
        <tr>
          <td class="has-text-align-left" data-align="left">${genreName}</td>
          <td><strong>${disc.artist.name} - ${disc.name}</strong></td>
        </tr>`;
    }
  });
  html += `
      </tbody>
    </table>
  </figure>`;
  const blob = new Blob([html], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `discs_${props.group.releaseDate}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
};

const buscarImagenesLastFm = async () => {
  const date = new Date(props.group.releaseDate);
  await fillImages(date.getMonth() + 1, date.getFullYear(), Math.ceil(date.getDate() / 7));
};
</script>

<template>
  <div v-if="canEditCatalog" class="flex flex-col sm:flex-row sm:items-center justify-center gap-2 mt-4 w-full">
    <button v-if="canFillImages" type="button" @click="buscarImagenesLastFm"
      class="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold
             hover:bg-red-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] active:translate-y-0
             w-full max-w-[300px] sm:max-w-none sm:w-auto justify-center self-center shadow-md">
      <i class="fa-brands fa-lastfm" aria-hidden="true"></i> Last.fm búsqueda
    </button>

    <button v-if="new Date(group.releaseDate) < new Date()" type="button" @click="buscarEnlacesSpotify"
      class="inline-flex items-center gap-2 bg-[#1DB954] text-white px-4 py-2 rounded-full text-sm font-semibold
             hover:bg-[#1aa34a] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] active:translate-y-0
             w-full max-w-[300px] sm:max-w-none sm:w-auto justify-center self-center shadow-md">
      <i class="fa-brands fa-spotify" aria-hidden="true"></i> Buscar en Spotify
    </button>

    <button type="button" @click="exportarHtml"
      class="inline-flex items-center gap-2 bg-rv-navy dark:bg-gray-200 text-white dark:text-rv-navy px-4 py-2 rounded-full text-sm font-semibold
             hover:opacity-80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] active:translate-y-0
             w-full max-w-[300px] sm:max-w-none sm:w-auto justify-center self-center shadow-md">
      <i class="fa-solid fa-code" aria-hidden="true"></i> Exportar HTML
    </button>
  </div>
</template>
