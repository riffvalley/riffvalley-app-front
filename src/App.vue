<template>
  <main v-if="authStore.authStatus === 'initializing'" class="min-h-screen flex items-center justify-center p-6" aria-live="polite">
    <p>Comprobando tu sesión…</p>
  </main>
  <main v-else-if="authStore.authStatus === 'error' && route.name !== 'Login'" class="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center" role="alert">
    <h1>No se pudo comprobar la sesión</h1>
    <p>El servicio de identidad no está disponible ahora. Puedes volver a intentarlo.</p>
    <button class="btn btn-primary" type="button" :disabled="retrying" @click="retryAuthInitialization">
      {{ retrying ? 'Reintentando…' : 'Reintentar' }}
    </button>
    <router-link class="link" to="/login">Acceder con contraseña</router-link>
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
