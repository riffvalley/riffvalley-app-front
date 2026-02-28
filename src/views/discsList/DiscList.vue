<template>
  <div :class="{ 'menu-open': menuVisible }" class="max-w-[100rem] mx-auto mt-10 px-4">
<h1 class="text-4xl font-bold mb-8 text-center text-rv-navy">
  Discos
</h1>

    <DiscFilters :searchQuery="searchQuery" :selectedGenre="selectedGenre" :selectedWeek="selectedWeek" :genres="genres"
      :selectedCountry="selectedCountry" :countries="countries" @update:searchQuery="searchQuery = $event"
      @update:selectedGenre="selectedGenre = $event" @update:selectedWeek="selectedWeek = $event"
      @update:selectedCountry="selectedCountry = $event" selectClass="w-full" wrapperClass=""
      @resetAndFetch="resetAndFetch" />

    <div class="filters-wrap flex justify-start space-x-2 mb-6">
      <label class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-lg font-medium transition-all duration-200"
        :class="viewMode === 'all'
          ? 'bg-rv-navy text-white'
          : 'bg-gray-200 text-rv-navy hover:bg-gray-300'
          ">
        <input type="radio" v-model="viewMode" value="all" class="hidden" />
        Todos los discos <span v-if="totalDisc !== ''">({{ totalDisc }})</span>
      </label>

      <label class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-md font-medium transition-all duration-200"
        :class="viewMode === 'rates'
          ? 'bg-blue-500 text-white'
          : 'bg-gray-200 hover:bg-gray-300'
          ">
        <input type="radio" v-model="viewMode" value="rates" class="hidden" />
        Mis votos <span v-if="totalRates !== ''">({{ totalRates }})</span>
      </label>

      <label class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-md font-medium transition-all duration-200"
        :class="viewMode === 'covers'
          ? 'bg-green-500 text-white'
          : 'bg-gray-200 hover:bg-gray-300'
          ">
        <input type="radio" v-model="viewMode" value="covers" class="hidden" />
        Mis portadas <span v-if="totalCovers !== ''">({{ totalCovers }})</span>
      </label>

      <label class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-md font-medium transition-all duration-200"
        :class="viewMode === 'favorites'
          ? 'bg-red-500 text-white'
          : 'bg-gray-200 text-rv-navy hover:bg-gray-300'
          ">
        <input type="radio" v-model="viewMode" value="favorites" class="hidden" />
        Favoritos
        <span v-if="totalFavorites !== ''">({{ totalFavorites }})</span>
      </label>

      <label class="px-4 py-2 rounded-full cursor-pointer text-sm shadow-md font-medium transition-all duration-200"
        :class="viewMode === 'pendientes'
          ? 'bg-yellow-500 text-white'
          : 'bg-gray-200 text-rv-navy hover:bg-gray-300'
          ">
        <input type="radio" v-model="viewMode" value="pendientes" class="hidden" />
        Pendientes
        <span v-if="totalPendings !== ''">({{ totalPendings }})</span>
      </label>
    </div>
    <!-- donde hoy tienes el select de orden -->
    <div v-if="viewMode === 'all' || viewMode === 'rates' || viewMode === 'covers' || viewMode === 'favorites'"
      class="mb-6 flex justify-start">
      <SimpleSelect class="select-pill w-full md:w-64" v-model="orderBy" :options="orderOptionsForTab"
        :placeholder="'Ordenar por'" />
    </div>

    <!-- Contenedor de cuadrícula para las tarjetas -->
    <div class="cards-grid">
      <DiscCard v-for="disc in discs" :key="disc.id" :id="disc.id" :ep="disc.ep" :artistCountry="disc.artist?.country"
        :image="disc.image" :name="disc.name" :releaseDate="disc.releaseDate"
        :artistName="disc.artist?.name || 'Desconocido'" :genreName="disc.genre?.name" :genreColor="disc.genre?.color"
        :link="disc.link" :averageRate="disc.averageRate" :averageCover="disc.averageCover" :rate="disc.userRate?.rate"
        :cover="disc.userRate?.cover" :isNew="!disc.userRate" :userDiscRate="disc.userRate?.id"
        :favoriteId="disc.favoriteId" :pendingId="disc.pendingId" :comment-count="disc.commentCount"
        :rateCount="disc.voteCount" :debut="disc.debut" />
    </div>

    <!-- Elemento para disparar la carga adicional -->
    <div ref="loadMore" class="mt-10 text-center">
      <span v-if="loading" class="text-rv-navy">Cargando más discos...</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, nextTick, computed } from "vue";
import { getDiscs } from "@services/discs/discs";
import DiscCard from "@components/DiscCardComponent.vue";
import Datepicker from "@vuepic/vue-datepicker";
import { getRatesByUser } from "@services/rates/rates";
import { useCatalogStore } from "@stores/catalog/catalog";
import { getFavoritesByUser } from "@services/favorites/favorites";
import { getPendingsByUser } from "@services/pendings/pendings";
import DiscFilters from "@components/DiscFilters.vue";
import SearchableSelect from "@components/SearchableSelect.vue";
import SimpleSelect from "@components/SimpleSelect.vue";

