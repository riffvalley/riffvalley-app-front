<template>
  <transition name="fade" appear>
    <div class="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black bg-opacity-50 z-50"
      @click.self="$emit('close')">
      <transition name="scale">
        <div ref="modal"
          class="bg-white dark:bg-rv-darkCard rounded-xl shadow-xl relative w-full max-w-2xl sm:max-w-lg md:max-w-xl lg:max-w-2xl flex flex-col max-h-[90vh] sm:max-h-[90vh] h-auto border border-gray-100 dark:border-white/10">
          <!-- Botón para cerrar el modal -->
          <button @click="$emit('close')" aria-label="Cerrar" title="Cerrar" class="absolute top-2 right-2 text-white bg-rv-navy hover:bg-[#e46e8a]
         rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all
         border-0 outline-none focus:outline-none focus-visible:outline-none
         ring-0 focus:ring-0 focus-visible:ring-0">
            <i class="fas fa-times"></i>
          </button>

          <!-- Cabecera -->
          <div class="border-b border-gray-200 dark:border-white/10 px-4 py-4 text-center">
            <h2 class="mb-4">
              <span class="bg-rv-navy text-white px-4 py-1 rounded-full text-md font-bold">
                CHAT
              </span>
            </h2>
            <p class="text-lg text-gray-800 dark:text-white mt-2">
              {{ artistName }} – <span class="italic">{{ albumName }}</span>
            </p>
          </div>

          <div class="flex-1 overflow-y-auto px-4 py-3 space-y-4 max-h-[70vh] sm:max-h-[80vh] bg-white dark:bg-rv-darkCard">
            <CommentItem v-for="comment in comments" :key="comment.id" :comment="comment" :disc-id="discId" :depth="0"
              :avatar-size="64" @reply-added="onReplyAdded" @deleted="handleCommentDeleted"
              @comment-updated="handleCommentUpdated"
              @open-user="openUserModal($event.username, $event.id, $event.avatar)" />
          </div>

          <UserModal v-if="showUserModal" :username="selectedUserName" :user-id="selectedUserId"
            :avatar-src="selectedUserAvatar" @close="showUserModal = false" />

          <div class="bg-gray-50 dark:bg-rv-darkSurface border-t border-gray-200 dark:border-white/10 rounded-b-lg px-4 py-3">

            <!-- Emoji picker panel -->
            <Transition name="emoji-slide">
              <div v-if="showEmojiPicker"
                class="mb-2 bg-white dark:bg-rv-darkCard rounded-xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden">
                <!-- Tabs de categoría -->
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
                <!-- Grid de emojis -->
                <div class="grid grid-cols-9 gap-0.5 p-2 max-h-32 overflow-y-auto">
                  <button v-for="emoji in currentEmojis" :key="emoji" type="button"
                    @click="insertEmoji(emoji)"
                    class="text-lg p-1 rounded-lg bg-transparent border-0 outline-none focus:outline-none hover:bg-gray-100 dark:hover:bg-white/10 transition-colors leading-none">
                    {{ emoji }}
                  </button>
                </div>
              </div>
            </Transition>

            <form @submit.prevent="submitTopComment" class="flex items-center space-x-2">
              <!-- Botón emoji -->
              <button type="button" @click="showEmojiPicker = !showEmojiPicker"
                class="text-xl flex-shrink-0 transition-all duration-200 select-none"
                :class="showEmojiPicker ? 'scale-110' : 'opacity-70 hover:opacity-100 hover:scale-110'"
                title="Emojis">
                😊
              </button>
              <input ref="inputRef" v-model="topCommentText" type="text" placeholder="Escribe un comentario..."
                class="flex-1 rounded-lg px-3 py-2 text-sm sm:text-base
border border-gray-300 dark:border-white/10 bg-white dark:bg-rv-darkCard
text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500
outline-none focus:outline-none focus-visible:outline-none
ring-0 focus:ring-0 focus-visible:ring-0
focus:border-rv-navy dark:focus:border-rv-purple" />
              <button type="submit"
                class="bg-rv-pink text-white font-semibold px-4 py-2 rounded-full hover:bg-rv-pink/90 transition-all flex-shrink-0">
                Enviar
              </button>
            </form>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, toRefs, nextTick } from "vue";
import CommentItem from "./CommentItem.vue";
import { getDisccomments, postcommentService } from "@services/comments/comments";
import SwalService from "@services/swal/SwalService";
import UserModal from '@/components/UserModal.vue';

function buildCommentTree(flatComments: any[]): any[] {
  const commentMap: Record<string, any> = {};
  // Crea un map de id -> comentario
  flatComments.forEach((c) => {
    commentMap[c.id] = { ...c, replies: [] };
  });

  const rootComments: any[] = [];
  flatComments.forEach((c) => {
    if (c.parentId) {
      if (commentMap[c.parentId]) {
        commentMap[c.parentId].replies.push(commentMap[c.id]);
      } else {

        rootComments.push(commentMap[c.id]);
      }
    } else {

      rootComments.push(commentMap[c.id]);
    }
  });

  return rootComments;
}


function markCommentAsDeleted(comments: any[], commentId: string): any[] {
  comments.forEach((comment) => {
    if (comment.id === commentId) {
      comment.isDeleted = true;
      comment.comment = "Comentario eliminado";
    }
    if (comment.replies && comment.replies.length) {
      markCommentAsDeleted(comment.replies, commentId);
    }
  });
  return comments;
}


