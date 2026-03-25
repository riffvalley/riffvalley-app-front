```
<template>
  <div
    class="p-3 border rounded-2xl flex flex-col sm:flex-row items-center justify-between w-full bg-white shadow-md transition"
    :class="[
      { 'text-white': getGenreColor(disc.genreId) !== 'transparent' },
      isFocused ? 'ring-4 ring-rv-pink/70 shadow-xl scale-[1.01]' : ''
    ]" :style="{ backgroundColor: getGenreColor(disc.genreId) }">
    <!-- Columna izquierda: Imagen del disco -->
    <div class="flex items-center w-full sm:w-1/3 p-4 min-w-0">
      <button v-if="!disc.image" @click="openImageModal"
        class="bg-purple-500 hover:bg-purple-600 text-white text-xs px-2 py-1 rounded shadow-md ml-2">
        <i class="fa-solid fa-image"></i>
      </button>
      <img v-if="disc.image" :src="disc.image" alt="Disc cover" class="w-24 h-24 rounded-md cursor-pointer object-cover"
        @click="openImageModal" />
      <div class="ml-6 flex flex-col text-center sm:text-left w-full min-w-0 overflow-hidden">
        <!-- Nombre de la banda con acciones -->
        <div class="flex items-center space-x-2">
          <h3 class="font-bold text-base truncate min-w-0 overflow-hidden"
            :style="{ maxWidth: 'clamp(12ch, 65vw, 30ch)' }">
            <a @click="openArtistDetail" class="block truncate w-full cursor-pointer hover:underline">
              {{ disc.artist.name }}
            </a>
          </h3>

          <!-- Botón editar artista -->
          <button @click="openArtistModal" class="bg-white p-1 text-sm text-rv-navy hover:bg-gray-200 rounded-full"
            title="Editar artista">
            <i class="fa-solid fa-edit text-xs"></i>
          </button>

        </div>

        <!-- Nombre del disco -->
        <div class="flex items-center space-x-2">
          <a @click="openDiscDetail" class="text-sm truncate min-w-0 cursor-pointer hover:underline"
            :style="{ maxWidth: 'clamp(12ch, 65vw, 30ch)' }">
            <span class="block truncate">
              {{ disc.name }}
            </span>
          </a>
          <button @click="showNameModal = true" class="bg-white p-1 text-sm text-rv-navy hover:bg-gray-200 rounded-full"
            title="Editar nombre">
            <i class="fa-solid fa-edit text-xs"></i>
          </button>
        </div>

        <p class="text-sm mt-2 w-full flex items-center space-x-2">
          <a v-if="linkButtonData.visible" :href="disc.link" target="_blank" rel="noopener" :class="[
            linkButtonData.color,
            linkButtonData.hover,
            'text-white px-2 py-1 rounded-full shadow-md inline-flex items-center space-x-1 text-sm',
          ]" @click.prevent="handleListenClick">
            <i :class="[linkButtonData.icon, 'text-base']"></i>
            <span>{{ linkButtonData.text }}</span>
          </a>

          <span v-else-if="!disc.link" class="text-gray-400">
            <SpotifyArtistButton :artistName="disc.artist.name" />
          </span>

          <button @click="showLinkModal = true"
            class="bg-white p-1 text-sm text-rv-navy hover:bg-gray-200 rounded-full">
            <i class="fa-solid fa-link"></i>
          </button>
        </p>

        <a class="cursor-pointer mt-2" @click="showDateModal = true">
          {{ formattedDate }}
        </a>
      </div>
    </div>

    <!-- Columna derecha: Botones de acción reorganizados -->
    <div class="flex flex-col gap-2 w-full sm:w-2/3 p-2">
      <!-- Fila 1: Selects de género y país -->
      <div class="grid gap-2" :class="{ 'grid-cols-2': !isNarrow, 'grid-cols-1': isNarrow }">
        <!-- Select de género -->
        <SearchableSelect :key="`genres-${genres.length}`" v-model="editedData.genreId" :options="genres" title="name"
          trackby="id" placeholder="Buscar género..." trigger-placeholder="Selecciona un género"
          all-label="Todos los géneros" :max="200"
          class="rounded-full text-rv-navy text-sm border-rv-navy/20 shadow-lg ring-0 focus:ring-0 focus:outline-none"
          @update:modelValue="() => saveChanges('genreId')" />

        <!-- País del artista -->
        <SearchableSelect :key="`countries-${countries.length}`" v-model="editedArtist.countryId" :options="countries"
          title="name" trackby="id" placeholder="Buscar país..." trigger-placeholder="Selecciona un país"
          all-label="Todos los países" :max="300"
          class="rounded-full text-rv-navy text-sm border-rv-navy/20 shadow-lg ring-0 focus:ring-0 focus:outline-none"
          @update:modelValue="saveCountry" />
      </div>

      <!-- Fila 2: Álbum, Debut y Verificado -->
      <div class="grid grid-cols-3 gap-2">
        <button @click="toggleEp()" :class="{
          'bg-gradient-to-r from-gray-400 to-gray-400 shadow-lg hover:from-gray-500 hover:to-gray-500': disc.ep,
          'bg-gradient-to-r from-rv-purple to-rv-purple shadow-lg hover:from-rv-purple/80 hover:to-rv-purple/80': !disc.ep
        }"
          class="text-white font-bold px-3 py-2 rounded-lg shadow-md transition-all duration-200 hover:shadow-md transform hover:scale-105 text-sm">
          {{ disc.ep ? "EP" : "Álbum" }}
        </button>

        <button @click="toggleDebut()" :class="{
          'bg-gradient-to-r from-rv-purple to-rv-purple shadow-lg hover:from-rv-purple/80 hover:to-rv-purple/80': disc.debut,
          'bg-gradient-to-r from-gray-400 to-gray-400 shadow-lg hover:from-gray-500 hover:to-gray-500': !disc.debut
        }"
          class="text-white font-bold px-3 py-2 rounded-lg shadow-md transition-all duration-200 hover:shadow-md transform hover:scale-105 text-sm">
          {{ disc.debut ? "Debut" : "No Debut" }}
        </button>

        <button @click="toggleVerified()" :class="{
          'bg-gradient-to-r from-green-500 to-green-500 shadow-lg hover:from-green-600 hover:to-green-600': disc.verified,
          'bg-gradient-to-r from-gray-400 to-gray-400 shadow-lg hover:from-gray-500 hover:to-gray-500': !disc.verified
        }"
          class="text-white font-semibold px-3 py-2 rounded-lg shadow-md transition-all duration-200 hover:shadow-md transform hover:scale-105 text-sm">
          {{ disc.verified ? "✓ Verificado" : "✗ Verificado" }}
        </button>
      </div>

      <!-- Fila 3: Pendiente y Borrar -->
      <div class="grid grid-cols-2 gap-2">
        <button @click="toggleBookmark()" :class="{
          'bg-gradient-to-r from-yellow-500 to-yellow-500 shadow-lg hover:from-yellow-600 hover:to-yellow-600': pendingId,
          'bg-gradient-to-r from-gray-400 to-gray-400 shadow-lg hover:from-gray-500 hover:to-gray-500': !pendingId
        }"
          class="text-white font-semibold px-3 py-2 rounded-lg shadow-md transition-all duration-200 hover:shadow-md transform hover:scale-105 text-sm">
          {{ pendingId ? "Guardado" : "Añadir a pendientes" }}
        </button>

        <button @click="confirmDelete(disc.id)"
          class="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-3 py-2 rounded-lg shadow-md transition-all duration-200 hover:shadow-xl transform hover:scale-105 text-sm">
          Borrar
        </button>
      </div>

      <!-- Fila 4: Novedad nacional (solo si el artista es español) -->
      <div v-if="isSpanish">
        <button
          @click="addNationalRelease"
          :disabled="addingNational"
          class="w-full bg-gradient-to-r from-rv-pink to-rv-purple hover:opacity-90 disabled:opacity-50 text-white font-semibold px-3 py-2 rounded-lg shadow-md transition-all duration-200 text-sm"
        >
          {{ addingNational ? "Añadiendo..." : "🇪🇸 Añadir a novedades nacionales" }}
        </button>
      </div>
    </div>
  </div>

  <!-- Teleport para todos los modales -->
  <Teleport to="body">
    <!-- Modal para actualizar/crear artista -->
    <div v-if="showArtistModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 bg-gray-900 bg-opacity-50">
      <div class="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 class="text-lg font-semibold mb-4">Actualizar o crear Artista</h2>
        <label class="flex items-center mb-4">
          <input type="checkbox" v-model="creatingNewArtist" class="mr-2" />
          Crear nuevo artista
        </label>
        <input v-model="newArtistName" type="text" placeholder="Introduce el nombre del artista"
          class="border p-2 w-full rounded-md" />
        <div class="flex justify-end mt-4 space-x-2">
          <button @click="closeArtistModal"
            class="bg-gray-400 text-white px-4 py-2 rounded-full transition-all duration-200 hover:shadow-md transform hover:scale-105">Cancelar</button>
          <button @click="handleArtistUpdate"
            class="bg-rv-pink text-white px-4 py-2 rounded-full transition-all duration-200 hover:shadow-md transform hover:scale-105">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modales de edición -->
    <EditModal v-model:show="showNameModal" v-model="editedName" title="Editar título del álbum"
      placeholder="Introduce el nombre del disco" @save="updateDiscName" />

    <EditModal v-model:show="showLinkModal" v-model="editedLink" title="Editar link del álbum"
      placeholder="Introduce el link del disco" @save="updateDiscLink" />

    <EditModal v-model:show="showImageModal" v-model="newImageUrl" title="Cambiar portada del álbum"
      placeholder="Introduce la URL de la imagen" @save="updateImageUrl" />

    <EditModal v-model:show="showDateModal" v-model="editedReleaseDate" title="Cambiar fecha del álbum"
      placeholder="Selecciona la fecha" inputType="date" @save="updateDiscReleaseDate" />
  </Teleport>

  <!-- Modal DiscDetail -->
  <div v-if="showDiscDetail" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <div class="bg-white rounded-lg p-4 relative max-w-3xl w-full">
      <button class="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl" @click="closeDiscDetail">
        &times;
      </button>
      <DiscDetail v-if="showDiscDetail" :disc="disc" @close="showDiscDetail = false" />
    </div>
  </div>

  <!-- Modal ArtistDetail -->
  <div v-if="showArtistDetail" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <div class="bg-white rounded-lg p-4 relative max-w-3xl w-full">
      <button class="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl" @click="closeArtistDetail">
        &times;
      </button>
      <ArtistDetail v-if="showArtistDetail" :disc-name="disc.name" :artistName="disc.artist.name"
        @close="showArtistDetail = false" />
    </div>
  </div>
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
        month: "long",
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
      } catch (e) {
        console.error("No se pudo actualizar el país:", e);
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

        Swal.fire({
          title: "¡Éxito!",
          text: `El ${field} del disco se ha actualizado correctamente.`,
          icon: "success",
          timer: 3000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      } catch (error) {
        console.error(`Error al actualizar ${field}:`, error);
        Swal.fire({
          title: "Error",
          text: `No se pudo actualizar el ${field}.`,
          icon: "error",
          timer: 3000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
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
      return country?.isoCode === 'ES';
    });

    const addingNational = ref(false);

    const addNationalRelease = async () => {
      addingNational.value = true;
      try {
        const releaseDay = new Date(props.disc.releaseDate).toISOString().split('T')[0];
        await createNationalReleaseFromDisc({ discId: props.disc.id, releaseDay });
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
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  position: relative;
  z-index: 10000 !important;
  background: white;
  padding: 20px;
  border-radius: 8px;
  z-index: 1100 !important;
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
  margin-top: 0.25rem;
}

body {
  position: relative;
  overflow: visible !important;
}
</style>
