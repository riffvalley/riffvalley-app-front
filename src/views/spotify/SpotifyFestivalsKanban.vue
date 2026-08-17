<template>
  <div class="min-h-[calc(100vh-64px)] p-4 dark:bg-rv-darkBg md:p-6">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold dark:text-white md:text-3xl"><i class="fa-brands fa-spotify mr-2 text-[#1DB954]"></i>Festivales</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Playlists reales de Spotify y seguimiento editorial.</p>
      </div>
      <button v-if="activeTab === 'playlists' && canManage" class="rounded-lg bg-rv-pink px-4 py-2 font-semibold text-white shadow-sm transition-colors hover:bg-rv-purple disabled:cursor-not-allowed disabled:opacity-50" :disabled="!connection.connected" :title="connection.connected ? 'Crear playlist' : 'Conecta Spotify para crear una playlist'" @click="openCreate">
        Nueva playlist de festival
      </button>
    </div>

    <nav class="mb-6 flex gap-1 rounded-xl bg-gray-200 p-1 dark:bg-white/10" aria-label="Secciones de festivales">
      <button class="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors" :class="activeTab === 'playlists' ? 'bg-rv-pink text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-rv-pink dark:bg-rv-darkCard dark:text-white dark:hover:bg-white/20 dark:hover:text-white'" @click="activeTab = 'playlists'">
        Playlists
      </button>
      <button class="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors" :class="activeTab === 'kanban' ? 'bg-rv-pink text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-rv-pink dark:bg-rv-darkCard dark:text-white dark:hover:bg-white/20 dark:hover:text-white'" @click="activeTab = 'kanban'">
        Kanban editorial
      </button>
    </nav>

    <div v-if="loading" class="py-16 text-center text-gray-500 dark:text-gray-400">Cargando festivales…</div>
    <div v-else-if="error" class="py-16 text-center text-red-500">{{ error }}</div>

    <template v-else-if="activeTab === 'playlists'">
      <section v-if="canManage" class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-rv-darkCard">
        <div class="flex items-center gap-3">
          <span class="grid h-11 w-11 place-items-center rounded-full bg-[#1DB954]/10 text-xl text-[#1DB954]"><i class="fa-brands fa-spotify"></i></span>
          <div>
            <p class="font-semibold text-gray-900 dark:text-white">{{ connectionTitle }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ connectionDescription }}
            </p>
            <p v-if="connection.missingScopes.length" class="mt-1 text-xs text-amber-600 dark:text-amber-300">Faltan permisos: {{ connection.missingScopes.join(', ') }}</p>
            <p v-if="connection.refreshTokenExpiresAt && connection.connected" class="mt-1 text-xs text-gray-500 dark:text-gray-400">Autorización válida hasta el {{ formatAuthorizationDate(connection.refreshTokenExpiresAt) }}.</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="rounded-lg bg-[#1DB954] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="connecting" @click="startSpotifyOAuth">
            {{ connecting ? 'Redirigiendo…' : connectButtonLabel }}
          </button>
          <button v-if="connection.spotifyUserId" class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-rv-darkSurface dark:text-white dark:hover:bg-rv-darkBg" @click="confirmDisconnect">Desconectar</button>
        </div>
      </section>

      <div v-if="canManage && connection.authorizationStatus === 'expiring_soon'" class="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
        <p class="font-bold"><i class="fa-solid fa-clock mr-2"></i>La autorización de Spotify caduca pronto</p>
        <p class="mt-1 text-sm">Quedan {{ connection.daysUntilReauthorization }} días. Vuelve a autorizar ahora para evitar que se interrumpa la sincronización.</p>
        <button class="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" :disabled="connecting" @click="startSpotifyOAuth">Volver a autorizar Spotify</button>
      </div>

      <div v-if="canManage && connection.reauthorizationRequired" class="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
        <p class="font-bold"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Spotify necesita volver a autorizarse</p>
        <p class="mt-1 text-sm">{{ reauthorizationMessage }} Las playlists no se han eliminado, pero no podrán modificarse hasta completar la autorización.</p>
        <button class="mt-3 rounded-lg bg-[#1DB954] px-4 py-2 text-sm font-bold text-white disabled:opacity-50" :disabled="connecting" @click="startSpotifyOAuth">Volver a autorizar Spotify</button>
      </div>

      <div v-if="items.length === 0" class="rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-white/20">
        <i class="fa-brands fa-spotify mb-3 text-4xl text-gray-300"></i>
        <p class="font-semibold text-gray-700 dark:text-gray-200">Aún no hay playlists de festivales</p>
      </div>

      <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <article v-for="item in items" :key="item.id" class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-rv-darkCard">
          <div class="flex items-start gap-3">
            <div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-rv-purple to-rv-blue shadow-sm">
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="`Portada de ${item.name}`" class="h-full w-full object-cover" />
              <div v-else class="grid h-full place-items-center text-xl text-white/80"><i class="fa-solid fa-music"></i></div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <h2 class="min-w-0 flex-1 truncate text-base font-bold text-gray-900 dark:text-white">{{ item.name }}</h2>
                <span class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-rv-darkSurface dark:text-gray-300">
                  {{ item.spotifyPlaylistId ? (item.isPublic === false ? 'Privada' : 'Pública') : item.link ? 'No vinculada' : 'Sin enlace' }}
                </span>
              </div>
              <p class="mt-1 h-8 overflow-hidden text-xs leading-4 text-gray-500 dark:text-gray-400">{{ summary(item.description) || 'Sin descripción' }}</p>
            </div>
          </div>
          <div>
            <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span><i class="fa-solid fa-user-group mr-1"></i>{{ artistCount(item) }} artistas</span>
              <a v-if="item.link" :href="item.link" target="_blank" rel="noopener noreferrer" class="font-semibold text-[#1DB954] hover:underline">Abrir en Spotify</a>
            </div>
            <button v-if="item.spotifyPlaylistId" class="mt-3 w-full rounded-lg bg-rv-pink px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-rv-purple disabled:cursor-not-allowed disabled:opacity-50" :disabled="!canManage" @click="openManager(item)">
              Gestionar playlist
            </button>
            <button v-else-if="item.link && canManage" class="mt-3 w-full rounded-lg bg-rv-pink px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-rv-purple disabled:cursor-wait disabled:opacity-60" :disabled="linkingItemId !== null" @click="confirmLinkExisting(item)">
              {{ linkingItemId === item.id ? 'Vinculando playlist…' : 'Vincular con Spotify' }}
            </button>
            <div v-else class="mt-3 rounded-lg bg-amber-50 px-3 py-1.5 text-center text-[11px] font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">Playlist no vinculada con Spotify</div>
          </div>
        </article>
      </div>
    </template>

    <div v-else class="flex flex-col gap-4 pb-4 md:h-[calc(100vh-230px)] md:flex-row md:overflow-x-auto">
      <div v-for="col in columns" :key="col.id" class="flex w-full flex-col rounded-xl p-2 md:min-w-[220px] md:flex-1" :class="[col.bgClass, col.borderClass]" @dragover.prevent="onDragOver" @drop="onDrop(col.id)">
        <h2 class="top-0 z-10 mb-4 flex items-center justify-between pb-2 font-bold md:sticky" :class="[col.textClass, col.bgClass]">
          {{ col.label }}
          <span class="rounded-full px-2 py-0.5 text-sm" :class="col.countClass">{{ getItems(col.id).length }}</span>
        </h2>
        <div class="custom-scrollbar space-y-3 pr-2 md:flex-1 md:overflow-y-auto">
          <article v-for="item in getItems(col.id)" :key="item.id" :draggable="canManage" class="group relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-rv-darkCard" :class="canManage ? 'cursor-move' : 'cursor-default'" @dragstart="onDragStart(item)">
            <div class="flex gap-3">
              <img v-if="item.imageUrl" :src="item.imageUrl" class="h-12 w-12 rounded-lg object-cover" alt="" />
              <div class="min-w-0 flex-1">
                <h3 class="truncate font-semibold text-gray-900 dark:text-white">{{ item.name }}</h3>
                <p class="mt-0.5 text-xs text-gray-500">{{ item.spotifyPlaylistId ? `${artistCount(item)} artistas` : 'No vinculada con Spotify' }}</p>
              </div>
            </div>

            <div class="relative mt-3">
              <div v-if="editingUserItemId !== item.id" class="flex items-center gap-2 rounded-lg bg-gray-50 p-1.5 dark:bg-rv-darkSurface" :class="canManage ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-rv-darkBg' : 'cursor-default'" @click="startEditingUser(item.id)">
                <template v-if="item.user">
                  <img v-if="item.user.image" :src="item.user.image" class="h-5 w-5 rounded-full object-cover" alt="Avatar" />
                  <span v-else class="grid h-5 w-5 place-items-center rounded-full bg-black/10 text-[10px] font-bold dark:bg-white/10">{{ item.user.username.charAt(0).toUpperCase() }}</span>
                  <span class="min-w-0 flex-1 truncate text-xs font-medium text-gray-700 dark:text-gray-300">{{ item.user.username }}</span>
                </template>
                <template v-else><i class="fa-solid fa-user ml-1 text-[10px] text-gray-400"></i><span class="text-xs text-gray-500">Sin asignar</span></template>
              </div>
              <select v-else ref="userSelectRef" :value="item.user?.id || ''" class="w-full rounded-lg border border-blue-500 bg-white p-1.5 text-xs dark:bg-rv-darkSurface dark:text-gray-200" @change="onUserChange(item, $event)" @blur="stopEditingUser">
                <option value="">Sin asignar</option>
                <option v-for="user in users" :key="user.id" :value="user.id">{{ user.username }}</option>
              </select>
            </div>

            <div class="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 dark:border-white/10">
              <span class="text-xs text-gray-400">{{ fmtDate(item.updateDate) }}</span>
              <div class="flex gap-2">
                <button v-if="item.spotifyPlaylistId" class="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 disabled:opacity-40 dark:bg-blue-900/20 dark:text-blue-400" title="Gestionar playlist" :disabled="!canManage" @click="openManager(item)"><i class="fa-solid fa-sliders text-xs"></i></button>
                <button v-else-if="item.link && canManage" class="grid h-8 w-8 place-items-center rounded-lg bg-green-50 text-[#1DB954] disabled:cursor-wait disabled:opacity-50 dark:bg-green-900/20" title="Vincular con Spotify" :disabled="linkingItemId !== null" @click="confirmLinkExisting(item)"><i class="fa-solid" :class="linkingItemId === item.id ? 'fa-spinner fa-spin' : 'fa-link'"></i></button>
                <button v-if="!item.spotifyPlaylistId && canManage" class="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" title="Eliminar registro antiguo" @click="confirmDeleteLegacy(item)"><i class="fa-solid fa-trash text-xs"></i></button>
                <a v-if="item.link" :href="item.link" target="_blank" rel="noopener noreferrer" class="grid h-8 w-8 place-items-center rounded-lg bg-green-50 text-[#1DB954] dark:bg-green-900/20" title="Abrir en Spotify"><i class="fa-brands fa-spotify"></i></a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>

    <div v-if="showCreate" class="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" @click.self="closeCreate">
      <form class="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl dark:bg-rv-darkCard" @submit.prevent="createPlaylist">
        <h2 class="text-lg font-bold dark:text-white">Nueva playlist de festival</h2>
        <div class="grid grid-cols-2 gap-1 rounded-xl bg-gray-200 p-1 dark:bg-white/10">
          <button type="button" class="rounded-lg px-3 py-2 text-sm font-semibold transition-colors" :class="createMode === 'new' ? 'bg-rv-pink text-white shadow-sm' : 'bg-white text-gray-700 hover:text-rv-pink dark:bg-rv-darkCard dark:text-white dark:hover:bg-white/20'" @click="createMode = 'new'">Crear nueva en Spotify</button>
          <button type="button" class="rounded-lg px-3 py-2 text-sm font-semibold transition-colors" :class="createMode === 'link' ? 'bg-rv-pink text-white shadow-sm' : 'bg-white text-gray-700 hover:text-rv-pink dark:bg-rv-darkCard dark:text-white dark:hover:bg-white/20'" @click="createMode = 'link'">Vincular existente</button>
        </div>
        <div v-if="createMode === 'new'">
          <label class="mb-1 block text-sm font-medium dark:text-gray-300">Nombre</label>
          <input v-model="createForm.name" maxlength="100" class="w-full rounded-lg border px-3 py-2 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white" />
          <p class="mt-1 text-right text-xs text-gray-400">{{ createForm.name.length }}/100</p>
        </div>
        <div v-if="createMode === 'new'">
          <label class="mb-1 block text-sm font-medium dark:text-gray-300">Descripción</label>
          <textarea v-model="createForm.description" maxlength="300" rows="4" class="w-full resize-none rounded-lg border px-3 py-2 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"></textarea>
          <p class="mt-1 text-right text-xs text-gray-400">{{ createForm.description.length }}/300</p>
        </div>
        <label v-if="createMode === 'new'" class="flex items-center gap-2 text-sm dark:text-gray-300"><input v-model="createForm.isPublic" type="checkbox" class="h-4 w-4 rounded" /> Playlist pública</label>
        <div v-else>
          <label class="mb-1 block text-sm font-medium dark:text-gray-300">Enlace de la playlist de Spotify</label>
          <input v-model.trim="createForm.spotifyUrl" type="url" placeholder="https://open.spotify.com/playlist/..." class="w-full rounded-lg border px-3 py-2 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white" />
          <p v-if="createForm.spotifyUrl && spotifyUrlError" class="mt-1 text-xs text-red-500">{{ spotifyUrlError }}</p>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">La playlist debe pertenecer a la cuenta oficial conectada.</p>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-rv-darkSurface dark:text-white dark:hover:bg-rv-darkBg" @click="closeCreate">Cancelar</button>
          <button type="submit" class="rounded-lg bg-rv-pink px-4 py-2 font-semibold text-white shadow-sm transition-colors hover:bg-rv-purple disabled:opacity-50" :disabled="creating || !canSubmitCreate">{{ creating ? (createMode === 'link' ? 'Vinculando playlist…' : 'Creando en Spotify…') : (createMode === 'link' ? 'Vincular playlist' : 'Crear playlist') }}</button>
        </div>
      </form>
    </div>

    <div v-if="managedPlaylist" class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-2 md:p-4" @click.self="managedPlaylist = null">
      <FestivalPlaylistManager :playlist-id="managedPlaylist.id" :playlist-name="managedPlaylist.name" :connection="connection" :can-manage="canManage" @close="managedPlaylist = null" @renew="startSpotifyOAuth" @updated="applySyncedPlaylist" @deleted="removeDeletedPlaylist" />
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getUsersRv, type Superuser } from '@services/auth/auth';
import { useAuthStore } from '@/modules/auth';
import SwalService from '@services/swal/SwalService';
import {
  getSpotifyFestivals,
  removeSpotify,
  updateSpotify,
  type Spotify,
  type SpotifyStatus,
} from '@services/spotify/spotify';
import {
  connectSpotify,
  createFestivalPlaylist,
  createLinkedFestivalPlaylist,
  disconnectSpotify,
  getSpotifyConnection,
  linkExistingFestivalPlaylist,
  type SpotifyConnection,
  type SyncedFestivalPlaylist,
} from '@services/spotify/festivalPlaylists';
import FestivalPlaylistManager from './components/FestivalPlaylistManager.vue';

