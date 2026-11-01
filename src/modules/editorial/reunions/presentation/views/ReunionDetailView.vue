<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import { useReunionDetailQuery } from "../../application/reunionsQueries";
import ReunionEditor from "../components/ReunionEditor.vue";
import { reportVisibleReunions } from "../composables/reunionsVisibility";

const props = defineProps<{ id: string }>();
const auth = useAuthStore();
const session = {
  userId: computed(() => auth.userId),
  generation: computed(() => auth.authSessionGeneration),
  role: computed(() => auth.role),
};
const reunionId = computed(() => props.id);
const detailQuery = useReunionDetailQuery(session, reunionId);
const visibleReunions = computed(() => (detailQuery.data.value ? [detailQuery.data.value] : []));
reportVisibleReunions(visibleReunions);
</script>

<template>
  <ReunionEditor :id="id" />
</template>
