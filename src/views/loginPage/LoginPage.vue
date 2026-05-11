<template>
<div class="min-h-[100svh] flex flex-col items-center justify-center
          scale-[0.92] sm:scale-100 origin-center
          bg-gray-100 dark:bg-rv-darkBg">

    <!-- CARD ÚNICA -->
    <div class="w-full max-w-sm shadow-lg rounded-3xl overflow-hidden bg-white dark:bg-rv-darkCard border border-gray-100 dark:border-white/10">

      <!-- HEADER -->
      <div class="relative px-6 pt-6 pb-5 text-center
         bg-gradient-to-b from-[#fe7b4a] via-[#a569aa] to-[#1464d0]">
        <!-- SVG de montañas -->
        <img src="/bg-mountains.jpg" alt="" class="absolute bottom-0 left-0 w-full h-full
         scale-[1.05] origin-bottom
         pointer-events-none select-none" />

        <!-- CONTENIDO -->
        <div class="relative z-10">
          <img src="/LOGO-RIFF-VALLEY.svg" alt="Riff Valley Logo" class="w-16 h-16 mx-auto mb-3 drop-shadow" />

          <div class="flex items-baseline justify-center gap-[2px]">
            <span class="font-brand text-4xl tracking-wide text-white drop-shadow-sm">
              RIFF VALLEY
            </span>

            <span class="text-sm font-medium tracking-widest lowercase text-white/80 relative top-[2px]">
              app
            </span>
          </div>
        </div>
      </div>

      <!-- FORM (abajo redondeado por el wrapper) -->
      <div class="p-5">
        <form @submit.prevent="handleLogin" class="space-y-3 w-full">
          <input type="text" v-model="username" placeholder="Usuario" class="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-full
       bg-white dark:bg-rv-darkSurface
       text-gray-800 dark:text-white
       placeholder:text-gray-400 dark:placeholder:text-gray-500
       focus:outline-none focus:ring-2 focus:ring-rv-pink/40" />

          <div class="relative">
            <input :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="Contraseña" class="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-full
       bg-white dark:bg-rv-darkSurface
       text-gray-800 dark:text-white
       placeholder:text-gray-400 dark:placeholder:text-gray-500
       focus:outline-none focus:ring-2 focus:ring-rv-pink/40" />
            <button type="button" @click="showPassword = !showPassword"
                                class="absolute right-3 top-1/2 -translate-y-1/2
bg-transparent text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white
border-0 outline-none focus:outline-none focus-visible:outline-none
ring-0 focus:ring-0 focus-visible:ring-0 active:bg-transparent"
>
              <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" class="text-sm"></i>
            </button>
          </div>

          <button type="submit" class="w-full bg-gradient-to-r from-[#0c6ddc] to-[#0a56b3]
         text-white font-bold py-2 rounded-full
         shadow-md shadow-blue-900/25
         hover:from-[#0a5fc2] hover:to-[#084a9a]
         hover:shadow-md hover:shadow-blue-900/40 hover:-translate-y-[1px]
         active:scale-[0.98] active:translate-y-0 active:shadow-md
         transition-transform transition-shadow transition-colors duration-200 ease-out
         focus:outline-none focus:ring-4 focus:ring-rv-blueDark/25" :disabled="loading">
            {{ loading ? "Accediendo..." : "Login" }}
          </button>

          <p v-if="error" class="text-red-500 text-sm text-center">
            {{ error }}
          </p>
        </form>
      </div>
    </div>



    <!-- Botones inferiores -->
    <div class="mt-5 flex items-center justify-center gap-3">
      <!-- Cómo usar la app -->
<button
  @click="showHowToUse = true"
  class="inline-flex items-center text-[#211d1d] dark:text-white font-semibold px-4 py-2 rounded-full shadow-md
         bg-gray-100 dark:bg-rv-darkCard
         hover:bg-gray-200 dark:hover:bg-rv-darkSurface
         hover:text-rv-navy dark:hover:text-white
         border border-gray-100 dark:border-white/10
         transition duration-100 hover:-translate-y-[1px]"
>
        <i class="fa-solid fa-circle-question text-md mr-2"></i>
        Cómo usar la app
      </button>

      <!-- Enlace a riffvalley.es -->
<a
  href="https://riffvalley.es"
  target="_blank"
  rel="noopener noreferrer"
  class="inline-flex items-center text-[#211d1d] dark:text-white font-semibold px-4 py-2 rounded-full shadow-md
         bg-gray-100 dark:bg-rv-darkCard
         hover:bg-gray-200 dark:hover:bg-rv-darkSurface
         hover:text-rv-navy dark:hover:text-white
         border border-gray-100 dark:border-white/10
         transition duration-100 hover:-translate-y-[1px]"
>
        <i class="fa-solid fa-globe text-md mr-2"></i>
        riffvalley.es
      </a>
    </div>

    <div class="mt-1 mb-1 flex justify-center">
    </div>

    <!-- Solicitud de acceso -->
<div class="mt-3 w-full max-w-sm px-4">
  <button
    @click="showAccessRequest = true"
class="w-full rounded-2xl bg-white/95 dark:bg-rv-darkCard px-4 py-3 text-center shadow-md
border border-gray-100 dark:border-white/10
hover:-translate-y-[1px] hover:shadow-lg
transition-all duration-150"
  >
<p class="text-sm font-bold text-[#211d1d] dark:text-white">
      ¿Te gusta lo que ves y quieres votar discos?
    </p>
<p class="mt-1 text-xs text-gray-500 dark:text-gray-300">
      Solicita acceso a Riff Valley app
    </p>
  </button>
</div>

    <!-- Redes sociales -->
    <div class="mt-5 flex items-center justify-center gap-3">
      <a href="https://www.instagram.com/riffvalleyes" target="_blank" class="w-10 h-10 flex items-center justify-center rounded-full
          bg-gray-100 dark:bg-rv-darkCard hover:bg-gray-200 dark:hover:bg-rv-darkSurface text-[#211d1d] dark:text-white border border-gray-100 dark:border-white/10
           shadow-md
           hover:bg-rv-pink hover:-translate-y-[1px] hover:text-white
           transition-all duration-150">
        <i class="fa-brands fa-instagram"></i>
      </a>

      <a href="https://www.facebook.com/riffvalleyes" target="_blank" class="w-10 h-10 flex items-center justify-center rounded-full
           bg-gray-100 dark:bg-rv-darkCard text-[#211d1d] dark:text-white border border-gray-100 dark:border-white/10
           shadow-md
           hover:bg-rv-blueDark hover:-translate-y-[1px] hover:text-white
           transition-all duration-150">
        <i class="fa-brands fa-facebook-f"></i>
      </a>

      <a href="https://t.me/riffvalleyes" target="_blank" class="w-10 h-10 flex items-center justify-center rounded-full
           bg-gray-100 dark:bg-rv-darkCard text-[#211d1d] dark:text-white border border-gray-100 dark:border-white/10
           shadow-md
           hover:bg-rv-blue/70 hover:-translate-y-[1px] hover:text-white
           transition-all duration-150">
        <i class="fa-brands fa-telegram"></i>
      </a>

      <a href="https://www.tiktok.com/@riffvalley" target="_blank" class="w-10 h-10 flex items-center justify-center rounded-full
           bg-gray-100 dark:bg-rv-darkCard text-[#211d1d] dark:text-white border border-gray-100 dark:border-white/10
           shadow-md
           hover:bg-rv-navy hover:-translate-y-[1px] hover:text-white
           transition-all duration-150">
        <i class="fa-brands fa-tiktok"></i>
      </a>

      <a href="https://open.spotify.com/user/vy0sh3a649tix6bfajzstx5xq" target="_blank" class="w-10 h-10 flex items-center justify-center rounded-full
         bg-gray-100 dark:bg-rv-darkCard text-[#211d1d] dark:text-white border border-gray-100 dark:border-white/10
         shadow-md
         hover:bg-green-500 hover:-translate-y-[1px] hover:text-white
         transition-all duration-150">
        <i class="fa-brands fa-spotify"></i>
      </a>

      <a href="https://x.com/riffvalleyes" target="_blank" class="w-10 h-10 flex items-center justify-center rounded-full
           bg-gray-100 dark:bg-rv-darkCard text-[#211d1d] dark:text-white border border-gray-100 dark:border-white/10
           shadow-md
           hover:bg-rv-navy hover:-translate-y-[1px] hover:text-white
           transition-all duration-150">
        <i class="fa-brands fa-x-twitter"></i>
      </a>

      <a href="https://www.threads.net/@riffvalleyes" target="_blank" class="w-10 h-10 flex items-center justify-center rounded-full
           bg-gray-100 dark:bg-rv-darkCard text-[#211d1d] dark:text-white border border-gray-100 dark:border-white/10
           shadow-md
           hover:bg-rv-purple hover:-translate-y-[1px] hover:text-white
           transition-all duration-150">
        <i class="fa-brands fa-threads"></i>
      </a>

      <a href="https://bsky.app/profile/riffvalleyes.bsky.social" target="_blank" class="w-10 h-10 flex items-center justify-center rounded-full
          bg-gray-100 dark:bg-rv-darkCard text-[#211d1d] dark:text-white border border-gray-100 dark:border-white/10
           shadow-md
            hover:bg-rv-blue/60 hover:-translate-y-[1px] hover:text-white
           transition-all duration-150">
        <i class="fa-solid fa-cloud"></i>
      </a>
    </div>

<!-- Switch modo oscuro -->
<div class="mt-4 flex items-center justify-center">
  <label class="flex items-center justify-center gap-3 text-[#211d1d] dark:text-white/75 cursor-pointer">
    <i
      class="fa-solid fa-sun text-sm transition-colors"
      :class="!isDarkMode ? 'text-rv-pink' : 'text-gray-400 dark:text-white/45'"
    ></i>

    <button
      type="button"
      role="switch"
      :aria-checked="isDarkMode"
      @click="toggleDarkMode"
      class="relative w-11 h-6 rounded-full transition-all duration-300
        border border-gray-200 dark:border-white/20
        bg-gray-200 dark:bg-white/15 hover:bg-gray-300 dark:hover:bg-white/25
        outline-none focus:outline-none focus-visible:outline-none
        ring-0 focus:ring-0 focus-visible:ring-0"
    >
      <span
        class="absolute top-1/2 left-0.5 -translate-y-1/2
          w-5 h-5 rounded-full bg-white shadow-md
          transition-transform duration-300"
        :class="isDarkMode ? 'translate-x-5' : 'translate-x-0'"
      ></span>
    </button>

    <i
      class="fa-solid fa-moon text-sm transition-colors"
      :class="isDarkMode ? 'text-rv-pink' : 'text-gray-400 dark:text-white/45'"
    ></i>
  </label>
</div>

    <HowToUseModal v-if="showHowToUse" @close="showHowToUse = false" />
  </div>

  <AccessRequestModal
  v-if="showAccessRequest"
  @close="showAccessRequest = false"
/>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth/auth';
import { useRouter } from 'vue-router';
import HowToUseModal from '@/components/HowToUseModal.vue';
import AccessRequestModal from '@/components/AccessRequestModal.vue';

export default defineComponent({
  components: {
    HowToUseModal,
      AccessRequestModal,
  },
  setup() {
    const username = ref('');
    const password = ref('');
    const loading = ref(false);
    const error = ref<string | null>(null);
    const showPassword = ref(false);
    const showHowToUse = ref(false); 
    const showAccessRequest = ref(false);
    
    const isDarkMode = ref(document.documentElement.classList.contains('dark'));

const applyDarkMode = (enabled: boolean) => {
  document.documentElement.classList.toggle('dark', enabled);
  localStorage.setItem('theme', enabled ? 'dark' : 'light');
  isDarkMode.value = enabled;
};

const toggleDarkMode = () => {
  applyDarkMode(!isDarkMode.value);
};

onMounted(() => {
  const savedTheme = localStorage.getItem('theme');
  const enabled = savedTheme === 'dark';
  applyDarkMode(enabled);
});

    const authStore = useAuthStore();
    const router = useRouter();

    const handleLogin = async () => {
      error.value = null;
      loading.value = true;
      try {
        await authStore.login({ username: username.value, password: password.value });
        router.push({ name: 'Home' });
      } catch (err) {
        error.value = 'Acceso fallido. Revisa tus credenciales.';
      } finally {
        loading.value = false;
      }
    };

    return {
      username,
      password,
      showPassword,
      loading,
      error,
      handleLogin,
      showHowToUse,
      showAccessRequest,
      isDarkMode,
toggleDarkMode,
    };
  },
});
</script>

<style scoped>
body {
  background-color: #f9f9f9;
  font-family: 'Inter', sans-serif;
}

.text-brown-700 {
  color: #7B3F00;
}
</style>