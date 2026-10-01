import { computed, ref } from "vue";
import { countComments, type DiscComment } from "../domain/comment";

export function useDiscConversation(discId: string, loadConversation: (discId: string) => Promise<DiscComment[]>) {
  const comments = ref<DiscComment[]>([]);
  const isLoading = ref(false);
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

  return { comments, totalComments, isLoading, load };
}
