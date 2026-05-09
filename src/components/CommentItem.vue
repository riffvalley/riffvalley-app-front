<template>
  <div :class="depth > 0 ? 'ml-6 border-l border-gray-200 dark:border-white/10 pl-3' : ''" class="space-y-2 text-left">
    <!-- Formulario de edición -->
    <div v-if="showEditForm" class="p-3 bg-gray-100 dark:bg-rv-darkSurface rounded border border-gray-100 dark:border-white/10">
      <input v-model="editText" type="text"
        class="border border-gray-300 dark:border-white/10 rounded w-full px-3 py-2 
bg-white dark:bg-rv-darkCard text-gray-800 dark:text-white
focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <div class="flex space-x-2 mt-2">
        <button @click="submitEdit" class="bg-rv-blue rounded-full text-white px-3 py-1 text-xs hover:bg-rv-blue/80">
          Guardar
        </button>
        <button @click="cancelEdit" class="bg-gray-500 rounded-full text-white px-3 py-1 text-xs hover:bg-gray-600">
          Cancelar
        </button>
      </div>
    </div>

    <!-- Vista del comentario (si no está en edición) -->
    <div v-else class="p-3 bg-gray-100 dark:bg-rv-darkSurface rounded flex items-start space-x-3 border border-gray-100 dark:border-white/10">
      <!-- Avatar del usuario -->
      <div class="relative overflow-hidden rounded-full bg-gray-100 dark:bg-gray-500 shrink-0" :style="avatarStyle">
        <img v-if="displayedAvatar" :src="displayedAvatar" alt="Avatar" class="block object-cover"
          :style="avatarStyle" />
        <svg v-else class="block text-gray-400" :style="avatarStyle" viewBox="0 0 20 20" fill="currentColor"
          xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
        </svg>
      </div>

      <!-- Contenido del comentario -->
      <div class="flex-1">
<p class="text-gray-800 dark:text-gray-100 text-left">{{ localComment.comment }}</p>

        <!-- Autor y fecha -->
        <div v-if="!localComment.isDeleted" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          <button
            class="bg-gray-300 dark:bg-rv-darkCard hover:bg-gray-300/75 dark:hover:bg-rv-purple 
text-rv-navy dark:text-white rounded-full shadow-sm hover:underline 
px-2 py-0.5 border border-transparent dark:border-white/10
focus:outline-none"
            @click="$emit('open-user', {
              username: localComment.user.username,
              id: localComment.user.id,
              avatar: displayedAvatar || localComment.user.image || localComment.user.avatarUrl || ''
            })">
            {{ localComment.user.username }}
          </button>


          – {{ formatDate(localComment.createdAt) }}
        </div>

        <!-- Botones: Responder, Editar, Borrar -->
<div class="mt-2 flex space-x-2">
  <!-- Responder -->
  <button
    type="button"
    @click="toggleReplyForm"
    v-if="!localComment.isDeleted"
    class="bg-rv-navy hover:bg-rv-navy/80 text-white
           rounded-full shadow-sm hover:underline
           text-xs px-3 py-1
           flex items-center gap-1
           outline-none focus:outline-none focus-visible:outline-none
           ring-0 focus:ring-0 focus-visible:ring-0"
  >
    <i class="fa-solid fa-reply text-[10px]"></i>
    <span>Responder</span>
  </button>

  <!-- Editar -->
  <button
    type="button"
    @click="startEdit"
    v-if="!localComment.isDeleted && localComment.user.id === user.id"
    class="bg-rv-blue hover:bg-rv-blue/80 text-white
           rounded-full shadow-sm hover:underline
           text-xs px-3 py-1
           flex items-center gap-1
           outline-none focus:outline-none focus-visible:outline-none
           ring-0 focus:ring-0 focus-visible:ring-0"
  >
    <i class="fa-solid fa-pen-to-square text-[10px]"></i>
    <span>Editar</span>
  </button>

  <!-- Borrar -->
  <button
    type="button"
    @click="deleteComment"
    v-if="!localComment.isDeleted && localComment.user.id === user.id"
    class="bg-red-500 hover:bg-red-500/80 text-white
           rounded-full shadow-sm hover:underline
           text-xs px-3 py-1
           flex items-center gap-1
           outline-none focus:outline-none focus-visible:outline-none
           ring-0 focus:ring-0 focus-visible:ring-0"
  >
    <i class="fa-solid fa-trash-can text-[10px]"></i>
    <span>Borrar</span>
  </button>
</div>

      </div>
    </div>

    <!-- Formulario para responder, solo si el comentario no está eliminado -->
    <div v-if="showReplyForm && !localComment.isDeleted" class="ml-4 mt-2">
      <form @submit.prevent="submitReply" class="flex space-x-2">
<input v-model="replyText" type="text" placeholder="Escribe tu respuesta..." class="flex-1 border rounded-lg px-3 py-2 text-xs
border-gray-300 dark:border-white/10
bg-white dark:bg-rv-darkCard
text-gray-800 dark:text-white
placeholder:text-gray-400 dark:placeholder:text-gray-500
outline-none focus:outline-none focus-visible:outline-none
ring-0 focus:ring-0 focus-visible:ring-0
focus:border-rv-navy dark:focus:border-rv-purple" />
        <button type="submit"
          class="bg-rv-pink text-white px-3 py-1 rounded-full text-xs hover:bg-rv-pink/80 transition-colors">
          Enviar
        </button>
      </form>
    </div>

    <!-- Renderizado recursivo de las respuestas -->
    <div v-if="localComment.replies && localComment.replies.length" class="mt-2 space-y-2">
      <CommentItem v-for="reply in localComment.replies" :key="reply.id" :comment="reply" :disc-id="discId"
        :depth="depth + 1" :avatar-size="avatarSize" @open-user="$emit('open-user', $event)" />

    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from "vue";

