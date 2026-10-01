<script setup lang="ts">
import type { ArtistManagementDisc, ArtistManagementMatch } from "../../../domain/artistManagement";
import type { LastFmManagementProfile } from "../../application/artistExternalProfile";

defineProps<{
  show: boolean;
  artistName: string;
  artistImage: string | null;
  profile: LastFmManagementProfile | null;
  catalogArtist: ArtistManagementMatch | null;
}>();

const emit = defineEmits<{
  close: [];
  navigateSimilar: [name: string];
  openDisc: [disc: ArtistManagementDisc];
}>();

const cleanBio = (content: string) => content
  .split("User-contributed")[0]
  .replace(/<a[^>]*>[\s\S]*?<\/a>/gi, "")
  .trim();

const formatDate = (date: string) => new Date(date).toLocaleDateString("es-ES", {
  year: "numeric",
  month: "short",
  day: "numeric",
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40"
      @click.self="emit('close')"
    >
      <div
        class="bg-white dark:bg-rv-darkBg rounded-2xl shadow-xl text-rv-navy dark:text-white w-full max-w-3xl max-h-[92vh] overflow-y-auto relative"
      >
        <button
          class="absolute top-3 right-3 text-white bg-black/30 hover:bg-black/50 rounded-full w-8 h-8 flex items-center justify-center z-10 text-base"
          @click="emit('close')"
        >
          &times;
        </button>

        <div class="relative h-72 bg-gray-100 dark:bg-white/10 overflow-hidden rounded-t-2xl">
          <img
            v-if="artistImage"
            :src="artistImage"
            class="absolute inset-0 w-full h-full object-cover"
            style="object-position: center 30%"
          />
          <div v-else class="absolute inset-0 bg-gradient-to-br from-rv-pink to-rv-purple"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <div class="absolute bottom-4 left-4 right-12 flex flex-col gap-1.5">
            <div class="flex items-center gap-2 flex-wrap">
              <i class="fa-brands fa-lastfm text-red-400 text-xl"></i>
              <span class="text-white font-bold text-xl leading-tight">{{ artistName }}</span>
              <span
                v-if="profile?.ontour === '1'"
                class="text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide"
              >En gira</span>
            </div>
            <a
              v-if="profile?.url"
              :href="profile.url"
              target="_blank"
              rel="noopener"
              class="text-xs text-white/70 hover:text-white underline w-fit"
            >Ver en Last.fm</a>
          </div>
        </div>

        <div v-if="!profile" class="p-8 text-center text-gray-400 dark:text-gray-400 text-sm">
          <i class="fa-brands fa-lastfm text-2xl text-red-400 mb-2 block"></i>
          Cargando...
        </div>

        <div v-else class="p-5 flex flex-col gap-4">
          <div v-if="profile.stats" class="flex gap-3">
            <div class="flex-1 bg-gray-50 dark:bg-white/10 rounded-xl p-3 text-center">
              <p class="text-lg font-bold text-rv-navy dark:text-white">
                {{ Number(profile.stats.listeners).toLocaleString("es-ES") }}
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-300 uppercase tracking-wide">Oyentes</p>
            </div>
            <div class="flex-1 bg-gray-50 dark:bg-white/10 rounded-xl p-3 text-center">
              <p class="text-lg font-bold text-rv-navy dark:text-white">
                {{ Number(profile.stats.playcount).toLocaleString("es-ES") }}
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-300 uppercase tracking-wide">Reproducciones</p>
            </div>
          </div>

          <div v-if="profile.tags?.tag?.length">
            <p class="text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wide mb-2">Etiquetas</p>
            <div class="flex flex-wrap gap-1.5">
              <a
                v-for="tag in profile.tags.tag"
                :key="tag.name"
                :href="tag.url"
                target="_blank"
                rel="noopener"
                class="px-2.5 py-0.5 bg-rv-pink rounded-full text-white text-xs font-semibold hover:opacity-80 transition-opacity"
              >{{ tag.name }}</a>
            </div>
          </div>

          <div v-if="profile.bio?.content">
            <p class="text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wide mb-2">Biografía</p>
            <div
              class="text-sm text-gray-700 dark:text-gray-200 leading-relaxed"
              v-html="cleanBio(profile.bio.content)"
            ></div>
            <p v-if="profile.bio.published" class="text-xs text-gray-400 dark:text-gray-400 mt-2">
              Publicado: {{ profile.bio.published }}
            </p>
          </div>

          <div v-if="catalogArtist?.discs.length">
            <p class="text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wide mb-2">Discos en la app</p>
            <div class="flex flex-col gap-1.5">
              <div
                v-for="disc in catalogArtist.discs"
                :key="disc.id"
                class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 rounded-xl p-1 -mx-1 transition-colors"
                @click="emit('openDisc', disc)"
              >
                <img v-if="disc.image" :src="disc.image" class="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                <div v-else class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-300 flex-shrink-0">
                  <i class="fa-solid fa-compact-disc text-sm"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <span class="font-medium truncate text-rv-navy dark:text-white block hover:underline">{{ disc.name }}</span>
                  <span class="text-xs text-gray-400 dark:text-gray-400">{{ formatDate(disc.releaseDate) }}</span>
                  <span v-if="disc.genre" class="text-xs ml-2" :style="{ color: disc.genre.color }">{{ disc.genre.name }}</span>
                </div>
                <div class="flex flex-col items-center w-12 text-center flex-shrink-0">
                  <span class="text-sm font-bold text-blue-600">{{ disc.rateCount > 0 ? disc.averageRate.toFixed(1) : "-" }}</span>
                  <span class="text-[10px] text-gray-400 dark:text-gray-400">{{ disc.rateCount > 0 ? `(${disc.rateCount})` : "Sin votos" }}</span>
                </div>
                <i class="fa-solid fa-chevron-right text-xs text-gray-300 flex-shrink-0"></i>
              </div>
            </div>
          </div>

          <div v-if="profile.similar?.artist?.length">
            <p class="text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wide mb-2">Artistas similares</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="similar in profile.similar.artist"
                :key="similar.name"
                class="px-2.5 py-1 bg-gray-100 dark:bg-white/10 hover:bg-rv-pink hover:text-white rounded-full text-xs text-rv-navy dark:text-white font-medium transition-colors"
                @click="emit('navigateSimilar', similar.name)"
              >
                {{ similar.name }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
