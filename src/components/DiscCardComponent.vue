<template>


  <!-- Tarjeta individual -->
  <div class="card w-full max-w-[20rem] border-2 rounded-xl shadow-lg
  bg-white dark:bg-rv-darkCard
  border-gray-100 dark:border-white/20
  flex flex-col mx-auto p-2 relative">
    <!-- Badge Debut -->
    <div v-if="debut" class="absolute -top-3 -left-2 z-10
         px-2 py-1 rounded-full text-[10px] font-bold
         text-rv-purple dark:text-purple-300 shadow-sm
         bg-white dark:bg-rv-darkSurface
         border-rv-purple dark:border-purple-300 border-2">
      Álbum debut
    </div>

    <!-- Botón editar (solo Riff Valley) -->
    <button v-if="canModerate" type="button" class="absolute bottom-30 translate-y-28 left-2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200
         flex items-center justify-center hover:bg-gray-50" title="Editar en calendario" @click="openCalendarModal">
      <i class="fa-solid fa-wrench text-rv-navy text-sm"></i>
    </button>

    <div class="flex items-center justify-between px-2 p-1">
      <p class="text-xs text-gray-500 dark:text-gray-300">{{ formattedDate }}</p>
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
          class="w-24 h-24 object-cover rounded mb-2 shadow-md cursor-zoom-in relative transition-transform duration-200 hover:scale-150 hover:shadow-xl hover:z-50"
          @click="openImage" />
        <div class="flex space-x-2 mt-1">
          <div class="flex flex-col items-center w-16 h-12 rounded-lg
  bg-gray-100 dark:bg-rv-darkSurface
  border border-gray-200 dark:border-white/60
  shadow-sm mb-1">
            <p class="text-sm font-bold mt-1"
              :class="spoilerMode ? 'text-rv-pink tracking-widest' : 'text-blue-600 dark:text-blue-300'">
              {{ spoilerMode ? '???' : (averageRate ? averageRate.toFixed(2) : "-") }}
            </p>
            <p class="text-xs text-rv-navy dark:text-gray-200">Disco</p>
          </div>
          <div class="flex flex-col items-center w-16 h-12 rounded-lg
  bg-gray-100 dark:bg-rv-darkSurface
  border border-gray-200 dark:border-white/60
  shadow-sm mb-1">
            <p class="text-sm font-bold mt-1"
              :class="spoilerMode ? 'text-rv-pink tracking-widest' : 'text-green-600 dark:text-green-300'">
              {{ spoilerMode ? '???' : (averageCover ? averageCover.toFixed(2) : "-") }}
            </p>
            <p class="text-xs text-rv-navy dark:text-gray-200">Portada</p>
          </div>
        </div>
      </div>

      <!-- Contenido al lado derecho -->
      <div class="ml-2 flex flex-1 flex-col min-w-0">
        <!-- Título y artista -->
        <div class="flex justify-between items-center min-w-0">
          <h2 @click="openDiscDetail"
            class="text-sm text-rv-navy dark:text-white font-semibold italic cursor-pointer pr-1 line-clamp-2 break-words">
            {{ name }}
          </h2>
        </div>
        <div class="flex justify-between items-center min-w-0">
          <!-- El nombre del artista se hace clickable para abrir ArtistDetail -->
          <p @click="openArtistDetail"
            class="text-xs text-gray-500 dark:text-gray-300 font-semibold cursor-pointer hover:underline truncate">
            {{ artistName }}
          </p>
        </div>

        <!-- Botón de Escuchar -->
        <div class="flex items-center space-x-2 mt-2 mb-2">
          <div class="flex items-center gap-1">
            <font-awesome-icon v-if="embedUrl" :icon="['fas', 'circle-chevron-down']"
              class="text-[14px] cursor-pointer transition-all duration-300 text-gray-400 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-500 flex-shrink-0 translate-y-[8px]"
              :class="{ 'rotate-180': showPlayer }"
              :title="showPlayer ? 'Ocultar reproductor' : 'Mostrar reproductor'"
              @click="showPlayer = !showPlayer" />
            <button v-if="link" @click="openPlatformLink(link)"
              class="w-5 h-5 rounded-full cursor-pointer text-white shadow-sm transition-all flex-shrink-0 flex items-center justify-center focus:outline-none hover:opacity-80"
              :class="platformInfo.bg" :title="platformInfo.label">
              <i :class="platformInfo.icon" class="text-[20px] leading-none translate-y-[1px]"></i>
            </button>
          </div>

          <!-- Íconos: corazón y bookmark -->
          <div class="flex space-x-2 items-center">
            <div class="relative group">
              <font-awesome-icon :icon="['fas', 'heart']"
                class="h-7 w-5 cursor-pointer transition-all duration-300 ease-in-out" :class="{
                  'text-red-500 scale-110': favoriteId,
                  'text-gray-400 hover:text-red-400': !favoriteId,
                }" @click="toggleHeart" />
              <span class="pointer-events-none hidden md:block absolute bottom-full left-1/2 transform -translate-x-1/2
         px-2 py-1 text-[9px] font-semibold text-white bg-rv-navy rounded
         opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Fav
              </span>

            </div>

            <div class="relative group cursor-pointer" @click="toggleBookmark">
              <font-awesome-icon :icon="['fas', 'bookmark']"
                class="h-5 w-5 mt-1 cursor-pointer transition-all duration-300 ease-in-out" :class="{
                  'text-yellow-400 scale-110': pendingId,
                  'text-gray-400 hover:text-yellow-300': !pendingId,
                }" />
              <span class="pointer-events-none hidden md:block absolute bottom-full left-1/2 transform -translate-x-1/2
         px-2 py-1 text-[9px] font-semibold text-white bg-rv-navy rounded
         opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Guardar
              </span>
            </div>

            <div class="relative group cursor-pointer" @click="copyAsImage">
              <i v-if="isCopying" class="fa-solid fa-spinner animate-spin text-rv-pink mt-1"
                style="width:20px;height:20px;display:block;"></i>
              <font-awesome-icon v-else :icon="['fas', 'share-nodes']"
                class="h-5 w-5 mt-1 transition-all duration-300 ease-in-out text-gray-400 hover:text-rv-pink" />
              <span class="pointer-events-none hidden md:block absolute bottom-full left-1/2 transform -translate-x-1/2
         px-2 py-1 text-[9px] font-semibold text-white bg-rv-navy rounded
         opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                Compartir
              </span>
            </div>
          </div>
        </div>

        <!-- Formulario de votación -->
        <div class="flex flex-col space-y-1">
          <label class="text-xs text-gray-500 dark:text-gray-300 translate-x-1.5">
            Disco:
            <input type="number" step="0.01" v-model="localRating.rate" min="1" max="10" class="px-0 py-1 border rounded w-16 text-xs font-bold text-center
        bg-white dark:bg-rv-darkSurface
        text-gray-500 dark:text-white
        border-gray-300 dark:border-gray-200/40" />
          </label>

          <label class="text-xs text-gray-500 dark:text-gray-300">
            Portada:
            <input type="number" step="0.01" v-model="localRating.cover" min="1" max="10" class="px-0 py-1 border rounded w-16 text-xs font-bold text-center
        bg-white dark:bg-rv-darkSurface
        text-gray-500 dark:text-white
        border-gray-300 dark:border-gray-200/40" />
          </label>
        </div>
      </div>
    </div>

    <!-- Botones para votos y enviar calificación -->
    <div class="flex mt-2 gap-1 w-full">
      <button @click="toggleVotes"
        class="w-1/3 border-2 border-rv-navy bg-rv-navy text-white font-bold py-2 px-1 rounded-lg transition-all focus:outline-none flex items-center justify-center space-x-1 hover:bg-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-white/20">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
          class="size-4">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
        </svg>
        <span class="flex items-center">
          {{ showVotes ? "Ocultar" : "Votos" }}
          <span v-if="rateCount > 0" class="ml-1 mt-1 text-[9px] text-pink-300">({{ rateCount }})</span>
        </span>
      </button>

      <button @click="openComentsModal"
        class="w-1/3 border-2 border-rv-navy bg-rv-navy text-white font-bold py-2 px-2 rounded-lg transition-all focus:outline-none flex items-center justify-center gap-1 hover:bg-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-white/20">
        <i class="fa-solid fa-comment-dots text-md"></i>
        <span class="flex items-center">
          Chat
          <span v-if="commentCount > 0" class="ml-1 mt-1 text-[9px] text-pink-300">({{ commentCount }})</span>
        </span>
      </button>

      <button @click="submitRating" :disabled="disableSubmitButton"
        class="w-1/3 border-2 border-rv-pink bg-rv-pink text-white font-bold py-2 px-1 rounded-lg transition-all focus:outline-none flex items-center justify-center space-x-1 hover:bg-[#ea849a] hover:border-[#ea849a]"
        :class="{ 'opacity-40 cursor-not-allowed': disableSubmitButton }">
        <i v-if="hasVoted" class="fa-solid fa-arrows-rotate text-md"></i>
        <i v-else class="fa-solid fa-pen-to-square text-md"></i>
        <span>{{ hasVoted ? "Editar" : "Votar" }}</span>
      </button>
    </div>

    <!-- Reproductor desplegable -->
    <Transition name="player-slide">
      <div v-if="showPlayer && link" class="mt-2 w-full overflow-x-hidden rounded-xl">
        <!-- Cargando track más popular -->
        <div v-if="isLoadingTrack"
          class="flex items-center justify-center gap-2 bg-gray-100 dark:bg-rv-darkSurface rounded-xl"
          style="height:80px">
          <i class="fa-solid fa-spinner animate-spin text-rv-pink text-sm"></i>
          <span class="text-xs text-gray-400 dark:text-gray-500">Cargando...</span>
        </div>
        <!-- Iframe listo -->
        <iframe v-else-if="embedUrl"
          :src="embedUrl"
          :height="embedHeight"
          width="100%"
          frameborder="0"
          scrolling="no"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          class="block rounded-xl"
          style="max-width:100%; overflow:hidden;"
        ></iframe>
      </div>
    </Transition>

    <!-- Lista de votos -->
  </div>

  <!-- Modal para mostrar DiscDetail -->
  <div v-if="showVotes" class="fixed inset-0 flex items-center justify-center bg-rv-navy bg-opacity-50 z-50">
    <div class="p-6 relative max-w-3xl w-full">
      <!-- Se pasa la información del disco -->
      <VotesModal :albumName="name" :artistName="artistName" :votes="votes" :showVotes="showVotes"
        :hasVoted="hasVoted" @close="showVotes = false" />
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
      <div
        class="bg-white dark:bg-rv-darkBg rounded-xl shadow-xl w-[95vw] max-w-6xl max-h-[90vh] relative overflow-hidden">
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
import { defineComponent, ref, computed, watchEffect, watch, nextTick, onUnmounted, type PropType } from "vue";
import { obtenerTrackMasPopularAlbum } from "@helpers/SpotifyFunctions";
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

    const platformInfo = computed(() => {
      const url = props.link || '';
      if (url.includes('spotify.com'))
        return { icon: 'fa-brands fa-spotify', bg: 'bg-green-500', label: 'Escuchar en Spotify' };
      if (url.includes('bandcamp.com'))
        return { icon: 'fa-brands fa-bandcamp', bg: 'bg-[#1da0c3]', label: 'Escuchar en Bandcamp' };
      if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('music.youtube.com'))
        return { icon: 'fa-brands fa-youtube', bg: 'bg-red-500', label: 'Ver en YouTube' };
      return { icon: 'fa-solid fa-play', bg: 'bg-gray-500', label: 'Escuchar' };
    });

    const embedUrl = computed(() => {
      const url = props.link || '';
      const theme = isDark.value ? 0 : 1;
      const spotifyMatch = url.match(/spotify\.com\/album\/([a-zA-Z0-9]+)/);
      if (spotifyMatch) {
        if (topTrackId.value)
          return `https://open.spotify.com/embed/track/${topTrackId.value}?utm_source=generator&theme=${theme}`;
        return `https://open.spotify.com/embed/album/${spotifyMatch[1]}?utm_source=generator&theme=${theme}`;
      }
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (ytMatch)
        return `https://www.youtube.com/embed/${ytMatch[1]}?controls=1`;
      return null;
    });

    const embedHeight = computed(() => {
      const url = props.link || '';
      if (url.includes('youtube.com') || url.includes('youtu.be')) return 115;
      return 80; // track compacto de Spotify
    });

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

    // --- Reproductor desplegable ---
    const showPlayer = ref(false);
    const topTrackId = ref<string | null>(null);
    const isLoadingTrack = ref(false);

    watch(showPlayer, async (val) => {
      if (!val || topTrackId.value) return; // cerrado o ya cargado
      const url = props.link || '';
      const spotifyMatch = url.match(/spotify\.com\/album\/([a-zA-Z0-9]+)/);
      if (!spotifyMatch) return; // no es Spotify, no hace falta
      isLoadingTrack.value = true;
      topTrackId.value = (await obtenerTrackMasPopularAlbum(spotifyMatch[1])) ?? null;
      isLoadingTrack.value = false;
    });

    // Detectar dark mode (clase 'dark' en <html>)
    const isDark = ref(document.documentElement.classList.contains('dark'));
    const darkObserver = new MutationObserver(() => {
      isDark.value = document.documentElement.classList.contains('dark');
    });
    darkObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    onUnmounted(() => darkObserver.disconnect());

    // --- No Spoilers ---
    const noSpoilers = ref(localStorage.getItem('rv_no_spoilers') === 'true');
    const spoilerMode = computed(() => noSpoilers.value && !hasVoted.value);

    const handleSpoilersChanged = (e: Event) => {
      noSpoilers.value = (e as CustomEvent).detail;
    };
    window.addEventListener('rv-spoilers-changed', handleSpoilersChanged);
    onUnmounted(() => window.removeEventListener('rv-spoilers-changed', handleSpoilersChanged));

    // --- Share as image (Canvas) ---
    const isCopying = ref(false);

    const riffValleyLogoUrl = "/LOGO-RIFF-VALLEY.svg";

    const flagImageUrl = computed(() => {
      const iso = props.artistCountry?.isoCode;
      if (!iso) return "";

      if (iso === "int") return "/int.svg";

      return `https://flagcdn.com/w80/${iso.slice(0, 2).toLowerCase()}.png`;
    });

    const loadImage = (src: string): Promise<HTMLImageElement | null> => {
      return new Promise(resolve => {
        if (!src) {
          resolve(null);
          return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;

        setTimeout(() => resolve(null), 5000);
      });
    };

    const rrect = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const wrapText = (
      ctx: CanvasRenderingContext2D,
      text: string,
      maxW: number
    ): string[] => {
      const words = text.split(" ");
      const lines: string[] = [];
      let cur = "";

      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;

        if (ctx.measureText(test).width > maxW && cur) {
          lines.push(cur);
          cur = word;
        } else {
          cur = test;
        }
      }

      if (cur) lines.push(cur);
      return lines;
    };

    const drawCoverCrop = (
      ctx: CanvasRenderingContext2D,
      img: HTMLImageElement,
      x: number,
      y: number,
      w: number,
      h: number,
      radius = 0
    ) => {
      const ratio = img.naturalWidth / img.naturalHeight;

      let sx = 0;
      let sy = 0;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;

      if (ratio > 1) {
        sx = (img.naturalWidth - img.naturalHeight) / 2;
        sw = img.naturalHeight;
      } else if (ratio < 1) {
        sy = (img.naturalHeight - img.naturalWidth) / 2;
        sh = img.naturalWidth;
      }

      ctx.save();

      if (radius > 0) {
        rrect(ctx, x, y, w, h, radius);
        ctx.clip();
      }

      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
      ctx.restore();
    };

    const copyAsImage = async () => {
      if (isCopying.value) return;
      isCopying.value = true;

      try {
        const SIZE = 480;
        const DPR = 2;
        const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

        const canvas = document.createElement("canvas");
        canvas.width = SIZE * DPR;
        canvas.height = SIZE * DPR;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No canvas context");

        ctx.scale(DPR, DPR);

        const img = await loadImage(computedImage.value);

        ctx.fillStyle = "#00021f";
        ctx.fillRect(0, 0, SIZE, SIZE);

        if (img) {
          drawCoverCrop(ctx, img, 0, 0, SIZE, SIZE);

          ctx.fillStyle = "rgba(0, 2, 31, 0.76)";
          ctx.fillRect(0, 0, SIZE, SIZE);

          const vignette = ctx.createRadialGradient(
            SIZE / 2, SIZE / 2, 90,
            SIZE / 2, SIZE / 2, SIZE / 1.05
          );
          vignette.addColorStop(0, "rgba(0,2,31,0.05)");
          vignette.addColorStop(1, "rgba(0,2,31,0.9)");
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, SIZE, SIZE);
        }

        // Portada más arriba y algo más pequeña para ganar aire abajo
        const coverSize = 176;
        const coverX = (SIZE - coverSize) / 2;
        const coverY = 34;

        if (img) {
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.65)";
          ctx.shadowBlur = 22;
          ctx.shadowOffsetY = 10;
          drawCoverCrop(ctx, img, coverX, coverY, coverSize, coverSize, 16);
          ctx.restore();

          rrect(ctx, coverX, coverY, coverSize, coverSize, 16);
          ctx.strokeStyle = "rgba(255,255,255,0.45)";
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }

        const genre = (props.genreName || "Sin género").toUpperCase();
        const flagImg = await loadImage(flagImageUrl.value);

        // Fila bandera + género
        const rowY = coverY + coverSize + 16;
        const badgeH = 22;

        ctx.font = `800 11px ${font}`;
        const badgeW = ctx.measureText(genre).width + 26;

        const flagW = flagImg ? 30 : 0;
        const flagH = flagImg ? 22 : 0;
        const gap = flagImg ? 10 : 0;
        const rowW = flagW + gap + badgeW;

        let rowX = (SIZE - rowW) / 2;

        // Bandera como imagen real
        if (flagImg) {
          ctx.save();

          rrect(ctx, rowX, rowY, flagW, flagH, 8);
          ctx.clip();

          ctx.drawImage(flagImg, rowX, rowY, flagW, flagH);

          ctx.restore();

          rowX += flagW + gap;
        }

        // Badge género
        rrect(ctx, rowX, rowY, badgeW, badgeH, 13);
        ctx.fillStyle = props.genreColor || "#6b7280";
        ctx.fill();

        ctx.font = `800 11px ${font}`;
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(genre, rowX + badgeW / 2, rowY + badgeH / 2 + 0.5);

