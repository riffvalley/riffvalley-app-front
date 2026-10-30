<script setup lang="ts">
import StatusPageShell from "@components/status/StatusPageShell.vue";
import { useAuthStore } from "@/modules/identity/auth";

const authStore = useAuthStore();
</script>

<template>
  <StatusPageShell
    :embedded="authStore.authStatus === 'authenticated'"
    code="404"
    title="No encontramos esta página"
    description="La dirección puede estar mal escrita o el contenido ya no estar disponible."
    image-src="/errors/404.png"
    image-alt="Un mono trabajador junto a una señal de error 404 en una zona de obras."
  >
    <template #actions>
      <router-link class="status-action status-action-primary" to="/">
        Volver al inicio
      </router-link>
    </template>
  </StatusPageShell>
</template>
