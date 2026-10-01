import { computed, ref } from "vue";
import { countComments, type DiscComment } from "../../domain/comment";
import type { CommentConversationOperations } from "../../application/commentPort";

export function useDiscConversation(discId: string, operations: CommentConversationOperations) {
  const comments = ref<DiscComment[]>([]);
  const isLoading = ref(false);
  const isSubmitting = ref(false);
  const submittingReplyIds = ref(new Set<string>());
  const editingCommentIds = ref(new Set<string>());
  const deletingCommentIds = ref(new Set<string>());
  const totalComments = computed(() => countComments(comments.value));

  async function load() {
    comments.value = [];
    isLoading.value = true;
    try {
      comments.value = await operations.load(discId);
    } finally {
      isLoading.value = false;
    }
  }

  async function addRootComment(text: string): Promise<void> {
    if (isSubmitting.value) return;
    isSubmitting.value = true;
    try {
      const created = await operations.createRoot(discId, text);
      comments.value = [...comments.value, created];
    } finally {
      isSubmitting.value = false;
    }
  }

  function appendReply(parentId: string, reply: DiscComment, tree: DiscComment[]): DiscComment[] {
    let changed = false;
    const updatedTree = tree.map((comment) => {
      if (comment.id === parentId) {
        if (comment.replies.some((existing) => existing.id === reply.id)) return comment;
        changed = true;
        return { ...comment, replies: [...comment.replies, reply] };
      }
      const replies = appendReply(parentId, reply, comment.replies);
      if (replies === comment.replies) return comment;
      changed = true;
      return { ...comment, replies };
    });
    return changed ? updatedTree : tree;
  }

  async function addReply(
    parentId: string,
    text: string,
    identity: { userId: string | null; avatar: string },
  ): Promise<void> {
    if (submittingReplyIds.value.has(parentId)) return;
    submittingReplyIds.value = new Set(submittingReplyIds.value).add(parentId);
    try {
      const created = await operations.createReply(discId, parentId, text);
      if (created.user.id === identity.userId && !created.user.avatarUrl && !created.user.image && identity.avatar) {
        created.user.avatarUrl = identity.avatar;
      }
      comments.value = appendReply(parentId, created, comments.value);
    } finally {
      const pending = new Set(submittingReplyIds.value);
      pending.delete(parentId);
      submittingReplyIds.value = pending;
    }
  }

  function replaceComment(updated: { id: string; comment: string; editedAt?: string | null }, tree: DiscComment[]): DiscComment[] {
    let changed = false;
    const result = tree.map((node) => {
      if (node.id === updated.id) {
        changed = true;
        return { ...node, comment: updated.comment, editedAt: updated.editedAt };
      }
      const replies = replaceComment(updated, node.replies);
      if (replies === node.replies) return node;
      changed = true;
      return { ...node, replies };
    });
    return changed ? result : tree;
  }

  async function editComment(id: string, text: string): Promise<void> {
    if (editingCommentIds.value.has(id)) return;
    editingCommentIds.value = new Set(editingCommentIds.value).add(id);
    try {
      const updated = await operations.update(id, text);
      comments.value = replaceComment({ ...updated, id }, comments.value);
    } finally {
      const pending = new Set(editingCommentIds.value);
      pending.delete(id);
      editingCommentIds.value = pending;
    }
  }

  function markDeleted(id: string, tree: DiscComment[]): DiscComment[] {
    let changed = false;
    const result = tree.map((node) => {
      if (node.id === id) {
        if (node.isDeleted && node.comment === "Comentario eliminado") return node;
        changed = true;
        return { ...node, isDeleted: true, comment: "Comentario eliminado" };
      }
      const replies = markDeleted(id, node.replies);
      if (replies === node.replies) return node;
      changed = true;
      return { ...node, replies };
    });
    return changed ? result : tree;
  }

  async function removeComment(id: string): Promise<void> {
    if (deletingCommentIds.value.has(id)) return;
    deletingCommentIds.value = new Set(deletingCommentIds.value).add(id);
    try {
      await operations.delete(id);
      comments.value = markDeleted(id, comments.value);
    } finally {
      const pending = new Set(deletingCommentIds.value);
      pending.delete(id);
      deletingCommentIds.value = pending;
    }
  }

  return { comments, totalComments, isLoading, isSubmitting, submittingReplyIds, editingCommentIds, deletingCommentIds, load, addRootComment, addReply, editComment, removeComment };
}
