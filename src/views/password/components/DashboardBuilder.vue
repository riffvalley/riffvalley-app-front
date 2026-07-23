<template>
  <div>
    <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5 text-center max-w-xl mx-auto">
      Cada fila tiene 2 huecos de 1x1 o 1 hueco de 2x1. Arrastra un módulo hasta un hueco para colocarlo,
      o hasta la franja entre filas para crear una fila nueva ahí. Los cambios se aplican al instante.
    </p>

    <!-- Grid activo: filas explícitas, igual que se empaquetan en el Dashboard real -->
    <div class="flex flex-col gap-1.5">
      <template v-for="(row, idx) in rows" :key="row.a.id">
        <!-- Franja para insertar una fila nueva antes de esta -->
        <div
          class="rounded-full transition-all duration-150 flex items-center justify-center cursor-default"
          :class="hoverKey === 'row:' + row.a.id
            ? 'h-10 bg-rv-pink/10 border-2 border-dashed border-rv-pink/50'
            : dragging
              ? 'h-7 bg-rv-pink/5 border-2 border-dashed border-rv-pink/25'
              : 'h-2.5 hover:h-4 hover:bg-gray-100 dark:hover:bg-white/5'"
          @dragover.prevent="setHover('row:' + row.a.id)"
          @drop.prevent="dropAt(row.a.id)"
        >
          <i v-if="hoverKey === 'row:' + row.a.id" class="fa-solid fa-plus text-rv-pink text-xs"></i>
        </div>

        <div class="flex gap-2 items-stretch">
          <!-- Tirador para arrastrar la fila entera como bloque: solo tiene sentido
               cuando la fila tiene DOS módulos (si no, arrastrar el único módulo
               ya mueve "la fila" y este tirador sería un segundo control redundante) -->
          <div
            v-if="row.b"
            draggable="true"
            @dragstart="onRowDragStart($event, row)"
            @dragend="clearDrag"
            title="Arrastrar toda la fila"
            class="flex items-center justify-center w-6 shrink-0 rounded-md cursor-grab active:cursor-grabbing select-none
                   text-gray-300 dark:text-white/20 hover:text-rv-pink hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <i class="fa-solid fa-grip-vertical text-sm"></i>
          </div>

          <div class="flex gap-3 flex-1">
            <template v-if="row.type === 'full'">
              <ModuleCard :key="row.a.id" :mod="row.a" full :dragging="isDragging(row.a.id)" :hover-side="sideOf(row.a.id)"
                @dragstart="dragStartModule(row.a.id)" @dragover="onCardDragOver(row.a.id, $event)"
                @drop="onCardDrop(row.a.id, $event)" @dragend="clearDrag" @remove="disableModule(row.a.id)" />
            </template>
            <template v-else>
              <ModuleCard :key="row.a.id" :mod="row.a" :dragging="isDragging(row.a.id)" :hover-side="sideOf(row.a.id)"
                @dragstart="dragStartModule(row.a.id)" @dragover="onCardDragOver(row.a.id, $event)"
                @drop="onCardDrop(row.a.id, $event)" @dragend="clearDrag" @remove="disableModule(row.a.id)" />
              <ModuleCard v-if="row.b" :key="row.b.id" :mod="row.b" :dragging="isDragging(row.b.id)" :hover-side="sideOf(row.b.id)"
                @dragstart="dragStartModule(row.b.id)" @dragover="onCardDragOver(row.b.id, $event)"
                @drop="onCardDrop(row.b.id, $event)" @dragend="clearDrag" @remove="disableModule(row.b.id)" />
              <!-- Hueco libre: falta un 1x1 para completar la fila -->
              <div v-else
                class="w-full sm:w-[calc(50%-6px)] flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-4 text-sm transition-colors duration-150"
                :class="hoverKey === 'gap:' + idx
                  ? 'border-rv-pink/60 bg-rv-pink/5 dark:bg-rv-pink/10 text-rv-pink'
                  : dragging
                    ? 'border-rv-pink/30 text-rv-pink/70'
                    : 'border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500'"
                @dragover.prevent="setHover('gap:' + idx)"
                @drop.prevent="dropAt(nextRowFirstId(idx))"
              >
                <i class="fa-solid fa-plus text-xs"></i>
                Hueco 1x1 libre
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- Franja final: crear una fila nueva al final -->
      <div
        class="rounded-full transition-all duration-150 flex items-center justify-center cursor-default"
        :class="hoverKey === 'row:end'
          ? 'h-10 bg-rv-pink/10 border-2 border-dashed border-rv-pink/50'
          : dragging
            ? 'h-7 bg-rv-pink/5 border-2 border-dashed border-rv-pink/25'
            : 'h-2.5 hover:h-4 hover:bg-gray-100 dark:hover:bg-white/5'"
        @dragover.prevent="setHover('row:end')"
        @drop.prevent="dropAt(null)"
      >
        <i v-if="hoverKey === 'row:end'" class="fa-solid fa-plus text-rv-pink text-xs"></i>
      </div>

      <!-- Zona para añadir una fila totalmente nueva -->
      <div
        class="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-sm transition-colors duration-150"
        :class="hoverKey === 'append'
          ? 'border-rv-pink/60 bg-rv-pink/5 dark:bg-rv-pink/10 text-rv-pink'
          : dragging
            ? 'border-rv-pink/30 text-rv-pink/70'
            : 'border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500'"
        @dragover.prevent="setHover('append')"
        @drop.prevent="dropAt(null)"
      >
        <i class="fa-solid fa-plus text-xs"></i>
        Arrastra aquí un módulo (1x1 o 2x1) para crear una fila nueva
      </div>

      <p v-if="!enabledModules.length" class="w-full text-center text-gray-400 dark:text-gray-500 text-sm italic py-2">
        No hay módulos activos. Arrastra alguno desde "Módulos disponibles".
      </p>
    </div>

    <!-- Bandeja de módulos desactivados -->
    <div class="mt-6">
      <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
        Módulos disponibles
      </p>
      <div
        class="flex flex-wrap gap-3 min-h-[3.5rem] p-3 rounded-2xl border-2 border-dashed transition-colors duration-150"
        :class="hoverKey === 'tray'
          ? 'border-rv-pink/50 bg-rv-pink/5 dark:bg-rv-pink/10'
          : dragging?.kind === 'module'
            ? 'border-rv-pink/25'
            : 'border-gray-100 dark:border-white/10'"
        @dragover.prevent="setHover('tray')"
        @drop.prevent="dropTray"
      >
        <div
          v-for="mod in disabledModules"
          :key="mod.id"
          draggable="true"
          @dragstart="onModuleDragStart($event, mod.id)"
          @dragend="clearDrag"
          @click="enableModule(mod.id)"
          class="flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-rv-darkCard
                 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 cursor-grab active:cursor-grabbing select-none
                 hover:border-rv-pink/40 hover:text-rv-pink dark:hover:text-rv-pink transition-colors"
          :class="isDragging(mod.id) ? 'opacity-40' : 'opacity-100'"
        >
          <i :class="[mod.icon, 'text-sm']"></i>
          {{ mod.label }}
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/10">
            {{ mod.size === 'full' ? '2x1' : '1x1' }}
          </span>
        </div>
        <p v-if="!disabledModules.length" class="w-full text-center text-gray-400 dark:text-gray-500 text-sm italic py-3">
          Todos los módulos están activados.
        </p>
      </div>
    </div>

    <div class="mt-6 text-center">
      <button type="button" @click="resetToDefault"
        class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-rv-darkSurface">
        <i class="fa-solid fa-rotate-left text-xs"></i>
        Restablecer orden por defecto
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useDashboardConfig, type DashboardModule } from '@/composables/useDashboardConfig';
import ModuleCard from './ModuleCard.vue';

