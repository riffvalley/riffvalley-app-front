<template>
  <div v-if="ready" class="mx-auto max-w-5xl px-4 py-8">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- IZQUIERDA: Avatares por temática -->
      <section class="bg-white rounded-lg shadow p-6">
        <div class="text-center mb-5">
        <span class="bg-rv-navy text-white px-4 py-1 rounded-full text-md font-bold">
            Avatar
          </span>
          </div>

        <div class="space-y-3">
          <!-- Acordeón de categorías -->
          <div v-for="cat in categories" :key="cat.key" class="border rounded-lg overflow-hidden">
            <!-- Cabecera -->
            <button type="button"
              class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
              @click="toggleCategory(cat.key)" :aria-expanded="openCategory === cat.key">
              <div class="flex items-center gap-2">
                <span v-if="cat.icon" :class="cat.icon"></span>
                <span class="font-medium">{{ cat.label }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                  {{ (avatarsByCategory[cat.key] || []).length }}
                </span>
              </div>
              <i :class="openCategory === cat.key ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
            </button>

            <!-- Panel -->
            <div v-show="openCategory === cat.key" class="p-4">
              <div v-if="(avatarsByCategory[cat.key] || []).length" class="grid grid-cols-4 gap-3 place-items-center">
                <button v-for="avatar in avatarsByCategory[cat.key]" :key="avatar" type="button"
                  @click="selectAvatar(avatar)"
                  class="grid place-items-center w-20 h-20 p-0 leading-none rounded-full overflow-hidden border-4
       transition-transform duration-200 hover:scale-105
       focus:outline-none focus-visible:ring-4 focus-visible:ring-rv-pink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white" :class="avatar === selectedAvatar
        ? 'border-rv-pink shadow-[0_0_0_3px_rgba(236,72,153,0.35),0_0_18px_rgba(236,72,153,0.55)]'
        : 'border-gray-100'">
                  <img :src="avatar" alt="Avatar" class="block w-full h-full object-cover" loading="eager"
                    decoding="async" />
                </button>

              </div>

              <p v-else class="text-sm text-gray-500 italic">Próximamente añadiremos avatares en esta categoría.</p>

            </div>
          </div>
        </div>

        <button type="button" @click="saveAvatar" class="w-full mt-6 bg-gradient-to-r from-rv-pink to-rv-pink/90 text-white font-bold py-2 rounded-full
         hover:from-rv-pink/90 hover:to-rv-pink/80 focus:outline-none 
         disabled:opacity-50 disabled:cursor-not-allowed">
          Guardar avatar
        </button>

      </section>

      <!-- DERECHA: Cambiar contraseña -->
      <section class="bg-white rounded-lg shadow p-6">
        <div class="text-center mb-5">
        <span class="bg-rv-navy text-white px-4 py-1 rounded-full text-md font-bold">
            Cambiar contraseña
          </span>
          </div>

        <form @submit.prevent="changePassword" class="space-y-4">
          <div>
            <label for="password" class="block font-medium mb-1">Nueva contraseña</label>
            <input v-model="password" type="password" id="password" class="w-full p-2 border border-gray-300 rounded-lg"
              placeholder="Crea tu nueva contraseña" required />
            <p v-if="passwordError" class="text-red-500 text-sm mt-1">
              {{ passwordError }}
            </p>
          </div>

          <div>
            <label for="confirmPassword" class="block font-medium mb-1">Confirmar Contraseña</label>
            <input v-model="confirmPassword" type="password" id="confirmPassword"
              class="w-full p-2 border border-gray-300 rounded-lg" placeholder="Confirma tu nueva contraseña"
              required />
          </div>

          <p v-if="passwordMismatch" class="text-red-500 text-sm -mt-2">
            Las contraseñas no coinciden
          </p>

          <p v-if="errorMessage" class="text-red-500 text-sm">
            {{ errorMessage }}
          </p>

          <button type="submit" class="w-full mt-6 bg-gradient-to-r from-rv-pink to-rv-pink/90 text-white font-bold py-2 rounded-full
         hover:from-rv-pink/90 hover:to-rv-pink/80 focus:outline-none 
         disabled:opacity-50 disabled:cursor-not-allowed">
            Guardar Contraseña
          </button>
        </form>
      </section>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import SwalService from "@services/swal/SwalService";
import { useUserStore } from "@stores/user/users";
import { useAuthStore } from "@stores/auth/auth";

export default {
  name: "ChangePassword",
  setup() {
    const userStore = useUserStore();
    const authStore = useAuthStore();

    // Estado general
    const ready = ref(false);
    const password = ref("");
    const confirmPassword = ref("");
    const errorMessage = ref("");

    // Avatares
    const selectedAvatar = ref("");
    const avatars = ref([]); // listado plano si lo necesitas en otros sitios
    const openCategory = ref("music"); // categoría abierta por defecto

    // Definición de categorías
    const categories = ref([
      { key: "music", label: "Música", icon: "fa-solid fa-music" },
      { key: "animals", label: "Animales", icon: "fa-solid fa-paw" },
      { key: "marvel", label: "Marvel", icon: "fa-solid fa-mask" },
      { key: "misc", label: "Miscelánea", icon: "fa-solid fa-shapes" },
    ]);

    const avatarsByCategory = ref({
      music: [
        "/avatar/avatar1.png", "/avatar/avatar2.png", "/avatar/avatar3.png", "/avatar/avatar4.png",
        "/avatar/avatar5.png", "/avatar/avatar6.png", "/avatar/avatar7.png", "/avatar/avatar8.png", "/avatar/avatar9.png", "/avatar/avatar10.png", "/avatar/avatar11.png", "/avatar/avatar12.png", "/avatar/avatar13.png", "/avatar/avatar14.png",
        "/avatar/avatar15.png", "/avatar/avatar16.png", "/avatar/avatar17.png", "/avatar/avatar18.png", "/avatar/avatar19.png",
      ],
      animals: [
        "/avatar/avatar21.png", "/avatar/avatar22.png", "/avatar/avatar23.png", "/avatar/avatar24.png",
        "/avatar/avatar25.png", "/avatar/avatar26.png", "/avatar/avatar27.png", "/avatar/avatar28.png", "/avatar/avatar29.png", "/avatar/avatar30.png", "/avatar/avatar31.png", "/avatar/avatar32.png", "/avatar/avatar33.png", "/avatar/avatar34.png",
        "/avatar/avatar35.png", "/avatar/avatar36.png", "/avatar/avatar37.png", "/avatar/avatar38.png",
      ],
      marvel: [
        "/avatar/avatar39.png", "/avatar/avatar40.png", "/avatar/avatar41.png", "/avatar/avatar42.png", "/avatar/avatar43.png", "/avatar/avatar44.png", "/avatar/avatar45.png", "/avatar/avatar46.png", "/avatar/avatar47.png", "/avatar/avatar48.png", "/avatar/avatar49.png", "/avatar/avatar50.png",
      ],
      misc: [
        "/avatar/avatar20.png", "/avatar/avatar52.png", "/avatar/avatar53.png",
      ],

    });

    // Derivar un array "todos"
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

    // UI Avatares
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

    // Contraseña
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
      // contraseña
      password, confirmPassword, passwordMismatch, passwordError, changePassword, errorMessage,
      // avatares
      categories, avatarsByCategory, allAvatars,
      openCategory, toggleCategory,
      avatars, selectedAvatar, selectAvatar, saveAvatar,
    };
  },
};
</script>
