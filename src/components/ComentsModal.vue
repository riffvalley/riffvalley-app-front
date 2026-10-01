<template>
  <transition name="fade" appear>
    <div class="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/60 z-50 px-4"
      @click.self="$emit('close')">
      <transition name="scale">
        <div ref="modal"
          class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-2xl relative
                 w-full max-w-2xl flex flex-col max-h-[90vh]
                 border border-gray-100 dark:border-white/10">

          <!-- ── Cabecera sticky ───────────────────────────── -->
          <div class="sticky top-0 z-10 bg-white dark:bg-rv-darkCard
                      border-b border-gray-100 dark:border-white/10
                      px-5 pt-5 pb-4 rounded-t-2xl shrink-0">

            <!-- Botón cerrar -->
            <button @click="$emit('close')" aria-label="Cerrar"
              class="absolute top-4 right-4 text-white bg-rv-navy hover:bg-rv-pink
                     rounded-full w-9 h-9 flex items-center justify-center shadow-md transition-all
                     border-0 outline-none focus:outline-none ring-0 focus:ring-0">
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>

            <div class="pr-10">
              <div class="flex items-center gap-2 mb-1">
                <span class="bg-rv-navy dark:bg-rv-purple text-white px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase">
                  Chat
                </span>
                <span class="text-xs text-gray-400 dark:text-gray-300">
                  {{ totalComments }} comentario{{ totalComments !== 1 ? 's' : '' }}
                </span>
              </div>
              <p class="text-base font-bold text-rv-navy dark:text-white leading-snug">
                {{ artistName }}
                <span class="font-normal text-gray-400 dark:text-gray-500 mx-1">—</span>
                <span class="italic font-semibold">{{ albumName }}</span>
              </p>
            </div>
          </div>

          <!-- ── Lista de comentarios ──────────────────────── -->
          <div class="flex-1 overflow-y-auto px-5 py-2 bg-white dark:bg-rv-darkCard">
            <div v-if="comments.length === 0" class="py-12 text-center">
              <i class="fa-regular fa-comment-dots text-3xl text-gray-300 dark:text-white/20 mb-2 block"></i>
              <p class="text-sm text-gray-400 dark:text-gray-500">Sé el primero en comentar</p>
            </div>
            <CommentItem
              v-for="comment in comments" :key="comment.id"
              :comment="comment" :disc-id="discId" :depth="0"
              :current-user="currentUser" :session-avatar="sessionAvatar"
              :submitting-reply-ids="submittingReplyIds"
              :editing-comment-ids="editingCommentIds"
              :submit-reply="submitReply"
              :submit-edit="editComment"
              @deleted="handleCommentDeleted"
              @open-user="openUserModal($event.username, $event.id, $event.avatar)" />
          </div>

          <!-- ── Footer: input ─────────────────────────────── -->
          <div class="shrink-0 bg-gray-50 dark:bg-rv-darkSurface border-t border-gray-100 dark:border-white/10 rounded-b-2xl px-4 py-3">

            <!-- Emoji picker -->
            <Transition name="emoji-slide">
              <div v-if="showEmojiPicker" class="emoji-slide-grid mb-2">
                <div class="emoji-slide-content bg-white dark:bg-rv-darkCard rounded-xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden">
                  <div class="flex border-b border-gray-100 dark:border-white/10">
                    <button v-for="cat in emojiCategories" :key="cat.name" type="button"
                      @click="activeEmojiCategory = cat.name"
                      class="flex-1 py-1.5 text-base transition-colors bg-transparent border-0 outline-none focus:outline-none"
                      :class="activeEmojiCategory === cat.name
                        ? 'bg-gray-100 dark:bg-rv-darkSurface'
                        : 'hover:bg-gray-50 dark:hover:bg-rv-darkSurface/60'">
                      {{ cat.label }}
                    </button>
                  </div>
                  <div class="grid grid-cols-9 gap-0.5 p-2 max-h-32 overflow-y-auto">
                    <button v-for="emoji in currentEmojis" :key="emoji" type="button"
                      @click="insertEmoji(emoji)"
                      class="text-lg p-1 rounded-lg bg-transparent border-0 outline-none focus:outline-none hover:bg-gray-100 dark:hover:bg-white/10 transition-colors leading-none">
                      {{ emoji }}
                    </button>
                  </div>
                </div>
              </div>
            </Transition>

            <form @submit.prevent="submitTopComment" class="flex items-center gap-2">
              <button type="button" @click="showEmojiPicker = !showEmojiPicker"
                class="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 p-0
                       border-0 outline-none focus:outline-none transition-all duration-200 select-none
                       bg-white dark:bg-rv-darkCard shadow-sm"
                :class="showEmojiPicker ? 'scale-110' : 'opacity-70 hover:opacity-100 hover:scale-110'"
                title="Emojis">
                😊
              </button>
              <input ref="inputRef" v-model="topCommentText" type="text"
                :disabled="isSubmitting"
                placeholder="Añade un comentario..."
                class="flex-1 rounded-full px-4 py-2 text-sm
                       border border-gray-200 dark:border-white/10
                       bg-white dark:bg-rv-darkCard
                       text-gray-800 dark:text-white
                       placeholder:text-gray-400 dark:placeholder:text-gray-500
                       outline-none focus:outline-none focus:border-rv-navy dark:focus:border-rv-purple" />
              <button type="submit" :disabled="isSubmitting"
                class="bg-rv-pink text-white font-semibold text-sm px-4 py-2 rounded-full
                       hover:bg-rv-pink/90 transition-all shrink-0
                       focus:outline-none border-0">
                Enviar
              </button>
            </form>
          </div>

          <!-- UserModal -->
          <UserModal v-if="showUserModal" :username="selectedUserName" :user-id="selectedUserId"
            :avatar-src="selectedUserAvatar" @close="showUserModal = false" />

        </div>
      </transition>
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, toRefs, nextTick } from "vue";
import CommentItem from "./CommentItem.vue";
import SwalService from "@services/swal/SwalService";
import UserModal from '@/components/UserModal.vue';
import { useDiscConversation, type DiscComment } from "@/modules/community";
import { createCommunityReply, createCommunityRootComment, getCommunityCommentIdentity, loadCommunityConversation, updateCommunityComment } from "@/app/dependencies/communityConversation";

