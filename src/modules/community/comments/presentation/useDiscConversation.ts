import { computed, ref } from "vue";
import { countComments, type DiscComment } from "../domain/comment";

export function useDiscConversation(
  discId: string,
  loadConversation: (discId: string) => Promise<DiscComment[]>,
  createRootComment: (discId: string, text: string) => Promise<DiscComment>,
) {
  const comments = ref<DiscComment[]>([]);
  const isLoading = ref(false);
  const isSubmitting = ref(false);
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

  return { comments, totalComments, isLoading, isSubmitting, load, addRootComment };
}
