<template>
  <div
    ref="loginRootEl"
    class="min-h-[100svh] flex flex-col items-center justify-center py-6 sm:py-8 bg-gradient-to-br from-orange-50 via-purple-50 to-blue-100 dark:from-[#0d0010] dark:via-rv-darkBg dark:to-[#00102a] relative overflow-x-hidden"
  >
    <!-- Canvas partículas -->
    <canvas ref="canvasEl" class="pointer-events-none fixed inset-0 z-0 w-full h-full"></canvas>

    <!-- CARD ÚNICA -->
    <div
      class="relative z-10 w-full max-w-sm shadow-lg rounded-3xl overflow-hidden bg-white dark:bg-rv-darkCard border border-gray-100 dark:border-white/10"
    >
      <!-- HEADER -->
      <div
        class="relative px-5 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-5 text-center bg-gradient-to-b from-[#fe7b4a] via-[#a569aa] to-[#1464d0]"
      >
        <img
          src="/bg-mountains.jpg"
          alt=""
          class="absolute bottom-0 left-0 w-full h-full scale-[1.05] origin-bottom pointer-events-none select-none"
        />

        <div class="relative z-10">
          <img
            src="/LOGO-RIFF-VALLEY.svg"
            alt="Riff Valley Logo"
            class="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3 drop-shadow"
          />
          <div class="flex items-baseline justify-center gap-[2px]">
            <span class="font-brand text-3xl sm:text-4xl tracking-wide text-white drop-shadow-sm"
              >RIFF VALLEY</span
            >
            <span
              class="text-sm font-medium tracking-widest lowercase text-white/80 relative top-[2px]"
              >app</span
            >
          </div>
        </div>
      </div>

      <!-- FORM -->
      <div class="p-4 sm:p-5">
        <form @submit.prevent="handleLogin" class="space-y-2.5 sm:space-y-3 w-full">
          <label for="login-username" class="block">
            <span class="sr-only">Usuario</span>
            <input
              id="login-username"
              type="text"
              v-model="username"
              placeholder="Usuario"
              class="w-full px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-white/10 rounded-full bg-white dark:bg-rv-darkSurface text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rv-pink/40"
            />
          </label>

          <div class="relative">
            <label for="login-password" class="block">
              <span class="sr-only">Contraseña</span>
              <input
                id="login-password"
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                placeholder="Contraseña"
                class="w-full px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-white/10 rounded-full bg-white dark:bg-rv-darkSurface text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rv-pink/40"
              />
            </label>
            <button
              type="button"
              @click="showPassword = !showPassword"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              class="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 active:bg-transparent"
            >
              <i
                :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                class="text-sm"
              ></i>
            </button>
          </div>

          <div class="text-right -mt-1">
            <router-link
              :to="{ name: 'ForgotPassword' }"
              class="text-sm font-medium text-rv-blueDark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink rounded dark:text-blue-300"
            >
              ¿Has olvidado tu contraseña?
            </router-link>
          </div>

          <button
            type="submit"
            class="w-full bg-gradient-to-r from-[#0c6ddc] to-[#0a56b3] text-white font-bold py-1.5 sm:py-2 rounded-full shadow-md shadow-blue-900/25 hover:from-[#0a5fc2] hover:to-[#084a9a] hover:shadow-md hover:shadow-blue-900/40 hover:-translate-y-[1px] active:scale-[0.98] active:translate-y-0 active:shadow-md transition-transform transition-shadow transition-colors duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-rv-blueDark/25"
            :disabled="loading"
          >
            {{ loading ? "Accediendo..." : "Login" }}
          </button>

          <p v-if="error" role="alert" class="text-red-500 text-sm text-center">{{ error }}</p>
        </form>
      </div>
    </div>

    <!-- Botones inferiores -->
    <div class="mt-3 sm:mt-5 flex items-center justify-center gap-3">
      <button
        @click="showHowToUse = true"
        class="inline-flex items-center text-[#211d1d] dark:text-white font-semibold px-4 py-2 rounded-full shadow-md bg-gray-100 dark:bg-rv-darkCard hover:bg-gray-200 dark:hover:bg-rv-darkSurface hover:text-rv-navy dark:hover:text-white border border-gray-100 dark:border-white/10 transition duration-100 hover:-translate-y-[1px]"
      >
        <i class="fa-solid fa-circle-question text-md mr-2"></i>
        Cómo usar la app
      </button>

      <a
        href="https://riffvalley.es"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center text-[#211d1d] dark:text-white font-semibold px-4 py-2 rounded-full shadow-md bg-gray-100 dark:bg-rv-darkCard hover:bg-gray-200 dark:hover:bg-rv-darkSurface hover:text-rv-navy dark:hover:text-white border border-gray-100 dark:border-white/10 transition duration-100 hover:-translate-y-[1px]"
      >
        <i class="fa-solid fa-globe text-md mr-2"></i>
        riffvalley.es
      </a>
    </div>

    <!-- Solicitud de acceso -->
    <div class="mt-1.5 sm:mt-3 w-full max-w-sm px-4">
      <button
        @click="showAccessRequest = true"
        class="w-full rounded-2xl bg-white dark:bg-rv-darkCard shadow-md border border-gray-100 dark:border-white/10 hover:-translate-y-[1px] hover:shadow-lg transition-all duration-150 overflow-hidden"
      >
        <div class="h-1 w-full bg-gradient-to-r from-[#fe7b4a] via-[#a569aa] to-[#1464d0]"></div>
        <div class="flex items-center gap-3 px-4 py-3">
          <div
            class="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[#a569aa] to-[#1464d0] flex items-center justify-center shadow-sm"
          >
            <i class="fa-solid fa-user-plus text-white text-sm"></i>
          </div>
          <div class="text-left">
            <p class="text-sm font-bold text-[#211d1d] dark:text-white leading-tight">
              ¿Te gusta lo que ves y quieres votar discos?
            </p>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-300">
              Solicita acceso a Riff Valley app
            </p>
          </div>
          <i
            class="fa-solid fa-chevron-right text-xs text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0"
          ></i>
        </div>
      </button>
    </div>

    <!-- Redes sociales -->
    <div class="mt-2 sm:mt-5 flex items-center justify-center gap-2 sm:gap-3">
      <a
        v-for="social in socials"
        :key="social.href"
        :href="social.href"
        target="_blank"
        class="relative group w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-rv-darkCard text-[#211d1d] dark:text-white border border-gray-100 dark:border-white/10 shadow-md hover:-translate-y-[1px] hover:text-white dark:hover:text-white transition-all duration-150"
        :class="social.hover"
      >
        <span
          class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium rounded-lg bg-gray-800 dark:bg-white text-white dark:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap pointer-events-none z-20"
        >
          {{ social.label }}
        </span>
        <i :class="social.icon"></i>
      </a>
    </div>

    <!-- Switch modo oscuro -->
    <div class="mt-2 sm:mt-4 flex items-center justify-center">
      <div class="flex items-center justify-center gap-3 text-[#211d1d] dark:text-white/75">
        <i
          class="fa-regular fa-sun text-base transition-colors"
          :class="!isDarkMode ? 'text-rv-pink' : 'text-gray-400 dark:text-white/45'"
        ></i>

        <button
          type="button"
          role="switch"
          aria-label="Modo oscuro"
          :aria-checked="isDarkMode"
          @click.stop="toggleDarkMode"
          class="relative w-11 h-6 rounded-full transition-all duration-300 border border-gray-200 dark:border-white/20 bg-gray-200 dark:bg-white/15 hover:bg-gray-300 dark:hover:bg-white/25 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0"
        >
          <span
            class="absolute top-1/2 left-0.5 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300"
            :class="isDarkMode ? 'translate-x-5' : 'translate-x-0'"
          ></span>
        </button>

        <i
          class="fa-solid fa-moon text-base transition-colors"
          :class="isDarkMode ? 'text-rv-pink' : 'text-gray-400 dark:text-white/45'"
        ></i>
      </div>
    </div>

    <!-- FAB - Cambiar fondo animado -->
    <div class="mt-2 sm:mt-4 flex justify-center" @click.stop data-background-controls>
      <div class="relative flex items-center justify-center w-10 h-10">
        <!-- Sub-buttons (arc, abre hacia arriba) -->
        <button
          v-for="(opt, i) in bgOptions"
          :key="opt.mode"
          type="button"
          @click.stop="
            bgMode = opt.mode;
            fabOpen = false;
          "
          class="group absolute w-9 h-9 top-1/2 left-1/2 -ml-[18px] -mt-[18px] rounded-full flex items-center justify-center text-sm shadow-lg border transition-all duration-300 ease-out"
          :class="
            bgMode === opt.mode
              ? 'bg-rv-pink text-white border-rv-pink/60'
              : 'bg-gray-100/95 dark:bg-white/15 text-gray-700 dark:text-white border-gray-200 dark:border-white/20 hover:bg-rv-pink hover:text-white hover:border-rv-pink/50'
          "
          :style="{
            transform: fabOpen
              ? `${arcTransforms[i]}${bgMode === opt.mode ? ' scale(1.12)' : ' scale(1)'}`
              : 'translate(0, 0) scale(0.3)',
            opacity: fabOpen ? '1' : '0',
            transitionDelay: fabOpen ? i * 55 + 'ms' : '0ms',
            pointerEvents: fabOpen ? 'auto' : 'none',
          }"
        >
          <i :class="opt.icon"></i>
          <!-- Tooltip -->
          <span
            class="absolute top-full mt-2 px-2 py-1 text-[10px] font-semibold rounded-lg whitespace-nowrap bg-gray-800 dark:bg-white text-white dark:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-30 shadow-md"
            :class="i === 0 ? 'right-0' : i === 3 ? 'left-0' : 'left-1/2 -translate-x-1/2'"
          >
            {{ opt.label }}
          </span>
        </button>

        <!-- Trigger principal -->
        <button
          type="button"
          @click.stop="fabOpen = !fabOpen"
          title="Cambiar fondo animado"
          class="relative z-10 w-10 h-10 rounded-full flex items-center justify-center border shadow-md transition-all duration-300 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0"
          :class="
            fabOpen
              ? 'bg-rv-purple text-white border-rv-purple/60 rotate-[30deg] scale-110'
              : 'bg-gray-100 dark:bg-white/15 text-gray-600 dark:text-white border-gray-200 dark:border-white/20 hover:bg-rv-purple hover:text-white hover:border-rv-purple/50'
          "
        >
          <i class="fa-solid fa-wand-magic-sparkles text-sm"></i>
        </button>
      </div>
    </div>

    <p
      v-if="isBetaEnvironment"
      data-testid="login-beta-version"
      aria-label="Entorno beta, versión 4.0.0"
      class="fixed bottom-3 right-3 z-50 rounded-full border border-rv-navy/20 bg-rv-navy px-3 py-1 text-xs font-bold tracking-wider text-white shadow-md dark:border-rv-purple/40 dark:bg-rv-purple"
    >
      BETA · 4.0.0
    </p>

    <HowToUseModal v-if="showHowToUse" @close="showHowToUse = false" />
  </div>

  <AccessRequestModal v-if="showAccessRequest" @close="showAccessRequest = false" />
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch } from "vue";
import HowToUseModal from "@/components/HowToUseModal.vue";
import AccessRequestModal from "./components/AccessRequestModal.vue";
import {
  useLoginBackgroundAnimation,
  type LoginBackgroundMode,
} from "./composables/useLoginBackgroundAnimation";
import { useLoginForm } from "./composables/useLoginForm";

