<template>
  <div id="app-container">

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
import { defineComponent, ref, computed, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import DefaultLayout from "./layouts/default/DefaultLayout.vue";
import LoginLayout from "./layouts/auth/LoginLayout.vue";
import SidebarMenu from "@/layouts/default/components/SidebarMenu.vue";
import { useCatalogStore } from "@stores/catalog/catalog";

export default defineComponent({
  name: "App",
  components: {
    SidebarMenu,
  },
  setup() {
    const menuVisible = ref(false);
    const route = useRoute();
    const catalogStore = useCatalogStore();

    onMounted(() => {
      catalogStore.fetchCatalog();
    });

    const closeMenuHandler = () => {
      console.log("✅ `closeMenuHandler()` ejecutado en App.vue");
      menuVisible.value = false;
    };

    // Detectar si estamos en la página de login o mantenimiento (para ocultar sidebar)
    const isLoginPage = computed(() => ["Login", "Maintenance"].includes(route.name as string));

    watch(route, () => {
      console.log("🔄 Cambio de ruta detectado, cerrando menú...");
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
      closeMenuHandler,
      isLoginPage, // ✅ Nueva variable reactiva para detectar login
      layoutComponent: computed(() => {
        return ["Login", "Maintenance"].includes(route.name as string) ? LoginLayout : DefaultLayout;
      }),
    };
  },
});
</script>
