<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import { hasMinimumRole } from "@/modules/identity/shared";
import DiscCalendar from "./DiscCalendar.vue";
import DiscCalendarBaby from "./DiscCalendarBaby.vue";

const authStore = useAuthStore();

const calendarView = computed(() => {
  if (
    authStore.authStatus !== "authenticated" ||
    !hasMinimumRole(authStore.role, "user")
  ) {
    return null;
  }

  switch (authStore.role) {
    case "user":
    case "collaborator":
      return DiscCalendarBaby;
    case "riffvalley":
    case "superadmin":
      return DiscCalendar;
    default:
      return null;
  }
});
</script>

<template>
  <component :is="calendarView" v-if="calendarView" />
</template>
