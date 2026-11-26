<script setup lang="ts">
import { faCrown, faMedal } from "@fortawesome/free-solid-svg-icons";
import type { TopDiscsCardUpdateEvent, TopRankedDisc } from "../../types/topDiscs";
import DiscCard from "@components/DiscCardComponent.vue";

defineProps<{ discs: TopRankedDisc[] }>();
const emit = defineEmits<{ "card-updated": [event: TopDiscsCardUpdateEvent] }>();

const tiers = ["gold", "silver", "bronze"] as const;
</script>

<template>
  <section
    v-if="discs.length"
    aria-label="Top 3 de la clasificación"
    data-testid="top-discs-featured-section"
    class="featured-section"
  >
    <ol class="featured-grid" aria-label="Primeros tres discos de la clasificación">
      <li
        v-for="(disc, index) in discs"
        :key="disc.id"
        class="featured-item"
        :class="`podium-${tiers[index]} podium-pos-${index + 1}`"
      >
        <span class="medal-chip" :class="`medal-${tiers[index]}`">
          <font-awesome-icon :icon="index === 0 ? faCrown : faMedal" class="medal-icon" aria-hidden="true" />
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
          @card-updated="emit('card-updated', $event)"
        />
      </li>
    </ol>
  </section>
</template>

<style scoped>
.featured-section {
  /* Deja sitio a la medalla, que sobresale por encima del marco del podio. */
  margin-top: 2rem;
  border-bottom: 1px solid rgb(107 114 128 / 25%);
  padding-bottom: 2.5rem;
}

/* Móvil y tablet: el podio se apila de arriba abajo (1º, 2º, 3º). */
.featured-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: 2.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.featured-item {
  --tier: 107 114 128;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 23rem;
  min-width: 0;
  padding: 1.9rem 0.5rem 0.75rem;
  border: 2px solid rgb(var(--tier) / 45%);
  border-radius: 1.25rem;
  background: linear-gradient(180deg, rgb(var(--tier) / 18%), rgb(var(--tier) / 4%) 70%);
  box-shadow: 0 10px 30px -12px rgb(var(--tier) / 55%);
}

.podium-gold {
  --tier: 234 170 0;
}

.podium-silver {
  --tier: 140 150 165;
}

.podium-bronze {
  --tier: 196 112 48;
}

.medal-chip {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.95rem;
  border: 2px solid #fff;
  border-radius: 9999px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 2px rgb(0 0 0 / 25%);
  box-shadow: 0 4px 12px rgb(var(--tier) / 50%);
  white-space: nowrap;
}

.medal-icon {
  font-size: 0.8rem;
}

.medal-gold {
  background: linear-gradient(135deg, #ffd54a, #e08a00);
}

.medal-silver {
  background: linear-gradient(135deg, #d4d8de, #7d8692);
}

.medal-bronze {
  background: linear-gradient(135deg, #e0a06a, #9a4f1c);
}

.dark .featured-item {
  background: linear-gradient(180deg, rgb(var(--tier) / 22%), rgb(var(--tier) / 5%) 70%);
}

.dark .medal-chip {
  border-color: #1b1d3a;
}

/* Escritorio: podio clásico 2º · 1º · 3º, con el 1º más alto. */
@media (min-width: 640px) {
  .featured-item {
    padding: 2rem 1rem 1rem;
  }
}

@media (min-width: 1024px) {
  .featured-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: end;
    gap: 2rem;
  }

  .podium-pos-1 {
    order: 2;
    padding-top: 2.75rem;
    padding-bottom: 2.25rem;
  }

  .podium-pos-1 .medal-chip {
    font-size: 1.05rem;
    padding: 0.45rem 1.2rem;
  }

  .podium-pos-2 {
    order: 1;
  }

  .podium-pos-3 {
    order: 3;
  }
}
</style>
