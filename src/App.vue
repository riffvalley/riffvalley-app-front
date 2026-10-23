<template>
  <main v-if="authStore.authStatus === 'initializing'" class="min-h-screen flex items-center justify-center p-6" aria-live="polite">
    <p>Comprobando tu sesión…</p>
  </main>
  <main
    v-else-if="authStore.authStatus === 'error' && route.name !== 'Login'"
    class="min-h-screen flex items-center justify-center bg-gray-100 px-5 py-10 text-center dark:bg-rv-darkBg sm:px-8"
    role="alert"
  >
    <section class="w-full max-w-lg rounded-3xl border border-gray-200 bg-white px-6 py-9 shadow-xl dark:border-white/10 dark:bg-rv-darkSurface sm:px-10 sm:py-11">
      <div class="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-rv-pink/10 text-rv-pink dark:bg-rv-pink/15" aria-hidden="true">
        <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 7v5h-5" />
          <path d="M4.9 9a7.5 7.5 0 0 1 12.4-2L20 12M4 17v-5h5" />
          <path d="M19.1 15a7.5 7.5 0 0 1-12.4 2L4 12" />
        </svg>
      </div>

      <h1 class="text-2xl font-bold leading-tight text-rv-navy dark:text-white sm:text-3xl">
        No hemos podido recuperar tu sesión
      </h1>
      <p class="mx-auto mt-4 max-w-prose text-base leading-relaxed text-gray-600 dark:text-gray-300">
        No hemos podido conectar con el servicio de autenticación. Tu sesión podría seguir activa.
      </p>

      <div class="mt-8 flex flex-col items-center gap-4">
        <button
          class="!min-h-12 !w-full !max-w-xs !gap-2 !rounded-xl !border-rv-pink !bg-rv-pink !px-6 !py-3 !font-semibold !text-rv-navy transition-colors hover:!bg-rv-pink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rv-purple disabled:!cursor-not-allowed disabled:!opacity-60"
          type="button"
          :disabled="retrying"
          :aria-busy="retrying"
          @click="retryAuthInitialization"
        >
          <svg
            class="h-5 w-5"
            :class="retrying ? 'animate-spin' : ''"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 7v5h-5" />
            <path d="M20 12a8 8 0 0 0-14.9-4M4 17v-5h5" />
            <path d="M4 12a8 8 0 0 0 14.9 4" />
          </svg>
          {{ retrying ? 'Reintentando…' : 'Reintentar' }}
        </button>
        <router-link
          class="rounded-lg px-3 py-2 text-sm font-semibold text-rv-navy underline decoration-transparent underline-offset-4 transition-colors hover:text-rv-pink hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:text-gray-200 dark:hover:text-rv-pink"
          to="/login"
        >
          Acceder con contraseña
        </router-link>
      </div>
    </section>
  </main>
  <div v-else-if="authReady" id="app-container">

    <!-- FONDO OSCURO SOLO CUANDO EL MENÚ ESTÁ ABIERTO -->
    <div v-if="menuVisible && !isLoginPage" class="fixed inset-0 bg-black bg-opacity-50 z-10"
      @click="closeMenuHandler" />

    <!-- Sidebar (por encima del overlay) -->
    <SidebarMenu v-if="!isLoginPage" :menuVisible="menuVisible" @close-menu="closeMenuHandler" class="z-20" />

    <!-- Layout logic -->
    <component :is="layoutComponent">
      <router-view />
    </component>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import DefaultLayout from "./layouts/default/DefaultLayout.vue";
import LoginLayout from "./layouts/auth/LoginLayout.vue";
import SidebarMenu from "@/layouts/default/components/SidebarMenu.vue";
import { useCatalogStore } from "@stores/catalog/catalog";
import { useAuthStore } from "@stores/auth/auth";

export default defineComponent({
  name: "App",
  components: {
    SidebarMenu,
  },
  setup() {
    const menuVisible = ref(false);
    const route = useRoute();
    const router = useRouter();
    const catalogStore = useCatalogStore();
    const authStore = useAuthStore();
    const retrying = ref(false);

    watch(() => authStore.authStatus, (status) => {
      if (status === "authenticated") void catalogStore.fetchCatalog();
    }, { immediate: true });

    const retryAuthInitialization = async () => {
      if (retrying.value) return;
      retrying.value = true;
      try {
        const status = await authStore.initializeAuth();
        if (status !== "error") {
          const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          await router.replace(currentLocation);
        }
      } finally {
        retrying.value = false;
      }
    };

    const authReady = computed(() =>
      authStore.authStatus === "authenticated" || authStore.authStatus === "anonymous" ||
      (authStore.authStatus === "error" && route.name === "Login"),
    );

    const closeMenuHandler = () => {
      menuVisible.value = false;
    };

    // Detectar si estamos en la página de login o mantenimiento (para ocultar sidebar)
    const isLoginPage = computed(() => ["Login", "Maintenance", "NationalReleasePublic"].includes(route.name as string));

    watch(route, () => {
      menuVisible.value = false;
    });

    let scrollY = 0;

    watch(menuVisible, (visible) => {
      const body = document.body;

      if (visible) {
        scrollY = window.scrollY;

        body.style.position = "fixed";
        body.style.top = `-${scrollY}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";
      } else {
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";

        window.scrollTo(0, scrollY);
      }
    });

    return {
      menuVisible,
      authStore,
      authReady,
      route,
      retrying,
      retryAuthInitialization,
      closeMenuHandler,
      isLoginPage, // ✅ Nueva variable reactiva para detectar login
      layoutComponent: computed(() => {
        return ["Login", "Maintenance", "NationalReleasePublic"].includes(route.name as string) ? LoginLayout : DefaultLayout;
      }),
    };
  },
});
</script>
