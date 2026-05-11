<template>
  <div class="max-w-[100rem] mx-auto mt-10 px-4">
    <h1 class="text-4xl font-bold mb-2 text-center text-rv-navy dark:text-white">
      Discos sin portada
    </h1>
    <p class="text-center text-gray-500 dark:text-gray-400 mb-8 text-sm">
      Discos que no tienen imagen asignada (no encontrados en Spotify/Bandcamp)
    </p>

    <DiscFilters
      :searchQuery="searchQuery"
      :selectedGenre="selectedGenre"
      :selectedWeek="selectedWeek"
      :genres="genres"
      :selectedCountry="selectedCountry"
      :countries="countries"
      @update:searchQuery="searchQuery = $event"
      @update:selectedGenre="selectedGenre = $event"
      @update:selectedWeek="selectedWeek = $event"
      @update:selectedCountry="selectedCountry = $event"
      selectClass="w-full"
      wrapperClass=""
      @resetAndFetch="resetAndFetch"
    />

    <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
      {{ errorDiscs.length }} disco{{ errorDiscs.length !== 1 ? 's' : '' }} sin portada cargados
      <span v-if="hasMore"> (cargando más...)</span>
    </p>

    <div class="cards-grid">
      <DiscCard
        v-for="disc in errorDiscs"
        :key="disc.id"
        :id="disc.id"
        :ep="disc.ep"
        :artistCountry="disc.artist?.country"
        :image="disc.image"
        :name="disc.name"
        :releaseDate="disc.releaseDate"
        :artistName="disc.artist?.name || 'Desconocido'"
        :genreName="disc.genre?.name"
        :genreColor="disc.genre?.color"
        :link="disc.link"
        :averageRate="disc.averageRate"
        :averageCover="disc.averageCover"
        :rate="disc.userRate?.rate"
        :cover="disc.userRate?.cover"
        :isNew="!disc.userRate"
        :userDiscRate="disc.userRate?.id"
        :favoriteId="disc.favoriteId"
        :pendingId="disc.pendingId"
        :comment-count="disc.commentCount"
        :rateCount="disc.voteCount"
        :debut="disc.debut"
      />
    </div>

    <div
      v-if="!loading && !hasMore && errorDiscs.length === 0"
      class="text-center text-gray-500 dark:text-gray-400 mt-16"
    >
      <i class="fa-solid fa-circle-check text-green-500 text-4xl mb-3 block"></i>
      No hay discos sin portada. ¡Todo en orden!
    </div>

    <div ref="loadMore" class="mt-10 flex flex-col items-center justify-center gap-3">
      <i v-if="loading" class="fa-solid fa-compact-disc animate-spin text-rv-pink text-3xl"></i>
      <span v-if="loading" class="text-sm font-medium text-rv-navy dark:text-white">
        Cargando discos...
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch, nextTick } from "vue";
import { getDiscs } from "@services/discs/discs";
import DiscCard from "@components/DiscCardComponent.vue";
import { useCatalogStore } from "@stores/catalog/catalog";
import DiscFilters from "@components/DiscFilters.vue";

export default defineComponent({
  components: { DiscCard, DiscFilters },

  setup() {
    const allDiscs = ref<any[]>([]);
    const limit = ref(50);
    const offset = ref(0);
    const totalItems = ref(0);
    const loading = ref(false);
    const hasMore = ref(true);
    const loadMore = ref<HTMLDivElement | null>(null);

    const searchQuery = ref("");
    const selectedWeek = ref(null);
    const selectedGenre = ref("");
    const selectedCountry = ref("");

    const catalogStore = useCatalogStore();

    const errorDiscs = computed(() => allDiscs.value.filter(d => !d.image));

    const fetchDiscs = async (reset = false) => {
      if (loading.value) return;
      loading.value = true;

      try {
        if (reset) {
          allDiscs.value = [];
          offset.value = 0;
          hasMore.value = true;
          totalItems.value = 0;
        }

        const response = await getDiscs(
          limit.value,
          offset.value,
          searchQuery.value,
          selectedWeek.value,
          selectedGenre.value,
          selectedCountry.value,
          "disc.releaseDate:DESC,artist.name:ASC"
        );

        totalItems.value = response.totalItems;
        allDiscs.value.push(
          ...(response.data as any[]).map(disc => ({
            ...disc,
            userRate: disc.userRate
              ? {
                  ...disc.userRate,
                  rate: disc.userRate.rate != null ? parseFloat(disc.userRate.rate) : null,
                  cover: disc.userRate.cover != null ? parseFloat(disc.userRate.cover) : null,
                }
              : null,
          }))
        );

        offset.value += limit.value;
        hasMore.value = offset.value < totalItems.value;
      } catch (error) {
        console.error("Error fetching discs:", error);
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
        fetchDiscs();
      }
    };

    const resetAndFetch = () => fetchDiscs(true);

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore.value) {
        fetchDiscs();
      }
    });

    watch([searchQuery, selectedWeek, selectedGenre, selectedCountry], () => {
      resetAndFetch();
    });

    onMounted(() => {
      fetchDiscs();
      if (loadMore.value) observer.observe(loadMore.value);
    });

    return {
      errorDiscs,
      loading,
      hasMore,
      loadMore,
      searchQuery,
      selectedWeek,
      selectedGenre,
      selectedCountry,
      genres: computed(() => catalogStore.genres),
      countries: computed(() => catalogStore.countries),
      resetAndFetch,
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
</style>