type BgMode = LoginBackgroundMode;

export default defineComponent({
  components: { HowToUseModal, AccessRequestModal },
  setup() {
    const { username, password, loading, error, handleLogin } = useLoginForm();
    const isBetaEnvironment = import.meta.env.VITE_APP_ENV === "beta";
    const showPassword = ref(false);
    const showHowToUse = ref(false);
    const showAccessRequest = ref(false);
    const canvasEl = ref<HTMLCanvasElement | null>(null);
    const loginRootEl = ref<HTMLElement | null>(null);

    const isDarkMode = ref(document.documentElement.classList.contains("dark"));
    const bgMode = ref<BgMode>((localStorage.getItem("bgMode") as BgMode) || "none");
    const fabOpen = ref(false);

    const bgOptions = [
      { mode: "none" as BgMode, icon: "fa-solid fa-ban", label: "Sin animación" },
      { mode: "waves" as BgMode, icon: "fa-solid fa-water", label: "Ondas" },
      {
        mode: "constellation" as BgMode,
        icon: "fa-solid fa-circle-nodes",
        label: "Constelaciones",
      },
      { mode: "nebula" as BgMode, icon: "fa-solid fa-burst", label: "Blur" },
    ];

    // Arc positions (downward fan): translate from center of the trigger button
    const arcTransforms = [
      "translate(-58px, 38px)",
      "translate(-22px, 68px)",
      "translate(22px, 68px)",
      "translate(58px, 38px)",
    ];

    const socials = [
      {
        href: "https://www.instagram.com/riffvalleyes",
        icon: "fa-brands fa-instagram",
        label: "Instagram",
        hover: "hover:bg-rv-pink dark:hover:bg-rv-pink",
      },
      {
        href: "https://www.facebook.com/riffvalleyes",
        icon: "fa-brands fa-facebook-f",
        label: "Facebook",
        hover: "hover:bg-rv-blueDark dark:hover:bg-rv-blueDark",
      },
      {
        href: "https://t.me/riffvalleyes",
        icon: "fa-brands fa-telegram",
        label: "Telegram",
        hover: "hover:bg-rv-blue/70 dark:hover:bg-rv-blue/70",
      },
      {
        href: "https://www.tiktok.com/@riffvalley",
        icon: "fa-brands fa-tiktok",
        label: "TikTok",
        hover: "hover:bg-rv-navy dark:hover:bg-rv-navy",
      },
      {
        href: "https://open.spotify.com/user/vy0sh3a649tix6bfajzstx5xq",
        icon: "fa-brands fa-spotify",
        label: "Spotify",
        hover: "hover:bg-green-500 dark:hover:bg-green-500",
      },
      {
        href: "https://x.com/riffvalleyes",
        icon: "fa-brands fa-x-twitter",
        label: "X / Twitter",
        hover: "hover:bg-rv-navy dark:hover:bg-rv-navy",
      },
      {
        href: "https://www.threads.net/@riffvalleyes",
        icon: "fa-brands fa-threads",
        label: "Threads",
        hover: "hover:bg-rv-purple dark:hover:bg-rv-purple",
      },
      {
        href: "https://bsky.app/profile/riffvalleyes.bsky.social",
        icon: "fa-solid fa-cloud",
        label: "Bluesky",
        hover: "hover:bg-rv-blue/60 dark:hover:bg-rv-blue/60",
      },
    ];

    // ── Auth helpers ─────────────────────────────────────────
    const applyDarkMode = (enabled: boolean) => {
      document.documentElement.classList.toggle("dark", enabled);
      localStorage.setItem("theme", enabled ? "dark" : "light");
      isDarkMode.value = enabled;
    };
    const toggleDarkMode = () => applyDarkMode(!isDarkMode.value);

    watch(bgMode, (val) => localStorage.setItem("bgMode", val));

    onMounted(() => {
      applyDarkMode(localStorage.getItem("theme") === "dark");
      loginRootEl.value?.addEventListener("click", closeBackgroundOptionsOnClick);
    });
    onUnmounted(() => {
      loginRootEl.value?.removeEventListener("click", closeBackgroundOptionsOnClick);
    });

    function closeBackgroundOptionsOnClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest("[data-background-controls]")) {
        fabOpen.value = false;
      }
    }

    useLoginBackgroundAnimation(canvasEl, bgMode);

    return {
      username,
      password,
      showPassword,
      loading,
      error,
      handleLogin,
      isBetaEnvironment,
      showHowToUse,
      showAccessRequest,
      isDarkMode,
      toggleDarkMode,
      canvasEl,
      loginRootEl,
      bgMode,
      bgOptions,
      fabOpen,
      arcTransforms,
      socials,
    };
  },
});
</script>

<style scoped>
body {
  background-color: #f9f9f9;
  font-family: "Inter", sans-serif;
}
</style>
