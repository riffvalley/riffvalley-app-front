<script setup lang="ts">
import type { TopDiscsCardUpdateEvent, TopRankedDisc } from "../../types/topDiscs";
import DiscCard from "@components/DiscCardComponent.vue";

defineProps<{ discs: TopRankedDisc[] }>();
const emit = defineEmits<{ "card-updated": [event: TopDiscsCardUpdateEvent] }>();
</script>

<template>
  <section
    v-if="discs.length"
    aria-label="Resto de la clasificación"
    data-testid="top-discs-grid-section"
    class="remaining-section"
  >
    <ol class="remaining-grid" aria-label="Discos secundarios de la clasificación">
      <li v-for="disc in discs" :key="disc.id" class="remaining-item">
        <DiscCard
          :id="disc.id"
          :ep="disc.ep"
          :image="disc.image"
          :name="disc.name"
          :releaseDate="disc.releaseDate"
          :artistName="disc.artist?.name"
          :genreName="disc.genre?.name"
          :genreColor="disc.genre?.color"
          :link="disc.link"
          :averageRate="disc.averageRate"
          :averageCover="disc.averageCover"
          :rate="disc.userRate?.rate"
          :cover="disc.userRate?.cover"
          :isNew="!disc.userRate"
          :userDiscRate="disc.userRate?.id"
          :favoriteId="disc.userFavoriteId"
          :pendingId="disc.pendingId"
          :comment-count="disc.commentCount"
          :rateCount="disc.voteCount"
          show-zero-average-rate
          :artistCountry="disc.artist?.country"
          :debut="disc.debut"
          @card-updated="emit('card-updated', $event)"
        />
      </li>
    </ol>
  </section>
</template>

<style scoped>
.remaining-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.remaining-item {
  min-width: 0;
}

@media (min-width: 640px) {
  .remaining-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .remaining-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
