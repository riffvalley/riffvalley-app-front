<template>


  <!-- Tarjeta individual -->
  <div class="card w-full max-w-[20rem] border rounded shadow-lg bg-white flex flex-col mx-auto p-2 relative">
    <!-- Badge Debut -->
    <div v-if="debut" class="absolute -top-3 -left-2 z-20
         px-2 py-1 rounded-full text-[10px] font-bold
         text-rv-purple shadow-sm
         bg-white border-rv-purple border-2">
      Álbum debut
    </div>

    <!-- Botón editar (solo Riff Valley) -->
    <button v-if="canModerate" type="button" class="absolute bottom-30 translate-y-28 left-2 z-30 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200
         flex items-center justify-center hover:bg-gray-50" title="Editar en calendario" @click="openCalendarModal">
      <i class="fa-solid fa-wrench text-rv-navy text-sm"></i>
    </button>

    <div class="flex items-center justify-between px-2 p-1">
      <p class="text-xs text-gray-500">{{ formattedDate }}</p>
      <div class="flex items-center space-x-2">
        <p v-if="isEP" class="px-2 py-1 rounded-full text-xs font-medium text-white bg-blue-500 text-center shadow-sm">
          EP
        </p>

        <div v-if="artistCountry?.isoCode" class="relative group">
          <!-- Caso especial: International (isoCode = 'int') -->
          <template v-if="artistCountry.isoCode === 'int'">
            <img src="/int.svg" alt="Internacional" class="rounded-full cursor-help object-cover"
              style="width: 25px; height: 25px;" />
          </template>

          <!-- Resto de países: CircleFlags -->
          <template v-else-if="artistCountry.isoCode.length >= 2">
            <CircleFlags :country="artistCountry.isoCode.slice(0, 2).toLowerCase()" :show-flag-name="false"
              class="cursor-help" />
          </template>

          <!-- Tooltip -->
          <span class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-[9px] font-semibold 
           text-white bg-rv-navy rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300
           max-w-[160px] whitespace-normal text-center"
            style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            {{ countryLabel }}
          </span>
        </div>

      </div>
      <p class="px-2 py-1 rounded-full text-xs font-medium text-white text-center shadow-sm"
        :style="{ backgroundColor: genreColor || 'grey' }">
        {{ genreName || "Sin género" }}
      </p>
    </div>

    <!-- Imagen y estadísticas -->
    <div class="flex items-center mt-3">
      <div class="flex flex-col items-center">
        <img :src="computedImage" :alt="name"
          class="w-24 h-24 object-cover rounded mb-2 shadow-md cursor-zoom-in hover:opacity-80" @click="openImage" />
        <div class="flex space-x-2 mt-1">
          <div class="flex flex-col items-center w-16 h-12 border rounded-lg shadow-md bg-gray-100 mb-1">
            <p class="text-sm font-bold text-blue-600 mt-1">
              {{ averageRate ? averageRate.toFixed(2) : "-" }}
            </p>
            <p class="text-xs text-rv-navy">Disco</p>
          </div>
          <div class="flex flex-col items-center w-16 h-12 border rounded-lg shadow-md bg-gray-100 mb-1">
            <p class="text-sm font-bold text-green-600 mt-1">
              {{ averageCover ? averageCover.toFixed(2) : "-" }}
            </p>
            <p class="text-xs text-rv-navy">Portada</p>
          </div>
        </div>
      </div>

      <!-- Contenido al lado derecho -->
      <div class="ml-2 flex flex-1 flex-col">
        <!-- Título y artista -->
        <div class="flex justify-between items-center">
          <h2 @click="openDiscDetail" class="text-sm text-rv-navy font-semibold italic truncate cursor-pointer">
            {{ name }}
          </h2>
        </div>
        <div class="flex justify-between items-center">
          <!-- El nombre del artista se hace clickable para abrir ArtistDetail -->
          <p @click="openArtistDetail" class="text-xs text-gray-500 font-semibold cursor-pointer hover:underline">
            {{ artistName }}
          </p>
        </div>

        <!-- Botón de Escuchar -->
        <div class="flex items-center space-x-2 mt-1">
<a
  v-if="link"
  @click="openPlatformLink(link)"
  class="px-2 py-1 rounded-full cursor-pointer font-medium text-white
         text-center shadow-sm bg-green-500 hover:bg-green-600
         transition-all w-1/2
         text-[10px] overflow-hidden text-ellipsis whitespace-nowrap"
