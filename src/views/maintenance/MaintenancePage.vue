<script setup lang="ts">
import StatusPageShell from "@components/status/StatusPageShell.vue";

function reloadPage(): void {
  window.location.reload();
}
</script>

<template>
  <StatusPageShell
    embedded
    title="Esta vista está en construcción"
    description="Estamos preparando esta parte de Riff Valley. Vuelve pronto para descubrirla."
    image-src="/errors/maintenance.png"
    image-alt="Un mono trabajador organiza herramientas y planos frente a un portátil."
  >
    <template #actions>
      <router-link class="status-action status-action-primary" to="/">
        Volver al inicio
      </router-link>
      <button class="status-action status-action-secondary" type="button" @click="reloadPage">
        Recargar página
      </button>
    </template>
  </StatusPageShell>
</template>
