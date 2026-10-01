<template>
  <div class="comment-item" :data-comment-id="comment.id" :class="depth > 0
    ? 'ml-10 pl-4 border-l-2 border-gray-200 dark:border-white/10'
    : 'border-b border-gray-50 dark:border-white/5 last:border-0'">

    <!-- ── Formulario de edición ──────────────────────── -->
    <div v-if="showEditForm" class="py-3 flex items-start gap-3">
      <div class="rounded-full overflow-hidden shrink-0 bg-gray-200 dark:bg-rv-darkSurface"
           :style="{ width: avatarSizePx + 'px', height: avatarSizePx + 'px', minWidth: avatarSizePx + 'px' }">
        <img v-if="displayedAvatar" :src="displayedAvatar" class="w-full h-full object-cover" />
        <svg v-else class="w-full h-full text-gray-400 dark:text-gray-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
        </svg>
      </div>
      <div class="flex-1">
        <input v-model="editText" type="text" autofocus
          class="w-full px-4 py-2 text-sm rounded-xl
                 border border-gray-200 dark:border-white/10
                 bg-gray-50 dark:bg-rv-darkSurface
                 text-gray-800 dark:text-white
                 focus:outline-none focus:border-rv-navy dark:focus:border-rv-purple" />
        <div class="flex gap-4 mt-2">
          <button @click="submitEdit" type="button" :disabled="isEditSubmitting"
            class="text-xs font-semibold text-rv-blue hover:text-rv-blue/70 transition-colors
                   bg-transparent border-0 p-0 focus:outline-none">Guardar</button>
          <button @click="cancelEdit" type="button" :disabled="isEditSubmitting"
            class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors
                   bg-transparent border-0 p-0 focus:outline-none">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- ── Bocadillo ──────────────────────────────────── -->
    <div v-else class="flex items-end gap-2 py-2">

      <!-- Avatar -->
      <div class="rounded-full overflow-hidden shrink-0 bg-gray-200 dark:bg-rv-darkSurface"
           :style="{ width: avatarSizePx + 'px', height: avatarSizePx + 'px', minWidth: avatarSizePx + 'px' }">
        <img v-if="displayedAvatar" :src="displayedAvatar" alt="Avatar" class="w-full h-full object-cover" />
        <svg v-else class="w-full h-full text-gray-400 dark:text-gray-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
        </svg>
      </div>

      <!-- Columna de contenido -->
      <div class="flex flex-col gap-1 min-w-0 items-start"
           :style="{ maxWidth: depth > 0 ? '88%' : '78%' }">

        <!-- Nombre + fecha -->
        <div v-if="!comment.isDeleted"
             class="flex items-center gap-1.5 text-xs px-1 flex-wrap">
          <button
            @click="$emit('open-user', {
              username: comment.user.username,
              id:       comment.user.id,
              avatar:   displayedAvatar || comment.user.image || comment.user.avatarUrl || ''
            })"
            class="font-semibold text-rv-navy dark:text-white
                   hover:text-rv-pink dark:hover:text-rv-pink transition-colors
                   bg-transparent border-0 p-0 focus:outline-none">
            {{ comment.user.username }}
          </button>
          <span class="text-gray-300 dark:text-white/15 select-none">·</span>
          <span class="text-gray-400 dark:text-gray-500">{{ timeAgo(comment.createdAt) }}</span>
          <span v-if="isEdited" class="text-gray-400 dark:text-gray-500 italic">(editado)</span>
        </div>

        <!-- Bubble -->
        <div class="px-4 py-2.5 text-sm leading-relaxed break-words"
             :class="comment.isDeleted
               ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 italic rounded-2xl'
               : isOwnComment
                 ? 'bg-rv-navy dark:bg-rv-purple text-white rounded-2xl rounded-bl-none'
                 : 'bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-none'">
          {{ comment.isDeleted ? 'Comentario eliminado.' : comment.comment }}
        </div>

        <!-- Acciones -->
        <div v-if="!comment.isDeleted"
             class="flex items-center gap-3 px-1">
          <button type="button" @click="toggleReplyForm"
            class="text-xs text-gray-400 dark:text-gray-500 hover:text-rv-navy dark:hover:text-white
                   transition-colors flex items-center gap-1 bg-transparent border-0 p-0 focus:outline-none">
            <i class="fa-solid fa-reply text-[10px]"></i> Responder
          </button>
          <button v-if="comment.user.id === user.id" type="button" @click="startEdit"
            class="text-xs text-gray-400 dark:text-gray-500 hover:text-rv-blue dark:hover:text-rv-blue
                   transition-colors flex items-center gap-1 bg-transparent border-0 p-0 focus:outline-none">
            <i class="fa-solid fa-pen-to-square text-[10px]"></i> Editar
          </button>
          <button v-if="comment.user.id === user.id" type="button" @click="deleteComment" :disabled="isDeleteSubmitting || isDeleteConfirming"
            class="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400
                   transition-colors flex items-center gap-1 bg-transparent border-0 p-0 focus:outline-none">
            <i class="fa-solid fa-trash-can text-[10px]"></i> Borrar
          </button>
        </div>
      </div>
    </div>

    <!-- ── Formulario de respuesta ────────────────────── -->
    <div v-if="showReplyForm && !comment.isDeleted" class="pb-3 pl-12">

      <Transition name="emoji-slide">
        <div v-if="showReplyEmojiPicker" class="emoji-slide-grid mb-1">
          <div class="emoji-slide-content bg-white dark:bg-rv-darkCard rounded-xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden">
            <div class="flex border-b border-gray-100 dark:border-white/10">
              <button v-for="cat in emojiCategories" :key="cat.name" type="button"
                @click="activeReplyEmojiCategory = cat.name"
                class="flex-1 py-1.5 text-sm bg-transparent border-0 outline-none focus:outline-none transition-colors"
                :class="activeReplyEmojiCategory === cat.name
                  ? 'bg-gray-100 dark:bg-rv-darkSurface'
                  : 'hover:bg-gray-50 dark:hover:bg-rv-darkSurface/60'">
                {{ cat.label }}
              </button>
            </div>
            <div class="grid grid-cols-9 gap-0.5 p-2 max-h-28 overflow-y-auto">
              <button v-for="emoji in currentReplyEmojis" :key="emoji" type="button"
                @click="insertReplyEmoji(emoji)"
                class="text-base p-1 rounded-lg bg-transparent border-0 outline-none focus:outline-none
                       hover:bg-gray-100 dark:hover:bg-white/10 transition-colors leading-none">
                {{ emoji }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <form @submit.prevent="submitReply" class="flex items-center gap-2">
        <button type="button" @click="showReplyEmojiPicker = !showReplyEmojiPicker"
          class="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 p-0
                 border-0 outline-none focus:outline-none transition-all duration-200 select-none
                 bg-white dark:bg-rv-darkSurface shadow-sm"
          :class="showReplyEmojiPicker ? 'scale-110' : 'opacity-70 hover:opacity-100 hover:scale-110'"
          title="Emojis">😊</button>
        <input ref="replyInputRef" v-model="replyText" type="text" :disabled="isReplySubmitting"
          placeholder="Escribe tu respuesta..."
          class="flex-1 text-sm rounded-full px-4 py-1.5
                 border border-gray-200 dark:border-white/10
                 bg-white dark:bg-rv-darkSurface
                 text-gray-800 dark:text-white
                 placeholder:text-gray-400 dark:placeholder:text-gray-500
                 focus:outline-none focus:border-rv-navy dark:focus:border-rv-purple" />
        <button type="submit" :disabled="isReplySubmitting"
          class="text-sm font-semibold text-white bg-rv-pink hover:bg-rv-pink/80
                 px-4 py-1.5 rounded-full transition-colors shrink-0 focus:outline-none border-0">
          Enviar
        </button>
      </form>
    </div>

    <!-- ── Respuestas anidadas ────────────────────────── -->
    <div v-if="comment.replies.length" class="comment-replies">
      <CommentItem
        v-for="reply in comment.replies" :key="reply.id"
        :comment="reply" :disc-id="discId" :depth="depth + 1" :avatar-size="avatarSize"
        :current-user="currentUser" :session-avatar="sessionAvatar"
        :submitting-reply-ids="submittingReplyIds"
        :editing-comment-ids="editingCommentIds"
        :deleting-comment-ids="deletingCommentIds"
        :submit-reply="submitReply"
        :submit-edit="submitEditComment"
        :submit-delete="submitDeleteComment"
        :feedback="feedback"
        @open-user="$emit('open-user', $event)" />
    </div>

  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, nextTick, type PropType } from "vue";