type ColumnId = SpotifyStatus;
interface Column { id: ColumnId; label: string; bgClass: string; borderClass: string; textClass: string; countClass: string }

const columns: Column[] = [
  { id: 'not_started', label: 'Sin empezar', bgClass: 'bg-red-50 dark:bg-red-900/20', borderClass: 'border-t-4 border-red-500', textClass: 'text-red-900 dark:text-red-300', countClass: 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  { id: 'in_progress', label: 'En progreso', bgClass: 'bg-orange-50 dark:bg-orange-900/20', borderClass: 'border-t-4 border-orange-500', textClass: 'text-orange-900 dark:text-orange-300', countClass: 'bg-orange-200 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  { id: 'editing', label: 'En revisión', bgClass: 'bg-yellow-50 dark:bg-yellow-900/20', borderClass: 'border-t-4 border-yellow-500', textClass: 'text-yellow-900 dark:text-yellow-300', countClass: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { id: 'ready', label: 'Terminado', bgClass: 'bg-blue-50 dark:bg-blue-900/20', borderClass: 'border-t-4 border-blue-500', textClass: 'text-blue-900 dark:text-blue-300', countClass: 'bg-blue-200 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  { id: 'published', label: 'Publicado', bgClass: 'bg-green-50 dark:bg-green-900/20', borderClass: 'border-t-4 border-green-500', textClass: 'text-green-900 dark:text-green-300', countClass: 'bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
];

const emptyConnection: SpotifyConnection = {
  connected: false,
  spotifyUserId: null,
  displayName: null,
  canUploadImages: false,
  missingScopes: [],
  authorizationStatus: 'disconnected',
  reauthorizationRequired: false,
  reauthorizationReason: null,
  authorizedAt: null,
  refreshTokenExpiresAt: null,
  daysUntilReauthorization: null,
};
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const canManage = computed(() => ['riffValley', 'admin', 'superUser'].some((role) => authStore.hasRole(role)));
const activeTab = ref<'playlists' | 'kanban'>('playlists');
const items = ref<Spotify[]>([]);
const users = ref<Superuser[]>([]);
const connection = ref<SpotifyConnection>({ ...emptyConnection });
const loading = ref(false);
const error = ref<string | null>(null);
const connecting = ref(false);
const creating = ref(false);
const linkingItemId = ref<string | null>(null);
const showCreate = ref(false);
const managedPlaylist = ref<Spotify | null>(null);
const draggedItem = ref<Spotify | null>(null);
const editingUserItemId = ref<string | null>(null);
const userSelectRef = ref<HTMLSelectElement | HTMLSelectElement[] | null>(null);
const createMode = ref<'new' | 'link'>('new');
const createForm = reactive({ name: '', description: '', isPublic: true, spotifyUrl: '' });
const spotifyUrlError = computed(() => validateSpotifyPlaylistUrl(createForm.spotifyUrl));
const canSubmitCreate = computed(() => createMode.value === 'new'
  ? createForm.name.trim().length > 0
  : createForm.spotifyUrl.length > 0 && spotifyUrlError.value === null);
const connectionTitle = computed(() => {
  if (connection.value.reauthorizationRequired) return 'Spotify necesita autorización';
  if (connection.value.authorizationStatus === 'expiring_soon') return 'Spotify conectado · caduca pronto';
  return connection.value.connected ? 'Spotify conectado' : 'Spotify desconectado';
});
const connectionDescription = computed(() => {
  if (connection.value.spotifyUserId) return connection.value.displayName || connection.value.spotifyUserId;
  return 'Conecta la cuenta oficial para sincronizar playlists.';
});
const connectButtonLabel = computed(() => {
  if (connection.value.reauthorizationRequired || connection.value.authorizationStatus === 'expiring_soon') return 'Volver a autorizar';
  return connection.value.connected ? 'Renovar permisos' : 'Conectar Spotify';
});
const reauthorizationMessage = computed(() => connection.value.reauthorizationReason === 'refresh_token_invalid'
  ? 'Spotify ha invalidado la autorización guardada.'
  : 'La autorización de seis meses ha caducado.');

function formatAuthorizationDate(value: string): string {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date(value));
}

function artistCount(item: Spotify): number {
  return item.playlistArtists?.length ?? item.playlistArtistsCount ?? 0;
}

function errorMessage(errorValue: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(errorValue)) return errorValue.response?.data?.message || fallback;
  return fallback;
}

async function loadConnection() {
  if (!canManage.value) return;
  connection.value = await getSpotifyConnection();
}

async function reload() {
  loading.value = true;
  error.value = null;
  try {
    const requests: [Promise<Spotify[]>, Promise<Superuser[]>] = [
      getSpotifyFestivals(),
      canManage.value ? getUsersRv() : Promise.resolve([]),
    ];
    const [festivals, rvUsers] = await Promise.all(requests);
    items.value = festivals;
    users.value = rvUsers;
    try {
      await loadConnection();
    } catch (connectionError) {
      SwalService.error(errorMessage(connectionError, 'No se pudo consultar la conexión con Spotify'));
    }
  } catch (loadError) {
    error.value = errorMessage(loadError, 'Error cargando datos');
    SwalService.error(error.value);
  } finally {
    loading.value = false;
  }
}

async function processOAuthReturn() {
  const result = Array.isArray(route.query.spotify) ? route.query.spotify[0] : route.query.spotify;
  if (result !== 'connected' && result !== 'error') return;
  const nextQuery = { ...route.query };
  delete nextQuery.spotify;
  await router.replace({ query: nextQuery });
  if (result === 'connected') {
    try {
      await loadConnection();
      SwalService.success('Cuenta de Spotify conectada correctamente');
    } catch (oauthError) {
      SwalService.error(errorMessage(oauthError, 'No se pudo confirmar la conexión con Spotify'));
    }
  } else {
    SwalService.error('Spotify no pudo completar la autorización');
  }
}

async function startSpotifyOAuth() {
  if (!canManage.value || connecting.value) return;
  connecting.value = true;
  try {
    const { authorizationUrl } = await connectSpotify();
    window.location.assign(authorizationUrl);
  } catch (oauthError) {
    connecting.value = false;
    SwalService.error(errorMessage(oauthError, 'No se pudo iniciar la conexión con Spotify'));
  }
}

async function confirmDisconnect() {
  const result = await SwalService.confirm('¿Desconectar Spotify?', 'Se eliminarán los tokens locales. Las playlists existentes no se borrarán de Spotify.', 'Sí, desconectar', 'Cancelar');
  if (!result.isConfirmed) return;
  try {
    await disconnectSpotify();
    connection.value = { ...emptyConnection };
    SwalService.success('Cuenta de Spotify desconectada');
  } catch (disconnectError) {
    SwalService.error(errorMessage(disconnectError, 'No se pudo desconectar Spotify'));
  }
}

function openCreate() {
  createMode.value = 'new';
  createForm.name = '';
  createForm.description = '';
  createForm.isPublic = true;
  createForm.spotifyUrl = '';
  showCreate.value = true;
}
function closeCreate() { if (!creating.value) showCreate.value = false; }

async function createPlaylist() {
  if (!canSubmitCreate.value || creating.value) return;
  creating.value = true;
  try {
    const created = createMode.value === 'link'
      ? await createLinkedFestivalPlaylist(createForm.spotifyUrl)
      : await createFestivalPlaylist({ name: createForm.name.trim(), description: createForm.description, public: createForm.isPublic });
    items.value.push(created);
    showCreate.value = false;
    SwalService.success(createMode.value === 'link' ? 'Playlist vinculada correctamente' : 'Playlist creada en Spotify');
  } catch (createError) {
    SwalService.error(errorMessage(createError, createMode.value === 'link' ? 'No se pudo vincular la playlist' : 'No se pudo crear la playlist'));
  } finally {
    creating.value = false;
  }
}

function validateSpotifyPlaylistUrl(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com' || !url.pathname.includes('/playlist/')) {
      return 'Introduce un enlace válido de playlist de open.spotify.com.';
    }
    return null;
  } catch {
    return 'Introduce una URL válida.';
  }
}

