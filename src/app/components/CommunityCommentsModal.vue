<template>
  <ComentsModal
    :disc-id="discId"
    :artist-name="artistName"
    :album-name="albumName"
    :current-user="identity.user"
    :session-avatar="identity.avatar"
    @close="$emit('close')"
    @open-user="openUser" />
  <UserModal
    v-if="selectedUser"
    :username="selectedUser.username"
    :user-id="selectedUser.id"
    :avatar-src="selectedUser.avatar"
    @close="selectedUser = null" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import ComentsModal from "@/components/ComentsModal.vue";
import UserModal from "@/components/UserModal.vue";
import { getCommunityCommentIdentity } from "@/app/dependencies/communityConversation";

defineProps<{ discId: string; artistName: string; albumName: string }>();
defineEmits<{ close: [] }>();

const identity = getCommunityCommentIdentity();
const selectedUser = ref<{ username: string; id: string; avatar: string } | null>(null);
function openUser(user: { username: string; id: string; avatar: string }) {
  selectedUser.value = user;
}
</script>
