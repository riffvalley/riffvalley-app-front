<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { ArtistDetailIdentity } from "@/modules/catalog";
import { SpotifyArtistContent, type ArtistDetails } from "@/integrations/spotify";
import { fetchArtistDetails } from "../dependencies/artistDetail";

const props = defineProps<{ identity: ArtistDetailIdentity }>();
const details = ref<ArtistDetails | null>(null);
const loading = ref(true);
const error = ref("");

onMounted(async () => {
  const result = await fetchArtistDetails(props.identity);
  if (result.status === "found") details.value = result.details;
  else error.value = {
    "token-unavailable": "No se pudo obtener el token de Spotify",
    "not-found": "No se encontró ningún álbum en Spotify con esos datos",
    "artist-not-found": "No se encontró un artista válido en el álbum",
    failed: "Error al buscar el artista en Spotify",
  }[result.status];
  loading.value = false;
});
</script>

<template>
  <div v-if="loading" class="py-20 text-center">
    <i class="fa-solid fa-spinner animate-spin text-2xl text-rv-pink mb-3 block"></i>
    <span class="text-sm text-gray-400 dark:text-gray-500">Buscando en Spotify...</span>
  </div>
  <div v-else-if="error" class="py-16 text-center px-6">
    <i class="fa-brands fa-spotify text-4xl text-gray-300 dark:text-white/20 mb-3 block"></i>
    <p class="text-sm text-gray-500 dark:text-gray-400">{{ error }}</p>
  </div>
  <SpotifyArtistContent v-else-if="details" :details="details"><slot /></SpotifyArtistContent>
</template>
