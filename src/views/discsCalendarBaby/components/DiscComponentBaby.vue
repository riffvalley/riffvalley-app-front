<template>
  <div
    class="p-3 border rounded-2xl flex flex-col sm:flex-row items-center justify-between w-full sm:w-1/2 bg-white shadow-md"
    :style="{ backgroundColor: getGenreColor(disc.genreId) }"
    :class="{ 'text-white': getGenreColor(disc.genreId) !== 'transparent' }">
    <!-- Columna izquierda: Imagen del disco -->
    <div class="flex items-center w-full sm:w-1/3 p-4 min-w-0">
      <button v-if="!disc.image" @click="openImageModal"
        class="bg-purple-500 hover:bg-purple-600 text-white text-xs px-2 py-1 rounded shadow-md ml-2">
        <i class="fa-solid fa-image"></i>
      </button>
      <img v-if="disc.image" :src="disc.image" alt="Disc cover" class="w-28 h-28 rounded-md object-cover" />
      <div class="ml-6 flex flex-col text-center sm:text-left w-full min-w-0 overflow-hidden">
        <!-- Nombre de la banda -->
        <div class="flex items-center space-x-2">
          <h3 class="font-bold text-lg truncate min-w-0 overflow-hidden"
            :style="{ maxWidth: 'clamp(12ch, 65vw, 30ch)' }">
            <!-- Se añade @click para abrir ArtistDetail -->
            <a @click="openArtistDetail" class="block truncate w-full cursor-pointer hover:underline">
              {{ disc.artist.name }}
            </a>
          </h3>
        </div>
        <!-- Nombre del disco -->
        <div class="flex items-center space-x-2">
          <!-- Se añade @click para abrir DiscDetail -->
          <a @click="openDiscDetail" class="text-sm truncate min-w-0 cursor-pointer hover:underline"
            :style="{ maxWidth: 'clamp(12ch, 65vw, 30ch)' }">
            <span class="block truncate">
              {{ disc.name }}
            </span>
          </a>
        </div>
        <p class="text-sm mt-2 w-full flex items-center space-x-2">
          <a v-if="linkButtonData.visible" :href="disc.link" target="_blank" :class="[
            linkButtonData.color,
            linkButtonData.hover,
            'text-white px-2 py-1 rounded-full shadow-md inline-flex items-center space-x-1 text-sm',
          ]">
            <i :class="[linkButtonData.icon, 'text-base']"></i>
            <span>{{ linkButtonData.text }}</span>
          </a>
          <span v-else-if="!disc.link" class="text-gray-400">
            <SpotifyArtistButton :artistName="disc.artist.name" />
          </span>
        </p>
        <p class="mt-2 text-left sm:text-left">
          {{ formattedDate }}
        </p>
      </div>
    </div>

    <div class="w-full sm:w-2/3 p-2 flex flex-col items-start gap-y-3 sm:gap-y-4">
      <div class="flex items-center gap-2">
        <p class="px-2 py-1 rounded-full text-xs font-medium text-white text-center shadow-sm border-white border"
          :style="{ backgroundColor: disc.genre?.color || 'grey' }">
          {{ disc.genre?.name || "Sin género" }}
        </p>

        <p v-if="disc.ep"
          class="px-2 py-1 rounded-full text-xs font-medium text-white bg-blue-500 text-center shadow-sm">
          EP
        </p>

                <p v-if="disc.debut"
          class="px-2 py-1 rounded-full text-xs font-medium text-white bg-rv-purple text-center shadow-sm">
          Álbum debut
        </p>

<div v-if="artistCountry?.isoCode" class="relative group">
  <template v-if="artistCountry.isoCode === 'int'">
    <img
      src="/int.svg"
      alt="Internacional"
      class="h-7 w-7 rounded-full cursor-help object-cover"
      aria-hidden="true"
    />
  </template>

  <template v-else-if="artistCountry.isoCode.length >= 2">
    <CircleFlags
      :country="artistCountry.isoCode.slice(0, 2).toLowerCase()"
      :show-flag-name="false"
      class="h-5 w-5 cursor-help"
      aria-hidden="true"
    />
  </template>
          <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[9px] font-semibold
               text-white bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300
               max-w-[160px] whitespace-normal text-center z-20"
            style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
            {{ countryAbbr[artistCountry?.name] || artistCountry?.name ||
              artistCountry?.isoCode?.slice(0, 2).toUpperCase() }}
          </span>
        </div>
      </div>

      <button @click="toggleBookmark()" :class="{ 'bg-yellow-500': pendingId, 'bg-gray-400': !pendingId }"
        class="text-white font-medium px-3 py-1 rounded-full shadow-md self-start">
        {{ pendingId ? "Guardado" : "Añadir a pendientes" }}
      </button>
    </div>
  </div>

  <div v-if="showDiscDetail" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <div class="bg-white rounded-lg p-4 relative max-w-3xl w-full">
      <button class="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl" @click="closeDiscDetail">
        &times;
      </button>
      <!-- Se pasa la información del disco -->
      <DiscDetail v-if="showDiscDetail" :disc="disc" @close="showDiscDetail = false" />
    </div>
  </div>

  <!-- Modal para mostrar ArtistDetail -->
  <div v-if="showArtistDetail" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <div class="bg-white rounded-lg p-4 relative max-w-3xl w-full">
      <button class="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl" @click="closeArtistDetail">
        &times;
      </button>
      <!-- Se pasa el nombre del artista al componente ArtistDetail -->
      <ArtistDetail v-if="showArtistDetail" :disc-name="disc.name" :artistName="disc.artist.name"
        @close="showArtistDetail = false" />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import type { PropType } from "vue";
