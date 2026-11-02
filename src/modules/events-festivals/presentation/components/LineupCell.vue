<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from "vue";
import type { LineupCellState, LineupItem } from "../../application/useEventImportRows";

defineProps<{
  items: LineupItem[];
  state: LineupCellState;
  rowNumber: number;
}>();

const emit = defineEmits<{
  updateDraft: [value: string];
  commitDraft: [];
  retryDraft: [];
  updateItemName: [itemKey: string, value: string];
  commitItemName: [itemKey: string];
  retryItem: [itemKey: string];
  removeItem: [itemKey: string];
}>();

const editingItemKey = ref<string | null>(null);
const itemInputs = useTemplateRef<HTMLInputElement[]>("itemInputs");

function editItem(itemKey: string) {
  editingItemKey.value = itemKey;
  void nextTick(() => {
    itemInputs.value?.find((input) => input.dataset.lineupKey === itemKey)?.focus();
  });
}

function stopEditing(itemKey: string) {
  emit("commitItemName", itemKey);
  if (editingItemKey.value === itemKey) editingItemKey.value = null;
}

function blurInput(event: Event) {
  (event.target as HTMLInputElement).blur();
}
</script>

<template>
  <div class="flex min-h-10 min-w-0 flex-wrap items-center gap-1.5 px-2 py-1">
    <template v-for="(item, index) in items" :key="item.key">
      <span
        v-if="item.artistId && editingItemKey !== item.key"
        class="inline-flex max-w-full items-center gap-1 rounded-full border border-green-300 bg-green-100 py-1 pl-2.5 pr-1 text-xs font-semibold text-green-900 dark:border-green-400/30 dark:bg-green-400/15 dark:text-green-200"
      >
        <span class="max-w-48 truncate">{{ item.name }}</span>
        <button
          type="button"
          :aria-label="`Editar ${item.name}`"
          class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-white/70 hover:text-rv-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white"
          @click="editItem(item.key)"
        >
          <i class="fa-solid fa-pen text-[10px]" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          :aria-label="`Eliminar ${item.name} de Lineup, fila ${rowNumber}`"
          class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-red-100 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:text-gray-200 dark:hover:bg-red-900/40 dark:hover:text-red-200"
          @click="emit('removeItem', item.key)"
        >
          <i class="fa-solid fa-xmark text-xs" aria-hidden="true"></i>
        </button>
      </span>

      <span
        v-else
        class="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1 dark:border-white/15 dark:bg-rv-darkSurface"
      >
        <input
          :value="item.name"
          ref="itemInputs"
          :data-lineup-key="item.key"
          type="text"
          :aria-label="`Artista ${index + 1} de Lineup, fila ${rowNumber}`"
          autocomplete="off"
          class="min-h-8 w-36 min-w-12 max-w-full bg-transparent px-1.5 text-xs text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rv-purple dark:text-white"
          @input="emit('updateItemName', item.key, ($event.target as HTMLInputElement).value)"
          @blur="stopEditing(item.key)"
          @keydown.enter.prevent="blurInput"
        />
        <span
          v-if="state.itemStatus[item.key] === 'resolving'"
          class="shrink-0 text-[10px] text-gray-500 dark:text-gray-400"
          role="status"
        >
          Resolviendo…
        </span>
        <button
          v-if="state.itemStatus[item.key] === 'error'"
          type="button"
          :aria-label="`Reintentar resolución de ${item.name}`"
          class="shrink-0 rounded px-1 text-[10px] font-semibold text-rv-purple hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:text-purple-200"
          @click="emit('retryItem', item.key)"
        >
          Reintentar
        </button>
        <button
          type="button"
          :aria-label="`Eliminar ${item.name || 'artista'} de Lineup, fila ${rowNumber}`"
          class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-red-100 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:text-gray-300 dark:hover:bg-red-900/40 dark:hover:text-red-200"
          @click="emit('removeItem', item.key)"
        >
          <i class="fa-solid fa-xmark text-xs" aria-hidden="true"></i>
        </button>
      </span>
    </template>

    <input
      :value="state.draft"
      type="text"
      :aria-label="`Añadir artistas a Lineup, fila ${rowNumber}`"
      autocomplete="off"
      placeholder="Añadir artista…"
      class="min-h-8 min-w-32 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus-visible:border-rv-purple focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white dark:placeholder:text-gray-400"
      @input="emit('updateDraft', ($event.target as HTMLInputElement).value)"
      @blur="emit('commitDraft')"
      @keydown.enter.prevent="blurInput"
    />

    <span
      v-if="state.draftStatus === 'resolving'"
      class="text-xs text-gray-500 dark:text-gray-400"
      role="status"
    >
      Resolviendo…
    </span>
    <span
      v-else-if="state.draftStatus === 'error'"
      class="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-300"
      role="status"
    >
      No se pudo resolver; se conserva el texto.
      <button
        type="button"
        class="font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple"
        @click="emit('retryDraft')"
      >
        Reintentar
      </button>
    </span>
  </div>
</template>
