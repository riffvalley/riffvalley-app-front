<template>
  <transition name="fade" appear>
    <div class="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black bg-opacity-50 z-50"
      @click.self="$emit('close')">
      <transition name="scale">
        <div ref="modal"
          class="bg-white dark:bg-rv-darkCard rounded-lg shadow-lg relative w-full max-w-2xl sm:max-w-lg md:max-w-xl lg:max-w-2xl flex flex-col max-h-[90vh] sm:max-h-[90vh] h-auto border border-gray-100 dark:border-white/10">
          <!-- Botón para cerrar el modal -->
          <button @click="$emit('close')" aria-label="Cerrar" title="Cerrar" class="absolute top-2 right-2 text-white bg-rv-navy hover:bg-[#e46e8a]
         rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all
         border-0 outline-none focus:outline-none focus-visible:outline-none
         ring-0 focus:ring-0 focus-visible:ring-0">
            <i class="fas fa-times"></i>
          </button>

          <!-- Cabecera -->
          <div class="border-b border-gray-200 dark:border-white/10 px-4 py-6 text-center">
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

          <div class="bg-rv-navy dark:bg-rv-darkSurface border-t border-rv-navy dark:border-white/10 rounded-b-lg px-4 py-3">
            <form @submit.prevent="submitTopComment" class="flex space-x-2">
              <input v-model="topCommentText" type="text" placeholder="Escribe un comentario..." class="flex-1 rounded-lg px-3 py-2 text-sm sm:text-base
border border-gray-200 dark:border-white/10 bg-white dark:bg-rv-darkCard
text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500
outline-none focus:outline-none focus-visible:outline-none
ring-0 focus:ring-0 focus-visible:ring-0
focus:border-rv-navy dark:focus:border-rv-purple" />
              <button type="submit"
                class="bg-rv-pink text-white font-semibold px-4 py-2 rounded-full hover:bg-rv-pink/90 transition-all">
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
import { defineComponent, ref, onMounted, toRefs } from "vue";
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
</style>