async function confirmLinkExisting(item: Spotify) {
  if (!canManage.value || !item.link || item.spotifyPlaylistId || linkingItemId.value) return;
  const result = await SwalService.confirm(
    '¿Vincular con Spotify?',
    'Se usarán los datos actuales de Spotify y se actualizarán el nombre, descripción, visibilidad y portada del registro local.',
    'Sí, vincular',
    'Cancelar',
  );
  if (!result.isConfirmed) return;
  linkingItemId.value = item.id;
  try {
    applySyncedPlaylist(await linkExistingFestivalPlaylist(item.id));
    SwalService.success('Playlist vinculada correctamente');
  } catch (linkError) {
    SwalService.error(errorMessage(linkError, 'No se pudo vincular la playlist'));
  } finally {
    linkingItemId.value = null;
  }
}

function openManager(item: Spotify) {
  if (!item.spotifyPlaylistId || !canManage.value) return;
  managedPlaylist.value = item;
}

function applySyncedPlaylist(updated: SyncedFestivalPlaylist) {
  const index = items.value.findIndex((item) => item.id === updated.id);
  if (index !== -1) items.value[index] = updated;
  if (managedPlaylist.value?.id === updated.id) managedPlaylist.value = items.value[index] || updated;
}

function removeDeletedPlaylist(playlistId: string) {
  items.value = [...items.value.filter((item) => item.id !== playlistId)];
  managedPlaylist.value = null;
}

