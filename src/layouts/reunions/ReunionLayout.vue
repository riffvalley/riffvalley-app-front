<template>
  <div>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/modules/identity/auth";
import { useReunionsRealtime } from "@/modules/editorial/reunions/application/useReunionsRealtime";
import { provideVisibleReunions } from "@/modules/editorial/reunions/presentation/composables/reunionsVisibility";

const route = useRoute();
const auth = useAuthStore();
const enabled = computed(() => route.path === "/reunions" || route.path.startsWith("/reunions/"));

const visibleReunions = provideVisibleReunions();
useReunionsRealtime(auth, enabled, visibleReunions);
</script>
