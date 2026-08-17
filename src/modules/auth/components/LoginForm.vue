<template>
  <form class="space-y-2.5 sm:space-y-3 w-full" @submit.prevent="submit">
    <input v-model="username" type="text" autocomplete="username" placeholder="Usuario"
      class="w-full px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-white/10 rounded-full bg-white dark:bg-rv-darkSurface text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rv-pink/40" />
    <div class="relative">
      <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="Contraseña"
        class="w-full px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-white/10 rounded-full bg-white dark:bg-rv-darkSurface text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rv-pink/40" />
      <button type="button" :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPassword = !showPassword"
        class="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent text-gray-400 dark:text-gray-300 border-0 outline-none">
        <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" class="text-sm"></i>
      </button>
    </div>
    <button type="submit" :disabled="loading" class="w-full bg-gradient-to-r from-[#0c6ddc] to-[#0a56b3] text-white font-bold py-1.5 sm:py-2 rounded-full shadow-md shadow-blue-900/25 hover:from-[#0a5fc2] hover:to-[#084a9a] active:scale-[0.98] transition duration-200 focus:outline-none focus:ring-4 focus:ring-rv-blueDark/25">
      {{ loading ? 'Accediendo...' : 'Login' }}
    </button>
    <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useLogin } from '../composables/useLogin';

const showPassword = ref(false);
const { username, password, loading, error, submit } = useLogin();
</script>
