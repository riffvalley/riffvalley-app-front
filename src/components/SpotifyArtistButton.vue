<template>
  <button
    @click="openArtistLink"
    class="bg-green-500 text-white px-2 py-1.5 rounded flex items-center justify-center transition-colors hover:bg-green-600"
  >
    <i class="fa-brands fa-spotify"></i>
  </button>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import SwalService from "@services/swal/SwalService";
import { findArtistLink } from "@/integrations/spotify";

export default defineComponent({
  name: "SpotifyArtistButton",
  props: {
    artistName: {
      type: String,
      required: true,
    },
  },
  methods: {
    async openArtistLink() {
      try {
        const link = await findArtistLink(this.artistName);
        if (link) {
          window.open(link, "_blank");
        } else {
          SwalService.error(
            "No se pudo encontrar el enlace del artista en Spotify."
          );
        }
      } catch (error) {
        console.error("Error al obtener el enlace del artista:", error);
        SwalService.error("Ocurrió un error al intentar abrir el enlace.");
      }
    },
  },
});
</script>

