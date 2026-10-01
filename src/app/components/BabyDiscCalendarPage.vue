<script setup lang="ts">
import { computed } from "vue";
import { BabyDiscCalendarView } from "@/modules/catalog";
import DiscComponent from "@views/discsCalendarBaby/components/DiscComponentBaby.vue";
import { useCatalogStore } from "@stores/catalog/catalog";
import { calendarPort } from "../dependencies/discCalendar";
import { showErrorToast } from "@/shared/ui/errorToast";
import { getCommunityPending, isCommunityPendingSubmitting, seedCommunityPending, toggleCommunityPending } from "@/app/bridges/communityPendings";
import { useCommunityPendingRevision } from "@/modules/community/pendings/presentation/composables/useCommunityPendingState";
import { useAuthStore } from "@/app/dependencies/identity";
import type { PendingState } from "@/modules/community";

const catalog = useCatalogStore();
const auth = useAuthStore();
const communityPendingRevision = useCommunityPendingRevision();
const pendingUserId = computed(() => auth.loggedUser.id ?? "");
const emptyPendingState: PendingState = { pendingId: null, loaded: false };
function communityPending(discId: string): PendingState {
  communityPendingRevision.value;
  return pendingUserId.value ? getCommunityPending(pendingUserId.value, discId) : emptyPendingState;
}
function communityPendingSubmitting(userId: string, discId: string): boolean {
  communityPendingRevision.value;
  return isCommunityPendingSubmitting(userId, discId);
}
function initializePending(userId: string, discId: string, pendingId: string | null) {
  if (userId) seedCommunityPending(userId, discId, pendingId);
}
function togglePending(userId: string, discId: string) {
  return toggleCommunityPending(userId, discId);
}
const loadError = () => showErrorToast("Error al cargar los discos");
</script>

<template>
  <BabyDiscCalendarView :calendar-port="calendarPort" :genres="catalog.genres" :countries="catalog.countries" @load-error="loadError">
    <template #disc="{ disc }">
      <DiscComponent :disc="disc" :genres="catalog.genres" :artist-country="disc.artist?.country"
        :pending-user-id="pendingUserId" :pending-state="communityPending(disc.id)"
        :pending-submitting="communityPendingSubmitting(pendingUserId, disc.id)"
        :initialize-pending="initializePending" :toggle-pending="togglePending" />
    </template>
  </BabyDiscCalendarView>
</template>
