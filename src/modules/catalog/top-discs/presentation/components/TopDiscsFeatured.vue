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
  /* Deja sitio a la medalla, que sobresale por encima del borde de la tarjeta. */
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
  max-width: 20rem;
  min-width: 0;
}

/* Sin marco alrededor: la propia tarjeta lleva el borde del color de la medalla,
   un degradado suave por dentro y un brillo detrás. La medalla queda montada sobre su borde. */
.featured-item > :deep(.card) {
  /* Algo más fino que el borde de 2px de la tarjeta: con el color del podio se veía tosco. */
  border-width: 1.5px;
  border-color: rgb(var(--tier) / 85%);
  background-image: linear-gradient(180deg, rgb(var(--tier) / 14%), rgb(var(--tier) / 0%) 55%);
  box-shadow:
    0 0 0 1px rgb(var(--tier) / 20%),
    0 10px 28px -10px rgb(var(--tier) / 50%);
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
  /* Apoyada sobre el borde, sin tapar la bandera de la cabecera de la tarjeta. */
  transform: translate(-50%, -85%);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.8rem;
  border: 2px solid #fff;
  border-radius: 9999px;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 2px rgb(0 0 0 / 25%);
  box-shadow: 0 4px 12px rgb(var(--tier) / 50%);
  white-space: nowrap;
  z-index: 1;
}

.medal-icon {
  font-size: 0.7rem;
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

.dark .featured-item > :deep(.card) {
  border-color: rgb(var(--tier) / 90%);
  background-image: linear-gradient(180deg, rgb(var(--tier) / 20%), rgb(var(--tier) / 0%) 55%);
  box-shadow:
    0 0 0 1px rgb(var(--tier) / 25%),
    0 10px 32px -8px rgb(var(--tier) / 42%);
}

.dark .medal-chip {
  border-color: #1b1d3a;
}

/* Desde 1280px: a 1024px, con el menú lateral, las tarjetas del podio quedaban demasiado estrechas. */
@media (min-width: 1280px) {
  .featured-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    /* Las tres tarjetas en fila, alineadas por arriba a la misma altura. */
    align-items: start;
    gap: 2rem;
  }

  /* Orden 2º · 1º · 3º: el 1º en el centro, destacado solo por su medalla más grande. */
  .podium-pos-1 {
    order: 2;
  }

  .podium-pos-1 .medal-chip {
    font-size: 0.9rem;
    padding: 0.36rem 1rem;
  }

  .podium-pos-2 {
    order: 1;
  }

  .podium-pos-3 {
    order: 3;
  }
}
</style>