// Bloque central fijo: título + artista + fecha
ctx.textBaseline = "alphabetic";

const titleBlockTop = rowY + 54;
const maxTitleWidth = SIZE - 72;

let titleFontSize = 21;
let titleLines: string[] = [];

ctx.font = `900 ${titleFontSize}px ${font}`;
titleLines = wrapText(ctx, (props.name || "").toUpperCase(), maxTitleWidth);

if (titleLines.length > 2) {
  titleLines = titleLines.slice(0, 2);

  while (
    ctx.measureText(`${titleLines[1]}…`).width > maxTitleWidth &&
    titleLines[1].length > 4
  ) {
    titleLines[1] = titleLines[1].slice(0, -1);
  }

  titleLines[1] = `${titleLines[1]}…`;
}

if (titleLines.length === 2) {
  titleFontSize = 19;
  ctx.font = `900 ${titleFontSize}px ${font}`;
}

ctx.fillStyle = "#fff";

let titleY = titleBlockTop;
const titleLineHeight = titleLines.length === 2 ? 25 : 27;

for (const line of titleLines) {
  ctx.fillText(line, SIZE / 2, titleY);
  titleY += titleLineHeight;
}

// Artista
ctx.font = `700 15px ${font}`;
ctx.fillStyle = "rgba(255,255,255,0.82)";
ctx.fillText(props.artistName || "", SIZE / 2, titleY + 2);

