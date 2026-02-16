<template>
  <div class="flex">
    <!-- ✅ Botón hamburguesa fijado a la pantalla -->
    <button v-if="!menuVisible" class="menu-hamburguesa fixed top-4 left-4 z-30
         bg-gradient-to-r from-rv-pink/90 to-rv-pink
         text-white p-3 rounded-lg shadow-lg
         md:hidden transition-all duration-300
         hover:from-rv-pink/80 hover:to-rv-pink/90" @click="toggleMenu">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Sidebar -->
    <SidebarMenu v-if="!isLoginPage" :menuVisible="menuVisible" @close-menu="closeMenu" />

    <!-- Contenido principal -->
    <main :class="[
      'flex-1 bg-gray-100 p-6 transition-all duration-300',
      menuVisible ? 'ml-72' : 'ml-0 md:ml-72',
    ]">
      <slot />
    </main>

    <!-- Overlay -->
    <div v-if="menuVisible" class="overlay fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden" @click="closeMenu">
      <transition name="fade-slide" appear>
        <button
          class="absolute top-4 left-[calc(18rem+1rem)] w-10 h-10 flex items-center justify-center rounded-lg bg-rv-navy bg-opacity-75 text-white transition-all duration-300 hover:bg-rv-navy z-20"
          @click.stop="closeMenu">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </transition>
    </div>
  </div>
</template>


<script lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import SidebarMenu from "./components/SidebarMenu.vue";

export default {
  name: "DefaultLayout",
  components: {
    SidebarMenu,
  },
  setup() {
    const menuVisible = ref(false);
    const route = useRoute();
    const isLoginPage = computed(() => ["Login", "Maintenance"].includes(route.name as string));

    // ✅ Alternar menú con botón de hamburguesa
    const toggleMenu = () => {
      menuVisible.value = !menuVisible.value;
    };

    // ✅ Cerrar menú cuando cambia la ruta
    watch(route, () => {
      menuVisible.value = false;
    });

    let scrollY = 0;

    watch(menuVisible, (visible) => {
      const html = document.documentElement;
      const body = document.body;

      if (visible) {
        scrollY = window.scrollY;
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.overflow = 'hidden';
      } else {
        body.style.position = '';
        body.style.top = '';
        body.style.left = '';
        body.style.right = '';
        body.style.overflow = '';
        window.scrollTo(0, scrollY);
      }
    });


    // ✅ Función para cerrar menú desde `SidebarMenu.vue`
    const closeMenu = () => {
      menuVisible.value = false;
    };

    return {
      menuVisible,
      isLoginPage,
      toggleMenu,
      closeMenu,
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
</style>