function updateCommentInTree(commentList: any[], updated: any) {
  commentList.forEach((c) => {
    if (c.id === updated.id) {
      c.comment = updated.comment;
      c.editedAt = updated.editedAt;

    } else if (c.replies && c.replies.length) {
      updateCommentInTree(c.replies, updated);
    }
  });
}

export default defineComponent({
  name: "ComentsModal",
  components: { CommentItem, UserModal },
  props: {
    discId: { type: String, required: true },
    artistName: { type: String, required: true },
    albumName: { type: String, required: true },
  },

  emits: ["close"],
  setup(props, { emit }) {
    const comments = ref<any[]>([]);
    const topCommentText = ref("");
    const inputRef = ref<HTMLInputElement | null>(null);

    // --- Emoji picker ---
    const showEmojiPicker = ref(false);
    const activeEmojiCategory = ref('Reacciones');

    const emojiCategories = [
      {
        label: '😊', name: 'Reacciones',
        emojis: ['😂','😍','🔥','💀','👏','🤩','😭','🤔','💯','❤️','🙌','👍','👎','😮','🤣','😤','🥲','😎','🤯','😱','🤘','✌️','👌','🫶','💔','🫡','🙃','😏','🤫','🥳','🎉','🫠','😴','🤧','😬','🤮']
      },
      {
        label: '🎵', name: 'Música',
        emojis: ['🎵','🎶','🎸','🥁','🎹','🎤','🎧','🎼','🎷','🎺','🎻','🪗','🪘','🪕','🎙️','🔊','📢','🔔','🎬','🎯','🌟','⭐','✨','💥','🚀','🏆','🥇','💎','👑','🎊']
      },
      {
        label: '💬', name: 'Otros',
        emojis: ['💪','💅','🤌','👀','💬','💭','🌈','🌊','💫','⚡','🌙','☀️','🍺','🍻','🥂','🎁','🧠','👾','🤖','🫣','🙈','🐸','💩','👻','🤡','💃','🕺','🌚','🌝','🫵']
      },
    ];

    const currentEmojis = computed(() =>
      emojiCategories.find(c => c.name === activeEmojiCategory.value)?.emojis ?? []
    );

    const insertEmoji = (emoji: string) => {
      const input = inputRef.value;
      if (!input) {
        topCommentText.value += emoji;
        return;
      }
      const start = input.selectionStart ?? topCommentText.value.length;
      const end = input.selectionEnd ?? topCommentText.value.length;
      topCommentText.value =
        topCommentText.value.slice(0, start) + emoji + topCommentText.value.slice(end);
      nextTick(() => {
        input.selectionStart = start + emoji.length;
        input.selectionEnd = start + emoji.length;
        input.focus();
      });
    };

    const { artistName, albumName, discId } = toRefs(props);

    // ComentsModal.vue (setup)
    const showUserModal = ref(false);
    const selectedUserName = ref('');
    const selectedUserId = ref('');
    const selectedUserAvatar = ref(''); // 👈

    const openUserModal = (username: string, id: string, avatar?: string) => {
      selectedUserName.value = username;
      selectedUserId.value = id;
      selectedUserAvatar.value = avatar ?? '';
      showUserModal.value = true;
    };


    // Carga inicial de comentarios
    const fetchComments = async () => {
      try {
        const fetchedComments = await getDisccomments(discId.value);
        comments.value = buildCommentTree(fetchedComments);
      } catch (error) {
        console.error("Error al cargar los comentarios:", error);
        alert("Hubo un error al cargar los comentarios.");
      }
    };

    // Enviar comentario de primer nivel
    const submitTopComment = async () => {
      if (!topCommentText.value.trim()) {
        alert("El comentario no puede estar vacío.");
        return;
      }
      try {
        const newComment = await postcommentService({
          discId: props.discId,
          comment: topCommentText.value,
        });
        // Insertamos el nuevo comentario como raíz
        comments.value.push({ ...newComment, replies: [] });
        topCommentText.value = "";
        SwalService.success("Comentario creado");
      } catch (error) {
        console.error("Error al enviar el comentario:", error);
        alert("Hubo un error al enviar el comentario.");
      }
    };

    const onReplyAdded = (payload: { parentId: string; reply: any }) => {

    };

    const handleCommentDeleted = (commentId: string) => {
      comments.value = markCommentAsDeleted(comments.value, commentId);
    };

    const handleCommentUpdated = (updated: any) => {
      updateCommentInTree(comments.value, updated);
    };

    onMounted(() => {
      fetchComments();
    });

    return {
      comments,
      topCommentText,
      inputRef,
      showEmojiPicker,
      activeEmojiCategory,
      emojiCategories,
      currentEmojis,
      insertEmoji,
      submitTopComment,
      onReplyAdded,
      handleCommentDeleted,
      handleCommentUpdated,
      artistName,
      albumName,
      discId,
      showUserModal,
      selectedUserName,
      selectedUserId,
      openUserModal,
      selectedUserAvatar,
    };
  },
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}

.scale-enter-to {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.emoji-slide-enter-active,
.emoji-slide-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  max-height: 200px;
  overflow: hidden;
}
.emoji-slide-enter-from,
.emoji-slide-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>