>
  Escuchar
</a>

          <!-- Íconos: corazón y bookmark -->
          <div class="flex space-x-2 items-center">
            <div class="relative group">
              <font-awesome-icon :icon="['fas', 'heart']"
                class="h-7 w-5 cursor-pointer transition-all duration-300 ease-in-out" :class="{
                  'text-red-500 scale-110': favoriteId,
                  'text-gray-500 hover:text-red-400': !favoriteId,
                }" @click="toggleHeart" />
              <span class="pointer-events-none hidden md:block absolute bottom-full left-1/2 transform -translate-x-1/2
         px-2 py-1 text-[9px] font-semibold text-white bg-rv-navy rounded
         opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Favs
              </span>

            </div>

            <div class="relative group cursor-pointer" @click="toggleBookmark">
              <font-awesome-icon :icon="['fas', 'bookmark']"
                class="h-5 w-5 mt-1 cursor-pointer transition-all duration-300 ease-in-out" :class="{
                  'text-yellow-400 scale-110': pendingId,
                  'text-gray-500 hover:text-yellow-300': !pendingId,
                }" />
              <span class="pointer-events-none hidden md:block absolute bottom-full left-1/2 transform -translate-x-1/2
         px-2 py-1 text-[9px] font-semibold text-white bg-rv-navy rounded
         opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Guardar
              </span>
            </div>
          </div>
        </div>

        <!-- Formulario de votación -->
        <div class="flex flex-col space-y-1">
          <label class="text-xs text-gray-500 translate-x-1.5">
            Disco:
            <input type="number" step="0.01" v-model="localRating.rate" min="1" max="10"
              class="px-0 py-1 border w-16 rounded text-xs font-bold text-center text-gray-500 mt-3 mb-1 ml-0.5" />
          </label>
          <label class="text-xs text-gray-500">
            Portada:
            <input type="number" step="0.01" v-model="localRating.cover" min="1" max="10"
              class="px-0 py-1 w-16 border font-bold rounded text-center text-xs mb-1 ml-0.5" />
          </label>
        </div>
      </div>
    </div>

    <!-- Botones para votos y enviar calificación -->
    <div class="flex mt-2 space-x-2 w-full">
      <button @click="toggleVotes"
        class="w-1/3 bg-rv-navy text-white font-bold py-2 px-1 rounded-lg shadow-md border-4 border-transparent hover:border-rv-navy hover:bg-gradient-to-l from-gray-800 to-rv-navy flex items-center justify-center space-x-1">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
          class="size-4">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
        </svg>
        <span class="flex items-center">
          {{ showVotes ? "Ocultar" : "Votos" }}
          <span v-if="rateCount > 0" class="ml-1 mt-1 text-[9px] text-[#ffbaca]">({{ rateCount }})</span>
        </span>
      </button>

      <button @click="openComentsModal"
        class="w-1/3 gap-2 bg-rv-navy text-white font-bold py-2 px-2 rounded-lg shadow-md border-4 border-transparent hover:border-rv-navy hover:bg-gradient-to-l from-gray-800 to-rv-navy flex items-center justify-center">
        <i class="fa-solid fa-comment-dots text-white text-md"></i>
        <span class="flex items-center">
          Chat
          <span v-if="commentCount > 0" class="ml-1 mt-1 text-[9px] text-[#ffbaca]">(<span class="inline">{{
            commentCount
          }}</span>)</span>
        </span>
      </button>

      <button @click="submitRating" :disabled="disableSubmitButton"
        class="w-1/3 bg-rv-navy text-white font-bold py-2 px-1 rounded-lg shadow-md border-4 border-transparent hover:border-[#e46e8a] hover:bg-gradient-to-r hover:from-[#e46e8a] hover:to-[#ff8da8] flex items-center justify-center space-x-1"
        :class="{ 'opacity-50 cursor-not-allowed': disableSubmitButton }">
        <template v-if="hasVoted">
          <i class="fa-solid fa-arrows-rotate text-white text-md"></i>
        </template>
        <template v-else>
          <i class="fa-solid fa-pen-to-square text-white text-md"></i>
        </template>
        <span>{{ hasVoted ? "Modificar" : "Votar" }}</span>
      </button>
    </div>

    <!-- Lista de votos -->
  </div>

  <!-- Modal para mostrar DiscDetail -->
  <div v-if="showVotes" class="fixed inset-0 flex items-center justify-center bg-rv-navy bg-opacity-50 z-50">
    <div class="p-6 relative max-w-3xl w-full">
      <!-- Se pasa la información del disco -->
      <VotesModal :albumName="name" :artistName="artistName" :votes="votes" :showVotes="showVotes"
        @close="showVotes = false" />
    </div>
  </div>

  <!-- Modal para mostrar DiscDetail -->
  <div v-if="showDiscDetail" class="fixed inset-0 flex items-center justify-center bg-rv-navy bg-opacity-50 z-50">
    <div class="p-6 relative max-w-3xl w-full">
      <!-- Se pasa la información del disco -->
      <DiscDetail :disc="discData" @close="closeDiscDetail" />
    </div>
  </div>

  <!-- Modal para mostrar ArtistDetail -->
  <div v-if="showArtistDetail" class="fixed inset-0 flex items-center justify-center bg-rv-navy bg-opacity-50 z-50">
    <div class="p-4 relative max-w-3xl w-full">
      <!-- Se pasa el nombre del artista al componente ArtistDetail -->
      <ArtistDetail :disc-name="name" :artistName="artistName" @close="closeArtistDetail" />
    </div>
  </div>

  <div v-if="showComentsModal" class="fixed inset-0 flex items-center justify-center bg-rv-navy bg-opacity-50 z-50">
    <div class="p-4 relative max-w-3xl w-full">
      <ComentsModal :disc-id="discData.id" :artist-name="artistName" :album-name="name" @close="closeComentsModal" />
    </div>
  </div>

  <Teleport to="body">
    <div v-if="showCalendarModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl w-[95vw] max-w-6xl max-h-[90vh] relative overflow-hidden">
        <!-- botón cerrar -->
        <button type="button" @click.stop="showCalendarModal = false" aria-label="Cerrar" title="Cerrar" class="absolute top-2 right-2 z-50
         text-white bg-rv-navy hover:bg-[#e46e8a]
         rounded-full w-10 h-10 shadow-md transition-all
         grid place-items-center
         border-0 outline-none ring-0 focus:ring-0">
          <i class="fas fa-times -translate-x-[5px]"></i>
        </button>


        <div class="max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DiscCalendar :embedded="true" :initialDate="releaseDate" :focusDiscId="id"
            @close="showCalendarModal = false" />
        </div>
      </div>
    </div>
  </Teleport>

</template>

<script lang="ts">
import { defineComponent, ref, computed, watchEffect, type PropType } from "vue";
import defaultImage from "/src/assets/disco.png";
import DiscDetail from "./DiscDetail.vue";
import ArtistDetail from "./ArtistDetail.vue";
import VotesModal from "./VotesModal.vue";
import ComentsModal from "./ComentsModal.vue";
import DiscCalendar from "@views/discsCalendar/DiscCalendar.vue"; // o la ruta real si no está en @views
import {
  getDiscRates,
  postRateService,
  updateRateService,
} from "@services/rates/rates.ts";
import {
  postFavoriteService,
  deleteFavoriteService,
} from "@services/favorites/favorites.ts";
import {
  postPendingService,
  deletePendingService,
} from "@services/pendings/pendings";
import Swal from "sweetalert2";
import SwalService from "@services/swal/SwalService";

interface Vote {
  id: string;
  user: {
    id: string;
    username: string;
  };
  rate: number;
  cover: number;
}

export default defineComponent({
  components: { DiscDetail, ArtistDetail, ComentsModal, VotesModal, DiscCalendar }, // Add VotesModal
  props: {
    id: { type: String, required: true },
    image: { type: String, required: true },
    name: { type: String, required: true },
    releaseDate: { type: String, required: true },
    artistName: { type: String, required: true },
    genreName: { type: String, required: false, default: "" },
    genreColor: { type: String, required: false, default: "grey" },
    link: { type: String, required: false, default: "" },
    averageRate: { type: Number, required: false, default: null },
    averageCover: { type: Number, required: false, default: null },
    userDiscRate: { type: String, required: false, default: null },
    rate: { type: Number, required: false, default: null },
    cover: { type: Number, required: false, default: null },
    isNew: { type: Boolean, required: true },
    ep: { type: Boolean, required: false },
    artistCountry: {
      type: Object as PropType<{ id: string; name: string; isoCode: string }>,

      required: false,
      default: null,
    },
    favoriteId: { type: String, required: false },
    pendingId: { type: String, required: false },
    commentCount: { type: Number, required: false, default: null },
    rateCount: { type: Number, required: false, default: null },
    debut: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const localRating = ref({ rate: props.rate, cover: props.cover });
    const showVotes = ref(false);
    const votes = ref<Vote[]>([]);
    const isEP = computed(() => props.ep);
    const hasVoted = ref(!!props.userDiscRate);
    const userDiscRateId = ref(props.userDiscRate);
    const commentCount = ref(props.commentCount);
    const rateCount = ref(props.rateCount);
    const formattedDate = computed(() => {
      const date = new Date(props.releaseDate);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    });

    const debut = computed(() => props.debut);

    const showCalendarModal = ref(false);

    const openCalendarModal = () => {
      showCalendarModal.value = true;
    };

    const canModerate = computed(() => {
      const raw = localStorage.getItem("roles");
      if (!raw) return false;

      let roles: any = raw;
      try { roles = JSON.parse(raw); } catch { }

      const arr = Array.isArray(roles) ? roles : [roles];
      return arr.map(r => String(r).toLowerCase()).includes("riffvalley");
    });


    // Abreviaturas
    const countryAbbr: Record<string, string> = {
      "United States of America": "USA",
      "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
    };

    const countryLabel = computed(() => {
      if (!props.artistCountry) return "";

      // Caso especial: International
      if (props.artistCountry.isoCode === "int") {
        return "International";
      }

      const name = props.artistCountry.name;
      const iso = props.artistCountry.isoCode;

      return (
        countryAbbr[name] ||
        name ||
        (iso && iso.slice(0, 2).toUpperCase()) ||
        ""
      );
    });

    const computedImage = computed(() => props.image || defaultImage);

    const openImage = () => {
      const url = computedImage.value;
      if (!url) return;
      window.open(url, "_blank", "noopener");
    };
    const favoriteId = ref(props.favoriteId);
    const pendingId = ref(props.pendingId);

    watchEffect(() => {
      favoriteId.value = props.favoriteId;
    });

    const toggleHeart = async () => {
      try {
        if (favoriteId.value) {
          await deleteFavoriteService(favoriteId.value);
          favoriteId.value = null;
          SwalService.success("Eliminado de Favoritos");
        } else {
          const favorite = await postFavoriteService({ discId: props.id });
          favoriteId.value = favorite.id;
          SwalService.success("Añadido a Favoritos");
        }
      } catch (error) {
        console.error("Error al cambiar el estado de favorito:", error);
        Swal.fire({
          title: "Error",
          text: "No se pudo actualizar el estado de favorito.",
          icon: "error",
          position: "top-end",
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
        });
      }
    };

    const toggleBookmark = async () => {
      try {
        if (pendingId.value) {
          await deletePendingService(pendingId.value);
          pendingId.value = null;
          SwalService.success("Eliminado de Pendientes");
        } else {
          const pending = await postPendingService({ discId: props.id });
          pendingId.value = pending.id;
          SwalService.success("Añadido a Pendientes");
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

    const toggleVotes = async () => {
      showVotes.value = !showVotes.value;
      try {
        if (!showVotes.value) return; // si se está cerrando, no pida nada
        votes.value = await getDiscRates(props.id);
      } catch (error) {
        console.error("Error fetching votes:", error);
        Swal.fire({
          title: "Error",
          text: "No se pudieron obtener los votos.",
          icon: "error",
          position: "top-end",
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
        });
      }
    };
    const isSubmittingRating = ref(false);

    const disableSubmitButton = computed(() => {
      // Si se está enviando la petición, deshabilitamos
      if (isSubmittingRating.value) return true;

      // Valor numérico de rate y cover
      const rateValue = Number(localRating.value.rate) || 0;
      const coverValue = Number(localRating.value.cover) || 0;

      // Si ambos son 0 (o nulos), deshabilitamos
      const bothEmpty = rateValue <= 0 && coverValue <= 0;
      return bothEmpty;
    });


    const submitRating = async () => {
      // Evita que se dispare varias veces si ya está en proceso
      if (isSubmittingRating.value) return;

      // Activamos "modo envío"
      isSubmittingRating.value = true;

      const payload = {
        discId: props.id,
        rate: Number(localRating.value.rate) || null,
        cover: Number(localRating.value.cover) || null,
      };
      try {
        if (payload.rate === 0) payload.rate = null;
        if (payload.cover === 0) payload.cover = null;
        if (!hasVoted.value) {
          const response = await postRateService(payload);
          userDiscRateId.value = response.id;
          hasVoted.value = true;
        } else {
          await updateRateService(userDiscRateId.value, payload);
        }
        if (payload.rate && payload.rate > 0)
          SwalService.successImage(payload.rate);
        else SwalService.success("Votación enviada con éxito");
      } catch (error) {
        console.error("Error submitting rating:", error);
        Swal.fire({
          title: "Error",
          text: "No se pudo enviar tu evaluación.",
          icon: "error",
          position: "top-end",
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
        });
      } finally {
        isSubmittingRating.value = false;
      }
    };

    const showDiscDetail = ref(false);
    const openDiscDetail = () => {
      showDiscDetail.value = true;
    };
    const closeDiscDetail = () => {
      showDiscDetail.value = false;
    };

    const showArtistDetail = ref(false);
    const openArtistDetail = () => {
      showArtistDetail.value = true;
    };
    const closeArtistDetail = () => {
      showArtistDetail.value = false;
    };

    // Variables y funciones para el modal de ComentsModal
    const showComentsModal = ref(false);
    const openComentsModal = () => {
      showComentsModal.value = true;
    };
    const closeComentsModal = () => {
      showComentsModal.value = false;
    };

    const openSpotify = (webLink: string) => {
      try {
        const kinds = ["album", "track", "artist", "playlist", "episode", "show"];
        for (const kind of kinds) {
          const m = webLink.match(new RegExp(`${kind}\\/([a-zA-Z0-9]+)`));
          if (m && m[1]) {
            const id = m[1];
            const uri = `spotify://${kind}/${id}`;
            window.location.href = uri;
            setTimeout(() => window.open(webLink, "_blank", "noopener"), 1500);
            return;
          }
        }
        window.open(webLink, "_blank", "noopener");
      } catch (e) {
        console.error("Error al deep-linkear Spotify:", e);
        window.open(webLink, "_blank", "noopener");
      }
    };

    const openPlatformLink = (webLink: string) => {
      if (!webLink) return;

      if (webLink.includes("spotify.com")) {
        openSpotify(webLink); // intenta app + fallback
      } else if (
        webLink.includes("youtube.com") ||
        webLink.includes("youtu.be") ||
        webLink.includes("music.youtube.com") ||
        webLink.includes("bandcamp.com")
      ) {
        window.open(webLink, "_blank", "noopener"); // web para YouTube/Bandcamp
      } else {
        window.open(webLink, "_blank", "noopener"); // otros
      }
    };

    const discData = computed(() => ({
      id: props.id,
      name: props.name,
      image: props.image,
      releaseDate: props.releaseDate,
      artist: { name: props.artistName },
      link: props.link,
      averageRate: props.averageRate,
      averageCover: props.averageCover,
    }));

    return {
      localRating,
      formattedDate,
      computedImage,
      showVotes,
      toggleVotes,
      votes,
      submitRating,
      hasVoted,
      isEP,
      openImage,
      toggleHeart,
      toggleBookmark,
      favoriteId,
      pendingId,
      openDiscDetail,
      closeDiscDetail,
      showDiscDetail,
      discData,
      showArtistDetail,
      openArtistDetail,
      closeArtistDetail,
      showComentsModal,
      openComentsModal,
      closeComentsModal,
      commentCount,
      rateCount,
      openSpotify,
      openPlatformLink,
      isSubmittingRating,
      disableSubmitButton,
      countryAbbr,
      countryLabel,
      debut,
      canModerate,
      showCalendarModal,
      openCalendarModal,
    };
  },
});
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 0.5rem;
  max-width: 20rem;
  height: auto;
}

.card img {
  width: 6rem;
  height: 6rem;
  object-fit: cover;
  border-radius: 0.5rem;
}

.card h2 {
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.2;
  text-align: left;
  white-space: normal;
  word-wrap: break-word;
  margin: 0;
  overflow: hidden;
  cursor: pointer;
}

.card .flex-1 {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card button {
  height: 2rem;
  font-size: 0.75rem;
}
</style>
