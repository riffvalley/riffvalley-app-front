<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Cabecera -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Artistas</h1>
      <span class="text-sm text-gray-400">{{ totalItems }} artistas</span>
    </div>

    <!-- Filtros -->
    <div class="flex flex-wrap gap-3 mb-6 items-center">
      <input
        v-model="query"
        @input="onQueryInput"
        type="text"
        placeholder="Buscar por nombre..."
        class="border border-gray-200 rounded-xl px-4 py-2 text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-rv-pink"
      />
      <button
        v-if="isManager"
        @click="needsReview = needsReview === true ? null : true"
        :class="[
          'text-xs font-semibold px-3 py-2 rounded-xl border transition-all',
          needsReview === true
            ? 'bg-amber-500 border-amber-500 text-white'
            : 'bg-white border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-500'
        ]"
      >
        <i class="fa-solid fa-clock-rotate-left mr-1.5"></i>
        Pendientes de revisar
      </button>

      <SearchableSelect
        v-model="selectedGenreId"
        :options="genres"
        title="name"
        trackby="id"
        placeholder="Buscar género..."
        trigger-placeholder="Todos los géneros"
        all-label="Todos los géneros"
        :max="150"
        class="w-full sm:w-56 rounded-full text-rv-navy text-sm border-rv-navy/20 shadow-lg"
      />
    </div>

    <!-- Lista -->
    <div v-if="loading" class="text-center text-gray-400 py-12">Cargando...</div>

    <div v-else-if="artists.length === 0" class="text-center text-gray-400 py-12">
      No se encontraron artistas.
    </div>

    <div v-else class="flex flex-col gap-4">
      <div
        v-for="artist in artists"
        :key="artist.id"
        :class="[
          'rounded-2xl border overflow-hidden transition-all flex flex-col sm:flex-row',
          isEmpty(artist) && isManager
            ? 'border-red-400 ring-2 ring-red-300'
            : 'border-gray-200 bg-white'
        ]"
      >
        <!-- Imagen izquierda 320x320 -->
        <div class="relative w-full h-48 sm:w-80 sm:h-80 flex-shrink-0">
          <img
            v-if="artist.image"
            :src="artist.image"
            class="absolute inset-0 w-full h-full object-cover"
            style="object-position: center 45%"
          />
          <div
            v-else
            class="absolute inset-0"
            :style="{ backgroundColor: uniqueGenres(artist)[0]?.color || '#9ca3af', opacity: 0.45 }"
          ></div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
        </div>

        <!-- Contenido derecho -->
        <div class="flex-1 p-4 flex flex-col min-w-0">

          <!-- Header: nombre + país + acciones -->
          <div class="flex items-start justify-between gap-2 mb-3">
            <div class="flex flex-col gap-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  class="font-bold text-rv-navy text-base leading-tight truncate cursor-pointer hover:text-rv-pink transition-colors"
                  @click="toggleLastFm(artist)"
                >{{ artist.name }}</span>
                <button
                  @click="toggleLastFm(artist)"
                  class="text-[10px] font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-full transition-colors flex-shrink-0"
                >ver más</button>
              </div>
              <div class="flex items-center gap-1.5">
                <template v-if="artist.country">
                  <CircleFlags
                    v-if="artist.country.isoCode && artist.country.isoCode !== 'int' && artist.country.isoCode.length >= 2"
                    :country="artist.country.isoCode.slice(0, 2).toLowerCase()"
                    :show-flag-name="false"
                    class="h-4 w-4"
                  />
                  <span class="text-xs text-gray-500">{{ artist.country.name }}</span>
                </template>
                <span v-else :class="isManager ? 'text-xs text-red-400 font-semibold italic' : 'text-xs text-gray-400 italic'">Sin país</span>
              </div>
              <template v-if="isEmpty(artist) && isManager">
                <span class="text-xs font-semibold text-red-300 bg-red-900/50 px-2 py-0.5 rounded-full uppercase tracking-wide w-fit">
                  Sin discos ni novedades
                </span>
              </template>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button
                v-if="isManager && isEmpty(artist)"
                @click="confirmDelete(artist)"
                class="bg-red-100 hover:bg-red-200 text-red-500 rounded-full w-7 h-7 flex items-center justify-center transition-all"
                title="Eliminar artista"
              >
                <i class="fa-solid fa-trash text-xs"></i>
              </button>
              <button
                v-if="isManager"
                @click="openEditModal(artist)"
                class="bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full w-7 h-7 flex items-center justify-center transition-all"
                title="Editar artista"
              >
                <i class="fa-solid fa-pen text-xs"></i>
              </button>
            </div>
          </div>

          <!-- Discos -->
          <div v-if="artist.discs.length > 0" class="mt-1">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Discos ({{ artist.discs.length }})
            </p>
            <div class="flex flex-col gap-1">
              <div
                v-for="disc in artist.discs"
                :key="disc.id"
                class="flex items-center gap-3 text-sm text-gray-700"
              >
                <img
                  v-if="disc.image"
                  :src="disc.image"
                  class="w-14 h-14 rounded-lg object-cover flex-shrink-0 transition-transform duration-200 hover:scale-[2] hover:shadow-xl hover:z-10 cursor-zoom-in"
                />
                <div
                  v-else
                  class="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 flex-shrink-0"
                >
                  <i class="fa-solid fa-compact-disc text-lg"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <span
                    class="font-medium truncate cursor-pointer hover:underline text-rv-navy"
                    @click="openDiscDetail(disc, artist)"
                  >{{ disc.name }}</span>
                  <span class="text-xs text-gray-400 ml-2">{{ formatDate(disc.releaseDate) }}</span>
                  <span v-if="disc.genre" class="text-xs ml-2" :style="{ color: disc.genre.color }">
                    {{ disc.genre.name }}
                  </span>
                </div>
                <button
                  @click="openDiscCard(disc, artist)"
                  class="flex flex-col items-center w-14 h-10 border rounded-lg shadow-sm bg-gray-100 flex-shrink-0 justify-center hover:border-rv-pink hover:bg-rv-pink/10 transition-colors cursor-pointer"
                >
                  <p class="text-sm font-bold text-blue-600 leading-none">
                    {{ disc.rateCount > 0 ? disc.averageRate.toFixed(2) : '-' }}
                  </p>
                  <p class="text-[10px] text-rv-navy leading-none mt-0.5">
                    {{ disc.rateCount > 0 ? `(${disc.rateCount})` : 'Sin votos' }}
                  </p>
                </button>
              </div>
            </div>
          </div>

          <!-- Lanzamientos nacionales (solo los que no tienen disco ya listado) -->
          <div v-if="extraReleases(artist).length > 0" class="mt-3">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Lanzamientos ({{ extraReleases(artist).length }})
            </p>
            <div class="flex flex-col gap-1">
              <div
                v-for="nr in extraReleases(artist)"
                :key="nr.id"
                class="text-sm text-gray-700 flex items-center gap-2 flex-wrap"
              >
                <span
                  class="text-xs font-semibold px-2 py-0.5 rounded-full capitalize text-white"
                  :class="{
                    'bg-blue-500': nr.discType === 'single',
                    'bg-rv-purple': nr.discType === 'ep',
                    'bg-gray-500': !nr.discType || nr.discType === 'album',
                  }"
                >
                  {{ nr.discType || 'álbum' }}
                </span>
                <span class="font-medium">{{ nr.discName }}</span>
                <span class="text-xs text-gray-400">{{ formatDate(nr.releaseDay) }}</span>
                <a
                  v-if="nr.link"
                  :href="nr.link"
                  target="_blank"
                  rel="noopener"
                  :class="getLinkStyle(nr.link).color"
                  class="inline-flex items-center gap-1 text-xs font-semibold text-white px-2.5 py-0.5 rounded-full"
                >
                  <i :class="getLinkStyle(nr.link).icon"></i>
                  {{ getLinkStyle(nr.link).text }}
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-3 mt-8">
      <button
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage <= 1"
        class="px-3 py-1.5 rounded-xl border text-sm disabled:opacity-40 hover:border-rv-pink hover:text-rv-pink transition-colors"
      >
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <span class="text-sm text-gray-600">Página {{ currentPage }} de {{ totalPages }}</span>
      <button
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage >= totalPages"
        class="px-3 py-1.5 rounded-xl border text-sm disabled:opacity-40 hover:border-rv-pink hover:text-rv-pink transition-colors"
      >
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  </div>

  <!-- Modal detalle disco (nombre) -->
  <Teleport to="body">
    <DiscDetail
      v-if="selectedDisc"
      :disc="selectedDisc"
      @close="selectedDisc = null"
    />
  </Teleport>

  <!-- Modal DiscCard (nota) -->
  <Teleport to="body">
    <div
      v-if="selectedDiscCard || discCardLoading"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      @click.self="selectedDiscCard = null; discCardLoading = false"
    >
      <div class="bg-white rounded-2xl shadow-xl p-4 w-full max-w-md relative">
        <button
          @click="selectedDiscCard = null; discCardLoading = false"
          class="absolute top-3 right-3 z-10 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 rounded-full w-8 h-8 flex items-center justify-center text-base font-bold shadow transition-all"
        >&times;</button>
        <div v-if="discCardLoading" class="py-8 text-center text-gray-400 text-sm">Cargando...</div>
        <DiscCardComponent v-else
          :id="selectedDiscCard.id"
          :image="selectedDiscCard.image || ''"
          :name="selectedDiscCard.name"
          :release-date="selectedDiscCard.releaseDate"
          :artist-name="selectedDiscCard.artistName"
          :genre-name="selectedDiscCard.genre?.name || ''"
          :genre-color="selectedDiscCard.genre?.color || 'grey'"
          :link="selectedDiscCard.link || ''"
          :average-rate="selectedDiscCard.averageRate"
          :rate-count="selectedDiscCard.rateCount"
          :is-new="!selectedDiscCard.userDiscRate"
          :ep="selectedDiscCard.ep"
          :debut="selectedDiscCard.debut"
          :user-disc-rate="selectedDiscCard.userDiscRate"
          :rate="selectedDiscCard.rate"
          :cover="selectedDiscCard.cover"
        />
      </div>
    </div>
  </Teleport>

  <!-- Modal Last.fm -->
  <Teleport to="body">
    <div
      v-if="lastFmModalShow"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40"
      @click.self="lastFmModalShow = false"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto relative">
        <button
          @click="lastFmModalShow = false"
          class="absolute top-3 right-3 text-white bg-black/30 hover:bg-black/50 rounded-full w-8 h-8 flex items-center justify-center z-10 text-base"
        >&times;</button>

        <!-- Cabecera con imagen del artista -->
        <div class="relative h-72 bg-gray-100 overflow-hidden rounded-t-2xl">
          <img
            v-if="lastFmModalArtistImage"
            :src="lastFmModalArtistImage"
            class="absolute inset-0 w-full h-full object-cover"
            style="object-position: center 30%"
          />
          <div v-else class="absolute inset-0 bg-gradient-to-br from-rv-pink to-rv-purple"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <div class="absolute bottom-4 left-4 right-12 flex flex-col gap-1.5">
            <div class="flex items-center gap-2 flex-wrap">
              <i class="fa-brands fa-lastfm text-red-400 text-xl"></i>
              <span class="text-white font-bold text-xl leading-tight">{{ lastFmModalArtistName }}</span>
              <span
                v-if="lastFmModalData?.ontour === '1'"
                class="text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide"
              >En gira</span>
            </div>
            <a
              v-if="lastFmModalData?.url"
              :href="lastFmModalData.url"
              target="_blank"
              rel="noopener"
              class="text-xs text-white/70 hover:text-white underline w-fit"
            >Ver en Last.fm</a>
          </div>
        </div>

        <div v-if="!lastFmModalData" class="p-8 text-center text-gray-400 text-sm">
          <i class="fa-brands fa-lastfm text-2xl text-red-400 mb-2 block"></i>
          Cargando...
        </div>

        <div v-else class="p-5 flex flex-col gap-4">

          <!-- Stats -->
          <div v-if="lastFmModalData?.stats" class="flex gap-3">
            <div class="flex-1 bg-gray-50 rounded-xl p-3 text-center">
              <p class="text-lg font-bold text-rv-navy">{{ Number(lastFmModalData.stats.listeners).toLocaleString('es-ES') }}</p>
              <p class="text-xs text-gray-400 uppercase tracking-wide">Oyentes</p>
            </div>
            <div class="flex-1 bg-gray-50 rounded-xl p-3 text-center">
              <p class="text-lg font-bold text-rv-navy">{{ Number(lastFmModalData.stats.playcount).toLocaleString('es-ES') }}</p>
              <p class="text-xs text-gray-400 uppercase tracking-wide">Reproducciones</p>
            </div>
          </div>

          <!-- Tags -->
          <div v-if="lastFmModalData?.tags?.tag?.length">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Etiquetas</p>
            <div class="flex flex-wrap gap-1.5">
              <a
                v-for="tag in lastFmModalData.tags.tag"
                :key="tag.name"
                :href="tag.url"
                target="_blank"
                rel="noopener"
                class="px-2.5 py-0.5 bg-rv-pink rounded-full text-white text-xs font-semibold hover:opacity-80 transition-opacity"
              >{{ tag.name }}</a>
            </div>
          </div>

          <!-- Biografía -->
          <div v-if="lastFmModalData?.bio?.content">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Biografía</p>
            <div
              class="text-sm text-gray-700 leading-relaxed"
              v-html="cleanBio(lastFmModalData.bio.content)"
            ></div>
            <p v-if="lastFmModalData.bio.published" class="text-xs text-gray-400 mt-2">
              Publicado: {{ lastFmModalData.bio.published }}
            </p>
          </div>

          <!-- Discos en la app (si el artista existe en BD) -->
          <div v-if="lastFmModalDbArtist?.discs?.length">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Discos en la app</p>
            <div class="flex flex-col gap-1.5">
              <div
                v-for="disc in lastFmModalDbArtist.discs"
                :key="disc.id"
                class="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded-xl p-1 -mx-1 transition-colors"
                @click="openDbDisc(disc)"
              >
                <img
                  v-if="disc.image"
                  :src="disc.image"
                  class="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
                <div v-else class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 flex-shrink-0">
                  <i class="fa-solid fa-compact-disc text-sm"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <span class="font-medium truncate text-rv-navy block hover:underline">{{ disc.name }}</span>
                  <span class="text-xs text-gray-400">{{ formatDate(disc.releaseDate) }}</span>
                  <span v-if="disc.genre" class="text-xs ml-2" :style="{ color: disc.genre.color }">{{ disc.genre.name }}</span>
                </div>
                <div class="flex flex-col items-center w-12 text-center flex-shrink-0">
                  <span class="text-sm font-bold text-blue-600">{{ disc.rateCount > 0 ? disc.averageRate.toFixed(1) : '-' }}</span>
                  <span class="text-[10px] text-gray-400">{{ disc.rateCount > 0 ? `(${disc.rateCount})` : 'Sin votos' }}</span>
                </div>
                <i class="fa-solid fa-chevron-right text-xs text-gray-300 flex-shrink-0"></i>
              </div>
            </div>
          </div>

          <!-- Artistas similares -->
          <div v-if="lastFmModalData?.similar?.artist?.length">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Artistas similares</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="sim in lastFmModalData.similar.artist"
                :key="sim.name"
                @click="loadSimilarArtist(sim.name)"
                class="px-2.5 py-1 bg-gray-100 hover:bg-rv-pink hover:text-white rounded-full text-xs text-rv-navy font-medium transition-colors"
              >{{ sim.name }}</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal editar artista -->
  <Teleport to="body">
    <div
      v-if="editModal.show"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      @click.self="closeEditModal"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <!-- Imagen de cabecera -->
        <div class="relative w-full h-36 bg-gray-100 flex items-center justify-center">
          <img
            v-if="editModal.image"
            :src="editModal.image"
            class="w-full h-full object-cover"
          />
          <i v-else class="fa-solid fa-user text-4xl text-gray-300"></i>
          <button
            @click="fetchSpotifyImage"
            :disabled="fetchingSpotifyImage"
            class="absolute bottom-2 right-2 flex items-center gap-1.5 text-xs font-semibold bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-full shadow transition-all"
          >
            <i class="fa-brands fa-spotify"></i>
            {{ fetchingSpotifyImage ? 'Buscando...' : 'Spotify' }}
          </button>

          <!-- Picker de resultados -->
          <div v-if="spotifyImageOptions.length > 0" class="absolute inset-0 bg-black/70 flex items-center justify-center gap-2 p-3 rounded-t-2xl">
            <button
              v-for="opt in spotifyImageOptions"
              :key="opt.image"
              @click="pickSpotifyImage(opt.image)"
              class="flex flex-col items-center gap-1 group"
            >
              <img :src="opt.image" class="w-16 h-16 rounded-lg object-cover ring-2 ring-transparent group-hover:ring-green-400 transition-all" />
              <span class="text-white text-[10px] truncate max-w-[64px]">{{ opt.name }}</span>
            </button>
          </div>
        </div>

        <div class="p-5 flex flex-col gap-3">
          <h2 class="text-base font-bold text-gray-800">Editar artista</h2>

          <!-- Nombre + País en fila -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Nombre</label>
              <input
                v-model="editModal.name"
                type="text"
                class="border border-gray-200 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-rv-pink"
              />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">País</label>
              <SearchableSelect
                v-model="editModal.countryId"
                :options="countries"
                title="name"
                trackby="id"
                placeholder="Buscar país..."
                trigger-placeholder="Sin país"
                all-label="Sin país"
                :max="250"
                class="rounded-xl text-sm border-gray-200"
              />
            </div>
          </div>

          <!-- URL imagen -->
          <div>
            <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Imagen (URL)</label>
            <input
              v-model="editModal.image"
              type="text"
              placeholder="https://..."
              class="border border-gray-200 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-rv-pink"
            />
          </div>

          <!-- Descripción -->
          <div>
            <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Descripción</label>
            <textarea
              v-model="editModal.description"
              rows="2"
              placeholder="Descripción del artista..."
              class="border border-gray-200 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-rv-pink resize-none"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-5">
          <button
            @click="closeEditModal"
            class="px-4 py-2 text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
          >
            Cancelar
          </button>
          <button
            @click="saveEdit"
            :disabled="editModal.saving"
            class="px-4 py-2 text-sm rounded-full bg-rv-pink hover:opacity-90 text-white font-semibold transition-all disabled:opacity-50"
          >
            {{ editModal.saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, watch, onMounted } from "vue";
import { getArtistsManagement, deleteArtist, updateArtist, searchArtistsByName } from "@services/artist/artist";
import { getArtistInfo } from "@services/lastfm/lastfm";
import type { ArtistManagementItem, ArtistManagementDisc } from "@services/artist/artist";
import { getCountries } from "@services/countries/countries";
import type { Country } from "@services/countries/countries";
import { getGenres } from "@services/genres/genres";
import type { Genre } from "@services/genres/genres";
import { getDiscRates } from "@services/rates/rates";
import { obtenerTokenSpotify } from "@helpers/SpotifyFunctions.ts";
import axios from "axios";
import { useAuthStore } from "@stores/auth/auth";
import SearchableSelect from "@components/SearchableSelect.vue";
import DiscDetail from "@components/DiscDetail.vue";
import DiscCardComponent from "@components/DiscCardComponent.vue";
import Swal from "sweetalert2";

const LIMIT = 30;

export default defineComponent({
  name: "ArtistManagement",
  components: { SearchableSelect, DiscDetail, DiscCardComponent },
  setup() {
    const artists = ref<ArtistManagementItem[]>([]);
    const totalItems = ref(0);
    const totalPages = ref(1);
    const currentPage = ref(1);
    const loading = ref(false);
    const query = ref("");
    const countries = ref<Country[]>([]);
    const genres = ref<Genre[]>([]);
    const selectedGenreId = ref("");
    const needsReview = ref<boolean | null>(null);
    const authStore = useAuthStore();
    const isManager = authStore.hasRole?.('riffValley') || authStore.hasRole?.('superUser')
      || (authStore.roles || '').includes('riffValley') || (authStore.roles || '').includes('superUser');
    let searchTimer: ReturnType<typeof setTimeout> | null = null;

    const editModal = reactive({
      show: false,
      saving: false,
      artistId: "",
      name: "",
      countryId: "",
      image: "",
      description: "",
    });

    const fetchArtists = async (page = 1) => {
      loading.value = true;
      try {
        const offset = (page - 1) * LIMIT;
        const res = await getArtistsManagement({ query: query.value || undefined, limit: LIMIT, offset, genreId: selectedGenreId.value || undefined, needsReview: needsReview.value ?? undefined });
        artists.value = res.data;
        totalItems.value = res.totalItems;
        totalPages.value = res.totalPages;
        currentPage.value = res.currentPage;
      } catch {
        Swal.fire({ icon: "error", title: "Error al cargar artistas", timer: 3000, showConfirmButton: false, toast: true, position: "top-end" });
      } finally {
        loading.value = false;
      }
    };

    const onQueryInput = () => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => fetchArtists(1), 400);
    };

    watch(selectedGenreId, () => fetchArtists(1));
    watch(needsReview, () => fetchArtists(1));

    const goToPage = (page: number) => {
      if (page < 1 || page > totalPages.value) return;
      fetchArtists(page);
    };

    const selectedDisc = ref<any>(null);
    const selectedDiscCard = ref<any>(null);
    const discCardLoading = ref(false);

    const openDiscDetail = (disc: ArtistManagementDisc, artist: ArtistManagementItem) => {
      selectedDisc.value = {
        ...disc,
        artist: { name: artist.name },
      };
    };

    const openDiscCard = async (disc: ArtistManagementDisc, artist: ArtistManagementItem) => {
      selectedDiscCard.value = null;
      discCardLoading.value = true;
      try {
        const authStore = useAuthStore();
        const rates = await getDiscRates(disc.id);
        const myRate = rates.find(r => r.user.id === authStore.userId);
        selectedDiscCard.value = {
          ...disc,
          artistName: artist.name,
          userDiscRate: myRate?.id ?? null,
          rate: myRate ? Number(myRate.rate) : null,
          cover: myRate ? Number(myRate.cover) : null,
        };
      } catch {
        selectedDiscCard.value = {
          ...disc,
          artistName: artist.name,
          userDiscRate: null,
          rate: null,
          cover: null,
        };
      } finally {
        discCardLoading.value = false;
      }
    };

    const lastFmCache = reactive<Record<string, any>>({});
    const lastFmLoading = reactive<Record<string, boolean>>({});
    const lastFmModalShow = ref(false);
    const lastFmModalArtistName = ref("");
    const lastFmModalArtistImage = ref<string | null>(null);
    const lastFmModalData = ref<any>(null);
    const lastFmModalDbArtist = ref<any>(null);

    const toggleLastFm = async (artist: ArtistManagementItem) => {
      lastFmModalArtistName.value = artist.name;
      lastFmModalArtistImage.value = artist.image ?? null;
      lastFmModalData.value = null;
      lastFmModalDbArtist.value = artist;
      lastFmModalShow.value = true;
      if (lastFmCache[artist.id]) {
        lastFmModalData.value = lastFmCache[artist.id];
        if (!lastFmModalArtistImage.value) {
          lastFmModalArtistImage.value = await fetchSpotifyArtistImage(artist.name);
        }
        return;
      }
      lastFmLoading[artist.id] = true;
      try {
        const [data, spotifyImage] = await Promise.all([
          getArtistInfo(artist.name),
          artist.image ? Promise.resolve(null) : fetchSpotifyArtistImage(artist.name),
        ]);
        lastFmCache[artist.id] = data;
        lastFmModalData.value = data;
        if (spotifyImage) lastFmModalArtistImage.value = spotifyImage;
      } catch {
        Swal.fire({ icon: "error", title: "No se encontró info en Last.fm", timer: 2000, showConfirmButton: false, toast: true, position: "top-end" });
      } finally {
        delete lastFmLoading[artist.id];
      }
    };

    const isEmpty = (artist: ArtistManagementItem) =>
      artist.discs.length === 0 && artist.nationalReleases.length === 0;

    const extraReleases = (artist: ArtistManagementItem) => {
      const discIds = new Set(artist.discs.map(d => d.id));
      return artist.nationalReleases.filter(nr => !discIds.has(nr.discId));
    };

    const uniqueGenres = (artist: ArtistManagementItem) => {
      const seen = new Set<string>();
      return artist.discs
        .map(d => d.genre)
        .filter((g): g is NonNullable<typeof g> => !!g && !seen.has(g.id) && !!seen.add(g.id));
    };

    const openEditModal = (artist: ArtistManagementItem) => {
      editModal.artistId = artist.id;
      editModal.name = artist.name;
      editModal.countryId = artist.country?.id ?? "";
      editModal.image = artist.image ?? "";
      editModal.description = artist.description ?? "";
      editModal.show = true;
    };

    const closeEditModal = () => {
      editModal.show = false;
      spotifyImageOptions.value = [];
    };

    const saveEdit = async () => {
      editModal.saving = true;
      try {
        await updateArtist(editModal.artistId, {
          name: editModal.name,
          ...(editModal.countryId && { countryId: editModal.countryId }),
          image: editModal.image || undefined,
          description: editModal.description || undefined,
        });
        const artist = artists.value.find(a => a.id === editModal.artistId);
        if (artist) {
          artist.name = editModal.name;
          artist.image = editModal.image || null;
          artist.description = editModal.description || null;
          const country = countries.value.find(c => c.id === editModal.countryId);
          artist.country = country
            ? { id: country.id, name: country.name, isoCode: country.isoCode ?? "" }
            : null;
        }
        if (needsReview.value === true) {
          artists.value = artists.value.filter(a => a.id !== editModal.artistId);
          totalItems.value--;
        }
        closeEditModal();
        Swal.fire({ icon: "success", title: "Artista actualizado", timer: 2000, showConfirmButton: false, toast: true, position: "top-end" });
      } catch {
        Swal.fire({ icon: "error", title: "No se pudo guardar", timer: 3000, showConfirmButton: false, toast: true, position: "top-end" });
      } finally {
        editModal.saving = false;
      }
    };

    const confirmDelete = async (artist: ArtistManagementItem) => {
      const result = await Swal.fire({
        title: `¿Borrar "${artist.name}"?`,
        text: "Este artista no tiene discos ni novedades nacionales. Esta acción no se puede deshacer.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Sí, borrar",
        cancelButtonText: "Cancelar",
      });
      if (!result.isConfirmed) return;
      try {
        await deleteArtist(artist.id);
        artists.value = artists.value.filter(a => a.id !== artist.id);
        totalItems.value--;
        Swal.fire({ icon: "success", title: "Artista eliminado", timer: 2000, showConfirmButton: false, toast: true, position: "top-end" });
      } catch {
        Swal.fire({ icon: "error", title: "No se pudo eliminar el artista", timer: 3000, showConfirmButton: false, toast: true, position: "top-end" });
      }
    };

    const formatDate = (date: string) =>
      new Date(date).toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" });

    const fetchingSpotifyImage = ref(false);
    const spotifyImageOptions = ref<{ name: string; image: string }[]>([]);

    const fetchSpotifyImage = async () => {
      fetchingSpotifyImage.value = true;
      spotifyImageOptions.value = [];
      try {
        const token = await obtenerTokenSpotify();
        if (!token) throw new Error("Sin token");
        const res = await axios.get("https://api.spotify.com/v1/search", {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: editModal.name, type: "artist", limit: 5 },
        });
        const first = res.data.artists.items.find((a: any) => a.images?.length > 0);
        if (!first) {
          Swal.fire({ icon: "warning", title: "No se encontraron imágenes en Spotify", timer: 2000, showConfirmButton: false, toast: true, position: "top-end" });
        } else {
          const img640 = first.images.find((img: any) => img.width === 640);
          editModal.image = (img640 ?? first.images[0]).url;
        }
      } catch {
        Swal.fire({ icon: "error", title: "Error al buscar en Spotify", timer: 2000, showConfirmButton: false, toast: true, position: "top-end" });
      } finally {
        fetchingSpotifyImage.value = false;
      }
    };

    const pickSpotifyImage = (image: string) => {
      editModal.image = image;
      spotifyImageOptions.value = [];
    };

    const fetchSpotifyArtistImage = async (name: string): Promise<string | null> => {
      try {
        const token = await obtenerTokenSpotify();
        if (!token) return null;
        const res = await axios.get("https://api.spotify.com/v1/search", {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: name, type: "artist", limit: 1 },
        });
        const first = res.data.artists?.items?.find((a: any) => a.images?.length > 0);
        if (!first) return null;
        const img640 = first.images.find((img: any) => img.width === 640);
        return (img640 ?? first.images[0]).url;
      } catch {
        return null;
      }
    };

    const openDbDisc = (disc: any) => {
      openDiscCard(disc, { name: lastFmModalArtistName.value } as ArtistManagementItem);
    };

    const loadSimilarArtist = async (name: string) => {
      lastFmModalArtistName.value = name;
      lastFmModalArtistImage.value = null;
      lastFmModalData.value = null;
      lastFmModalDbArtist.value = null;

      const [data, dbResults] = await Promise.all([
        getArtistInfo(name).catch(() => null),
        searchArtistsByName(name).catch(() => []),
      ]);

      if (!data) {
        Swal.fire({ icon: "error", title: "No se encontró info en Last.fm", timer: 2000, showConfirmButton: false, toast: true, position: "top-end" });
        return;
      }

      const dbArtist = dbResults.find((a: any) => a.name.toLowerCase() === name.toLowerCase()) ?? dbResults[0] ?? null;
      lastFmCache[name] = data;
      lastFmModalData.value = data;
      lastFmModalDbArtist.value = dbArtist;
      lastFmModalArtistImage.value = dbArtist?.image ?? await fetchSpotifyArtistImage(name);
    };

    const cleanBio = (content: string) => {
      return content
        .split('User-contributed')[0]
        .replace(/<a[^>]*>[\s\S]*?<\/a>/gi, '')
        .trim();
    };

    const getLinkStyle = (link: string) => {
      if (link.includes("spotify.com"))  return { color: "bg-green-500", icon: "fa-brands fa-spotify", text: "Spotify" };
      if (link.includes("youtube.com") || link.includes("youtu.be")) return { color: "bg-red-500", icon: "fa-brands fa-youtube", text: "YouTube" };
      if (link.includes("bandcamp.com")) return { color: "bg-blue-500", icon: "fa-brands fa-bandcamp", text: "Bandcamp" };
      return { color: "bg-gray-500", icon: "fa-solid fa-link", text: "Enlace" };
    };

    onMounted(async () => {
      await Promise.all([
        fetchArtists(),
        getCountries(250, 0).then(r => { countries.value = r.data.sort((a, b) => a.name.localeCompare(b.name)); }),
        getGenres(150, 0).then(r => { genres.value = r.data.sort((a, b) => a.name.localeCompare(b.name)); }),
      ]);
    });

    return {
      artists,
      totalItems,
      totalPages,
      currentPage,
      loading,
      query,
      countries,
      genres,
      selectedGenreId,
      needsReview,
      isManager,
      editModal,
      onQueryInput,
      goToPage,
      selectedDisc,
      openDiscDetail,
      selectedDiscCard,
      discCardLoading,
      openDiscCard,
      lastFmLoading,
      lastFmModalShow,
      lastFmModalArtistName,
      lastFmModalArtistImage,
      lastFmModalData,
      lastFmModalDbArtist,
      toggleLastFm,
      isEmpty,
      extraReleases,
      uniqueGenres,
      openEditModal,
      closeEditModal,
      saveEdit,
      confirmDelete,
      formatDate,
      openDbDisc,
      loadSimilarArtist,
      cleanBio,
      getLinkStyle,
      fetchSpotifyImage,
      fetchingSpotifyImage,
      spotifyImageOptions,
      pickSpotifyImage,
    };
  },
});
</script>
