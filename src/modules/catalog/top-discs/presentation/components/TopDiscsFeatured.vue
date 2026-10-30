<script setup lang="ts">
import { faTrophy } from "@fortawesome/free-solid-svg-icons";
import type { TopRankedDisc } from "../../types/topDiscs";
import DiscCard from "@components/DiscCardComponent.vue";

interface RatingSavedEvent {
  discId: string;
  action: "created" | "updated";
  musicalRateChanged: boolean;
  hasMusicalRate: boolean;
  coverChanged: boolean;
}

defineProps<{ discs: TopRankedDisc[] }>();
const emit = defineEmits<{ "rating-saved": [event: RatingSavedEvent] }>();

function medalClass(index: number): string {
  if (index === 0) return "medal-gold";
  if (index === 1) return "medal-silver";
  return "medal-bronze";
}
</script>

<template>
  <section
    v-if="discs.length"
    aria-label="Top 3 de la clasificación"
    data-testid="top-discs-featured-section"
    class="featured-section"
  >
    <ol class="featured-grid" aria-label="Primeros tres discos de la clasificación">
      <li v-for="(disc, index) in discs" :key="disc.id" class="featured-item">
        <span class="medal-chip" :class="medalClass(index)">
          <font-awesome-icon :icon="faTrophy" class="text-[10px]" aria-hidden="true" />
          {{ index + 1 }}º
        </span>
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
          @rating-saved="emit('rating-saved', $event)"
        />
      </li>
    </ol>
  </section>
</template>

<style scoped>
.featured-section {
  border-bottom: 1px solid rgb(107 114 128 / 25%);
  padding-bottom: 2rem;
}

.featured-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.featured-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.medal-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  box-shadow: 0 2px 6px rgb(0 0 0 / 15%);
}

.medal-gold {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
}

.medal-silver {
  background: linear-gradient(135deg, #c0c0c0, #888);
}

.medal-bronze {
  background: linear-gradient(135deg, #cd7f32, #8b4513);
}

@media (min-width: 640px) {
  .featured-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .featured-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 2rem;
  }
}
</style>
