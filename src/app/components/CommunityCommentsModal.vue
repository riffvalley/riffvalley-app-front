<template>
  <CommentConversationModal
    :disc-id="discId"
    :artist-name="artistName"
    :album-name="albumName"
    :operations="operations"
    :feedback="feedback"
    :current-user="identity.user"
    :session-avatar="identity.avatar"
    @close="$emit('close')"
    @open-user="openUser"
    @comment-count-change="$emit('comment-count-change', $event)" />
  <UserModal
    v-if="selectedUser"
    :username="selectedUser.username"
    :user-id="selectedUser.id"
    :avatar-src="selectedUser.avatar"
    @close="selectedUser = null" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { CommentConversationModal } from "@/modules/community";
import UserModal from "@/components/UserModal.vue";
import { communityCommentFeedback, communityCommentOperations, getCommunityCommentIdentity } from "@/app/dependencies/communityConversation";

defineProps<{ discId: string; artistName: string; albumName: string }>();
defineEmits<{ close: []; "comment-count-change": [count: number] }>();

const identity = getCommunityCommentIdentity();
const operations = communityCommentOperations;
const feedback = communityCommentFeedback;
const selectedUser = ref<{ username: string; id: string; avatar: string } | null>(null);
function openUser(user: { username: string; id: string; avatar: string }) {
  selectedUser.value = user;
}
</script>
