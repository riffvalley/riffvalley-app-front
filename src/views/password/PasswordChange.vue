<template>
  <div v-if="ready" class="mx-auto max-w-5xl px-4 py-8 min-h-screen dark:bg-rv-darkBg">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

      <!-- IZQUIERDA: Avatares por temática -->
      <section class="bg-white dark:bg-rv-darkCard rounded-xl shadow p-5 md:p-6">
        <div class="text-center mb-5">
          <span class="bg-rv-navy text-white px-4 py-1 rounded-full text-sm font-bold">
            Avatar
          </span>
        </div>

        <div class="space-y-2">
          <!-- Acordeón de categorías -->
          <div v-for="cat in categories" :key="cat.key"
            class="border dark:border-white/10 rounded-lg overflow-hidden">
            <!-- Cabecera -->
            <button type="button"
              class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-rv-darkSurface hover:bg-gray-100 dark:hover:bg-rv-darkBg/50 transition-colors"
              @click="toggleCategory(cat.key)" :aria-expanded="openCategory === cat.key">
              <div class="flex items-center gap-2">
                <span v-if="cat.icon" :class="[cat.icon, 'text-gray-500 dark:text-gray-400 text-sm']"></span>
                <span class="font-medium text-gray-800 dark:text-gray-200">{{ cat.label }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-rv-darkBg text-gray-600 dark:text-gray-400">
                  {{ (avatarsByCategory[cat.key] || []).length }}
                </span>
              </div>
              <i :class="openCategory === cat.key ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"
                class="text-gray-400 dark:text-gray-500 text-xs"></i>
            </button>

            <!-- Panel -->
            <div v-show="openCategory === cat.key" class="p-4 dark:bg-rv-darkCard">
              <div v-if="(avatarsByCategory[cat.key] || []).length"
                class="grid grid-cols-3 sm:grid-cols-4 gap-3 place-items-center">
                <button v-for="avatar in avatarsByCategory[cat.key]" :key="avatar" type="button"
                  @click="selectAvatar(avatar)"
                  class="grid place-items-center w-16 h-16 sm:w-18 sm:h-18 p-0 leading-none rounded-full overflow-hidden border-4
                    transition-transform duration-200 hover:scale-105
                    focus:outline-none focus-visible:ring-4 focus-visible:ring-rv-pink/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-rv-darkCard"
                  :class="avatar === selectedAvatar
                    ? 'border-rv-pink shadow-[0_0_0_3px_rgba(236,72,153,0.35),0_0_18px_rgba(236,72,153,0.55)]'
                    : 'border-gray-100 dark:border-white/20'">
                  <img :src="avatar" alt="Avatar" class="block w-full h-full object-cover" loading="eager" decoding="async" />
                </button>
              </div>
              <p v-else class="text-sm text-gray-400 dark:text-gray-500 italic">
                Próximamente añadiremos avatares en esta categoría.
              </p>
            </div>
          </div>
        </div>

        <button type="button" @click="saveAvatar"
          class="w-full mt-5 bg-gradient-to-r from-rv-pink to-rv-pink/90 text-white font-bold py-2.5 rounded-full
            hover:from-rv-pink/90 hover:to-rv-pink/80 focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
          Guardar avatar
        </button>
      </section>

      <!-- DERECHA: Cambiar contraseña + No Spoilers -->
      <div class="flex flex-col gap-6">
      <section class="bg-white dark:bg-rv-darkCard rounded-xl shadow p-5 md:p-6">
        <div class="text-center mb-5">
          <span class="bg-rv-navy text-white px-4 py-1 rounded-full text-sm font-bold">
            Cambiar contraseña
          </span>
        </div>

        <form @submit.prevent="changePassword" class="space-y-4">
          <div>
            <label for="password" class="block font-medium mb-1 text-gray-700 dark:text-gray-300 text-sm">
              Nueva contraseña
            </label>
            <div class="relative">
              <input v-model="password" :type="showPassword ? 'text' : 'password'" id="password"
                class="w-full p-2 pr-10 border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink focus:border-transparent"
                placeholder="Crea tu nueva contraseña" required />
              <button type="button" @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border-0 outline-none focus:outline-none ring-0 focus:ring-0 active:bg-transparent transition-colors">
                <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" class="text-sm"></i>
              </button>
            </div>
            <ul v-if="password" class="mt-2 space-y-1 text-sm">
              <li :class="password.length >= 6 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'">
                <i :class="password.length >= 6 ? 'fa-solid fa-check' : 'fa-solid fa-xmark'" class="w-4 inline-block"></i>
                Mínimo 6 caracteres
              </li>
              <li :class="/[A-Z]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'">
                <i :class="/[A-Z]/.test(password) ? 'fa-solid fa-check' : 'fa-solid fa-xmark'" class="w-4 inline-block"></i>
                Al menos una mayúscula
              </li>
              <li :class="/[0-9]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'">
                <i :class="/[0-9]/.test(password) ? 'fa-solid fa-check' : 'fa-solid fa-xmark'" class="w-4 inline-block"></i>
                Al menos un número
              </li>
            </ul>
          </div>

          <div>
            <label for="confirmPassword" class="block font-medium mb-1 text-gray-700 dark:text-gray-300 text-sm">
              Confirmar contraseña
            </label>
            <div class="relative">
              <input v-model="confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" id="confirmPassword"
                class="w-full p-2 pr-10 border border-gray-300 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink focus:border-transparent"
                placeholder="Confirma tu nueva contraseña" required />
              <button type="button" @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border-0 outline-none focus:outline-none ring-0 focus:ring-0 active:bg-transparent transition-colors">
                <i :class="showConfirmPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" class="text-sm"></i>
              </button>
            </div>
          </div>

          <p v-if="passwordMismatch && confirmPassword" class="text-red-500 dark:text-red-400 text-sm">
            Las contraseñas no coinciden
          </p>

          <p v-if="errorMessage" class="text-red-500 dark:text-red-400 text-sm">
            {{ errorMessage }}
          </p>

          <button type="submit"
            class="w-full mt-4 bg-gradient-to-r from-rv-pink to-rv-pink/90 text-white font-bold py-2.5 rounded-full
              hover:from-rv-pink/90 hover:to-rv-pink/80 focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
            Guardar contraseña
          </button>
        </form>
      </section>

      <!-- No Spoilers -->
      <section class="bg-white dark:bg-rv-darkCard rounded-xl shadow p-5 md:p-6">
        <div class="text-center mb-5">
          <span class="bg-rv-navy text-white px-4 py-1 rounded-full text-sm font-bold">
            No Spoilers
          </span>
        </div>

        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
              Habilitar modo No Spoilers
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Oculta las puntuaciones medias de los discos mientras no hayas votado. Actívalo si quieres escuchar los álbumes sin dejarte influir por las notas de los demás.
            </p>
          </div>

          <!-- Switch -->
          <button type="button"
            @click="toggleNoSpoilers"
            :aria-checked="noSpoilers"
            role="switch"
            class="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none border-0"
            :class="noSpoilers ? 'bg-rv-pink' : 'bg-gray-300 dark:bg-gray-600'">
            <span
              class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
              :class="noSpoilers ? 'translate-x-5' : 'translate-x-0'">
            </span>
          </button>
        </div>

        <p class="mt-3 text-xs text-center"
          :class="noSpoilers ? 'text-rv-pink font-semibold' : 'text-gray-400 dark:text-gray-500'">
          {{ noSpoilers ? 'Modo No Spoilers activado' : 'Modo No Spoilers desactivado' }}
        </p>
      </section>

      <!-- Vista por defecto en Discos -->
      <section class="bg-white dark:bg-rv-darkCard rounded-xl shadow p-5 md:p-6">
        <div class="text-center mb-5">
          <span class="bg-rv-navy text-white px-4 py-1 rounded-full text-sm font-bold">
            Vista por defecto en Discos
          </span>
        </div>

        <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
          Elige qué discos se muestran al abrir la sección <strong class="text-gray-700 dark:text-gray-200">Discos</strong>.
          Puedes cambiarlo manualmente en cualquier momento desde el propio filtro de año.
        </p>

        <!-- Selector pill -->
        <div class="flex rounded-full bg-gray-200 dark:bg-rv-darkSurface p-1 border border-gray-100 dark:border-white/10 gap-1">
          <button type="button" @click="setDefaultYearFilter('current')"
            class="flex-1 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 focus:outline-none"
            :class="defaultYearFilter === 'current'
              ? 'bg-rv-navy text-white shadow'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'">
            Año actual <span v-if="defaultYearFilter === 'current'" class="text-[10px] text-rv-pink ml-1">✓</span>
          </button>
          <button type="button" @click="setDefaultYearFilter('all')"
            class="flex-1 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 focus:outline-none"
            :class="defaultYearFilter === 'all'
              ? 'bg-rv-navy text-white shadow'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'">
            Todos los años <span v-if="defaultYearFilter === 'all'" class="text-[10px] text-rv-pink ml-1">✓</span>
          </button>
        </div>

        <!-- Descripción dinámica -->
        <p class="mt-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <template v-if="defaultYearFilter === 'current'">
            Al entrar en Discos, el filtro mostrará solo los lanzamientos de <strong>{{ currentYear }}</strong>. Ideal para seguir las novedades sin distracciones.
          </template>
          <template v-else>
            Al entrar en Discos, el filtro estará en "Todos los años" y verás todo el catálogo completo desde el principio.
          </template>
        </p>
      </section>

      </div><!-- /columna derecha -->

    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import SwalService from "@services/swal/SwalService";
import { useUserStore } from "@stores/user/users";
import { useAuthStore } from "@stores/auth/auth";

export default {
  name: "ChangePassword",
  setup() {
    const userStore = useUserStore();
    const authStore = useAuthStore();

    const ready = ref(false);
    const password = ref("");
    const confirmPassword = ref("");

    // --- Vista por defecto en Discos ---
    const currentYear = new Date().getFullYear();
    const defaultYearFilter = ref(
      localStorage.getItem('rv_default_year_filter') === 'all' ? 'all' : 'current'
    );
    const setDefaultYearFilter = (val) => {
      defaultYearFilter.value = val;
      localStorage.setItem('rv_default_year_filter', val);
      window.dispatchEvent(new CustomEvent('rv-year-filter-changed', { detail: val }));
    };

    // --- No Spoilers ---
    const noSpoilers = ref(localStorage.getItem('rv_no_spoilers') === 'true');
    const toggleNoSpoilers = () => {
      noSpoilers.value = !noSpoilers.value;
      localStorage.setItem('rv_no_spoilers', String(noSpoilers.value));
      window.dispatchEvent(new CustomEvent('rv-spoilers-changed', { detail: noSpoilers.value }));
    };
    const errorMessage = ref("");
    const showPassword = ref(false);
    const showConfirmPassword = ref(false);

    const selectedAvatar = ref("");
    const avatars = ref([]);
    const openCategory = ref("music");

    const categories = ref([
      { key: "music",   label: "Música",      icon: "fa-solid fa-music" },
      { key: "animals", label: "Animales",     icon: "fa-solid fa-paw" },
      { key: "marvel",  label: "Marvel",       icon: "fa-solid fa-mask" },
      { key: "misc",    label: "Miscelánea",   icon: "fa-solid fa-shapes" },
    ]);

    const avatarsByCategory = ref({
      music: [
        "/avatar/avatar1.png", "/avatar/avatar2.png", "/avatar/avatar3.png", "/avatar/avatar4.png",
        "/avatar/avatar5.png", "/avatar/avatar6.png", "/avatar/avatar7.png", "/avatar/avatar8.png",
        "/avatar/avatar9.png", "/avatar/avatar10.png", "/avatar/avatar11.png", "/avatar/avatar12.png",
        "/avatar/avatar13.png", "/avatar/avatar14.png", "/avatar/avatar15.png", "/avatar/avatar16.png",
        "/avatar/avatar17.png", "/avatar/avatar18.png",
      ],
      animals: [
        "/avatar/avatar21.png", "/avatar/avatar22.png", "/avatar/avatar23.png", "/avatar/avatar24.png",
        "/avatar/avatar25.png", "/avatar/avatar26.png", "/avatar/avatar27.png", "/avatar/avatar28.png",
        "/avatar/avatar29.png", "/avatar/avatar30.png", "/avatar/avatar31.png", "/avatar/avatar32.png",
        "/avatar/avatar33.png", "/avatar/avatar34.png", "/avatar/avatar35.png", "/avatar/avatar36.png",
        "/avatar/avatar37.png", "/avatar/avatar38.png",
      ],
      marvel: [
        "/avatar/avatar39.png", "/avatar/avatar40.png", "/avatar/avatar41.png", "/avatar/avatar42.png",
        "/avatar/avatar43.png", "/avatar/avatar44.png", "/avatar/avatar45.png", "/avatar/avatar46.png",
        "/avatar/avatar47.png", "/avatar/avatar48.png", "/avatar/avatar49.png", "/avatar/avatar50.png",
      ],
      misc: [
        "/avatar/avatar20.png", "/avatar/avatar19.png", "/avatar/avatar54.png",
        "/avatar/avatar52.png", "/avatar/avatar53.png",
      ],
    });

    const allAvatars = computed(() =>
      categories.value.flatMap(cat => (avatarsByCategory.value[cat.key] || []))
    );

    const passwordMismatch = computed(() => password.value !== confirmPassword.value);
    const passwordError = computed(() => {
      if (password.value.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
      if (!/[A-Z]/.test(password.value)) return "La contraseña debe incluir al menos una letra mayúscula.";
      if (!/[a-z]/.test(password.value)) return "La contraseña debe incluir al menos una letra minúscula.";
      if (!/[0-9]/.test(password.value)) return "La contraseña debe incluir al menos un número.";
      return "";
    });

    const loadAvatars = () => {
      avatars.value = allAvatars.value;
      const saved = authStore.avatarUrl || localStorage.getItem("image");
      selectedAvatar.value = (saved && saved.length) ? saved : (avatars.value[0] || "");
    };

    onMounted(() => {
      loadAvatars();
      ready.value = true;
    });

    const toggleCategory = (key) => {
      openCategory.value = (openCategory.value === key) ? null : key;
    };
    const selectAvatar = (avatar) => { selectedAvatar.value = avatar; };

    const saveAvatar = async () => {
      try {
        await userStore.updateUserStore({ image: selectedAvatar.value });
        authStore.setImage(selectedAvatar.value);
        SwalService.success("Avatar actualizado");
        errorMessage.value = "";
      } catch (error) {
        errorMessage.value = error?.response?.data?.message || "Ocurrió un error inesperado";
      }
    };

    const changePassword = async () => {
      if (passwordMismatch.value || passwordError.value) return;
      try {
        await userStore.updateUserStore({ password: password.value });
        SwalService.success("Contraseña cambiada");
        password.value = "";
        confirmPassword.value = "";
        errorMessage.value = "";
      } catch (error) {
        errorMessage.value = error?.response?.data?.message || "Ocurrió un error inesperado";
      }
    };

    return {
      ready,
      password, confirmPassword, showPassword, showConfirmPassword,
      passwordMismatch, passwordError, changePassword, errorMessage,
      categories, avatarsByCategory, allAvatars,
      openCategory, toggleCategory,
      avatars, selectedAvatar, selectAvatar, saveAvatar,
      noSpoilers, toggleNoSpoilers,
      defaultYearFilter, currentYear, setDefaultYearFilter,
    };
  },
};
</script>