const { modules, enabledModules, disabledModules, moveModule, moveGroup, enableModule, disableModule, resetToDefault } = useDashboardConfig();

interface Row {
  type: 'full' | 'half';
  a: DashboardModule;
  b: DashboardModule | null;
}

// Empaqueta la lista ordenada en filas exactamente igual que el flex-wrap
// del Dashboard real: un 2x1 ocupa su propia fila, dos 1x1 consecutivos
// comparten fila, y un 1x1 suelto (seguido de un 2x1 o del final) deja hueco.
function computeRows(mods: DashboardModule[]): Row[] {
  const rows: Row[] = [];
  let i = 0;
  while (i < mods.length) {
    const m = mods[i];
    if (m.size === 'full') {
      rows.push({ type: 'full', a: m, b: null });
      i += 1;
    } else {
      const next = mods[i + 1];
      if (next && next.size === 'half') {
        rows.push({ type: 'half', a: m, b: next });
        i += 2;
      } else {
        rows.push({ type: 'half', a: m, b: null });
        i += 1;
      }
    }
  }
  return rows;
}

const rows = computed(() => computeRows(enabledModules.value));

// Id del módulo que arranca la siguiente fila (o null si es la última):
// es el punto de inserción correcto para rellenar un hueco 1x1.
function nextRowFirstId(rowIndex: number): string | null {
  return rows.value[rowIndex + 1]?.a.id ?? null;
}

