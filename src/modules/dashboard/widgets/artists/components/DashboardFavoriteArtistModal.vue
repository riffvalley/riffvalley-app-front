<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import type { RatesTopArtistDto } from "@services/rates/rates";
import { ArtistDetailsModal } from "@/modules/catalog/artists";

const props = defineProps<{ artist: RatesTopArtistDto }>();
const emit = defineEmits<{ close: [] }>();
const currentArtistId = shallowRef(props.artist.id);
watch(() => props.artist.id, (id) => { currentArtistId.value = id; });
const personalArtist = computed(() => ({
  ...props.artist,
  id: currentArtistId.value,
  image: currentArtistId.value === props.artist.id ? props.artist.image : null,
}));
</script>

<template>
  <ArtistDetailsModal
    :artist-id="currentArtistId"
    :favorite-artist="personalArtist"
    @close="emit('close')"
    @open-related-artist="currentArtistId = $event"
  />
</template>