import {
  postcommentService,
  updateCommentService,
  deleteCommentService,
} from "@services/comments/comments";
import { useAuthStore } from "@stores/auth/auth.ts";
import SwalService from "@services/swal/SwalService";
export default defineComponent({
  name: "CommentItem",
  props: {
    comment: { type: Object, required: true },
    discId: { type: String, required: true },
    depth: { type: Number, default: 0 },
    avatarSize: { type: Number, default: 36 }, // tamaño base
  },

  emits: ["reply-added", "deleted", "comment-updated"],
  setup(props, { emit }) {
    // Copia local para manipular el comentario sin afectar directamente las props
    const localComment = ref({ ...props.comment });

    // Actualiza la copia local si las props cambian desde el padre
    watch(
      () => props.comment,
      (newVal) => {
        localComment.value = { ...newVal };
      },
      { deep: true, immediate: true }
    );

    const showReplyForm = ref(false);
    const replyText = ref("");
    const showEditForm = ref(false);
    const editText = ref(localComment.value.comment);

    // Store de usuario para comprobar permisos
    const authStore = useAuthStore();
    const user = computed(() => authStore.loggedUser);

    const displayedAvatar = computed(() => {
      const u = localComment.value?.user || {};
      // 1) si el comentario ya trae avatar en el payload
      if (u.avatarUrl && typeof u.avatarUrl === "string" && u.avatarUrl.length)
        return u.avatarUrl;
      if (u.image && typeof u.image === "string" && u.image.length)
        return u.image;
      // 2) si el comentario es del usuario actual, usa el avatar de la store
      if (
        u.id &&
        user.value?.id &&
        u.id === user.value.id &&
        authStore.avatarUrl
      )
        return authStore.avatarUrl;
      // 3) sin avatar
      return null;
    });

    // Toggle del formulario de respuesta
    const toggleReplyForm = () => {
      if (!localComment.value.isDeleted) {
        showReplyForm.value = !showReplyForm.value;
      }
    };

    // Envío de respuesta
    const submitReply = async () => {
      if (!replyText.value.trim()) {
        alert("La respuesta no puede estar vacía.");
        return;
      }
      try {
        const newReply = await postcommentService({
          discId: props.discId,
          comment: replyText.value,
          parentId: localComment.value.id,
        });
        if (!localComment.value.replies) {
          localComment.value.replies = [];
        }
        // 👇 si la API no envía avatar, y la reply es del usuario actual, usa el de la store
        if (
          newReply?.user?.id &&
          user.value?.id &&
          newReply.user.id === user.value.id
        ) {
          if (
            !newReply.user.avatarUrl &&
            !newReply.user.image &&
            authStore.avatarUrl
          ) {
            newReply.user.avatarUrl = authStore.avatarUrl;
          }
        }

        localComment.value.replies.push(newReply);
        SwalService.success("Respuesta añadida");
        emit("reply-added", {
          parentId: localComment.value.id,
          reply: newReply,
        });
        replyText.value = "";
        showReplyForm.value = false;
      } catch (error) {
        console.error("Error al enviar la respuesta:", error);
        alert("Hubo un error al enviar la respuesta.");
      }
    };

    const avatarPx = computed(() =>
      Number.isFinite(props.avatarSize) && props.avatarSize > 0 ? Number(props.avatarSize) : 36
    );

    const avatarStyle = computed(() => ({
      width: `${avatarPx.value}px`,
      height: `${avatarPx.value}px`,
      minWidth: `${avatarPx.value}px`,
      minHeight: `${avatarPx.value}px`,
    }));

    // Editar
    const startEdit = () => {
      if (localComment.value.isDeleted) return;
      showEditForm.value = true;
      editText.value = localComment.value.comment;
    };

    const cancelEdit = () => {
      showEditForm.value = false;
      editText.value = localComment.value.comment;
    };

    const submitEdit = async () => {
      if (!editText.value.trim()) {
        alert("El comentario no puede estar vacío.");
        return;
      }
      try {
        const updatedComment = await updateCommentService(
          localComment.value.id,
          {
            comment: editText.value,
          }
        );
        // Actualiza la copia local
        SwalService.success("Respuesta modificada");
        localComment.value.comment = updatedComment.comment;
        localComment.value.editedAt = updatedComment.editedAt;
        showEditForm.value = false;

        // Emite un evento para que el padre actualice su árbol
        emit("comment-updated", updatedComment);
      } catch (error) {
        console.error("Error al actualizar el comentario:", error);
        alert("Hubo un error al actualizar el comentario.");
      }
    };

    // Borrar (lógico o marcándolo como eliminado)
    const deleteComment = async () => {
      if (localComment.value.isDeleted) return;
      if (!confirm("¿Estás seguro de que deseas borrar este comentario?"))
        return;
      try {
        await deleteCommentService(localComment.value.id);

        emit("deleted", localComment.value.id);
        SwalService.success("Comentario borrado");
      } catch (error) {
        console.error("Error al borrar el comentario:", error);
        alert("Hubo un error al borrar el comentario.");
      }
    };

    // Formatear fecha
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    return {
      localComment,
      showReplyForm,
      replyText,
      toggleReplyForm,
      submitReply,
      showEditForm,
      editText,
      startEdit,
      cancelEdit,
      submitEdit,
      deleteComment,
      formatDate,
      user,
      displayedAvatar,
      avatarPx,
      avatarStyle,
    };
  },
});
</script>
