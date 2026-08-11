<template>
  <div class="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-rv-darkCard">
    <header class="flex items-center justify-between gap-4 border-b border-gray-200 p-5 dark:border-white/10">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-[#1DB954]">Playlist sincronizada</p>
        <h2 class="mt-1 text-xl font-bold text-gray-900 dark:text-white">{{ detail?.name || playlistName }}</h2>
      </div>
      <button class="grid h-9 w-9 shrink-0 place-items-center rounded-full p-0 leading-none text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Cerrar" @click="$emit('close')">
        <i class="fa-solid fa-xmark block leading-none" aria-hidden="true"></i>
      </button>
    </header>

    <div v-if="loading" class="grid min-h-80 place-items-center text-gray-500">Cargando playlist…</div>
    <div v-else-if="detail" class="overflow-y-auto p-5 md:p-6">
      <div v-if="!canManage" class="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
        Puedes consultar la playlist, pero tu rol no permite modificarla.
      </div>

      <div class="grid items-start gap-6 lg:grid-cols-2">
        <div class="space-y-6">
          <section class="rounded-xl border border-gray-200 p-4 dark:border-white/10">
            <div class="mb-4 flex items-center justify-between gap-3">
              <h3 class="font-bold text-gray-900 dark:text-white">Información y portada</h3>
              <a :href="detail.link" target="_blank" rel="noopener noreferrer" class="text-sm font-semibold text-[#1DB954] hover:underline">
                Abrir en Spotify <i class="fa-solid fa-arrow-up-right-from-square ml-1 text-xs"></i>
              </a>
            </div>

            <div class="grid gap-4 sm:grid-cols-[150px_1fr]">
              <div>
                <img :src="imagePreview || detail.imageUrl || fallbackImage" alt="Portada de la playlist" class="aspect-square w-full rounded-xl bg-gray-100 object-cover dark:bg-rv-darkSurface" />
                <label v-if="canManage" class="mt-3 block">
                  <span class="sr-only">Seleccionar portada JPEG</span>
                  <input type="file" accept="image/jpeg" class="block w-full text-xs text-gray-500 file:mr-2 file:rounded-md file:border-0 file:bg-gray-100 file:px-2 file:py-2 file:text-xs file:font-semibold dark:file:bg-white/10 dark:file:text-gray-200" :disabled="!connection.canUploadImages || savingImage" @change="selectImage" />
                </label>
                <p class="mt-2 text-[11px] leading-4 text-gray-500">JPEG cuadrado. Máximo 256 KB una vez codificado.</p>
                <button v-if="selectedImage" class="mt-2 w-full rounded-lg bg-rv-pink px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-rv-purple disabled:opacity-50" :disabled="savingImage" @click="uploadImage">
                  {{ savingImage ? 'Subiendo…' : 'Subir portada' }}
                </button>
                <button v-if="canManage && !connection.canUploadImages" class="mt-2 text-left text-xs font-semibold text-rv-purple hover:underline" @click="$emit('renew')">Renovar permisos de Spotify</button>
              </div>

              <form class="space-y-3" @submit.prevent="saveDetails">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                  <input v-model="editForm.name" maxlength="100" :disabled="!canManage" class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white disabled:opacity-60" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                  <textarea v-model="editForm.description" maxlength="300" rows="4" :disabled="!canManage" class="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white disabled:opacity-60"></textarea>
                  <p class="text-right text-xs text-gray-400">{{ editForm.description.length }}/300</p>
                </div>
                <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input v-model="editForm.isPublic" type="checkbox" :disabled="!canManage" class="h-4 w-4 rounded" /> Playlist pública
                </label>
                <button v-if="canManage" type="submit" class="rounded-lg bg-rv-pink px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rv-purple disabled:opacity-50" :disabled="savingDetails || !editForm.name.trim()">
                  {{ savingDetails ? 'Guardando…' : 'Guardar cambios' }}
                </button>
              </form>
            </div>
          </section>

          <section v-if="canManage" class="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
            <h3 class="font-bold text-red-800 dark:text-red-300">Zona peligrosa</h3>
            <div class="mt-4 rounded-xl border border-red-200 bg-white/70 p-3 dark:border-red-900 dark:bg-rv-darkSurface">
              <p class="text-sm font-bold text-gray-900 dark:text-white">Vaciar canciones de Spotify</p>
              <p class="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">Conserva la playlist, su portada y sus metadatos, pero elimina todas sus canciones reales de Spotify y las asociaciones de artistas.</p>
              <button class="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-60" :disabled="clearingPlaylist || deletingPlaylist" @click="requestClearPlaylist">
                {{ clearingPlaylist ? 'Vaciando playlist…' : 'Vaciar canciones de Spotify' }}
              </button>
            </div>
            <div class="mt-4 rounded-xl border border-red-300 bg-white/70 p-3 dark:border-red-800 dark:bg-rv-darkSurface">
              <p class="text-sm font-bold text-gray-900 dark:text-white">Eliminar playlist de Riff Valley</p>
              <p class="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">Elimina el registro local y sus datos de sincronización. La playlist real y sus canciones seguirán existiendo en Spotify.</p>
              <button class="mt-3 rounded-lg border-2 border-red-600 bg-transparent px-4 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-600 hover:text-white disabled:cursor-wait disabled:opacity-60 dark:text-red-300" :disabled="deletingPlaylist || clearingPlaylist" @click="openDeleteConfirmation">
                {{ deletingPlaylist ? 'Eliminando…' : 'Eliminar playlist' }}
              </button>
            </div>
          </section>
        </div>

        <div class="space-y-6">
          <section class="spotify-artists-section rounded-xl border border-gray-200 p-4 dark:border-white/10">
            <h3 class="spotify-artists-title font-bold">Añadir artistas</h3>
            <p class="mt-1 text-xs text-gray-500">La selección de temas se calcula con datos de setlist.fm y se sincroniza después con Spotify.</p>
            <input v-model="artistQuery" type="search" placeholder="Buscar artista interno…" :disabled="!canManage || syncingArtistId !== null || creatingArtist" class="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/20 dark:bg-rv-darkSurface dark:text-white disabled:opacity-60" />
            <p v-if="searching" class="py-4 text-center text-sm text-gray-500">Buscando…</p>
            <p v-else-if="artistQuery.trim().length >= 2 && searchResults.length === 0" class="py-4 text-center text-sm text-gray-500">No se encontraron artistas.</p>
            <div v-if="canCreateSearchedArtist" class="mt-3 rounded-xl border border-dashed border-rv-purple/60 bg-rv-purple/10 p-3">
              <p class="text-xs leading-5 text-gray-600 dark:text-gray-300">No hay una coincidencia exacta. Se creará como pendiente de completar imagen, país y descripción.</p>
              <button class="mt-2 w-full rounded-lg bg-rv-pink px-3 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rv-purple disabled:cursor-wait disabled:opacity-60" :disabled="creatingArtist || syncingArtistId !== null" @click="createAndAddArtist">
                {{ creatingArtist ? 'Creando y sincronizando artista…' : `Crear artista “${artistQuery.trim()}”` }}
              </button>
            </div>
            <div class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              <div v-for="artist in searchResults" :key="artist.id" class="rounded-xl border border-gray-200 bg-gray-50 p-3 shadow-sm dark:border-white/10 dark:bg-rv-darkSurface">
                <div class="flex items-center gap-2">
                  <img :src="artist.image || fallbackArtist" class="h-11 w-11 shrink-0 rounded-lg bg-gray-100 object-cover ring-1 ring-black/10 dark:ring-white/15" :alt="`Imagen de ${artist.name}`" />
                  <span class="min-w-0 flex-1">
                    <span class="spotify-artists-title block truncate text-sm font-bold">{{ artist.name }}</span>
                    <span v-if="artist.description" class="mt-0.5 block truncate text-xs !text-gray-500 dark:!text-gray-300">{{ artist.description }}</span>
                  </span>
                  <span v-if="isArtistPresent(artist.id)" class="text-xs font-semibold !text-green-400">Añadido</span>
                  <button v-else class="rounded-md bg-rv-pink px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-rv-purple disabled:opacity-50" :disabled="!canManage || syncingArtistId !== null || creatingArtist" @click="addArtist(artist.id)">
                    {{ syncingArtistId === artist.id ? 'Sincronizando artista…' : 'Añadir' }}
                  </button>
                </div>
                <button class="mt-2 text-xs font-semibold !text-pink-300 hover:underline" :disabled="previewLoadingId === artist.id" @click="loadPreview(artist)">
                  {{ previewLoadingId === artist.id ? 'Calculando…' : 'Ver canciones probables' }}
                </button>
                <div v-if="previewArtistId === artist.id && preview" class="mt-2 rounded-md bg-white p-2 text-xs !text-gray-700 dark:bg-rv-darkBg dark:!text-gray-200">
                  <p class="mb-1 font-semibold">{{ preview.setlistsAnalyzed }} setlists analizados</p>
                  <ol class="list-inside list-decimal space-y-1">
                    <li v-for="song in preview.songs" :key="song.name">{{ song.name }} · {{ song.plays }}</li>
                  </ol>
                  <div v-if="preview.sources.length" class="mt-2 flex flex-wrap gap-2">
                    <a v-for="source in preview.sources" :key="source" :href="source" target="_blank" rel="noopener noreferrer" class="text-rv-purple hover:underline">Fuente</a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="spotify-artists-section rounded-xl border border-gray-200 p-4 dark:border-white/10">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="spotify-artists-title font-bold">Artistas sincronizados</h3>
              <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs dark:bg-white/10 dark:text-gray-300">{{ detail.playlistArtists.length }}</span>
            </div>
            <p v-if="detail.playlistArtists.length === 0" class="py-5 text-center text-sm text-gray-500">Todavía no hay artistas en esta playlist.</p>
            <div v-for="entry in detail.playlistArtists" :key="entry.id" class="mb-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm last:mb-0 dark:border-white/10 dark:bg-rv-darkSurface">
              <button class="spotify-artist-row flex w-full items-center gap-3 p-3.5 text-left transition-colors" @click="toggleArtist(entry.id)">
                <img :src="entry.artist.image || fallbackArtist" class="h-12 w-12 shrink-0 rounded-lg bg-gray-100 object-cover ring-1 ring-black/10 dark:ring-white/15" :alt="`Imagen de ${entry.artist.name}`" />
                <span class="min-w-0 flex-1">
                  <span class="spotify-artists-title block truncate text-[15px] font-bold leading-5">{{ entry.artist.name }}</span>
                  <span class="mt-0.5 block text-xs !text-gray-500 dark:!text-gray-300">{{ entry.tracks.length }} canciones · {{ entry.setlistsAnalyzed }} setlists analizados</span>
                </span>
                <span class="rounded-full px-2 py-1 text-[11px] font-bold" :class="statusClass(entry.status)">{{ statusLabel(entry.status) }}</span>
                <i class="fa-solid fa-chevron-down text-xs text-gray-400 transition-transform" :class="{ 'rotate-180': expandedArtists.has(entry.id) }"></i>
              </button>
              <div v-if="expandedArtists.has(entry.id)" class="border-t border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-rv-darkBg">
                <p v-if="entry.status === 'failed' && entry.lastError" class="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">{{ entry.lastError }}</p>
                <div v-if="entry.tracks.length" class="space-y-1">
                  <a v-for="track in entry.tracks" :key="track.spotifyTrackId" :href="track.url" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm !text-rv-navy hover:bg-gray-100 dark:!text-white dark:hover:bg-white/10">
                    <span class="truncate !text-rv-navy dark:!text-white">{{ track.name }}</span>
                    <span class="shrink-0 text-xs !text-gray-500 dark:!text-gray-300">{{ track.plays }} apariciones <i class="fa-brands fa-spotify ml-1 text-[#1DB954]"></i></span>
                  </a>
                </div>
                <div v-if="canManage" class="mt-3 flex justify-end gap-2">
                  <button v-if="entry.status === 'failed'" class="rounded-md bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50" :disabled="syncingArtistId !== null" @click="addArtist(entry.artistId)">Reintentar</button>
                  <button class="rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50 dark:bg-red-950/30 dark:text-red-300" :disabled="syncingArtistId !== null" @click="removeArtist(entry)">Eliminar artista</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div v-if="showClearConfirmation" class="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" @click.self="closeClearConfirmation">
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-rv-darkCard">
        <div class="mb-4 flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300"><i class="fa-solid fa-triangle-exclamation"></i></span>
          <div>
            <h3 class="font-bold text-gray-900 dark:text-white">Confirmación final</h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">Escribe exactamente <strong>VACIAR</strong> para confirmar. Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <input v-model="clearConfirmationText" autofocus autocomplete="off" autocapitalize="characters" placeholder="VACIAR" class="w-full rounded-lg border border-red-300 px-3 py-2 font-mono uppercase text-gray-900 outline-none focus:ring-2 focus:ring-red-500 dark:border-red-800 dark:bg-rv-darkSurface dark:text-white" :disabled="clearingPlaylist" @input="normalizeConfirmationInput($event, 'clear')" @keyup.enter="confirmClearPlaylist" />
        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-rv-darkSurface dark:text-white dark:hover:bg-rv-darkBg" :disabled="clearingPlaylist" @click="closeClearConfirmation">Cancelar</button>
          <button class="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40" :disabled="clearConfirmationText !== 'VACIAR' || clearingPlaylist" @click="confirmClearPlaylist">
            {{ clearingPlaylist ? 'Vaciando playlist…' : 'Vaciar definitivamente' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirmation" class="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" @click.self="closeDeleteConfirmation">
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-rv-darkCard">
        <div class="mb-4 flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300"><i class="fa-solid fa-trash"></i></span>
          <div>
            <h3 class="font-bold text-gray-900 dark:text-white">Eliminar playlist de Riff Valley</h3>
            <p class="mt-2 text-sm leading-5 text-gray-600 dark:text-gray-300">Se eliminará «{{ detail?.name }}» de Riff Valley junto con sus asociaciones de artistas y datos de sincronización. La playlist real y sus canciones seguirán existiendo en Spotify.</p>
          </div>
        </div>
        <p class="mb-2 text-sm text-gray-700 dark:text-gray-200">Escribe exactamente <strong>ELIMINAR</strong> para confirmar:</p>
        <input v-model="deleteConfirmationText" autofocus autocomplete="off" autocapitalize="characters" placeholder="ELIMINAR" class="w-full rounded-lg border border-red-300 px-3 py-2 font-mono uppercase text-gray-900 outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60 dark:border-red-800 dark:bg-rv-darkSurface dark:text-white" :disabled="deletingPlaylist" @input="normalizeConfirmationInput($event, 'delete')" @keyup.enter="confirmDeletePlaylist" />
        <p v-if="deletePlaylistError" class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{{ deletePlaylistError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-rv-darkSurface dark:text-white dark:hover:bg-rv-darkBg" :disabled="deletingPlaylist" @click="closeDeleteConfirmation">Cancelar</button>
          <button class="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40" :disabled="deleteConfirmationText !== 'ELIMINAR' || deletingPlaylist" @click="confirmDeletePlaylist">
            {{ deletingPlaylist ? 'Eliminando…' : 'Eliminar definitivamente' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import SwalService from '@services/swal/SwalService';
import {
  addArtistToFestivalPlaylist,
  clearFestivalPlaylist,
  createPendingFestivalArtist,
  deleteFestivalPlaylist,
  getArtistTopSongs,
  getFestivalPlaylist,
  removeArtistFromFestivalPlaylist,
  searchFestivalArtists,
  updateFestivalPlaylist,
  updateFestivalPlaylistImage,
  validatePlaylistImage,
  type FestivalArtist,
  type PlaylistArtist,
  type PlaylistArtistSyncStatus,
  type SpotifyConnection,
  type SyncedFestivalPlaylist,
  type TopSongsResponse,
} from '@services/spotify/festivalPlaylists';

const props = defineProps<{
  playlistId: string;
  playlistName: string;
  connection: SpotifyConnection;
  canManage: boolean;
}>();

const emit = defineEmits<{
  close: [];
  renew: [];
  updated: [playlist: SyncedFestivalPlaylist];
  deleted: [playlistId: string];
}>();

const fallbackImage = '/LOGO-RIFF-VALLEY.svg';
const fallbackArtist = '/LOGO-RIFF-VALLEY.svg';
const detail = ref<SyncedFestivalPlaylist | null>(null);
const loading = ref(true);
const savingDetails = ref(false);
const savingImage = ref(false);
const selectedImage = ref<File | null>(null);
const imagePreview = ref<string | null>(null);
const artistQuery = ref('');
const searchResults = ref<FestivalArtist[]>([]);
const searching = ref(false);
const searchFailed = ref(false);
const creatingArtist = ref(false);
const syncingArtistId = ref<string | null>(null);
const expandedArtists = ref(new Set<string>());
const preview = ref<TopSongsResponse | null>(null);
const previewArtistId = ref<string | null>(null);
const previewLoadingId = ref<string | null>(null);
const clearingPlaylist = ref(false);
const showClearConfirmation = ref(false);
const clearConfirmationText = ref('');
const deletingPlaylist = ref(false);
const showDeleteConfirmation = ref(false);
const deleteConfirmationText = ref('');
const deletePlaylistError = ref<string | null>(null);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const editForm = reactive({ name: '', description: '', isPublic: false });
const searchedArtistName = computed(() => artistQuery.value.trim());
const hasExactArtistMatch = computed(() => searchResults.value.some((artist) =>
  artist.name.trim().localeCompare(searchedArtistName.value, undefined, { sensitivity: 'base' }) === 0,
));
const canCreateSearchedArtist = computed(() =>
  props.canManage
  && searchedArtistName.value.length >= 2
  && !searching.value
  && !searchFailed.value
  && !hasExactArtistMatch.value,
);
function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error)) return error.response?.data?.message || fallback;
  return fallback;
}

function applyDetail(value: SyncedFestivalPlaylist) {
  detail.value = value;
  editForm.name = value.name;
  editForm.description = value.description ?? '';
  editForm.isPublic = value.isPublic;
  emit('updated', value);
}

async function loadDetail() {
  loading.value = true;
  try {
    applyDetail(await getFestivalPlaylist(props.playlistId));
  } catch (error) {
    SwalService.error(errorMessage(error, 'No se pudo cargar la playlist'));
    emit('close');
  } finally {
    loading.value = false;
  }
}

async function saveDetails() {
  if (!detail.value || !editForm.name.trim()) return;
  savingDetails.value = true;
  try {
    applyDetail(await updateFestivalPlaylist(detail.value.id, {
      name: editForm.name.trim(),
      description: editForm.description,
      public: editForm.isPublic,
    }));
    SwalService.success('Playlist actualizada en Spotify');
  } catch (error) {
    SwalService.error(errorMessage(error, 'No se pudo actualizar la playlist'));
  } finally {
    savingDetails.value = false;
  }
}

function clearImagePreview() {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  imagePreview.value = null;
}

function selectImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  selectedImage.value = null;
  clearImagePreview();
  if (!file) return;
  const validationError = validatePlaylistImage(file);
  if (validationError) {
    input.value = '';
    SwalService.error(validationError);
    return;
  }
  selectedImage.value = file;
  imagePreview.value = URL.createObjectURL(file);
}

async function uploadImage() {
  if (!detail.value || !selectedImage.value || !props.connection.canUploadImages) return;
  savingImage.value = true;
  try {
    applyDetail(await updateFestivalPlaylistImage(detail.value.id, selectedImage.value));
    selectedImage.value = null;
    clearImagePreview();
    SwalService.success('Portada actualizada en Spotify');
  } catch (error) {
    SwalService.error(errorMessage(error, 'No se pudo actualizar la portada'));
  } finally {
    savingImage.value = false;
  }
}

watch(artistQuery, (query) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchResults.value = [];
  searchFailed.value = false;
  if (query.trim().length < 2) {
    searching.value = false;
    return;
  }
  searching.value = true;
  searchTimer = setTimeout(async () => {
    try {
      const response = await searchFestivalArtists(query.trim(), 15, 0);
      if (artistQuery.value.trim() === query.trim()) searchResults.value = response.data;
    } catch (error) {
      if (artistQuery.value.trim() === query.trim()) searchFailed.value = true;
      SwalService.error(errorMessage(error, 'No se pudieron buscar artistas'));
    } finally {
      if (artistQuery.value.trim() === query.trim()) searching.value = false;
    }
  }, 300);
});

function isArtistPresent(artistId: string) {
  return detail.value?.playlistArtists.some((entry) => entry.artistId === artistId) ?? false;
}

async function addArtist(artistId: string) {
  if (!detail.value || syncingArtistId.value) return;
  const existing = detail.value.playlistArtists.find((entry) => entry.artistId === artistId);
  if (existing && existing.status !== 'failed') return;
  syncingArtistId.value = artistId;
  try {
    applyDetail(await addArtistToFestivalPlaylist(detail.value.id, artistId, 10, 10));
    SwalService.success('Artista y canciones sincronizados');
  } catch (error) {
    SwalService.error(errorMessage(error, 'No se pudo sincronizar el artista'));
    await loadDetail();
  } finally {
    syncingArtistId.value = null;
  }
}

async function createAndAddArtist() {
  if (!detail.value || !canCreateSearchedArtist.value || creatingArtist.value || syncingArtistId.value) return;
  const name = searchedArtistName.value;
  let createdArtist: FestivalArtist | null = null;
  creatingArtist.value = true;
  try {
    createdArtist = await createPendingFestivalArtist(name);
    applyDetail(await addArtistToFestivalPlaylist(detail.value.id, createdArtist.id, 10, 20));
    artistQuery.value = '';
    searchResults.value = [];
    SwalService.success(`Artista “${createdArtist.name}” creado y sincronizado`);
  } catch (error) {
    if (createdArtist && !searchResults.value.some((artist) => artist.id === createdArtist?.id)) {
      searchResults.value.unshift(createdArtist);
    }
    SwalService.error(errorMessage(
      error,
      createdArtist
        ? 'El artista se creó como pendiente, pero no pudo sincronizarse con la playlist'
        : 'No se pudo crear el artista',
    ));
  } finally {
    creatingArtist.value = false;
  }
}

async function removeArtist(entry: PlaylistArtist) {
  if (!detail.value || syncingArtistId.value) return;
  const result = await SwalService.confirm(
    '¿Eliminar artista?',
    `Se eliminarán de Spotify las pistas de ${entry.artist.name}, excepto las compartidas con otros artistas.`,
    'Sí, eliminar',
    'Cancelar',
  );
  if (!result.isConfirmed) return;
  syncingArtistId.value = entry.artistId;
  try {
    applyDetail(await removeArtistFromFestivalPlaylist(detail.value.id, entry.artistId));
    SwalService.success('Artista eliminado de la playlist');
  } catch (error) {
    SwalService.error(errorMessage(error, 'No se pudo eliminar el artista'));
  } finally {
    syncingArtistId.value = null;
  }
}

async function requestClearPlaylist() {
  if (!detail.value || clearingPlaylist.value || !props.canManage) return;
  const result = await SwalService.confirm(
    '¿Vaciar completamente la playlist?',
    'Se eliminarán todas las canciones de Spotify y todos los artistas sincronizados. La playlist seguirá existiendo, pero quedará vacía.',
    'Continuar',
    'Cancelar',
  );
  if (!result.isConfirmed) return;
  clearConfirmationText.value = '';
  showClearConfirmation.value = true;
}

function closeClearConfirmation() {
  if (clearingPlaylist.value) return;
  showClearConfirmation.value = false;
  clearConfirmationText.value = '';
}

async function confirmClearPlaylist() {
  if (!detail.value || clearConfirmationText.value !== 'VACIAR' || clearingPlaylist.value) return;
  clearingPlaylist.value = true;
  try {
    applyDetail(await clearFestivalPlaylist(detail.value.id));
    expandedArtists.value = new Set();
    showClearConfirmation.value = false;
    clearConfirmationText.value = '';
    SwalService.success('La playlist se ha vaciado completamente');
  } catch (error) {
    SwalService.error(errorMessage(error, 'No se pudo vaciar la playlist'));
  } finally {
    clearingPlaylist.value = false;
  }
}

function openDeleteConfirmation() {
  if (!detail.value || deletingPlaylist.value || !props.canManage) return;
  deleteConfirmationText.value = '';
  deletePlaylistError.value = null;
  showDeleteConfirmation.value = true;
}

function closeDeleteConfirmation() {
  if (deletingPlaylist.value) return;
  showDeleteConfirmation.value = false;
  deleteConfirmationText.value = '';
  deletePlaylistError.value = null;
}

function normalizeConfirmationInput(event: Event, target: 'clear' | 'delete') {
  const value = (event.target as HTMLInputElement).value.toUpperCase();
  if (target === 'clear') clearConfirmationText.value = value;
  else deleteConfirmationText.value = value;
}

async function confirmDeletePlaylist() {
  if (!detail.value || deleteConfirmationText.value !== 'ELIMINAR' || deletingPlaylist.value) return;
  const playlistId = detail.value.id;
  deletingPlaylist.value = true;
  deletePlaylistError.value = null;
  try {
    await deleteFestivalPlaylist(playlistId);
    showDeleteConfirmation.value = false;
    deleteConfirmationText.value = '';
    detail.value = null;
    emit('deleted', playlistId);
    emit('close');
    SwalService.success('Playlist eliminada de Riff Valley. La playlist de Spotify no se ha eliminado.');
  } catch (error) {
    deletePlaylistError.value = errorMessage(error, 'No se pudo eliminar la playlist de Riff Valley');
  } finally {
    deletingPlaylist.value = false;
  }
}

async function loadPreview(artist: FestivalArtist) {
  previewLoadingId.value = artist.id;
  preview.value = null;
  previewArtistId.value = artist.id;
  try {
    preview.value = await getArtistTopSongs(artist.name, 10, 10);
  } catch (error) {
    SwalService.error(errorMessage(error, 'No se pudo calcular la vista previa'));
  } finally {
    previewLoadingId.value = null;
  }
}

function toggleArtist(id: string) {
  const next = new Set(expandedArtists.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedArtists.value = next;
}

function statusLabel(status: PlaylistArtistSyncStatus) {
  return { syncing: 'Sincronizando', synced: 'Sincronizado', failed: 'Error' }[status];
}

function statusClass(status: PlaylistArtistSyncStatus) {
  return {
    syncing: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    synced: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  }[status];
}

onMounted(loadDetail);
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
  clearImagePreview();
});
</script>

<style scoped>
.spotify-artists-section {
  background-color: transparent;
}

.spotify-artists-title {
  color: #111827 !important;
}

.spotify-artist-row {
  background-color: #ffffff !important;
}

.spotify-artist-row:hover {
  background-color: #f9fafb !important;
}

:global(.dark) .spotify-artists-section {
  background-color: transparent;
}

:global(.dark) .spotify-artists-title {
  color: #ffffff !important;
}

:global(.dark) .spotify-artist-row {
  background-color: #2a2b3d !important;
}

:global(.dark) .spotify-artist-row:hover {
  background-color: #00021f !important;
}
</style>
