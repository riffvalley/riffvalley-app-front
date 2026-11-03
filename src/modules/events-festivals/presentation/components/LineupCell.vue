<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from "vue";
import type { LineupCellState, LineupItem } from "../../application/useEventImportRows";

const props = defineProps<{
  rowId: string;
  items: LineupItem[];
  state: LineupCellState;
  rowNumber: number;
}>();

const emit = defineEmits<{
  updateDraft: [value: string];
  commitDraft: [];
  pasteDraft: [value: string];
  updateItemName: [itemKey: string, value: string];
  commitItemName: [itemKey: string];
  retryItem: [itemKey: string];
  removeItem: [itemKey: string];
  selectArtist: [rowId: string, itemKey: string, artistId: string];
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

function handlePaste(event: ClipboardEvent) {
  const value = event.clipboardData?.getData("text/plain");
  if (value === undefined) return;
  if (props.state.draft.trim() && !/[+\t\r\n]/u.test(value)) return;
  event.preventDefault();
  emit("updateDraft", "");
  emit("pasteDraft", value);
}

function itemStatusLabel(itemKey: string): string {
  if (props.state.itemStatus[itemKey] === "resolving") return "Buscando";
  const result = props.state.itemResolution[itemKey];
  if (!result) return "";
  if (result.status === "existing") return "Artista existente";
  if (result.status === "new") return "Artista nuevo";
  if (result.status === "invalid") return "Artista no válido";
  if (result.status === "error") return "Error al buscar";
  return "";
}
</script>

<template>
  <div class="flex min-h-10 min-w-0 flex-wrap items-center gap-1.5 px-2 py-1">
    <template v-for="(item, index) in items" :key="item.key">
      <span
        v-if="
          item.artistId &&
          state.itemResolution[item.key]?.status !== 'ambiguous' &&
          editingItemKey !== item.key
        "
        class="inline-flex max-w-full items-center gap-1 rounded-full border border-green-300 bg-green-100 py-1 pl-2.5 pr-1 text-xs font-semibold text-green-900 dark:border-green-400/30 dark:bg-green-400/15 dark:text-green-200"
        role="group"
        :aria-label="`${item.name}, artista existente`"
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
          v-if="itemStatusLabel(item.key) && state.itemResolution[item.key]?.status !== 'ambiguous'"
          class="sr-only"
          :role="state.itemStatus[item.key] === 'error' ? 'alert' : 'status'"
        >
          {{ itemStatusLabel(item.key) }} para {{ item.name }}
        </span>
        <div
          v-if="state.itemResolution[item.key]?.status === 'ambiguous'"
          class="flex min-w-0 items-center gap-1 text-[10px] text-amber-800 dark:text-amber-200"
        >
          <span class="sr-only">Candidatos para {{ item.name }}</span>
          <select
            :value="item.artistId ?? ''"
            :aria-label="`Candidato de artista ${item.name}, fila ${rowNumber}`"
            class="min-h-8 max-w-52 rounded border border-amber-500/60 bg-white px-1.5 text-xs text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:bg-rv-darkSurface dark:text-white"
            @change="
              emit('selectArtist', rowId, item.key, ($event.target as HTMLSelectElement).value)
            "
          >
            <option value="">Seleccionar artista…</option>
            <option
              v-for="candidate in state.itemResolution[item.key]?.status === 'ambiguous'
                ? state.itemResolution[item.key].candidates
                : []"
              :key="candidate.id"
              :value="candidate.id"
            >
              {{ candidate.name }}
            </option>
          </select>
          <span v-if="item.artistId" role="status">Seleccionado</span>
        </div>
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
      :aria-label="`Añadir artistas a Lineup (obligatorio), fila ${rowNumber}`"
      aria-required="true"
      autocomplete="off"
      placeholder="Añadir artista…"
      class="min-h-8 min-w-32 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus-visible:border-rv-purple focus-visible:ring-2 focus-visible:ring-rv-purple/30 dark:text-white dark:placeholder:text-gray-400"
      @input="emit('updateDraft', ($event.target as HTMLInputElement).value)"
      @blur="emit('commitDraft')"
      @paste="handlePaste"
      @keydown.enter.prevent="emit('commitDraft')"
    />

    <button
      type="button"
      :aria-label="`Confirmar artista de Lineup, fila ${rowNumber}`"
      class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rv-purple text-white hover:bg-rv-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
      @mousedown.prevent
      @click="emit('commitDraft')"
    >
      <i class="fa-solid fa-plus text-xs" aria-hidden="true"></i>
    </button>
  </div>
</template>
