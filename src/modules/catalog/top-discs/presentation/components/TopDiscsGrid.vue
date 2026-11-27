<script setup lang="ts">
import type { TopDiscsCardUpdateEvent, TopRankedDisc } from "../../types/topDiscs";
import DiscCard from "@components/DiscCardComponent.vue";

withDefaults(defineProps<{ discs: TopRankedDisc[]; startPosition?: number }>(), { startPosition: 4 });
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
      <li v-for="(disc, index) in discs" :key="disc.id" class="remaining-item">
        <span v-if="disc.voteCount > 0" class="rank-chip" data-testid="rank-position">{{ startPosition + index }}º</span>
        <span v-else class="rank-chip rank-chip-muted" data-testid="rank-position">Sin votos</span>
        <DiscCard
          :id="disc.id"
          :ep="disc.ep"
          :image="disc.image"
          :name="disc.name"
          :releaseDate="disc.releaseDate"
          :artistName="disc.artist?.name"
          :artistId="disc.artist?.id"
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
  gap: 1.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.remaining-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.rank-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  padding: 0.2rem 0.7rem;
  border-radius: 9999px;
  background: #00021f;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.rank-chip-muted {
  background: rgb(107 114 128 / 15%);
  color: #4b5563;
  font-weight: 600;
}

.dark .rank-chip {
  background: rgb(255 255 255 / 12%);
}

.dark .rank-chip-muted {
  background: rgb(255 255 255 / 6%);
  color: #9ca3af;
}

/* Columnas según el ancho REAL de la rejilla, no el de la pantalla: el menú lateral aparece a 768px
   y resta espacio, así que una media query dejaba tarjetas de ~180px con iconos fuera.
   Cada tarjeta mide al menos 14.5rem (por debajo, la portada fija de 136px no deja sitio a los iconos);
   como máximo 4 columnas, y una sola si ni siquiera caben dos. */
.remaining-grid {
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(100%, max(14.5rem, calc((100% - 4.5rem) / 4))), 1fr)
  );
}
</style>
