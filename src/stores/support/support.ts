import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const STORAGE_KEY = 'rv_support_read_ids';

function loadReadIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

export const useSupportStore = defineStore('support', () => {
  const readIds = ref<Set<string>>(loadReadIds());
  const pendingIds = ref<string[]>([]);

  const unreadCount = computed(() =>
    pendingIds.value.filter(id => !readIds.value.has(id)).length
  );

  function setPendingIds(ids: string[]) {
    pendingIds.value = ids;
  }

  function isRead(id: string): boolean {
    return readIds.value.has(id);
  }

  function markAsRead(id: string) {
    readIds.value = new Set([...readIds.value, id]);
    saveReadIds(readIds.value);
  }

  function markAllAsRead() {
    readIds.value = new Set([...readIds.value, ...pendingIds.value]);
    saveReadIds(readIds.value);
  }

  return { unreadCount, setPendingIds, isRead, markAsRead, markAllAsRead };
});