// Fecha
ctx.font = `600 12px ${font}`;
ctx.fillStyle = "rgba(255,255,255,0.5)";
ctx.fillText(formattedDate.value || "", SIZE / 2, titleY + 25);

// Scores
const scores = [
  { val: props.averageRate, label: "DISCO" },
  { val: props.averageCover, label: "PORTADA" },
].filter(score => typeof score.val === "number");

const scoreY = 408;

// Divisor horizontal encima de las notas
const dividerY = scoreY - 40;
ctx.beginPath();
ctx.moveTo(SIZE * 0.1, dividerY);
ctx.lineTo(SIZE * 0.9, dividerY);
ctx.strokeStyle = "rgba(255,255,255,0.18)";
ctx.lineWidth = 1;
ctx.stroke();

if (scores.length >= 2) {
  const leftX = SIZE / 2 - 72;
  const rightX = SIZE / 2 + 72;

  ctx.font = `900 33px ${font}`;
  ctx.fillStyle = "#fff";
  ctx.fillText(scores[0].val!.toFixed(2), leftX, scoreY);
  ctx.fillText(scores[1].val!.toFixed(2), rightX, scoreY);

  ctx.font = `800 10px ${font}`;
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.fillText(scores[0].label, leftX, scoreY + 22);
  ctx.fillText(scores[1].label, rightX, scoreY + 22);

  // Divisor vertical entre las dos notas
  ctx.beginPath();
  ctx.moveTo(SIZE / 2, scoreY - 26);
  ctx.lineTo(SIZE / 2, scoreY + 24);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

if (scores.length === 1) {
  ctx.font = `900 33px ${font}`;
  ctx.fillStyle = "#fff";
  ctx.fillText(scores[0].val!.toFixed(2), SIZE / 2, scoreY);

  ctx.font = `800 10px ${font}`;
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.fillText(scores[0].label, SIZE / 2, scoreY + 22);
}

// Footer Riff Valley — logo con aspect ratio real + URL, centrados juntos
const rvLogo = await loadImage(riffValleyLogoUrl);

const footerCenterY = SIZE - 20;
const logoTargetH = 20;

ctx.font = `500 12px ${font}`;
const urlText = "app.riffvalley.es";
const urlW = ctx.measureText(urlText).width;

if (rvLogo && rvLogo.naturalHeight > 0) {
  const aspect = rvLogo.naturalWidth / rvLogo.naturalHeight;
  const logoRenderW = Math.round(logoTargetH * aspect);
  const gap = 5;

  const totalW = logoRenderW + gap + urlW;
  const startX = (SIZE - totalW) / 2;

  ctx.drawImage(rvLogo, startX, footerCenterY - logoTargetH / 2, logoRenderW, logoTargetH);

  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(urlText, startX + logoRenderW + gap, footerCenterY);
} else {
  // Fallback sin logo
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(urlText, SIZE / 2, footerCenterY);
}

ctx.textAlign = "center";
ctx.textBaseline = "alphabetic";

        await new Promise<void>((resolve, reject) => {
          canvas.toBlob(async blob => {
            if (!blob) {
              reject(new Error("No se pudo generar la imagen"));
              return;
            }

            try {
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
              ]);
              resolve();
            } catch (error) {
              reject(error);
            }
          }, "image/png");
        });

        Swal.fire({
          icon: "success",
          title: "¡Imagen copiada!",
          text: "Pégala en cualquier chat",
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
      } catch (error) {
        console.error("Error al copiar imagen:", error);

        Swal.fire({
          icon: "error",
          title: "No se pudo copiar",
          timer: 2500,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
      } finally {
        isCopying.value = false;
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
      platformInfo,
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
      isCopying,
      flagImageUrl,
      copyAsImage,
      riffValleyLogoUrl,
      embedUrl,
      embedHeight,
      showPlayer,
      topTrackId,
      isLoadingTrack,
      spoilerMode,
    };
  },
});
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  background-color: white;
  border: 2px solid #e5e7eb;
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

:global(.dark) input[type="number"] {
  color-scheme: dark;
}

.player-slide-enter-active,
.player-slide-leave-active {
  transition: max-height 0.3s ease, opacity 0.25s ease;
  max-height: 130px;
  overflow: hidden;
}
.player-slide-enter-from,
.player-slide-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
