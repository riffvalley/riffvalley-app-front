<script setup lang="ts">
import { onMounted, ref } from 'vue';
import SuggestView from '@/modules/releases/requests/presentation/views/SuggestView.vue';
import type { RequestCatalogReference } from '@/modules/releases/requests/domain/request';
import {
  createDiscRequest,
  fetchMyDiscRequests,
  fetchRequestCatalogOptions,
} from '@/app/dependencies/requests';

const props = defineProps<{
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
}>();

const genres = ref<RequestCatalogReference[]>([]);
const countries = ref<RequestCatalogReference[]>([]);

onMounted(async () => {
  try {
    const options = await fetchRequestCatalogOptions();
    genres.value = options.genres.map(({ id, name }) => ({ id, name }));
    countries.value = options.countries.map(({ id, name }) => ({ id, name }));
  } catch {
    // The existing flow has no catalog-load error message; empty options remain usable.
  }
});
</script>

<template>
  <SuggestView
    :genres="genres"
    :countries="countries"
    :create-request="createDiscRequest"
    :get-my-requests="fetchMyDiscRequests"
    :notify-success="props.notifySuccess"
    :notify-error="props.notifyError"
  />
</template>
