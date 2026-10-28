<template>
  <div
    role="presentation"
    draggable="true"
    @dragstart="onDragStart"
    @dragover.prevent.stop="onDragOver"
    @drop.prevent.stop="onDrop"
    @dragend="$emit('dragend')"
    class="group relative flex items-center gap-3 rounded-2xl border px-4 py-4 cursor-grab active:cursor-grabbing select-none transition-all duration-150"
    :class="[
      full ? 'w-full' : 'flex-1 min-w-0',
      hoverSide
        ? 'border-rv-pink/50 bg-rv-pink/5 dark:bg-rv-pink/10'
        : 'border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-rv-darkSurface',
      dragging ? 'opacity-40' : 'opacity-100',
    ]"
  >
    <!-- Indicador de a qué lado se insertará -->
    <div
      v-if="hoverSide === 'before'"
      class="absolute left-0.5 top-1.5 bottom-1.5 w-1 rounded-full bg-rv-pink"
    ></div>
    <div
      v-if="hoverSide === 'after'"
      class="absolute right-0.5 top-1.5 bottom-1.5 w-1 rounded-full bg-rv-pink"
    ></div>

    <i
      class="fa-solid fa-grip-vertical text-gray-300 dark:text-white/20 text-sm shrink-0"
      aria-hidden="true"
    ></i>
    <i :class="[mod.icon, 'text-rv-pink text-lg shrink-0 ml-2']" aria-hidden="true"></i>
    <span class="flex-1 text-base font-semibold text-gray-700 dark:text-white truncate">{{
      mod.label
    }}</span>
    <span class="text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0">
      {{ mod.size === "full" ? "2x1" : "1x1" }}
    </span>
    <div class="flex shrink-0 items-center gap-1">
      <button
        type="button"
        @click="emit('moveUp')"
        :aria-disabled="!props.canMoveUp"
        :aria-label="`Mover ${mod.label} antes`"
        :title="`Mover ${mod.label} antes`"
        class="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:text-rv-pink hover:bg-gray-200 dark:hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
        :class="!props.canMoveUp ? 'opacity-40' : ''"
      >
        <i class="fa-solid fa-chevron-up text-[9px]" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        @click="emit('moveDown')"
        :aria-disabled="!props.canMoveDown"
        :aria-label="`Mover ${mod.label} después`"
        :title="`Mover ${mod.label} después`"
        class="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:text-rv-pink hover:bg-gray-200 dark:hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
        :class="!props.canMoveDown ? 'opacity-40' : ''"
      >
        <i class="fa-solid fa-chevron-down text-[9px]" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        @click="emit('remove')"
        :aria-label="`Desactivar ${mod.label} en el dashboard de escritorio`"
        class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 bg-gray-200 dark:text-gray-400 dark:bg-white/10 hover:text-white hover:bg-rv-pink dark:hover:text-white dark:hover:bg-rv-pink transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
      >
        <i class="fa-solid fa-xmark text-xs" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DashboardModule } from "@/app/dashboardWidgetRegistry";

const props = defineProps<{
  mod: DashboardModule;
  full?: boolean;
  dragging?: boolean;
  hoverSide?: "before" | "after" | null;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}>();

const emit = defineEmits<{
  dragstart: [];
  dragover: [side: "before" | "after"];
  drop: [side: "before" | "after"];
  dragend: [];
  moveUp: [];
  moveDown: [];
  remove: [];
}>();

// Mitad izquierda de la tarjeta = insertar antes, mitad derecha = insertar
// después. Sin esto, soltar un módulo sobre su vecino inmediato en la misma
// fila podía no hacer nada (quedarse en el mismo sitio tras el reordenado).
function sideFor(e: DragEvent): "before" | "after" {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return e.clientX - rect.left < rect.width / 2 ? "before" : "after";
}

// Sin dataTransfer.setData el navegador puede negarse a completar el drag
// (Firefox lo exige siempre; Chrome a veces falla al iniciarlo o al disparar
// dragover/drop en el destino si no hay datos asociados).
function onDragStart(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", props.mod.id);
  }
  emit("dragstart");
}

function onDragOver(e: DragEvent) {
  emit("dragover", sideFor(e));
}

function onDrop(e: DragEvent) {
  emit("drop", sideFor(e));
}
</script>
