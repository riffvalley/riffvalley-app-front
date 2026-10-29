<template>
  <div class="flex flex-col rounded-2xl shadow-sm border overflow-hidden transition-all duration-200 h-full"
       :class="hasColor ? 'border-white/20 text-white' : 'bg-white dark:bg-rv-darkCard text-rv-navy dark:text-white border-gray-100 dark:border-white/10'"
       :style="hasColor ? { backgroundColor: genreColor } : {}">

    <!-- Zona principal -->
    <div class="flex flex-col gap-2 p-4 flex-1">

      <!-- Fila: portada + títulos -->
      <div class="flex items-start gap-3">
        <!-- Portada -->
        <div class="shrink-0">
          <img v-if="disc.image" :src="disc.image" alt="Portada"
               class="w-16 h-16 rounded-xl object-cover shadow-md cursor-pointer"
               @click="openDiscDetail" />
          <div v-else
               class="w-16 h-16 rounded-xl flex items-center justify-center border-2 border-dashed cursor-pointer"
               :class="hasColor ? 'border-white/40' : 'border-gray-200 dark:border-white/20'"
               @click="openDiscDetail">
            <i class="fa-solid fa-compact-disc text-xl"
               :class="hasColor ? 'text-white/50' : 'text-gray-300 dark:text-white/30'"></i>
          </div>
        </div>

        <!-- Artista + título -->
        <div class="flex-1 min-w-0 flex flex-col gap-0.5 pt-0.5">
          <a @click="openArtistDetail"
             class="font-bold text-base leading-snug cursor-pointer hover:opacity-75 transition-opacity line-clamp-2">
            {{ disc.artist.name }}
          </a>
          <a @click="openDiscDetail"
             class="text-sm leading-snug cursor-pointer hover:opacity-60 transition-opacity line-clamp-2"
             :class="hasColor ? 'opacity-80' : 'text-gray-500 dark:text-gray-300'">
            {{ disc.name }}
          </a>
        </div>
      </div>

      <!-- Fila: fecha + botón plataforma (siempre debajo de los títulos) -->
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[11px] whitespace-nowrap"
              :class="hasColor ? 'opacity-70' : 'text-gray-400 dark:text-gray-400'">
          {{ formattedDate }}
        </span>
        <a v-if="linkButtonData.visible" :href="disc.link" target="_blank"
           :class="[linkButtonData.color, linkButtonData.hover]"
           class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
                  text-white text-[11px] font-semibold shadow-sm
                  transition-all hover:-translate-y-0.5 active:scale-[0.97]">
          <i :class="[linkButtonData.icon, 'text-[11px]']"></i>
          <span>{{ linkButtonData.text }}</span>
        </a>
        <span v-else-if="!disc.link">
          <SpotifyArtistButton :artistName="disc.artist.name" />
        </span>
      </div>
    </div>

    <!-- Footer: badges a la izquierda, pendiente a la derecha -->
    <div class="flex items-center justify-between gap-2 px-4 py-2.5 border-t"
         :class="hasColor ? 'border-white/15 bg-black/10' : 'border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5'">

      <!-- Badges izquierda -->
      <div class="flex items-center gap-1.5 flex-wrap min-w-0">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-medium leading-tight"
              :class="hasColor ? 'bg-white/20 text-white' : 'text-white'"
              :style="hasColor ? {} : { backgroundColor: disc.genre?.color || '#888' }">
          {{ disc.genre?.name || 'Sin género' }}
        </span>
        <span v-if="disc.ep"
              class="px-2 py-0.5 rounded-full text-[10px] font-medium leading-tight"
              :class="hasColor ? 'bg-white/20 text-white' : 'bg-rv-purple text-white'">
          EP
        </span>
        <span v-if="disc.debut"
              class="px-2 py-0.5 rounded-full text-[10px] font-medium leading-tight"
              :class="hasColor ? 'bg-white/20 text-white' : 'bg-rv-purple text-white'">
          Debut
        </span>

        <!-- Bandera -->
        <div v-if="artistCountry?.isoCode" class="relative group shrink-0">
          <template v-if="artistCountry.isoCode === 'int'">
            <img src="/int.svg" alt="Internacional"
                 class="h-4 w-4 rounded-full cursor-help object-cover" aria-hidden="true" />
          </template>
          <template v-else-if="artistCountry.isoCode.length >= 2">
            <CircleFlags :country="artistCountry.isoCode.slice(0, 2).toLowerCase()"
                         :show-flag-name="false" class="h-4 w-4 cursor-help" aria-hidden="true" />
          </template>
          <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[9px] font-semibold
                       text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity
                       whitespace-nowrap z-20 pointer-events-none shadow-lg">
            {{ countryAbbr[artistCountry?.name] || artistCountry?.name || artistCountry?.isoCode?.slice(0, 2).toUpperCase() }}
          </span>
        </div>
      </div>

      <!-- Pendiente derecha -->
      <button @click="toggleBookmark()"
              class="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
                     shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97]"
              :class="justAdded
                ? (hasColor ? 'bg-white/50 text-white scale-105' : 'bg-yellow-400 text-white scale-105')
                : pendingId
                  ? 'bg-yellow-500 text-white hover:bg-yellow-400'
                  : (hasColor ? 'bg-white/15 text-white hover:bg-white/30' : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white hover:bg-yellow-500 hover:text-white')">
        <i class="fa-solid fa-bookmark text-[10px]" :class="justAdded ? 'animate-bounce' : ''"></i>
        <span v-if="justAdded">¡Añadido!</span>
        <span v-else>{{ pendingId ? 'Guardado' : 'Pendiente' }}</span>
      </button>
    </div>
  </div>

  <!-- Modales -->
  <DiscDetail   v-if="showDiscDetail"   :disc="disc"           @close="showDiscDetail = false" />
  <ArtistDetail v-if="showArtistDetail" :disc-name="disc.name" :artistName="disc.artist.name" @close="showArtistDetail = false" />
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import type { PropType } from "vue";
import Swal from "sweetalert2";
import SwalService from "@services/swal/SwalService";

import SpotifyArtistButton from "@components/SpotifyArtistButton.vue";
import { postPendingService, deletePendingService } from "@services/pendings/pendings";
import DiscDetail from "@components/DiscDetail.vue";
import ArtistDetail from "@components/ArtistDetail.vue";

export default defineComponent({
  name: "DiscBaby",
  components: { SpotifyArtistButton, DiscDetail, ArtistDetail },
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
        debut: boolean;
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
        month: "short",
        day: "numeric",
      })
    );

    const genreColor = computed(() => {
      const direct = props.disc.genre?.color;
      if (direct && direct !== "transparent") return direct;
      const genre = props.genres.find((g) => String(g.id) === String(props.disc.genreId));
      return genre?.color || "transparent";
    });

    const hasColor = computed(() => genreColor.value !== "transparent");

    const linkButtonData = computed(() => {
      const link = props.disc.link || "";
      if (link.includes("spotify.com"))
        return { visible: true, color: "bg-green-500", hover: "hover:bg-green-600", icon: "fa-brands fa-spotify", text: "Spotify" };
      if (link.includes("youtube.com") || link.includes("youtu.be"))
        return { visible: true, color: "bg-red-500", hover: "hover:bg-red-600", icon: "fa-brands fa-youtube", text: "YouTube" };
      if (link.includes("bandcamp.com"))
        return { visible: true, color: "bg-blue-500", hover: "hover:bg-blue-600", icon: "fa-brands fa-bandcamp", text: "Bandcamp" };
      return { visible: false, color: "", hover: "", icon: "", text: "" };
    });

    const pendingId = ref<string | null>(props.disc.pendingId ?? null);
    const justAdded = ref(false);

    const toggleBookmark = async () => {
      try {
        if (pendingId.value) {
          await deletePendingService(pendingId.value);
          pendingId.value = null;
          SwalService.success('Eliminado de pendientes');
        } else {
          const pending = await postPendingService({ discId: props.disc.id });
          pendingId.value = pending.id;
          justAdded.value = true;
          setTimeout(() => { justAdded.value = false; }, 1500);
        }
      } catch (error) {
        console.error("Error al cambiar el estado de pendiente:", error);
        SwalService.error('No se pudo actualizar el estado de pendiente');
      }
    };

    const showDiscDetail   = ref(false);
    const showArtistDetail = ref(false);
    const openDiscDetail   = () => (showDiscDetail.value = true);
    const openArtistDetail = () => (showArtistDetail.value = true);

    const countryAbbr: Record<string, string> = {
      "United States of America": "USA",
      "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
    };

    return {
      formattedDate,
      genreColor,
      hasColor,
      linkButtonData,
      pendingId,
      justAdded,
      toggleBookmark,
      showDiscDetail,
      showArtistDetail,
      openDiscDetail,
      openArtistDetail,
      countryAbbr,
    };
  },
});
</script>
