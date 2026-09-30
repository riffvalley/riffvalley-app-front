<script setup lang="ts">
import DiscCalendarPage from "@/app/components/DiscCalendarPage.vue";
withDefaults(defineProps<{ embedded?: boolean; initialDate?: string; focusDiscId?: string }>(), {
  embedded: false, initialDate: "", focusDiscId: "",
});
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <DiscCalendarPage :embedded="embedded" :initial-date="initialDate" :focus-disc-id="focusDiscId" @close="emit('close')" />
</template>