export default defineComponent({
  components: {
    DiscCard,
    Datepicker,
    SearchableSelect,
    DiscFilters,
    SimpleSelect,
  },
  setup() {
    const discs = ref<any[]>([]);
    const limit = ref(20);
    const offset = ref(0);
    const totalItems = ref(0);
    const loading = ref(false);
    const hasMore = ref(true);
    const viewMode = ref("all");
    const loadMore = ref(null);
    const totalDisc = ref("");
    const totalRates = ref("");
    const totalCovers = ref("");
    const totalFavorites = ref("");
    const totalPendings = ref("");

    const catalogStore = useCatalogStore();

    //filtros
    const searchQuery = ref("");
    const selectedWeek = ref(null);
    const selectedGenre = ref("");
    const selectedCountry = ref("");
    const menuVisible = ref(false);

    const orderBy = ref<string>("disc.releaseDate:DESC,artist.name:ASC");
    const orderOptions = [
      {
        label: "Novedades (recientes primero)",
        value: "disc.releaseDate:DESC,artist.name:ASC",
      },
      {
        label: "Fecha (antiguos primero)",
        value: "disc.releaseDate:ASC,artist.name:ASC",
      },
      { label: "Voto ⬆️", value: "rate.rate:DESC,disc.releaseDate:DESC" },
      { label: "Voto ⬇️", value: "rate.rate:ASC,disc.releaseDate:DESC" },
      { label: 'Portada ⬆️', value: 'rate.cover:DESC,artist.name:ASC' },
      { label: 'Portada ⬇️', value: 'rate.cover:ASC,artist.name:ASC' },
    ];

    const handleGenreChange = async (newValue: string) => {
      selectedGenre.value = newValue;
      console.log("selectedGenre" + selectedGenre.value);
      await nextTick();
    };


    const fetchData = async (reset = false) => {
      let type;
      if (loading.value) return;
      loading.value = true;
      console.log("selectedGenre.value", selectedGenre.value);
      try {
        if (reset) {
          discs.value = [];
          offset.value = 0;
          hasMore.value = true;
          totalCovers.value = "";
          totalDisc.value = "";
          totalFavorites.value = "";
          totalRates.value = "";
          totalPendings.value = "";
        }

        let response;
        if (viewMode.value === "rates") {
          type = "rate";
          response = await getRatesByUser(
            limit.value,
            offset.value,
            searchQuery.value,
            selectedWeek.value,
            selectedGenre.value,
            selectedCountry.value,
            type,
            orderBy.value
          );
          totalRates.value = response.totalItems;
          discs.value.push(
            ...response.data.map((rate) => ({
              ...rate.disc,
              artist: {
                ...rate.disc.artist,
                country: rate.disc.artist?.country ?? null,
              },
              userRate: {
                rate: rate.rate,
                cover: rate.cover,
                id: rate.id,
              },
              commentCount: rate.disc.commentCount,
              voteCount: rate.disc.voteCount,
            }))
          );
        } else if (viewMode.value === "covers") {
          type = "cover";
          response = await getRatesByUser(
            limit.value,
            offset.value,
            searchQuery.value,
            selectedWeek.value,
            selectedGenre.value,
            selectedCountry.value,
            type,
            orderBy.value
          );
          totalCovers.value = response.totalItems;
          discs.value.push(
            ...response.data.map((rate) => ({
              ...rate.disc,
              artist: {
                ...rate.disc.artist,
                country: rate.disc.artist?.country ?? null,
              },
              userRate: {
                rate: rate.rate,
                cover: rate.cover,
                id: rate.id,
              },
              commentCount: rate.disc.commentCount,
              voteCount: rate.disc.voteCount,
            }))
          );
        } else if (viewMode.value === "favorites") {
          response = await getFavoritesByUser(
            limit.value,
            offset.value,
            searchQuery.value,
            selectedWeek.value,
            selectedGenre.value,
            selectedCountry.value,
            type,
            orderBy.value
          );
          totalFavorites.value = response.totalItems;
          discs.value.push(
            ...response.data.map((favorite) => ({
              ...favorite.disc,
              artist: {
                ...favorite.disc.artist,
                country: favorite.disc.artist?.country ?? null,
              },
              favoriteId: favorite.id,
              pendingId: favorite.disc.userPending
                ? favorite.disc.userPending.id
                : null,
              userRate: favorite.disc.userRate
                ? {
                  id: favorite.disc.userRate.id,
                  rate: favorite.disc.userRate.rate,
                  cover: favorite.disc.userRate.cover,
                }
                : null,
              commentCount: favorite.disc.commentCount,
              voteCount: favorite.disc.voteCount,
            }))
          );
          console.log("disc.value", discs.value);
        } else if (viewMode.value === "pendientes") {
          response = await getPendingsByUser(
            limit.value,
            offset.value,
            searchQuery.value,
            selectedWeek.value,
            selectedGenre.value,
            selectedCountry.value
          );
          totalPendings.value = response.totalItems;
          discs.value.push(
            ...response.data.map((pending) => ({
              ...pending.disc,
              artist: {
                ...pending.disc.artist,
                country: pending.disc.artist?.country ?? null,
              },
              pendingId: pending.id,
              userRate: pending.disc.userRate
                ? {
                  id: pending.disc.userRate.id,
                  rate: pending.disc.userRate.rate,
                  cover: pending.disc.userRate.cover,
                }
                : null,
              commentCount: pending.disc.commentCount,
              voteCount: pending.disc.voteCount,
            }))
          );
        } else {
          let voted;
          let votedType;
          let actualOrderBy = orderBy.value;

          if (orderBy.value.startsWith("UNVOTED:")) {
            voted = false;
            votedType = orderBy.value.split(":")[1];
            actualOrderBy = "disc.releaseDate:DESC,artist.name:ASC";
          }

          response = await getDiscs(
            limit.value,
            offset.value,
            searchQuery.value,
            selectedWeek.value,
            selectedGenre.value,
            selectedCountry.value,
            actualOrderBy,
            voted,
            votedType
          );
          totalDisc.value = response.totalItems;
          discs.value.push(...response.data);
        }

        totalItems.value = response.totalItems;
        offset.value += limit.value;
        hasMore.value = offset.value < totalItems.value;
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        loading.value = false;
        await nextTick();
        checkIfNeedsMore();
      }
    };

    const checkIfNeedsMore = () => {
      if (!hasMore.value || loading.value || !loadMore.value) return;
      const rect = loadMore.value.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        fetchData();
      }
    };

    const ORDER = {
      NEWS_DESC: { label: "Más recientes", value: "disc.releaseDate:DESC,artist.name:ASC" },
      DATE_ASC: { label: "Más antiguos", value: "disc.releaseDate:ASC,artist.name:ASC" },
      RATE_DESC: { label: "Nota", value: "rate.rate:DESC,disc.releaseDate:DESC", icon: "up" },
      RATE_ASC: { label: "Nota", value: "rate.rate:ASC,disc.releaseDate:DESC", icon: "down" },
      COVER_DESC: { label: "Portada", value: "rate.cover:DESC,artist.name:ASC", icon: "up" },
      COVER_ASC: { label: "Portada", value: "rate.cover:ASC,artist.name:ASC", icon: "down" },
      UNVOTED_RATE: { label: "Discos sin votar", value: "UNVOTED:rate" },
      UNVOTED_COVER: { label: "Portadas sin votar", value: "UNVOTED:cover" },
    };

    const defaultOrderByForTab = computed(() => {
      switch (viewMode.value) {
        case "rates": return ORDER.NEWS_DESC.value;
        case "covers": return ORDER.NEWS_DESC.value;
        case "favorites": return ORDER.NEWS_DESC.value;
        default: return ORDER.NEWS_DESC.value;
      }
    });

    const orderOptionsForTab = computed(() => {
      switch (viewMode.value) {
        case "rates":
          return [ORDER.NEWS_DESC, ORDER.DATE_ASC, ORDER.RATE_DESC, ORDER.RATE_ASC];
        case "covers":
          return [ORDER.NEWS_DESC, ORDER.DATE_ASC, ORDER.COVER_DESC, ORDER.COVER_ASC];
        case "favorites":
          return [ORDER.NEWS_DESC, ORDER.DATE_ASC, ORDER.RATE_DESC, ORDER.RATE_ASC, ORDER.COVER_DESC, ORDER.COVER_ASC];
        default:
          return [ORDER.NEWS_DESC, ORDER.DATE_ASC, ORDER.UNVOTED_RATE, ORDER.UNVOTED_COVER];
      }
    });

    const setupObserver = () => {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore.value) {
          fetchData();
        }
      });
      if (loadMore.value) {
        observer.observe(loadMore.value);
      }
    };

    watch(viewMode, () => {
      orderBy.value = defaultOrderByForTab.value;
    });

    watch([viewMode, searchQuery, selectedWeek, selectedGenre, selectedCountry, orderBy], () => {
      resetAndFetch();
    });

    onMounted(() => {
      fetchData();
      setupObserver();
    });

    const resetAndFetch = () => {
      offset.value = 0;
      fetchData(true);
    };

    return {
      discs,
      loading,
      searchQuery,
      selectedWeek,
      selectedGenre,
      selectedCountry,
      genres: computed(() => catalogStore.genres),
      countries: computed(() => catalogStore.countries),
      viewMode,
      menuVisible,
      countriesLoaded,
      loadMore,
      totalDisc,
      totalRates,
      totalCovers,
      totalFavorites,
      totalPendings,
      resetAndFetch,
      handleGenreChange,
      orderBy,
      orderOptions,
      orderOptionsForTab,
      defaultOrderByForTab,
    };
  },
});
</script>

<style scoped>
.cards-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.filters-wrap {
  display: flex;
  flex-direction: column;
}

@media (min-width: 640px) {
  .filters-wrap {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }
}

input[type="checkbox"] {
  margin-right: 0.5rem;
}

.custom-height-select .search_input_trigger {
  height: 26px;
  padding: 0.6rem 0.75rem;
  font-size: 1rem;
  font-weight: 500;
}

.search__input::placeholder {
  color: #9ca3af;
}
</style>
