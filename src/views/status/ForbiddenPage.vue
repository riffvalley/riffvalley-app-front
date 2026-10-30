<script setup lang="ts">
import StatusPageShell from "@components/status/StatusPageShell.vue";
import { useAuthStore } from "@/modules/identity/auth";

const authStore = useAuthStore();
</script>

<template>
  <StatusPageShell
    :embedded="authStore.authStatus === 'authenticated'"
    code="403"
    title="No tienes acceso a esta página"
    description="Tu cuenta no tiene los permisos necesarios. Si crees que deberías poder entrar, consulta con el equipo de Riff Valley."
    image-src="/errors/403.png"
    image-alt="Un trabajador encuentra una valla cerrada con un candado."
  >
    <template #actions>
      <router-link class="status-action status-action-primary" to="/">
        Volver al inicio
      </router-link>
    </template>
  </StatusPageShell>
</template>
