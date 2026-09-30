<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { DiscDetailIdentity } from "@/modules/catalog";
import { SpotifyAlbumContent, type AlbumDetails } from "@/integrations/spotify";
import { fetchDiscAlbumDetails } from "../dependencies/discDetail";

const props = defineProps<{ disc: DiscDetailIdentity }>();
const emit = defineEmits<{ close: [] }>();
const album = ref<AlbumDetails | null>(null);
const loading = ref(true);
const error = ref("");

onMounted(async () => {
  const result = await fetchDiscAlbumDetails({
    albumName: props.disc.name, artistName: props.disc.artist.name,
  });
  if (result.status === "found") album.value = result.album;
  else error.value = {
    "token-unavailable": "No se pudo obtener el token de Spotify",
    "not-found": "Álbum no encontrado en Spotify",
    failed: "Error al buscar el álbum en Spotify",
  }[result.status];
  loading.value = false;
});
</script>

<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
       @click.self="emit('close')">

    <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-2xl
                w-full max-w-2xl relative max-h-[88vh] overflow-y-auto
                border border-gray-100 dark:border-white/10">

      <!-- Botón cerrar siempre visible -->
      <button @click="emit('close')"
        class="absolute top-4 right-4 z-20 text-white bg-rv-navy hover:bg-rv-pink
               rounded-full w-9 h-9 flex items-center justify-center shadow-md transition-all
               border-0 outline-none focus:outline-none ring-0 focus:ring-0">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>

      <!-- ── Loading ─────────────────────────────────── -->
      <div v-if="loading" class="py-20 text-center">
        <i class="fa-solid fa-spinner animate-spin text-2xl text-rv-pink mb-3 block"></i>
        <span class="text-sm text-gray-400 dark:text-gray-500">Buscando en Spotify...</span>
      </div>

      <!-- ── Error ──────────────────────────────────── -->
      <div v-else-if="error" class="py-16 text-center px-6">
        <i class="fa-brands fa-spotify text-4xl text-gray-300 dark:text-white/20 mb-3 block"></i>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ error }}</p>
      </div>

      <!-- ── Contenido ──────────────────────────────── -->
      <SpotifyAlbumContent v-else-if="album" :album="album" />
    </div>
  </div>
</template>
