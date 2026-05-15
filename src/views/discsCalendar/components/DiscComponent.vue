```
<template>
  <!-- Tarjeta principal -->
  <div class="flex flex-col sm:flex-row w-full rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden transition-all duration-200 bg-white dark:bg-rv-darkCard"
       :class="isFocused ? 'ring-2 ring-rv-pink/60 shadow-lg' : ''">

    <!-- ── Columna izquierda: fondo de género (solo imagen + info básica) ── -->
    <div class="flex items-start gap-4 p-5 sm:w-[44%] shrink-0 min-w-0 genre-col"
         :class="getGenreColor(disc.genreId) !== 'transparent' ? 'text-white' : 'bg-white dark:bg-rv-darkCard text-rv-navy dark:text-white'"
         :style="getGenreColor(disc.genreId) !== 'transparent'
           ? { backgroundColor: getGenreColor(disc.genreId) }
           : {}">

      <!-- Portada -->
      <div class="shrink-0">
        <img v-if="disc.image" :src="disc.image" @click="openImageModal" alt="Portada"
             class="w-24 h-24 rounded-xl object-cover cursor-pointer shadow-lg
                    hover:scale-105 transition-transform duration-200" />
        <button v-else @click="openImageModal"
                class="w-24 h-24 rounded-xl flex items-center justify-center border-2 border-dashed
                       border-white/40 hover:border-white/80 transition-colors outline-none focus:outline-none">
          <i class="fa-solid fa-image text-white/60 text-2xl"></i>
        </button>
      </div>

      <!-- Info textual -->
      <div class="flex-1 min-w-0 flex flex-col gap-1">

        <!-- Artista -->
        <div class="flex items-start gap-1 min-w-0">
          <a @click="openArtistDetail"
             class="font-bold text-base leading-snug cursor-pointer hover:opacity-75 transition-opacity line-clamp-2">
            {{ disc.artist.name }}
          </a>
          <button @click="openArtistModal" title="Editar artista"
                  class="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded-full
                         bg-white/20 hover:bg-white/40 transition-all outline-none focus:outline-none border-0">
            <i class="fa-solid fa-pen text-[10px]"></i>
          </button>
        </div>

        <!-- Disco -->
        <div class="flex items-start gap-1 min-w-0">
          <a @click="openDiscDetail"
             class="text-sm italic leading-snug cursor-pointer opacity-85 hover:opacity-60 transition-opacity line-clamp-2">
            {{ disc.name }}
          </a>
          <button @click="showNameModal = true" title="Editar nombre"
                  class="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded-full
                         bg-white/20 hover:bg-white/40 transition-all outline-none focus:outline-none border-0">
            <i class="fa-solid fa-pen text-[10px]"></i>
          </button>
        </div>

        <!-- Fecha + link en la misma línea -->
        <div class="flex items-center gap-2 flex-wrap mt-1.5">
          <a class="text-xs opacity-70 cursor-pointer hover:opacity-100 transition-opacity whitespace-nowrap"
             @click="showDateModal = true">
            {{ formattedDate }}
          </a>
          <a v-if="linkButtonData.visible" @click.prevent="handleListenClick" :href="disc.link"
             :class="[linkButtonData.color, linkButtonData.hover]"
             class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                    text-white text-xs font-semibold shadow-sm cursor-pointer transition-all">
            <i :class="[linkButtonData.icon, 'text-xs']"></i>
            <span>{{ linkButtonData.text }}</span>
          </a>
          <span v-else-if="!disc.link">
            <SpotifyArtistButton :artistName="disc.artist.name" />
          </span>
          <button @click="showLinkModal = true" title="Editar link"
                  class="w-6 h-6 flex items-center justify-center rounded-full
                         bg-white/20 hover:bg-white/40 transition-all outline-none focus:outline-none border-0">
            <i class="fa-solid fa-link text-xs"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Columna derecha: controles admin (fondo neutro siempre) ── -->
    <div class="flex-1 p-4 flex flex-col gap-2.5 bg-white dark:bg-rv-darkCard min-w-0">

      <!-- Género (full width) -->
      <SearchableSelect :key="`genres-${genres.length}`" v-model="editedData.genreId" :options="genres"
        title="name" trackby="id" placeholder="Buscar género..." trigger-placeholder="Selecciona un género"
        all-label="Todos los géneros" :max="200"
        class="w-full rounded-full text-rv-navy dark:text-white text-sm border-rv-navy/20 dark:border-white/10 shadow-sm ring-0 focus:ring-0 focus:outline-none"
        @update:modelValue="() => saveChanges('genreId')" />

      <!-- País (full width) -->
      <SearchableSelect :key="`countries-${countries.length}`" v-model="editedArtist.countryId" :options="countries"
        title="name" trackby="id" placeholder="Buscar país..." trigger-placeholder="Selecciona un país"
        all-label="Todos los países" :max="300"
        class="w-full rounded-full text-rv-navy dark:text-white text-sm border-rv-navy/20 dark:border-white/10 shadow-sm ring-0 focus:ring-0 focus:outline-none"
        @update:modelValue="saveCountry" />

      <!-- Todos los botones de acción en una sola fila con wrap -->
      <div class="flex flex-wrap gap-2 items-center">
        <!-- Switch EP -->
        <label class="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">Álbum</span>
          <div class="relative" @click="toggleEp()">
            <div class="w-8 h-4 rounded-full transition-colors duration-200"
                 :class="disc.ep ? 'bg-rv-purple' : 'bg-gray-300 dark:bg-white/20'"></div>
            <div class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200"
                 :class="disc.ep ? 'translate-x-4' : 'translate-x-0'"></div>
          </div>
          <span class="text-xs font-semibold" :class="disc.ep ? 'text-rv-purple' : 'text-gray-400 dark:text-gray-500'">EP</span>
        </label>

        <!-- Separador -->
        <span class="w-px h-4 bg-gray-200 dark:bg-white/10"></span>

        <!-- Switch Debut -->
        <label class="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">No debut</span>
          <div class="relative" @click="toggleDebut()">
            <div class="w-8 h-4 rounded-full transition-colors duration-200"
                 :class="disc.debut ? 'bg-rv-purple' : 'bg-gray-300 dark:bg-white/20'"></div>
            <div class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200"
                 :class="disc.debut ? 'translate-x-4' : 'translate-x-0'"></div>
          </div>
          <span class="text-xs font-semibold" :class="disc.debut ? 'text-rv-purple' : 'text-gray-400 dark:text-gray-500'">Debut</span>
        </label>

        <!-- Separador -->
        <span class="w-px h-4 bg-gray-200 dark:bg-white/10"></span>
        <button @click="toggleVerified()"
                class="px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-sm whitespace-nowrap
                       transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
                :class="disc.verified ? 'bg-green-500 hover:bg-green-400' : 'bg-gray-300 dark:bg-white/20 hover:bg-green-500'">
          {{ disc.verified ? '✓ Verificado' : '✗ Sin verificar' }}
        </button>
        <button @click="toggleBookmark()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap
                       text-xs font-semibold text-white shadow-sm
                       transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97]"
                :class="justAdded
                  ? 'bg-yellow-400 scale-105'
                  : pendingId
                    ? 'bg-yellow-500 hover:bg-yellow-400'
                    : 'bg-gray-300 dark:bg-white/20 hover:bg-yellow-500'">
          <i class="fa-solid fa-bookmark" :class="justAdded ? 'animate-bounce' : ''"></i>
          <span v-if="justAdded">¡Añadido!</span>
          <span v-else>{{ pendingId ? 'Guardado' : 'Pendiente' }}</span>
        </button>
        <button @click="confirmDelete(disc.id)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap
                       text-xs font-semibold text-white bg-red-500 hover:bg-red-600 shadow-sm
                       transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]">
          <i class="fa-solid fa-trash"></i> Borrar
        </button>
      </div>

      <!-- Novedad nacional (solo artistas españoles) -->
      <div v-if="isSpanish">
        <button v-if="disc.nationalReleaseId" disabled
                class="px-3 py-1.5 rounded-full text-xs font-semibold cursor-not-allowed
                       bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500 whitespace-nowrap">
          ✓ Ya en novedades nacionales
        </button>
        <button v-else @click="addNationalRelease" :disabled="addingNational"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                       text-white whitespace-nowrap shadow-sm
                       bg-gradient-to-r from-rv-pink to-rv-purple hover:opacity-90 disabled:opacity-50
                       transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]">
          {{ addingNational ? 'Añadiendo...' : '🇪🇸 Novedades nacionales' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Teleport modales -->
  <Teleport to="body">
    <!-- Modal artista -->
    <div v-if="showArtistModal"
         class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="bg-white dark:bg-rv-darkCard p-6 rounded-2xl shadow-2xl w-full max-w-sm
                  border border-gray-100 dark:border-white/10">
        <h2 class="text-base font-bold mb-4 text-rv-navy dark:text-white">Actualizar o crear artista</h2>
        <label class="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" v-model="creatingNewArtist" class="rounded" />
          Crear nuevo artista
        </label>
        <input v-model="newArtistName" type="text" placeholder="Nombre del artista"
               class="border border-gray-200 dark:border-white/10 px-3 py-2 w-full rounded-xl text-sm
                      bg-white dark:bg-rv-darkSurface text-gray-800 dark:text-white
                      placeholder:text-gray-400 outline-none focus:border-rv-navy dark:focus:border-rv-purple" />
        <div class="flex justify-end gap-2 mt-4">
          <button @click="closeArtistModal"
                  class="px-4 py-2 rounded-full text-sm font-semibold
                         bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white
                         hover:bg-gray-300 dark:hover:bg-white/20 transition-all">
            Cancelar
          </button>
          <button @click="handleArtistUpdate"
                  class="px-4 py-2 rounded-full text-sm font-semibold bg-rv-pink text-white
                         hover:bg-rv-pink/90 transition-all">
            Guardar
          </button>
        </div>
      </div>
    </div>

    <EditModal v-model:show="showNameModal"  v-model="editedName"         title="Editar título del álbum"  placeholder="Introduce el nombre del disco"    @save="updateDiscName" />
    <EditModal v-model:show="showLinkModal"  v-model="editedLink"         title="Editar link del álbum"    placeholder="Introduce el link del disco"      @save="updateDiscLink" />
    <EditModal v-model:show="showImageModal" v-model="newImageUrl"        title="Cambiar portada del álbum" placeholder="Introduce la URL de la imagen"   @save="updateImageUrl" />
    <EditModal v-model:show="showDateModal"  v-model="editedReleaseDate"  title="Cambiar fecha del álbum"  placeholder="Selecciona la fecha" inputType="date" @save="updateDiscReleaseDate" />
  </Teleport>

  <!-- DiscDetail y ArtistDetail (gestionan su propio overlay) -->
  <DiscDetail   v-if="showDiscDetail"   :disc="disc"               @close="showDiscDetail = false" />
  <ArtistDetail v-if="showArtistDetail" :disc-name="disc.name"     :artistName="disc.artist.name" @close="showArtistDetail = false" />
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  reactive,
  ref,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
} from "vue";
import type { PropType } from "vue";
import { updateDisc, deleteDisc } from "@services/discs/discs";
import { createNationalReleaseFromDisc } from "@services/national-releases/nationalReleases";
import { updateArtist, postArtist } from "@services/artist/artist";
import { postPendingService, deletePendingService } from "@services/pendings/pendings";
import Swal from "sweetalert2";
import SwalService from "@services/swal/SwalService";
import axios from "axios";
import SpotifyArtistButton from "@components/SpotifyArtistButton.vue";
import { obtenerTokenSpotify } from "@helpers/SpotifyFunctions.ts";
import SearchableSelect from "@components/SearchableSelect.vue";
import EditModal from "./EditModal.vue";

// Componentes de detalle
import DiscDetail from "@components/DiscDetail.vue";
import ArtistDetail from "@components/ArtistDetail.vue";

export default defineComponent({
  name: "Disc",
  components: {
    SpotifyArtistButton,
    SearchableSelect,
    EditModal,
    DiscDetail,
    ArtistDetail,
  },
  props: {
    disc: {
      type: Object as PropType<{
        id: string;
        name: string;
        artist: { id: string; name: string; countryId: string };
        genreId: string;
        link: string | null;
        image: string | null;
        ep: boolean;
        debut: boolean;
        verified: boolean;
        releaseDate: Date;
        pendingId: string | null;
        nationalReleaseId: string | null;
      }>,
      required: true,
    },

    focusDiscId: { type: String, default: "" }, // ✅ AQUÍ

    genres: {
      type: Array as PropType<{ id: string; name: string; color?: string }[]>,
      required: true,
    },
    countries: {
      type: Array as PropType<{ id: string; name: string; isoCode?: string }[]>,
      required: true,
    },
  },
  setup(props, { emit }) {
    // Estado local del select (solo genreId)
    const editedData = reactive({
      genreId: props.disc.genreId ?? "",
    });

    // Evita pisar el select tras guardar
    const isSaving = ref(false);

    // Re-inicializa el formulario solo cuando cambie el disco
    watch(
      () => props.disc.id,
      () => {
        editedData.genreId = props.disc.genreId ?? "";
      },
      { immediate: true }
    );

    // Si el padre cambia genreId y NO estamos guardando, sincroniza
    watch(
      () => props.disc.genreId,
      (newId) => {
        if (isSaving.value) return;
        editedData.genreId = newId ?? "";
      }
    );

    const formattedDate = computed(() =>
      new Date(props.disc.releaseDate).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    );

    const editedArtist = reactive({
      countryId: props.disc.artist.countryId ?? null,
    });

    const linkButtonData = computed(() => {
      const link = props.disc.link || "";
      if (link.includes("spotify.com")) {
        return { visible: true, color: "bg-green-500", hover: "hover:bg-green-600", icon: "fa-brands fa-spotify", text: "Spotify" };
      } else if (link.includes("youtube.com") || link.includes("youtu.be")) {
        return { visible: true, color: "bg-red-500", hover: "hover:bg-red-600", icon: "fa-brands fa-youtube", text: "YouTube" };
      } else if (link.includes("bandcamp.com")) {
        return { visible: true, color: "bg-blue-500", hover: "hover:bg-blue-600", icon: "fa-brands fa-bandcamp", text: "Bandcamp" };
      }
      return { visible: false, color: "", hover: "", icon: "", text: "" };
    });

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

    const isFocused = computed(() => props.focusDiscId && props.focusDiscId === props.disc.id);

    const handleListenClick = () => {
      const link = props.disc.link || "";
      if (!link) return;
      if (link.includes("spotify.com")) openSpotify(link);
      else window.open(link, "_blank", "noopener");
    };

    const saveCountry = async () => {
      try {
        await updateArtist(props.disc.artist.id, { countryId: editedArtist.countryId });
        props.disc.artist.countryId = editedArtist.countryId as any;
        SwalService.success('País actualizado correctamente');
      } catch (e) {
        SwalService.error('No se pudo actualizar el país');
      }
    };

    const saveChanges = async (field: string) => {
      try {
        isSaving.value = true;

        // payload para patch
        const payload: Record<string, any> = {};
        payload[field] = (editedData as any)[field];

        await updateDisc(props.disc.id, payload);

        if (field === "genreId") {
          props.disc.genreId = editedData.genreId;
        } else {
          (props.disc as any)[field] = (editedData as any)[field];
        }

        SwalService.success('Género actualizado correctamente');
      } catch (error) {
        console.error(`Error al actualizar ${field}:`, error);
        SwalService.error('No se pudo actualizar el género');
      } finally {
        await nextTick();
        isSaving.value = false;
      }
    };

    const toggleEp = async () => {
      try {
        await updateDisc(props.disc.id, { ep: !props.disc.ep });
        props.disc.ep = !props.disc.ep;
      } catch (error) {
        console.error("Error al actualizar EP:", error);
      }
    };

    const toggleDebut = async () => {
      try {
        await updateDisc(props.disc.id, { debut: !props.disc.debut });
        props.disc.debut = !props.disc.debut;
      } catch (error) {
        console.error("Error al actualizar Debut:", error);
      }
    };

    const toggleVerified = async () => {
      try {
        await updateDisc(props.disc.id, { verified: !props.disc.verified });
        props.disc.verified = !props.disc.verified;
      } catch (error) {
        console.error("Error al actualizar verificación:", error);
      }
    };

    const pendingId = ref(props.disc.pendingId);
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

    const confirmDelete = async (discId: string) => {
      const confirm = await Swal.fire({
        title: "¿Estás seguro?",
        text: "¡Esta acción no se puede deshacer!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, eliminarlo",
        cancelButtonText: "Cancelar",
      });
      if (confirm.isConfirmed) {
        deleteDiscFunction(discId);
      }
    };

    const deleteDiscFunction = async (discId: string) => {
      try {
        await deleteDisc(discId);
        emit("disc-deleted", props.disc.id);
        Swal.fire({
          title: "¡Eliminado!",
          text: "El disco se eliminó correctamente.",
          icon: "success",
          timer: 3000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      } catch (error: any) {
        console.error("Error al eliminar el disco:", error);
        const status = error?.response?.status;
        Swal.fire({
          title: status === 404 ? "Ya eliminado" : "Error",
          text: status === 404
            ? "Este disco ya no existe. Recargá la página."
            : "No se pudo eliminar el disco.",
          icon: status === 404 ? "warning" : "error",
          timer: 4000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
        if (status === 404) {
          emit("disc-deleted", props.disc.id);
        }
      }
    };

    const getGenreColor = (genreId: string) => {
      const id = String(genreId || editedData.genreId || "");
      const genre = props.genres.find((g) => String(g.id) === id);
      return genre?.color || "transparent";
    };

    // Modal imagen
    const showImageModal = ref(false);
    const newImageUrl = ref(props.disc.image || "");
    const openImageModal = () => {
      newImageUrl.value = props.disc.image || "";
      showImageModal.value = true;
    };
    const updateImageUrl = async (newValue: string) => {
      try {
        await updateDisc(props.disc.id, { image: newValue });
        props.disc.image = newValue;
        Swal.fire({
          title: "¡Éxito!",
          text: "La imagen se ha actualizado correctamente.",
          icon: "success",
          timer: 3000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error al actualizar la imagen:", error);
        Swal.fire("Error", "No se pudo actualizar la imagen.", "error");
      }
    };

    // Modal link
    const showLinkModal = ref(false);
    const editedLink = ref(props.disc.link || "");
    const updateDiscLink = async (newValue: string) => {
      try {
        await updateDisc(props.disc.id, { link: newValue });
        props.disc.link = newValue;
        Swal.fire({
          title: "¡Éxito!",
          text: "El Link del disco ha sido actualizado.",
          icon: "success",
          timer: 3000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error al actualizar el link del disco:", error);
        Swal.fire({
          title: "Error",
          text: "No se pudo actualizar el Link del disco.",
          icon: "error",
          timer: 3000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      }
    };

    // Modal nombre
    const showNameModal = ref(false);
    const editedName = ref(props.disc.name);
    const updateDiscName = async (newValue: string) => {
      try {
        await updateDisc(props.disc.id, { name: newValue });
        props.disc.name = newValue;
        Swal.fire({
          title: "¡Éxito!",
          text: "El nombre del disco se ha actualizado correctamente.",
          icon: "success",
          timer: 3000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error al actualizar el nombre del disco:", error);
        Swal.fire({
          title: "Error",
          text: "No se pudo actualizar el nombre del disco.",
          icon: "error",
          timer: 3000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      }
    };

    // Modal fecha
    const showDateModal = ref(false);
    const editedReleaseDate = ref(new Date(props.disc.releaseDate).toISOString().substr(0, 10));
    const updateDiscReleaseDate = async (newValue: string) => {
      try {
        const newDate = new Date(newValue);
        await updateDisc(props.disc.id, { releaseDate: newDate });
        props.disc.releaseDate = newDate as any;
        Swal.fire({
          title: "¡Éxito!",
          text: "La fecha del disco se ha actualizado correctamente",
          icon: "success",
          timer: 3000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error al actualizar la fecha del disco:", error);
        Swal.fire({
          title: "Error",
          text: "No se pudo actualizar la fecha del disco.",
          icon: "error",
          timer: 3000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      }
    };

    // Responsive
    const isNarrow = ref(window.innerWidth < 768);
    const updateSize = () => {
      isNarrow.value = window.innerWidth < 768;
    };

    const buscarGeneroSpotify = async (disc: any) => {
      const token = await obtenerTokenSpotify();
      if (!token) {
        console.error("No se pudo obtener el token de Spotify");
        return;
      }
      try {
        const query = encodeURIComponent(`artist:${disc.artist.name}`);
        const response = await axios.get(`https://api.spotify.com/v1/search?q=${query}&type=artist&limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.artists.items.length > 0) {
          const artist = response.data.artists.items[0];
          const artistId = artist.id;
          const albumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { include_groups: "album,single", limit: 1 },
          });
          if (albumsResponse.data.items.length > 0) {
            const genres = artist.genres;
            if (genres.length > 0) {
              disc.genero = genres.join(", ");
              Swal.fire({
                title: "¡Éxito!",
                text: `El género del último track: ${disc.genero}`,
                icon: "success",
                position: "top-end",
                timer: 6000,
                timerProgressBar: true,
                showConfirmButton: false,
                toast: true,
              });
            } else {
              Swal.fire({
                title: "Sin géneros",
                text: `No se encontraron géneros asociados al artista "${disc.artist.name}".`,
                icon: "warning",
                position: "top-end",
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false,
                toast: true,
              });
            }
          } else {
            Swal.fire({
              title: "No se encontraron lanzamientos",
              text: `No se encontraron tracks recientes para el artista "${disc.artist.name}".`,
              icon: "warning",
              position: "top-end",
              timer: 3000,
              timerProgressBar: true,
              showConfirmButton: false,
              toast: true,
            });
          }
        } else {
          Swal.fire({
            title: "Artista no encontrado",
            text: `No se encontró información para el artista "${disc.artist.name}" en Spotify.`,
            icon: "warning",
            position: "top-end",
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false,
            toast: true,
          });
        }
      } catch (error) {
        console.error("Error al buscar el género por último track:", error);
        Swal.fire({
          title: "Error",
          text: "Ocurrió un error al buscar el género del último track.",
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
    const showArtistModal = ref(false);
    const newArtistName = ref("");
    const creatingNewArtist = ref(false);
    const openArtistModal = () => {
      newArtistName.value = props.disc.artist.name;
      showArtistModal.value = true;
    };
    const closeArtistModal = () => {
      showArtistModal.value = false;
    };
    const handleArtistUpdate = async () => {
      try {
        if (creatingNewArtist.value) {
          const newArtist = await postArtist({ name: newArtistName.value });
          // actualiza artista en el disco
          props.disc.artist = newArtist as any;
          await updateDisc(props.disc.id, { artistId: newArtist.id });
          emit("artist-created", newArtist.id, newArtist.name);
          Swal.fire("¡Éxito!", "Nuevo artista creado correctamente.", "success");
        } else {
          await updateArtist(props.disc.artist.id, { name: newArtistName.value });
          props.disc.artist.name = newArtistName.value;
          emit("update-artist", props.disc.artist.id, newArtistName.value);
          Swal.fire("¡Éxito!", "El nombre del artista se ha actualizado correctamente.", "success");
        }
        closeArtistModal();
      } catch {
        Swal.fire("Error", "No se pudo completar la acción.", "error");
      }
    };

    const COUNTRY_ID = "4108d9b0-a44e-4877-a839-a5541eac852d";
    const ALT_COUNTRY_ID = "a121dfc4-7ee8-4435-ab26-1db8e4071dde";

    const updateCountryId = async () => {
      const currentId = props.disc.artist.countryId;
      const newId = currentId === COUNTRY_ID ? ALT_COUNTRY_ID : COUNTRY_ID;
      try {
        await updateArtist(props.disc.artist.id, { countryId: newId });
        props.disc.artist.countryId = newId as any;
        Swal.fire({
          title: "¡Éxito!",
          text: `El país se ha cambiado correctamente.`,
          icon: "success",
          timer: 3000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error al actualizar el país:", error);
        Swal.fire({
          title: "Error",
          text: "No se pudo actualizar el país.",
          icon: "error",
          timer: 3000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      }
    };

    const showDiscDetail = ref(false);
    const showArtistDetail = ref(false);
    const openDiscDetail = () => (showDiscDetail.value = true);
    const openArtistDetail = () => (showArtistDetail.value = true);
    const closeDiscDetail = () => (showDiscDetail.value = false);
    const closeArtistDetail = () => (showArtistDetail.value = false);

    // --- Novedad nacional ---
    const isSpanish = computed(() => {
      const country = props.countries.find(c => c.id === editedArtist.countryId);
      return country?.isoCode?.toLowerCase() === 'es';
    });

    const addingNational = ref(false);

    const addNationalRelease = async () => {
      addingNational.value = true;
      try {
        const releaseDay = new Date(props.disc.releaseDate).toISOString().split('T')[0];
        const created = await createNationalReleaseFromDisc({ discId: props.disc.id, releaseDay });
        props.disc.nationalReleaseId = created.id;
        Swal.fire({ icon: 'success', title: 'Añadido a novedades nacionales', timer: 2000, showConfirmButton: false });
      } catch (error: any) {
        Swal.fire({ icon: 'error', title: error.response?.data?.message || 'Error al añadir' });
      } finally {
        addingNational.value = false;
      }
    };

    onMounted(() => {
      window.addEventListener("resize", updateSize);
    });
    onUnmounted(() => {
      window.removeEventListener("resize", updateSize);
    });

    return {
      editedData,
      formattedDate,
      saveChanges,
      toggleEp,
      toggleVerified,
      confirmDelete,
      getGenreColor,
      linkButtonData,
      showImageModal,
      newImageUrl,
      openImageModal,
      updateImageUrl,
      isNarrow,
      buscarGeneroSpotify,
      toggleBookmark,
      pendingId,
      justAdded,
      handleListenClick,
      openArtistModal,
      handleArtistUpdate,
      closeArtistModal,
      showArtistModal,
      newArtistName,
      updateDiscLink,
      showLinkModal,
      editedLink,
      showNameModal,
      editedName,
      updateDiscName,
      showDateModal,
      editedReleaseDate,
      updateDiscReleaseDate,
      openDiscDetail,
      openArtistDetail,
      showDiscDetail,
      showArtistDetail,
      closeDiscDetail,
      closeArtistDetail,
      updateCountryId,
      COUNTRY_ID,
      saveCountry,
      editedArtist,
      creatingNewArtist,
      toggleDebut,
      isFocused,
      isSpanish,
      addingNational,
      addNationalRelease,
    };
  },
});
</script>

<style scoped>
/* Diagonal solo en sm+ (≥640px). En móvil corte recto */
@media (min-width: 640px) {
  .genre-col {
    clip-path: polygon(0 0, 100% 0, calc(100% - 20px) 100%, 0 100%);
  }
}

/* Asegura que el dropdown del SearchableSelect no quede cortado */
.searchable__select {
  position: absolute;
  z-index: 500 !important;
}
</style>
