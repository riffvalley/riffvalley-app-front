<script setup lang="ts">
import DiscDetailModal from "@/app/components/DiscDetailModal.vue";
import type { DiscDetailIdentity } from "@/modules/catalog";

// Keep the existing import, prop and close event for all legacy consumers.
defineProps<{ disc: DiscDetailIdentity }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <DiscDetailModal :disc="disc" @close="emit('close')" />
</template>
