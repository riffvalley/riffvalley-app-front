<template>
  <div class="min-h-[100svh] flex flex-col items-center justify-center
          py-6 sm:py-8
          bg-gradient-to-br from-orange-50 via-purple-50 to-blue-100
          dark:from-[#0d0010] dark:via-rv-darkBg dark:to-[#00102a]
          relative overflow-x-hidden" @click="background?.closeSelector()">
    <div class="relative z-10 w-full max-w-sm shadow-lg rounded-3xl overflow-hidden bg-white dark:bg-rv-darkCard border border-gray-100 dark:border-white/10">
      <div class="relative px-5 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-5 text-center bg-gradient-to-b from-[#fe7b4a] via-[#a569aa] to-[#1464d0]">
        <img src="/bg-mountains.jpg" alt="" class="absolute bottom-0 left-0 w-full h-full scale-[1.05] origin-bottom pointer-events-none select-none" />
        <div class="relative z-10">
          <img src="/LOGO-RIFF-VALLEY.svg" alt="Riff Valley Logo" class="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3 drop-shadow" />
          <div class="flex items-baseline justify-center gap-[2px]">
            <span class="font-brand text-3xl sm:text-4xl tracking-wide text-white drop-shadow-sm">RIFF VALLEY</span>
            <span class="text-sm font-medium tracking-widest lowercase text-white/80 relative top-[2px]">app</span>
          </div>
        </div>
      </div>
      <div class="p-4 sm:p-5"><LoginForm /></div>
    </div>

    <div class="mt-3 sm:mt-5 flex items-center justify-center gap-3">
      <button @click="showHowToUse = true" class="inline-flex items-center text-[#211d1d] dark:text-white font-semibold px-4 py-2 rounded-full shadow-md
               bg-gray-100 dark:bg-rv-darkCard hover:bg-gray-200 dark:hover:bg-rv-darkSurface
               hover:text-rv-navy dark:hover:text-white border border-gray-100 dark:border-white/10
               transition duration-100 hover:-translate-y-[1px]">
        <i class="fa-solid fa-circle-question text-md mr-2"></i>Cómo usar la app
      </button>
      <a href="https://riffvalley.es" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-[#211d1d] dark:text-white font-semibold px-4 py-2 rounded-full shadow-md
               bg-gray-100 dark:bg-rv-darkCard hover:bg-gray-200 dark:hover:bg-rv-darkSurface
               hover:text-rv-navy dark:hover:text-white border border-gray-100 dark:border-white/10
               transition duration-100 hover:-translate-y-[1px]">
        <i class="fa-solid fa-globe text-md mr-2"></i>riffvalley.es
      </a>
    </div>

    <div class="mt-1.5 sm:mt-3 w-full max-w-sm px-4">
      <button @click="showAccessRequest = true" class="w-full rounded-2xl bg-white dark:bg-rv-darkCard shadow-md
               border border-gray-100 dark:border-white/10
               hover:-translate-y-[1px] hover:shadow-lg
               transition-all duration-150 overflow-hidden">
        <div class="h-1 w-full bg-gradient-to-r from-[#fe7b4a] via-[#a569aa] to-[#1464d0]"></div>
        <div class="flex items-center gap-3 px-4 py-3">
          <div class="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[#a569aa] to-[#1464d0] flex items-center justify-center shadow-sm"><i class="fa-solid fa-user-plus text-white text-sm"></i></div>
          <div class="text-left"><p class="text-sm font-bold text-[#211d1d] dark:text-white leading-tight">¿Te gusta lo que ves y quieres votar discos?</p><p class="mt-0.5 text-xs text-gray-500 dark:text-gray-300">Solicita acceso a Riff Valley app</p></div>
          <i class="fa-solid fa-chevron-right text-xs text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0"></i>
        </div>
      </button>
    </div>

    <div class="mt-2 sm:mt-5 flex items-center justify-center gap-2 sm:gap-3">
      <a v-for="social in socials" :key="social.href" :href="social.href" target="_blank" rel="noopener noreferrer"
        class="relative group w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full
                bg-gray-100 dark:bg-rv-darkCard text-[#211d1d] dark:text-white border border-gray-100 dark:border-white/10
                shadow-md hover:-translate-y-[1px] hover:text-white dark:hover:text-white
                transition-all duration-150" :class="social.hover">
        <span class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium rounded-lg
          bg-gray-800 dark:bg-white text-white dark:text-gray-900
          opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap pointer-events-none z-20">{{ social.label }}</span>
        <i :class="social.icon"></i>
      </a>
    </div>

    <div class="mt-2 sm:mt-4 flex items-center justify-center">
      <label class="flex items-center justify-center gap-3 text-[#211d1d] dark:text-white/75 cursor-pointer">
        <i class="fa-regular fa-sun text-base transition-colors" :class="!isDarkMode ? 'text-rv-pink' : 'text-gray-400 dark:text-white/45'"></i>
        <button type="button" role="switch" :aria-checked="isDarkMode" @click.stop="toggleDarkMode"
          class="relative w-11 h-6 rounded-full transition-all duration-300
                 border border-gray-200 dark:border-white/20
                 bg-gray-200 dark:bg-white/15 hover:bg-gray-300 dark:hover:bg-white/25
                 outline-none focus:outline-none focus-visible:outline-none
                 ring-0 focus:ring-0 focus-visible:ring-0">
          <span class="absolute top-1/2 left-0.5 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-md
                       transition-transform duration-300" :class="isDarkMode ? 'translate-x-5' : 'translate-x-0'"></span>
        </button>
        <i class="fa-solid fa-moon text-base transition-colors" :class="isDarkMode ? 'text-rv-pink' : 'text-gray-400 dark:text-white/45'"></i>
      </label>
    </div>

    <LoginBackground ref="background" />

    <HowToUseModal v-if="showHowToUse" @close="showHowToUse = false" />
  </div>
  <AccessRequestModal v-if="showAccessRequest" @close="showAccessRequest = false" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import LoginForm from '../components/LoginForm.vue';
import LoginBackground from '../components/LoginBackground.vue';
import HowToUseModal from '@/components/HowToUseModal.vue';
import AccessRequestModal from '@/components/AccessRequestModal.vue';

const showHowToUse = ref(false);
const showAccessRequest = ref(false);
const background = ref<InstanceType<typeof LoginBackground> | null>(null);
const isDarkMode = ref(document.documentElement.classList.contains('dark'));
const socials = [
  { href: 'https://www.instagram.com/riffvalleyes', icon: 'fa-brands fa-instagram', label: 'Instagram', hover: 'hover:bg-rv-pink dark:hover:bg-rv-pink' },
  { href: 'https://www.facebook.com/riffvalleyes', icon: 'fa-brands fa-facebook-f', label: 'Facebook', hover: 'hover:bg-rv-blueDark dark:hover:bg-rv-blueDark' },
  { href: 'https://t.me/riffvalleyes', icon: 'fa-brands fa-telegram', label: 'Telegram', hover: 'hover:bg-rv-blue/70 dark:hover:bg-rv-blue/70' },
  { href: 'https://www.tiktok.com/@riffvalley', icon: 'fa-brands fa-tiktok', label: 'TikTok', hover: 'hover:bg-rv-navy dark:hover:bg-rv-navy' },
  { href: 'https://open.spotify.com/user/vy0sh3a649tix6bfajzstx5xq', icon: 'fa-brands fa-spotify', label: 'Spotify', hover: 'hover:bg-green-500 dark:hover:bg-green-500' },
  { href: 'https://x.com/riffvalleyes', icon: 'fa-brands fa-x-twitter', label: 'X / Twitter', hover: 'hover:bg-rv-navy dark:hover:bg-rv-navy' },
  { href: 'https://www.threads.net/@riffvalleyes', icon: 'fa-brands fa-threads', label: 'Threads', hover: 'hover:bg-rv-purple dark:hover:bg-rv-purple' },
  { href: 'https://bsky.app/profile/riffvalleyes.bsky.social', icon: 'fa-solid fa-cloud', label: 'Bluesky', hover: 'hover:bg-rv-blue/60 dark:hover:bg-rv-blue/60' },
];
function applyDarkMode(enabled: boolean): void {
  document.documentElement.classList.toggle('dark', enabled);
  localStorage.setItem('theme', enabled ? 'dark' : 'light');
  isDarkMode.value = enabled;
}
function toggleDarkMode(): void { applyDarkMode(!isDarkMode.value); }
onMounted(() => applyDarkMode(localStorage.getItem('theme') === 'dark'));
</script>

<style scoped>
body {
  background-color: #f9f9f9;
  font-family: 'Inter', sans-serif;
}
</style>