function markCommentAsDeleted(comments: DiscComment[], commentId: string): DiscComment[] {
  comments.forEach((comment) => {
    if (comment.id === commentId) {
      comment.isDeleted = true;
      comment.comment = "Comentario eliminado";
    }
    if (comment.replies?.length) {
      markCommentAsDeleted(comment.replies, commentId);
    }
  });
  return comments;
}

export default defineComponent({
  name: "ComentsModal",
  components: { CommentItem, UserModal },
  props: {
    discId:     { type: String, required: true },
    artistName: { type: String, required: true },
    albumName:  { type: String, required: true },
  },
  emits: ["close"],
  setup(props, { emit }) {
    const conversation = useDiscConversation(props.discId, loadCommunityConversation, createCommunityRootComment,
      (discId, parentId, text) => createCommunityReply(discId, parentId, text), updateCommunityComment);
    const comments = conversation.comments;
    const submittingReplyIds = conversation.submittingReplyIds;
    const editingCommentIds = conversation.editingCommentIds;
    const topCommentText = ref("");
    const inputRef       = ref<HTMLInputElement | null>(null);

    const totalComments = conversation.totalComments;
    const isSubmitting = conversation.isSubmitting;

    // --- Emoji picker ---
    const showEmojiPicker       = ref(false);
    const activeEmojiCategory   = ref('Reacciones');

    const emojiCategories = [
      { label: '😊', name: 'Reacciones', emojis: ['😂','😍','🔥','💀','👏','🤩','😭','🤔','💯','❤️','🙌','👍','👎','😮','🤣','😤','🥲','😎','🤯','😱','🤘','✌️','👌','🫶','💔','🫡','🙃','😏','🤫','🥳','🎉','🫠','😴','🤧','😬','🤮'] },
      { label: '🎵', name: 'Música',     emojis: ['🎵','🎶','🎸','🥁','🎹','🎤','🎧','🎼','🎷','🎺','🎻','🪗','🪘','🪕','🎙️','🔊','📢','🔔','🎬','🎯','🌟','⭐','✨','💥','🚀','🏆','🥇','💎','👑','🎊'] },
      { label: '💬', name: 'Otros',      emojis: ['💪','💅','🤌','👀','💬','💭','🌈','🌊','💫','⚡','🌙','☀️','🍺','🍻','🥂','🎁','🧠','👾','🤖','🫣','🙈','🐸','💩','👻','🤡','💃','🕺','🌚','🌝','🫵'] },
    ];

    const currentEmojis = computed(() =>
      emojiCategories.find(c => c.name === activeEmojiCategory.value)?.emojis ?? []
    );

    const insertEmoji = (emoji: string) => {
      const input = inputRef.value;
      if (!input) { topCommentText.value += emoji; return; }
      const start = input.selectionStart ?? topCommentText.value.length;
      const end   = input.selectionEnd   ?? topCommentText.value.length;
      topCommentText.value =
        topCommentText.value.slice(0, start) + emoji + topCommentText.value.slice(end);
      nextTick(() => {
        input.selectionStart = start + emoji.length;
        input.selectionEnd   = start + emoji.length;
        input.focus();
      });
    };

    const { artistName, albumName, discId } = toRefs(props);
    const { user: currentUser, avatar: sessionAvatar } = getCommunityCommentIdentity();

    const showUserModal      = ref(false);
    const selectedUserName   = ref('');
    const selectedUserId     = ref('');
    const selectedUserAvatar = ref('');

    const openUserModal = (username: string, id: string, avatar?: string) => {
      selectedUserName.value   = username;
      selectedUserId.value     = id;
      selectedUserAvatar.value = avatar ?? '';
      showUserModal.value      = true;
    };

    const fetchComments = async () => {
      try {
        await conversation.load();
      } catch {
        SwalService.error("Error al cargar los comentarios.");
      }
    };

    const submitTopComment = async () => {
      if (!topCommentText.value.trim()) {
        SwalService.error("El comentario no puede estar vacío.");
        return;
      }
      try {
        await conversation.addRootComment(topCommentText.value);
        topCommentText.value = "";
        SwalService.success("Comentario añadido");
      } catch (error) {
        SwalService.error("Error al enviar el comentario.");
      }
    };

    const submitReply = (parentId: string, text: string) => conversation.addReply(parentId, text, {
      userId: currentUser?.id ?? null,
      avatar: sessionAvatar,
    });

    const handleCommentDeleted = (commentId: string) => {
      comments.value = markCommentAsDeleted(comments.value, commentId);
    };

    const editComment = conversation.editComment;

    onMounted(() => { fetchComments(); });

    return {
      comments,
      submittingReplyIds,
      topCommentText,
      inputRef,
      totalComments,
      isSubmitting,
      showEmojiPicker,
      activeEmojiCategory,
      emojiCategories,
      currentEmojis,
      insertEmoji,
      submitTopComment,
      submitReply,
      handleCommentDeleted,
      editingCommentIds,
      editComment,
      artistName,
      albumName,
      discId,
      currentUser,
      sessionAvatar,
      showUserModal,
      selectedUserName,
      selectedUserId,
      selectedUserAvatar,
      openUserModal,
    };
  },
});

</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

.scale-enter-active, .scale-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.scale-enter-from, .scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(8px);
}

.emoji-slide-enter-active, .emoji-slide-leave-active {
  transition: grid-template-rows 0.25s ease, opacity 0.2s ease;
}
.emoji-slide-grid { display: grid; grid-template-rows: 1fr; }
.emoji-slide-content { min-height: 0; }
.emoji-slide-enter-from, .emoji-slide-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}
</style>
