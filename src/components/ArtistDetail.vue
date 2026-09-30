<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { ArtistBiography } from "@/integrations/lastfm";
import { fetchArtistBiography } from "@/app/dependencies/artistBiography";
import ArtistDetailSpotify from "@/app/components/ArtistDetailSpotify.vue";

defineOptions({ name: "ArtistByDisc" });

const props = defineProps<{ discName: string; artistName: string }>();
const emit = defineEmits<{ close: [] }>();
const lastFmData = ref<ArtistBiography | null>(null);
const catalogIdentity = { discName: props.discName, artistName: props.artistName };

onMounted(async () => {
  lastFmData.value = await fetchArtistBiography(props.artistName);
});
</script>

<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
       @click.self="emit('close')">
    <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-2xl w-full max-w-2xl relative max-h-[88vh] overflow-y-auto border border-gray-100 dark:border-white/10">
      <button @click="emit('close')"
        class="absolute top-4 right-4 z-20 text-white bg-rv-navy hover:bg-rv-pink rounded-full w-9 h-9 flex items-center justify-center shadow-md transition-all border-0 outline-none focus:outline-none ring-0 focus:ring-0">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>

      <ArtistDetailSpotify :identity="catalogIdentity">
        <div v-if="lastFmData?.bio?.summary" class="px-6 pt-5 pb-4">
          <div class="flex items-center gap-2 mb-3">
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
              Biografía
            </p>
            <i class="fa-brands fa-lastfm text-xs text-gray-400 dark:text-gray-400"></i>
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed biography-content"
               v-html="lastFmData.bio.summary"></div>
        </div>

        <div v-if="lastFmData?.tags?.tag?.length" class="px-6 pb-4">
          <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-2">
            Etiquetas
          </p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="tag in lastFmData.tags.tag" :key="tag.name"
                  class="px-2.5 py-0.5 bg-rv-pink/10 dark:bg-rv-pink/20 text-rv-pink text-[11px] font-semibold rounded-full border border-rv-pink/20">
              {{ tag.name }}
            </span>
          </div>
        </div>
      </ArtistDetailSpotify>
    </div>
  </div>
</template>

<style scoped>
/* Limpia los enlaces que inyecta Last.fm en el v-html de la bio */
.biography-content :deep(a) {
  color: #e46e8a;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.biography-content :deep(a:hover) {
  opacity: 0.8;
}
</style>
