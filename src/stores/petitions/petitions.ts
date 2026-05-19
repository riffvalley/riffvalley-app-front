import { defineStore } from 'pinia';
import { ref } from 'vue';

export const usePetitionsStore = defineStore('petitions', () => {
  const pendingCount = ref(0);

  function setPendingCount(count: number) {
    pendingCount.value = count;
  }

  return { pendingCount, setPendingCount };
});
