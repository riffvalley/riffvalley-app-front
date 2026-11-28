<template>
  <div class="flex w-full">
    <!-- ✅ Botón hamburguesa fijado a la pantalla (solo móvil).
         Se esconde al bajar por la página para no tapar el contenido y vuelve al subir. -->
    <button v-if="!menuVisible" type="button" aria-label="Abrir menú" aria-controls="sidebar-menu" :aria-expanded="menuVisible"
      class="menu-hamburguesa fixed top-4 left-4 z-30
         bg-gradient-to-r from-rv-pink/90 to-rv-pink
         text-white p-3 rounded-lg shadow-lg
         md:hidden transition-all duration-300 motion-reduce:transition-none
         hover:from-rv-pink/80 hover:to-rv-pink/90
         focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-rv-pink"
      :class="hamburgerHidden ? '-translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'"
      :tabindex="hamburgerHidden ? -1 : undefined"
      @click="toggleMenu">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Sidebar -->
    <SidebarMenu
      :menuVisible="menuVisible"
      :isDark="isDark"
      @toggle-theme="toggleTheme"
      @close-menu="closeMenu"
    />

    <!-- Contenido principal. En móvil el menú se abre por encima: el contenido no se mueve ni se estrecha. -->
<main :class="[
'flex-1 min-w-0 bg-gray-100 dark:bg-rv-darkBg text-rv-navy dark:text-white p-6 pt-20 md:pt-6 transition-[margin] duration-300',
  'ml-0 md:ml-72',
]">
      <slot />
    </main>

    <Toaster
      position="top-right"
      :theme="isDark ? 'dark' : 'light'"
      :duration="3000"
      :visible-toasts="1"
      :close-button="false"
      container-aria-label="Notificaciones"
    />

    <!-- Overlay: oscurece y desenfoca el contenido de detrás mientras el menú está abierto -->
    <div v-if="menuVisible" class="overlay fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-10 md:hidden" @click="closeMenu">
      <transition name="fade-slide" appear>
        <button
          type="button" aria-label="Cerrar menú"
          class="absolute top-4 left-[calc(18rem+1rem)] w-10 h-10 flex items-center justify-center rounded-lg bg-rv-navy bg-opacity-75 text-white transition-all duration-300 hover:bg-rv-navy z-20"
          @click.stop="closeMenu">
          <i class="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
        </button>
      </transition>
    </div>
  </div>
</template>


<script lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import SidebarMenu from "./components/SidebarMenu.vue";
import { Toaster } from "vue-sonner";
import { useTheme } from "@/composables/useTheme";

export default {
  name: "DefaultLayout",
  components: {
    SidebarMenu,
    Toaster,
  },
  setup() {
    const menuVisible = ref(false);
    const route = useRoute();
    const { isDark, initTheme, toggleTheme } = useTheme();
    initTheme();

    // ✅ Alternar menú con botón de hamburguesa
    const toggleMenu = () => {
      menuVisible.value = !menuVisible.value;
    };

    // ✅ Cerrar menú cuando cambia la ruta
    watch(route, () => {
      menuVisible.value = false;
    });

    let scrollY = 0;
    let scrollLocked = false;

    const unlockScroll = () => {
      if (!scrollLocked) return;

      const body = document.body;
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.overflow = "";
      scrollLocked = false;
      window.scrollTo(0, scrollY);
    };

    watch(menuVisible, (visible) => {
      const body = document.body;

      if (visible) {
        scrollY = window.scrollY;
        scrollLocked = true;
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.overflow = 'hidden';
      } else {
        unlockScroll();
      }
    }, { flush: "sync" });

    // Botón ☰: se oculta al bajar más de 80px y reaparece en cuanto se sube un poco.
    const hamburgerHidden = ref(false);
    let lastScrollY = 0;
    const onWindowScroll = () => {
      if (scrollLocked) return; // el menú abierto mueve el scroll; no cuenta como gesto del usuario
      const current = window.scrollY;
      const delta = current - lastScrollY;
      if (current < 80) hamburgerHidden.value = false;
      else if (delta > 8) hamburgerHidden.value = true;
      else if (delta < -8) hamburgerHidden.value = false;
      if (Math.abs(delta) > 8 || current < 80) lastScrollY = current;
    };
    onMounted(() => {
      lastScrollY = window.scrollY;
      window.addEventListener("scroll", onWindowScroll, { passive: true });
    });

    onBeforeUnmount(() => {
      window.removeEventListener("scroll", onWindowScroll);
      unlockScroll();
    });


    // ✅ Función para cerrar menú desde `SidebarMenu.vue`
    const closeMenu = () => {
      menuVisible.value = false;
    };
    

    return {
      menuVisible,
      hamburgerHidden,
      toggleMenu,
      closeMenu,
      isDark,
toggleTheme,
    };
  },
};
</script>

<style>
/* Fondo oscuro cuando el menú está desplegado */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10;
}

/* Ocultar barra lateral en pantallas pequeñas */
@media (max-width: 768px) {

  .menu-hamburguesa {
    display: block;
  }
}

@media (min-width: 768px) {
  .menu-hamburguesa {
    display: none;
  }
}

/* Animación de fade + slide */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.7s ease, transform 0.7s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
  /* Aparece deslizándose desde arriba */
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

html,
body,
#app {
  background: #f3f4f6;
}

html.dark,
html.dark body,
html.dark #app {
  background: #00021f;
}
</style>