import Swal from "sweetalert2";

import SpotifyArtistButton from "@components/SpotifyArtistButton.vue";
import { postPendingService, deletePendingService } from "@services/pendings/pendings";

import DiscDetail from "@components/DiscDetail.vue";
import ArtistDetail from "@components/ArtistDetail.vue";

export default defineComponent({
  name: "DiscBaby",
  components: {
    SpotifyArtistButton,
    DiscDetail,
    ArtistDetail,
  },
  props: {
    disc: {
      type: Object as PropType<{
        id: string;
        name: string;
        artist: { name: string };
        genreId: string;
        genre?: { name?: string; color?: string };
        link: string | null;
        image: string | null;
        ep: boolean;
        releaseDate: Date;
        pendingId: string | null;
      }>,
      required: true,
    },
    artistCountry: {
      type: Object as PropType<{ id: string; name: string; isoCode: string } | null>,
      required: false,
      default: null,
    },
    genres: {
      type: Array as PropType<{ id: string; name: string; color?: string }[]>,
      required: true,
    },
  },
  setup(props) {
    const formattedDate = computed(() =>
      new Date(props.disc.releaseDate).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );

    const linkButtonData = computed(() => {
      const link = props.disc.link || "";
      if (link.includes("spotify.com")) return { visible: true, color: "bg-green-500", hover: "hover:bg-green-600", icon: "fa-brands fa-spotify", text: "Spotify" };
      if (link.includes("youtube.com") || link.includes("youtu.be")) return { visible: true, color: "bg-red-500", hover: "hover:bg-red-600", icon: "fa-brands fa-youtube", text: "YouTube" };
      if (link.includes("bandcamp.com")) return { visible: true, color: "bg-blue-500", hover: "hover:bg-blue-600", icon: "fa-brands fa-bandcamp", text: "Bandcamp" };
      return { visible: false, color: "", hover: "", icon: "", text: "" };
    });

    const getGenreColor = (genreId: string) => {
      // 1) si el disco ya trae el color, úselo
      const direct = props.disc.genre?.color;
      if (direct && direct !== "transparent") return direct;

      // 2) si no, busque por id en la lista de géneros
      const genre = props.genres.find((g) => String(g.id) === String(genreId));
      return genre?.color || "transparent";
    };

    const pendingId = ref<string | null>(props.disc.pendingId ?? null);

    const toggleBookmark = async () => {
      try {
        if (pendingId.value) {
          await deletePendingService(pendingId.value);
          pendingId.value = null;
          Swal.fire("Pendiente eliminado");
        } else {
          const pending = await postPendingService({ discId: props.disc.id });
          pendingId.value = pending.id;
          Swal.fire("Pendiente añadido");
        }
      } catch (error) {
        console.error("Error al cambiar el estado de pendiente:", error);
        Swal.fire({
          title: "Error",
          text: "No se pudo actualizar el estado de pendiente.",
          icon: "error",
          position: "top-end",
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
        });
      }
    };

    // Modales detalle
    const showDiscDetail = ref(false);
    const showArtistDetail = ref(false);
    const openDiscDetail = () => (showDiscDetail.value = true);
    const openArtistDetail = () => (showArtistDetail.value = true);
    const closeDiscDetail = () => (showDiscDetail.value = false);
    const closeArtistDetail = () => (showArtistDetail.value = false);

    // Abreviaturas (las que ya tenía)
    const countryAbbr: Record<string, string> = {
      "United States of America": "USA",
      "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
    };

    return {
      formattedDate,
      linkButtonData,
      getGenreColor,
      pendingId,
      toggleBookmark,
      showDiscDetail,
      showArtistDetail,
      openDiscDetail,
      openArtistDetail,
      closeDiscDetail,
      closeArtistDetail,
      countryAbbr,
    };
  },
});
</script>


<style scoped>
.p-4 {
  padding: 1rem;
}

.border {
  border: 1px solid #e5e7eb;
}

.rounded-md {
  border-radius: 0.375rem;
}

.text-white {
  color: #ffffff;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.w-full {
  width: 100%;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 1024px) {
  .grid-cols-2 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .p-4 {
    padding: 0.5rem;
  }

  .grid-cols-2 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }

  .w-full {
    width: 100%;
  }

  img {
    width: 80px;
    height: 80px;
  }

  h3 {
    font-size: 1rem;
  }

  .sm\:flex-row {
    flex-direction: column;
    min-width: 0;
  }
}

@media (max-width: 430px) {
  .p-4 {
    padding: 0.25rem;
  }

  img {
    width: 70px;
    height: 70px;
  }

  h3 {
    font-size: 0.9rem;
  }

  .sm\:flex-row {
    flex-direction: column;
  }
}

@media (max-width: 300px) {
  img {
    width: 60px;
    height: 60px;
  }

  h3 {
    font-size: 0.8rem;
  }
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9999 !important;
  /* ✅ Mayor que el searchable select */
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  position: relative;
  z-index: 10000 !important;
  /* ✅ Asegura que esté aún más arriba */
  background: white;
  padding: 20px;
  border-radius: 8px;
  z-index: 1100 !important;
  /* ✅ Mayor que el searchable select */
  max-width: 90%;
  width: 400px;
}

.searchable__select {
  position: absolute;
  width: 100%;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
  z-index: 500 !important;
  /* Reducimos el valor para que esté debajo del modal */
  margin-top: 0.25rem;
}

body {
  position: relative;
  overflow: visible !important;
}
</style>
