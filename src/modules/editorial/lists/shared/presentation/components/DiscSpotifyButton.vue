<template>
  <button
    type="button"
    :aria-label="`Abrir ${discName} en Spotify`"
    :title="`Abrir ${discName} en Spotify`"
    @click="openAlbum"
  >
    <i class="fa-brands fa-spotify" aria-hidden="true"></i>
  </button>
</template>

<script setup lang="ts">
import SwalService from "@services/swal/SwalService";
import { resolveSpotifyAlbum } from "@services/spotify/spotifyLookup";

const props = defineProps<{
  discName: string;
  artistName: string;
  albumUrl?: string | null;
}>();

const isSpotifyAlbumUrl = (url?: string | null): url is string => {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const albumSegmentIndex = pathSegments[0]?.startsWith("intl-") ? 1 : 0;

    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "open.spotify.com" &&
      pathSegments[albumSegmentIndex] === "album" &&
      Boolean(pathSegments[albumSegmentIndex + 1])
    );
  } catch {
    return false;
  }
};

const openAlbum = async () => {
  try {
    const albumUrl = isSpotifyAlbumUrl(props.albumUrl)
      ? props.albumUrl
      : (await resolveSpotifyAlbum(props.discName, props.artistName))?.listenUrl;

    if (!albumUrl) {
      SwalService.error("No se pudo encontrar el disco en Spotify.");
      return;
    }

    window.open(albumUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error("Error al buscar el disco en Spotify:", error);
    SwalService.error("Ocurrió un error al intentar abrir el disco en Spotify.");
  }
};
</script>