function summary(value?: string | null) {
  if (!value) return '';
  return value.length > 110 ? `${value.slice(0, 107)}…` : value;
}
function getItems(status: SpotifyStatus) { return items.value.filter((item) => item.status === status); }
function fmtDate(iso: string) { return iso ? new Date(iso).toLocaleDateString() : ''; }
function onDragStart(item: Spotify) { draggedItem.value = item; }
function onDragOver(event: DragEvent) { if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'; }

async function onDrop(targetStatus: ColumnId) {
  if (!canManage.value) return;
  const item = draggedItem.value;
  draggedItem.value = null;
  if (!item || item.status === targetStatus || targetStatus === 'published') return;
  try {
    const updated = await updateSpotify(item.id, { status: targetStatus });
    const index = items.value.findIndex((candidate) => candidate.id === item.id);
    if (index !== -1) items.value[index] = { ...items.value[index], ...updated };
  } catch (updateError) {
    SwalService.error(errorMessage(updateError, 'No se pudo actualizar el estado'));
  }
}

async function startEditingUser(itemId: string) {
  if (!canManage.value) return;
  editingUserItemId.value = itemId;
  await nextTick();
  const select = Array.isArray(userSelectRef.value) ? userSelectRef.value[0] : userSelectRef.value;
  select?.focus();
}
function stopEditingUser() { editingUserItemId.value = null; }

async function onUserChange(item: Spotify, event: Event) {
  const userId = (event.target as HTMLSelectElement).value;
  editingUserItemId.value = null;
  try {
    const updated = await updateSpotify(item.id, { userId: userId || null });
    const index = items.value.findIndex((candidate) => candidate.id === item.id);
    if (index !== -1) items.value[index] = { ...items.value[index], ...updated };
  } catch (updateError) {
    SwalService.error(errorMessage(updateError, 'No se pudo asignar el usuario'));
  }
}

async function confirmDeleteLegacy(item: Spotify) {
  if (item.spotifyPlaylistId) return;
  const result = await SwalService.confirm('¿Eliminar registro antiguo?', `Vas a eliminar “${item.name}”.`, 'Sí, eliminar', 'Cancelar');
  if (!result.isConfirmed) return;
  try {
    await removeSpotify(item.id);
    items.value = items.value.filter((candidate) => candidate.id !== item.id);
    SwalService.success('Festival eliminado');
  } catch (deleteError) {
    SwalService.error(errorMessage(deleteError, 'No se pudo eliminar el festival'));
  }
}

onMounted(async () => {
  await reload();
  await processOAuthReturn();
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgb(0 0 0 / 12%); border-radius: 3px; }
</style>
