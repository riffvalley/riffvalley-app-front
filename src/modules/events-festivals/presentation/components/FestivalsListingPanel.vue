<script setup lang="ts">
import { computed, nextTick, shallowRef } from "vue";
import { EVENT_LISTING_PAGE_SIZE } from "../../api/eventListing";
import { useEventListing } from "../../application/useEventListing";
import { useAuthStore } from "@/modules/identity/auth";
import { hasMinimumRole } from "@/modules/identity/shared";
import type { ListedEvent } from "../../types/eventListing";
import EventListingFilters from "./EventListingFilters.vue";
import EventListingPagination from "./EventListingPagination.vue";
import EventListingState from "./EventListingState.vue";
import FestivalListingTable from "./FestivalListingTable.vue";
import EventEditModal from "./EventEditModal.vue";
import EventDeleteDialog from "./EventDeleteDialog.vue";

const props = defineProps<{ active: boolean }>();
const listing = useEventListing("festival", () => props.active);
const auth = useAuthStore();
const canManage = computed(() => auth.isAuthenticated && hasMinimumRole(auth.role, "riffvalley"));
const editingEventId = shallowRef<string | null>(null);
const deletingEvent = shallowRef<ListedEvent | null>(null);
const data = computed(() => listing.query.data.value);
const festivals = computed(() => data.value?.data ?? []);
const currentPage = computed(() => Math.floor(listing.offset.value / EVENT_LISTING_PAGE_SIZE) + 1);

async function handleDeleted() {
  await nextTick();
  if ((data.value?.data.length ?? 0) === 0 && listing.offset.value > 0) {
    listing.goToPage(Math.max(1, Math.floor(listing.offset.value / EVENT_LISTING_PAGE_SIZE)));
  }
}
</script>

<template>
  <section class="flex flex-col gap-4" aria-label="Listado de festivales">
    <EventListingFilters
      id-prefix="festivals"
      :filters="listing.filters.value"
      :busy="listing.query.isFetching.value"
      @update-filter="listing.updateFilter"
      @clear="listing.clearFilters"
    />
    <p
      v-if="listing.invalidDateRange.value"
      class="text-sm font-medium text-red-700 dark:text-red-300"
      role="alert"
    >
      La fecha final debe ser igual o posterior a la fecha inicial.
    </p>
    <EventListingState
      :loading="listing.query.isLoading.value && !listing.invalidDateRange.value"
      :error="listing.invalidDateRange.value || listing.query.isError.value"
      :empty="
        !listing.invalidDateRange.value &&
        !listing.query.isError.value &&
        !listing.query.isLoading.value &&
        festivals.length === 0
      "
      :message="
        listing.invalidDateRange.value
          ? 'Revisa el intervalo de fechas.'
          : 'No se pudieron cargar los festivales. Comprueba la conexión e inténtalo de nuevo.'
      "
      @retry="listing.query.refetch()"
    />
    <template
      v-if="!listing.invalidDateRange.value && !listing.query.isError.value && festivals.length"
    >
      <FestivalListingTable
        :festivals="festivals"
        :can-manage="canManage"
        @edit="editingEventId = $event.id"
        @delete="deletingEvent = $event"
      />
      <EventListingPagination
        :current-page="data?.currentPage ?? currentPage"
        :total-pages="data?.totalPages ?? 1"
        :total-items="data?.totalItems ?? 0"
        :disabled="listing.query.isFetching.value"
        @change-page="listing.goToPage"
      />
    </template>
    <EventEditModal
      v-if="editingEventId"
      :event-id="editingEventId"
      :can-manage="canManage"
      @close="editingEventId = null"
    />
    <EventDeleteDialog
      v-if="deletingEvent"
      :event="deletingEvent"
      :can-manage="canManage"
      @close="deletingEvent = null"
      @deleted="handleDeleted"
    />
  </section>
</template>
