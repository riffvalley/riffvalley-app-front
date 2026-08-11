<template>
  <div
    class="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-rv-darkCard"
  >
    <header
      class="flex items-center justify-between gap-4 border-b border-gray-200 p-5 dark:border-white/10"
    >
      <div>
        <p
          class="text-xs font-semibold uppercase tracking-widest text-[#1DB954]"
        >
          Playlist de género sincronizada
        </p>
        <h2 class="mt-1 text-xl font-bold text-gray-900 dark:text-white">
          {{ detail?.name || playlistName }}
        </h2>
      </div>
      <button
        class="grid h-9 w-9 shrink-0 place-items-center rounded-full !bg-transparent p-0 text-gray-500 hover:!bg-gray-100 dark:text-gray-300 dark:hover:!bg-white/10"
        aria-label="Cerrar"
        @click="$emit('close')"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </header>

    <div v-if="loading" class="grid min-h-80 place-items-center text-gray-500">
      Cargando playlist…
    </div>
    <div v-else-if="detail" class="overflow-y-auto p-5 md:p-6">
      <div class="grid items-start gap-6 lg:grid-cols-2">
        <div class="space-y-6">
          <section
            class="rounded-xl border border-gray-200 p-4 dark:border-white/10"
          >
            <div class="mb-4 flex items-center justify-between gap-3">
              <h3 class="font-bold text-gray-900 dark:text-white">
                Información y portada
              </h3>
              <a
                :href="detail.link"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm font-semibold text-[#1DB954] hover:underline"
                >Abrir en Spotify
                <i
                  class="fa-solid fa-arrow-up-right-from-square ml-1 text-xs"
                ></i
              ></a>
            </div>
            <div class="grid gap-4 sm:grid-cols-[150px_1fr]">
              <div>
                <img
                  :src="imagePreview || detail.imageUrl || fallbackImage"
                  alt="Portada"
                  class="aspect-square w-full rounded-xl bg-gray-100 object-cover dark:bg-rv-darkSurface"
                />
                <label class="mt-3 block">
                  <span class="sr-only">Seleccionar portada JPEG</span>
                  <input
                    type="file"
                    accept="image/jpeg"
                    class="block w-full text-xs text-gray-500 file:mr-2 file:rounded-md file:border-0 file:bg-gray-100 file:px-2 file:py-2 file:text-xs file:font-semibold dark:file:bg-white/10 dark:file:text-gray-200"
                    :disabled="!connection.canUploadImages || savingImage"
                    @change="selectImage"
                  />
                </label>
                <p
                  class="mt-2 text-[11px] leading-4 text-gray-500 dark:text-gray-400"
                >
                  JPEG cuadrado. Máximo 256 KB codificado.
                </p>
                <button
                  v-if="selectedImage"
                  class="mt-2 w-full rounded-lg bg-rv-pink px-3 py-2 text-xs font-semibold text-white hover:bg-rv-purple disabled:opacity-50"
                  :disabled="savingImage"
                  @click="uploadImage"
                >
                  {{ savingImage ? "Subiendo…" : "Subir portada" }}
                </button>
                <button
                  v-if="!connection.canUploadImages"
                  class="mt-2 !bg-transparent p-0 text-left text-xs font-semibold text-rv-purple hover:underline"
                  @click="$emit('renew')"
                >
                  Renovar permisos de Spotify
                </button>
              </div>
              <form class="space-y-3" @submit.prevent="saveDetails">
                <div>
                  <label
                    class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >Nombre</label
                  >
                  <input
                    v-model="editForm.name"
                    maxlength="100"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
                  />
                </div>
                <div>
                  <label
                    class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >Descripción</label
                  >
                  <textarea
                    v-model="editForm.description"
                    maxlength="300"
                    rows="4"
                    class="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
                  ></textarea>
                  <p class="text-right text-xs text-gray-400">
                    {{ editForm.description.length }}/300
                  </p>
                </div>
                <label
                  class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  ><input
                    v-model="editForm.isPublic"
                    type="checkbox"
                    class="h-4 w-4 rounded"
                  />
                  Playlist pública</label
                >
                <button
                  type="submit"
                  class="rounded-lg bg-rv-pink px-4 py-2 text-sm font-semibold text-white hover:bg-rv-purple disabled:opacity-50"
                  :disabled="savingDetails || !editForm.name.trim()"
                >
                  {{ savingDetails ? "Guardando…" : "Guardar cambios" }}
                </button>
              </form>
            </div>
          </section>

          <section
            class="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20"
          >
            <h3 class="font-bold text-red-800 dark:text-red-300">
              Zona peligrosa
            </h3>
            <div
              class="mt-4 rounded-xl border border-red-200 bg-white/70 p-3 dark:border-red-900 dark:bg-rv-darkSurface"
            >
              <p class="text-sm font-bold text-gray-900 dark:text-white">
                Vaciar canciones de Spotify
              </p>
              <p
                class="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300"
              >
                Elimina todas las canciones reales y asociaciones, conservando
                la playlist y sus metadatos.
              </p>
              <button
                class="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                :disabled="clearing || deleting"
                @click="clearPlaylist"
              >
                {{ clearing ? "Vaciando…" : "Vaciar canciones" }}
              </button>
            </div>
            <div
              class="mt-4 rounded-xl border border-red-200 bg-white/70 p-3 dark:border-red-900 dark:bg-rv-darkSurface"
            >
              <p class="text-sm font-bold text-gray-900 dark:text-white">
                Eliminar playlist de Riff Valley
              </p>
              <p
                class="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300"
              >
                Elimina el registro local. La playlist real seguirá existiendo
                en Spotify.
              </p>
              <button
                class="mt-3 rounded-lg border-2 border-red-600 !bg-transparent px-4 py-2 text-sm font-bold text-red-700 hover:!bg-red-600 hover:text-white dark:text-red-300"
                :disabled="deleting || clearing"
                @click="deletePlaylist"
              >
                {{ deleting ? "Eliminando…" : "Eliminar playlist" }}
              </button>
            </div>
          </section>
        </div>

        <div class="space-y-6">
          <section
            class="rounded-xl border border-gray-200 bg-white p-4 text-gray-900 dark:border-white/10 dark:bg-rv-darkCard dark:text-white"
          >
            <h3 class="font-bold text-gray-900 dark:text-white">
              Añadir artistas
            </h3>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-300">
              Selecciona un artista y después exactamente dos canciones de
              Spotify.
            </p>
            <input
              v-model="artistQuery"
              type="search"
              placeholder="Buscar artista interno…"
              class="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
              :disabled="savingSelection"
            />
            <div
              v-if="artistResults.length"
              class="mt-3 max-h-48 space-y-2 overflow-y-auto"
            >
              <button
                v-for="artist in artistResults"
                :key="artist.id"
                class="flex w-full items-center gap-3 rounded-xl border border-gray-200 !bg-white p-2.5 text-left hover:!bg-gray-50 dark:border-white/10 dark:!bg-rv-darkCard dark:hover:!bg-rv-darkBg"
                @click="chooseArtist(artist)"
              >
                <img
                  :src="artist.image || fallbackArtist"
                  class="h-10 w-10 rounded-lg object-cover"
                  alt=""
                />
                <span
                  class="min-w-0 flex-1 truncate text-sm font-bold text-gray-900 dark:text-white"
                  >{{ artist.name }}</span
                >
                <span
                  v-if="isArtistPresent(artist.id)"
                  class="text-xs font-semibold text-green-500"
                  >Añadido</span
                >
              </button>
            </div>
            <div
              v-if="canCreateArtist"
              class="mt-3 rounded-xl border border-dashed border-rv-purple/60 bg-rv-purple/10 p-3"
            >
              <p class="text-xs text-gray-600 dark:text-gray-300">
                No existe una coincidencia exacta en Riff Valley.
              </p>
              <button
                class="mt-2 w-full bg-rv-pink px-3 py-2 text-sm font-bold text-white hover:bg-rv-purple"
                :disabled="creatingArtist"
                @click="createArtist"
              >
                {{
                  creatingArtist
                    ? "Creando…"
                    : `Crear artista “${artistQuery.trim()}”`
                }}
              </button>
            </div>

            <div
              v-if="selectedArtist"
              class="mt-5 border-t border-gray-200 pt-5 dark:border-white/10"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-bold text-gray-900 dark:text-white">
                    Canciones de {{ selectedArtist.name }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-300">
                    {{ selectedTrackIds.length }}/2 seleccionadas
                  </p>
                </div>
                <button
                  class="!bg-transparent p-1 text-xs text-gray-500 hover:text-rv-pink"
                  @click="cancelSelection"
                >
                  Cancelar
                </button>
              </div>
              <form class="mt-3 flex gap-2" @submit.prevent="loadTracks">
                <input
                  v-model="trackQuery"
                  placeholder="Buscar una canción…"
                  class="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
                />
                <button
                  class="rounded-lg bg-rv-purple px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  :disabled="loadingTracks"
                >
                  Buscar
                </button>
              </form>
              <p
                v-if="loadingTracks"
                class="py-5 text-center text-sm text-gray-500 dark:text-gray-300"
              >
                Buscando en Spotify…
              </p>
              <div v-else class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                <button
                  v-for="track in trackCandidates"
                  :key="track.spotifyTrackId"
                  class="flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors"
                  :class="
                    isTrackSelected(track.spotifyTrackId)
                      ? 'border-rv-pink !bg-rv-pink/10'
                      : 'border-gray-200 !bg-white hover:!bg-gray-50 dark:border-white/10 dark:!bg-rv-darkCard dark:hover:!bg-rv-darkBg'
                  "
                  @click="toggleTrack(track)"
                >
                  <img
                    :src="track.imageUrl || fallbackImage"
                    class="h-12 w-12 shrink-0 rounded-lg object-cover"
                    alt=""
                  />
                  <span class="min-w-0 flex-1">
                    <span
                      class="block truncate text-sm font-bold text-gray-900 dark:text-white"
                      >{{ track.name }}</span
                    >
                    <span
                      class="block truncate text-xs text-gray-500 dark:text-gray-300"
                      >{{ track.artists.map((a) => a.name).join(", ")
                      }}<template v-if="track.album">
                        · {{ track.album }}</template
                      ></span
                    >
                  </span>
                  <span
                    v-if="track.durationMs"
                    class="shrink-0 text-xs text-gray-400"
                    >{{ formatDuration(track.durationMs) }}</span
                  >
                  <i
                    class="fa-solid"
                    :class="
                      isTrackSelected(track.spotifyTrackId)
                        ? 'fa-circle-check text-rv-pink'
                        : 'fa-circle text-gray-300 dark:text-gray-500'
                    "
                  ></i>
                </button>
              </div>
              <button
                class="mt-4 w-full rounded-lg bg-rv-pink px-4 py-2 text-sm font-bold text-white hover:bg-rv-purple disabled:opacity-50"
                :disabled="selectedTrackIds.length !== 2 || savingSelection"
                @click="saveSelection"
              >
                {{
                  savingSelection
                    ? "Sincronizando…"
                    : editingAssociation
                      ? "Guardar nuevas canciones"
                      : "Añadir artista y canciones"
                }}
              </button>
            </div>
          </section>

          <section
            class="rounded-xl border border-gray-200 bg-white p-4 text-gray-900 dark:border-white/10 dark:bg-rv-darkCard dark:text-white"
          >
            <div class="mb-4 flex items-center justify-between">
              <h3 class="font-bold text-gray-900 dark:text-white">
                Artistas sincronizados
              </h3>
              <span
                class="rounded-full bg-gray-100 px-2.5 py-1 text-xs dark:bg-white/10 dark:text-gray-300"
                >{{ detail.playlistArtists.length }}</span
              >
            </div>
            <p
              v-if="!detail.playlistArtists.length"
              class="py-5 text-center text-sm text-gray-500 dark:text-gray-300"
            >
              Todavía no hay artistas.
            </p>
            <article
              v-for="entry in detail.playlistArtists"
              :key="entry.id"
              class="mb-3 rounded-xl border border-gray-200 bg-white p-3 last:mb-0 dark:border-white/10 dark:bg-rv-darkCard"
            >
              <div class="flex items-center gap-3">
                <img
                  :src="entry.artist.image || fallbackArtist"
                  class="h-11 w-11 rounded-lg object-cover"
                  alt=""
                />
                <div class="min-w-0 flex-1">
                  <p
                    class="truncate text-sm font-bold text-gray-900 dark:text-white"
                  >
                    {{ entry.artist.name }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-300">
                    {{ entry.tracks.length }} canciones
                  </p>
                </div>
                <button
                  class="grid h-8 w-8 place-items-center !bg-blue-50 p-0 text-blue-600 dark:!bg-blue-900/20 dark:text-blue-300"
                  title="Cambiar canciones"
                  @click="editArtist(entry)"
                >
                  <i class="fa-solid fa-pen text-xs"></i>
                </button>
                <button
                  class="grid h-8 w-8 place-items-center !bg-red-50 p-0 text-red-600 dark:!bg-red-900/20 dark:text-red-300"
                  title="Eliminar artista"
                  @click="removeArtist(entry)"
                >
                  <i class="fa-solid fa-trash text-xs"></i>
                </button>
              </div>
              <div
                class="mt-3 space-y-1 border-t border-gray-100 pt-2 dark:border-white/10"
              >
                <a
                  v-for="track in entry.tracks"
                  :key="track.spotifyTrackId"
                  :href="track.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs !text-gray-700 hover:bg-gray-100 dark:!text-gray-200 dark:hover:bg-white/10"
                  ><i class="fa-brands fa-spotify text-[#1DB954]"></i
                  ><span class="truncate">{{ track.name }}</span></a
                >
              </div>
            </article>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import SwalService from "@services/swal/SwalService";
import { removeSpotify } from "@services/spotify/spotify";
import {
  createPendingFestivalArtist,
  searchFestivalArtists,
  validatePlaylistImage,
  type FestivalArtist,
  type PlaylistArtist,
  type SpotifyConnection,
} from "@services/spotify/festivalPlaylists";
import {
  addGenreArtist,
  clearGenrePlaylist,
  getGenrePlaylist,
  removeGenreArtist,
  replaceGenreArtistTracks,
  searchGenreArtistTracks,
  updateGenrePlaylist,
  updateGenrePlaylistImage,
  type SpotifyTrackCandidate,
  type SyncedGenrePlaylist,
} from "@services/spotify/genrePlaylists";

const props = defineProps<{
  playlistId: string;
  playlistName: string;
  connection: SpotifyConnection;
}>();
const emit = defineEmits<{
  close: [];
  renew: [];
  updated: [playlist: SyncedGenrePlaylist];
  deleted: [playlistId: string];
}>();
const fallbackImage = "/LOGO-RIFF-VALLEY.svg";
const fallbackArtist = "/LOGO-RIFF-VALLEY.svg";
const detail = ref<SyncedGenrePlaylist | null>(null);
const loading = ref(true);
const savingDetails = ref(false);
const savingImage = ref(false);
const selectedImage = ref<File | null>(null);
const imagePreview = ref<string | null>(null);
const clearing = ref(false);
const deleting = ref(false);
const artistQuery = ref("");
const artistResults = ref<FestivalArtist[]>([]);
const searchingArtists = ref(false);
const creatingArtist = ref(false);
const selectedArtist = ref<FestivalArtist | null>(null);
const editingAssociation = ref<PlaylistArtist | null>(null);
const trackQuery = ref("");
const trackCandidates = ref<SpotifyTrackCandidate[]>([]);
const selectedTrackIds = ref<string[]>([]);
const loadingTracks = ref(false);
const savingSelection = ref(false);
const editForm = reactive({ name: "", description: "", isPublic: false });
let artistTimer: ReturnType<typeof setTimeout> | null = null;

const hasExactArtist = computed(() =>
  artistResults.value.some(
    (artist) =>
      artist.name.localeCompare(artistQuery.value.trim(), undefined, {
        sensitivity: "base",
      }) === 0,
  ),
);
const canCreateArtist = computed(
  () =>
    artistQuery.value.trim().length >= 2 &&
    !searchingArtists.value &&
    !hasExactArtist.value,
);
function errorMessage(error: unknown, fallback: string) {
  return axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || fallback
    : fallback;
}
function applyDetail(value: SyncedGenrePlaylist) {
  detail.value = value;
  editForm.name = value.name;
  editForm.description = value.description ?? "";
  editForm.isPublic = value.isPublic;
  emit("updated", value);
}
async function loadDetail() {
  loading.value = true;
  try {
    applyDetail(await getGenrePlaylist(props.playlistId));
  } catch (error) {
    SwalService.error(errorMessage(error, "No se pudo cargar la playlist"));
    emit("close");
  } finally {
    loading.value = false;
  }
}

watch(artistQuery, (query) => {
  if (artistTimer) clearTimeout(artistTimer);
  artistResults.value = [];
  if (query.trim().length < 2) return;
  searchingArtists.value = true;
  artistTimer = setTimeout(async () => {
    try {
      artistResults.value = (
        await searchFestivalArtists(query.trim(), 15, 0)
      ).data;
    } catch (error) {
      SwalService.error(errorMessage(error, "No se pudieron buscar artistas"));
    } finally {
      searchingArtists.value = false;
    }
  }, 300);
});

function isArtistPresent(id: string) {
  return (
    detail.value?.playlistArtists.some((entry) => entry.artistId === id) ??
    false
  );
}
async function chooseArtist(artist: FestivalArtist) {
  const existing = detail.value?.playlistArtists.find(
    (entry) => entry.artistId === artist.id,
  );
  if (existing) return editArtist(existing);
  selectedArtist.value = artist;
  editingAssociation.value = null;
  selectedTrackIds.value = [];
  trackQuery.value = "";
  await loadTracks();
}
async function createArtist() {
  if (!canCreateArtist.value) return;
  creatingArtist.value = true;
  try {
    const artist = await createPendingFestivalArtist(artistQuery.value.trim());
    artistResults.value.unshift(artist);
    await chooseArtist(artist);
  } catch (error) {
    SwalService.error(errorMessage(error, "No se pudo crear el artista"));
  } finally {
    creatingArtist.value = false;
  }
}
async function loadTracks() {
  if (!selectedArtist.value || loadingTracks.value) return;
  loadingTracks.value = true;
  try {
    const response = await searchGenreArtistTracks(
      props.playlistId,
      selectedArtist.value.id,
      trackQuery.value,
    );
    const saved =
      editingAssociation.value?.tracks.map((track) => ({
        ...track,
        artists: track.artists ?? [
          { id: "", name: selectedArtist.value!.name },
        ],
      })) ?? [];
    trackCandidates.value = [...saved, ...response.tracks].filter(
      (track, index, all) =>
        all.findIndex(
          (item) => item.spotifyTrackId === track.spotifyTrackId,
        ) === index,
    ) as SpotifyTrackCandidate[];
  } catch (error) {
    SwalService.error(
      errorMessage(error, "No se pudieron buscar canciones en Spotify"),
    );
  } finally {
    loadingTracks.value = false;
  }
}
function isTrackSelected(id: string) {
  return selectedTrackIds.value.includes(id);
}
function formatDuration(durationMs: number) {
  const seconds = Math.floor(durationMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function toggleTrack(track: SpotifyTrackCandidate) {
  if (isTrackSelected(track.spotifyTrackId))
    selectedTrackIds.value = selectedTrackIds.value.filter(
      (id) => id !== track.spotifyTrackId,
    );
  else if (selectedTrackIds.value.length < 2)
    selectedTrackIds.value.push(track.spotifyTrackId);
  else SwalService.error("Sólo puedes seleccionar dos canciones");
}
function cancelSelection() {
  selectedArtist.value = null;
  editingAssociation.value = null;
  selectedTrackIds.value = [];
  trackCandidates.value = [];
  trackQuery.value = "";
}
async function editArtist(entry: PlaylistArtist) {
  selectedArtist.value = entry.artist;
  editingAssociation.value = entry;
  selectedTrackIds.value = entry.tracks.map((track) => track.spotifyTrackId);
  trackQuery.value = "";
  trackCandidates.value = entry.tracks.map((track) => ({
    ...track,
    artists: track.artists ?? [{ id: "", name: entry.artist.name }],
  })) as SpotifyTrackCandidate[];
  await loadTracks();
}
async function saveSelection() {
  if (
    !detail.value ||
    !selectedArtist.value ||
    selectedTrackIds.value.length !== 2
  )
    return;
  savingSelection.value = true;
  try {
    const updated = editingAssociation.value
      ? await replaceGenreArtistTracks(
          detail.value.id,
          selectedArtist.value.id,
          selectedTrackIds.value,
        )
      : await addGenreArtist(
          detail.value.id,
          selectedArtist.value.id,
          selectedTrackIds.value,
        );
    applyDetail(updated);
    cancelSelection();
    artistQuery.value = "";
    artistResults.value = [];
    SwalService.success("Artista y canciones sincronizados");
  } catch (error) {
    SwalService.error(
      errorMessage(error, "No se pudieron sincronizar las canciones"),
    );
  } finally {
    savingSelection.value = false;
  }
}
async function removeArtist(entry: PlaylistArtist) {
  if (!detail.value) return;
  const result = await SwalService.confirm(
    "¿Eliminar artista?",
    `Se eliminarán de Spotify las canciones seleccionadas de ${entry.artist.name}, salvo que estén protegidas o compartidas.`,
    "Sí, eliminar",
    "Cancelar",
  );
  if (!result.isConfirmed) return;
  try {
    applyDetail(await removeGenreArtist(detail.value.id, entry.artistId));
    if (editingAssociation.value?.id === entry.id) cancelSelection();
    SwalService.success("Artista eliminado");
  } catch (error) {
    SwalService.error(errorMessage(error, "No se pudo eliminar el artista"));
  }
}
async function saveDetails() {
  if (!detail.value || !editForm.name.trim()) return;
  savingDetails.value = true;
  try {
    applyDetail(
      await updateGenrePlaylist(detail.value.id, {
        name: editForm.name.trim(),
        description: editForm.description,
        public: editForm.isPublic,
      }),
    );
    SwalService.success("Playlist actualizada");
  } catch (error) {
    SwalService.error(errorMessage(error, "No se pudo actualizar"));
  } finally {
    savingDetails.value = false;
  }
}
function clearPreview() {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  imagePreview.value = null;
}
function selectImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  selectedImage.value = null;
  clearPreview();
  if (!file) return;
  const error = validatePlaylistImage(file);
  if (error) {
    input.value = "";
    return SwalService.error(error);
  }
  selectedImage.value = file;
  imagePreview.value = URL.createObjectURL(file);
}
async function uploadImage() {
  if (!detail.value || !selectedImage.value) return;
  savingImage.value = true;
  try {
    applyDetail(
      await updateGenrePlaylistImage(detail.value.id, selectedImage.value),
    );
    selectedImage.value = null;
    clearPreview();
    SwalService.success("Portada actualizada");
  } catch (error) {
    SwalService.error(errorMessage(error, "No se pudo actualizar la portada"));
  } finally {
    savingImage.value = false;
  }
}
async function clearPlaylist() {
  if (!detail.value) return;
  const result = await SwalService.confirm(
    "¿Vaciar completamente la playlist?",
    "Se eliminarán todas las canciones reales y asociaciones de artistas.",
    "Sí, vaciar",
    "Cancelar",
  );
  if (!result.isConfirmed) return;
  clearing.value = true;
  try {
    applyDetail(await clearGenrePlaylist(detail.value.id));
    cancelSelection();
    SwalService.success("Playlist vaciada");
  } catch (error) {
    SwalService.error(errorMessage(error, "No se pudo vaciar"));
  } finally {
    clearing.value = false;
  }
}
async function deletePlaylist() {
  if (!detail.value) return;
  const id = detail.value.id;
  const result = await SwalService.confirm(
    "¿Eliminar playlist de Riff Valley?",
    "La playlist real seguirá existiendo en Spotify.",
    "Sí, eliminar",
    "Cancelar",
  );
  if (!result.isConfirmed) return;
  deleting.value = true;
  try {
    await removeSpotify(id);
    emit("deleted", id);
    emit("close");
    SwalService.success("Playlist eliminada de Riff Valley");
  } catch (error) {
    SwalService.error(errorMessage(error, "No se pudo eliminar"));
  } finally {
    deleting.value = false;
  }
}

onMounted(loadDetail);
onBeforeUnmount(() => {
  if (artistTimer) clearTimeout(artistTimer);
  clearPreview();
});
</script>