import type { DiscComment } from "../../domain/comment";
import type { CommentConversationFeedback } from "../../application/commentFeedbackPort";

interface CurrentCommentUser {
  id: string | null;
  username: string | null;
}

export default defineComponent({
  name: "CommentItem",
  props: {
    comment:    { type: Object as PropType<DiscComment>, required: true },
    discId:     { type: String, required: true },
    depth:      { type: Number, default: 0 },
    avatarSize: { type: Number, default: 36 },
    currentUser: { type: Object as PropType<CurrentCommentUser>, required: true },
    sessionAvatar: { type: String, default: "" },
    submittingReplyIds: { type: Object as PropType<Set<string>>, required: true },
    submitReply: { type: Function as PropType<(parentId: string, text: string) => Promise<void>>, required: true },
    editingCommentIds: { type: Object as PropType<Set<string>>, required: true },
    submitEdit: { type: Function as PropType<(id: string, text: string) => Promise<void>>, required: true },
    deletingCommentIds: { type: Object as PropType<Set<string>>, required: true },
    submitDelete: { type: Function as PropType<(id: string) => Promise<void>>, required: true },
    feedback: { type: Object as PropType<CommentConversationFeedback>, required: true },
  },
  emits: ["open-user"],
  setup(props) {
    const avatarSizePx = computed(() => props.depth === 0 ? 34 : 28);

    const showReplyForm = ref(false);
    const replyText     = ref("");
    const replyInputRef = ref<HTMLInputElement | null>(null);
    const showEditForm  = ref(false);
    const editText      = ref(props.comment.comment);
    const isDeleteConfirming = ref(false);

    const showReplyEmojiPicker     = ref(false);
    const activeReplyEmojiCategory = ref('Reacciones');

    const emojiCategories = [
      { label: '😊', name: 'Reacciones', emojis: ['😂','😍','🔥','💀','👏','🤩','😭','🤔','💯','❤️','🙌','👍','👎','😮','🤣','😤','🥲','😎','🤯','😱','🤘','✌️','👌','🫶','💔','🫡','🙃','😏','🤫','🥳','🎉','🫠','😴','🤧','😬','🤮'] },
      { label: '🎵', name: 'Música',     emojis: ['🎵','🎶','🎸','🥁','🎹','🎤','🎧','🎼','🎷','🎺','🎻','🪗','🪘','🪕','🎙️','🔊','📢','🔔','🎬','🎯','🌟','⭐','✨','💥','🚀','🏆','🥇','💎','👑','🎊'] },
      { label: '💬', name: 'Otros',      emojis: ['💪','💅','🤌','👀','💬','💭','🌈','🌊','💫','⚡','🌙','☀️','🍺','🍻','🥂','🎁','🧠','👾','🤖','🫣','🙈','🐸','💩','👻','🤡','💃','🕺','🌚','🌝','🫵'] },
    ];

    const currentReplyEmojis = computed(() =>
      emojiCategories.find(c => c.name === activeReplyEmojiCategory.value)?.emojis ?? []
    );

    const insertReplyEmoji = (emoji: string) => {
      const input = replyInputRef.value;
      if (!input) { replyText.value += emoji; return; }
      const start = input.selectionStart ?? replyText.value.length;
      const end   = input.selectionEnd   ?? replyText.value.length;
      replyText.value = replyText.value.slice(0, start) + emoji + replyText.value.slice(end);
      nextTick(() => {
        input.selectionStart = start + emoji.length;
        input.selectionEnd   = start + emoji.length;
        input.focus();
      });
    };

    const user = computed(() => props.currentUser);
    const isReplySubmitting = computed(() => props.submittingReplyIds.has(props.comment.id));
    const isEditSubmitting = computed(() => props.editingCommentIds.has(props.comment.id));
    const isDeleteSubmitting = computed(() => props.deletingCommentIds.has(props.comment.id));
    const isOwnComment = computed(() => props.comment.user.id === user.value.id);

    // Solo mostrar "(editado)" si editedAt es al menos 10 segundos posterior a createdAt.
    // El backend guarda editedAt = createdAt por defecto (bug de TypeORM @UpdateDateColumn),
    // así que comparamos para no mostrarlo en comentarios recién creados.
    const isEdited = computed(() => {
      if (!props.comment.editedAt || !props.comment.createdAt) return false;
      const created = new Date(props.comment.createdAt).getTime();
      const edited  = new Date(props.comment.editedAt).getTime();
      return (edited - created) > 10_000;
    });

    const displayedAvatar = computed(() => {
      const u = props.comment.user;
      if (u.avatarUrl && typeof u.avatarUrl === "string" && u.avatarUrl.length) return u.avatarUrl;
      if (u.image    && typeof u.image    === "string" && u.image.length)    return u.image;
      if (u.id && user.value?.id && u.id === user.value.id && props.sessionAvatar) return props.sessionAvatar;
      return null;
    });

    const toggleReplyForm = () => {
      if (!props.comment.isDeleted) showReplyForm.value = !showReplyForm.value;
    };

    const submitReply = async () => {
      if (isReplySubmitting.value) return;
      if (!replyText.value.trim()) { props.feedback.error("La respuesta no puede estar vacía."); return; }
      try {
        await props.submitReply(props.comment.id, replyText.value);
        props.feedback.success("Respuesta añadida");
        replyText.value     = "";
        showReplyForm.value = false;
      } catch {
        props.feedback.error("Error al enviar la respuesta.");
      }
    };

    const startEdit  = () => { if (!props.comment.isDeleted) { showEditForm.value = true; editText.value = props.comment.comment; } };
    const cancelEdit = () => { showEditForm.value = false; editText.value = props.comment.comment; };

    const submitEdit = async () => {
      if (isEditSubmitting.value) return;
      if (!editText.value.trim()) { props.feedback.error("El comentario no puede estar vacío."); return; }
      try {
        await props.submitEdit(props.comment.id, editText.value);
        showEditForm.value = false;
        props.feedback.success("Comentario actualizado");
      } catch {
        props.feedback.error("Error al actualizar el comentario.");
      }
    };

    const submitEditComment = (id: string, text: string) => props.submitEdit(id, text);
    const submitDeleteComment = (id: string) => props.submitDelete(id);

    const deleteComment = async () => {
      if (props.comment.isDeleted || isDeleteSubmitting.value || isDeleteConfirming.value) return;
      isDeleteConfirming.value = true;
      try {
        const result = await props.feedback.confirm('¿Borrar comentario?', 'Esta acción no se puede deshacer.', 'Sí, borrar', 'Cancelar');
        if (!result.isConfirmed) return;
        await props.submitDelete(props.comment.id);
        props.feedback.success("Comentario borrado");
      } catch {
        props.feedback.error("Error al borrar el comentario.");
      } finally {
        isDeleteConfirming.value = false;
      }
    };

    const timeAgo = (dateStr: string): string => {
      const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
      if (diff < 60)      return 'ahora';
      if (diff < 3600)    return `hace ${Math.floor(diff / 60)}m`;
      if (diff < 86400)   return `hace ${Math.floor(diff / 3600)}h`;
      if (diff < 2592000) return `hace ${Math.floor(diff / 86400)}d`;
      return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    };

    // Compatibilidad con código previo que use avatarPx / avatarStyle
    const avatarPx    = computed(() => avatarSizePx.value);
    const avatarStyle = computed(() => ({
      width: `${avatarSizePx.value}px`, height: `${avatarSizePx.value}px`,
      minWidth: `${avatarSizePx.value}px`, minHeight: `${avatarSizePx.value}px`,
    }));

    return {
      isOwnComment, isEdited,
      avatarSizePx, avatarPx, avatarStyle,
      showReplyForm, replyText, replyInputRef,
      showReplyEmojiPicker, activeReplyEmojiCategory, emojiCategories, currentReplyEmojis, insertReplyEmoji,
      toggleReplyForm, submitReply,
      showEditForm, editText, startEdit, cancelEdit, submitEdit,
      isEditSubmitting, submitEditComment,
      isDeleteSubmitting, isDeleteConfirming, submitDeleteComment,
      deleteComment, timeAgo, user, displayedAvatar, isReplySubmitting,
    };
  },
});
</script>

<style scoped>
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
