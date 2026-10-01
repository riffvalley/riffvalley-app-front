import { computed, ref } from "vue";
import { countComments, type DiscComment } from "../domain/comment";

export function useDiscConversation(
  discId: string,
  loadConversation: (discId: string) => Promise<DiscComment[]>,
  createRootComment: (discId: string, text: string) => Promise<DiscComment>,
  createReplyComment: (discId: string, parentId: string, text: string) => Promise<DiscComment>,
) {
  const comments = ref<DiscComment[]>([]);
  const isLoading = ref(false);
  const isSubmitting = ref(false);
  const submittingReplyIds = ref(new Set<string>());
  const totalComments = computed(() => countComments(comments.value));

  async function load() {
    comments.value = [];
    isLoading.value = true;
    try {
      comments.value = await loadConversation(discId);
    } finally {
      isLoading.value = false;
    }
  }

  async function addRootComment(text: string): Promise<void> {
    if (isSubmitting.value) return;
    isSubmitting.value = true;
    try {
      const created = await createRootComment(discId, text);
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
      const created = await createReplyComment(discId, parentId, text);
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

  return { comments, totalComments, isLoading, isSubmitting, submittingReplyIds, load, addRootComment, addReply };
}