// Id del módulo que sigue a `id` en el orden completo (incluye desactivados),
// o null si es el último. Es el punto de inserción para "soltar después de".
function idAfter(id: string): string | null {
  const idx = modules.value.findIndex(m => m.id === id);
  return modules.value[idx + 1]?.id ?? null;
}

// Lo que se está arrastrando: un módulo suelto, o una fila entera (sus 1-2
// módulos moviéndose juntos como bloque a través del tirador de la fila).
type Dragging = { kind: 'module'; id: string } | { kind: 'row'; ids: string[] };
const dragging = ref<Dragging | null>(null);
const hoverKey = ref<string | null>(null);

// Diferido a un tick: si marcamos el elemento como "dragging" (con su propio
// cambio de clase/opacidad) de forma síncrona dentro de su propio dragstart,
// Chrome puede abortar la sesión de arrastre nativa en cuanto repinta ese
// mismo nodo — de forma intermitente, según si el repintado llega antes o
// después de que el navegador confirme el drag. Por eso el estado se aplica
// en el siguiente tick, cuando el drag ya está comprometido.
function dragStartModule(id: string) {
  setTimeout(() => { dragging.value = { kind: 'module', id }; }, 0);
}

function dragStartRow(row: Row) {
  setTimeout(() => { dragging.value = { kind: 'row', ids: rowIds(row) }; }, 0);
}

// Sin dataTransfer.setData el navegador puede negarse a completar el drag
// (Firefox lo exige siempre; Chrome a veces falla al iniciarlo o al disparar
// dragover/drop en el destino si no hay datos asociados).
function onModuleDragStart(e: DragEvent, id: string) {
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }
  dragStartModule(id);
}

function onRowDragStart(e: DragEvent, row: Row) {
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rowIds(row).join(','));
  }
  dragStartRow(row);
}

function isDragging(id: string): boolean {
  if (!dragging.value) return false;
  return dragging.value.kind === 'row' ? dragging.value.ids.includes(id) : dragging.value.id === id;
}

function setHover(key: string) {
  hoverKey.value = key;
}

function sideOf(id: string): 'before' | 'after' | null {
  if (hoverKey.value === 'slot:before:' + id) return 'before';
  if (hoverKey.value === 'slot:after:' + id) return 'after';
  return null;
}

// Mitad izquierda de la tarjeta destino = insertar antes; mitad derecha =
// insertar después. Necesario para poder intercambiar dos módulos vecinos:
// "insertar siempre antes" es un no-op cuando arrastras el módulo que ya
// precede justo al objetivo (al quitarlo, el objetivo ocupa su hueco y
// "antes de él" vuelve a ser la misma posición).
function onCardDragOver(id: string, side: 'before' | 'after') {
  setHover('slot:' + side + ':' + id);
}

function onCardDrop(id: string, side: 'before' | 'after') {
  dropAt(side === 'before' ? id : idAfter(id));
}

function rowIds(row: Row): string[] {
  return row.b ? [row.a.id, row.b.id] : [row.a.id];
}

function dropAt(beforeId: string | null) {
  if (!dragging.value) return;
  if (dragging.value.kind === 'row') {
    // Ya están todos activados (una fila solo existe con módulos activos);
    // basta con reordenar el grupo entero de una vez.
    moveGroup(dragging.value.ids, beforeId);
  } else {
    // Solo forzamos enable:true si venía de la bandeja de desactivados —
    // si no, un simple reordenar dentro de la rejilla acabaría mostrando
    // el toast de "Módulo activado" en vez de "Orden actualizado".
    const fromTray = disabledModules.value.some(m => m.id === dragging.value!.id);
    moveModule(dragging.value.id, beforeId, fromTray ? { enable: true } : undefined);
  }
  clearDrag();
}

function dropTray() {
  // Solo se puede desactivar un módulo suelto, no una fila entera: si sueltas
  // el tirador de la fila sobre la bandeja, no hacemos nada (usa la "x" de
  // cada tarjeta para desactivar módulos individuales).
  if (dragging.value?.kind === 'module') disableModule(dragging.value.id);
  clearDrag();
}

function clearDrag() {
  dragging.value = null;
  hoverKey.value = null;
}

// Red de seguridad: si el drop ocurre fuera de cualquier zona reconocida (o
// el elemento arrastrado desaparece del DOM a mitad del gesto), el navegador
// sigue disparando "dragend" en algún punto, pero no necesariamente sobre
// nuestro elemento — así que lo escuchamos también a nivel de window para no
// dejar `dragging`/`hoverKey` colgados contaminando el siguiente intento.
function onWindowDragEnd() {
  clearDrag();
}

onMounted(() => window.addEventListener('dragend', onWindowDragEnd));
onUnmounted(() => window.removeEventListener('dragend', onWindowDragEnd));
</script>
