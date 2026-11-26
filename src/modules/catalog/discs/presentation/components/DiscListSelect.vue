<template>
  <div ref="root" class="relative min-w-0" @focusout="closeOnFocusLeave">
    <!-- Combobox «solo selección» (patrón APG): el foco se queda en el botón y
         la opción activa se anuncia con aria-activedescendant. -->
    <button
      :id="id"
      ref="trigger"
      type="button"
      role="combobox"
      class="flex h-[50px] w-full items-center justify-between gap-2 whitespace-nowrap rounded-2xl border border-gray-300 bg-white px-4 text-left text-base text-rv-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy aria-expanded:ring-2 aria-expanded:ring-rv-navy disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-rv-darkCard dark:text-white dark:focus-visible:ring-gray-200 dark:aria-expanded:ring-gray-200"
      :data-value="currentValue"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-controls="listId"
      :aria-labelledby="labelledby"
      :aria-label="labelledby ? undefined : ariaLabel"
      :aria-activedescendant="open && activeOption ? optionId(activeOption.value) : undefined"
      :disabled="disabled"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span class="flex min-w-0 items-center gap-2">
        <span class="min-w-0 truncate"
          >{{ selectedLabel
          }}<span v-if="selectedOption?.applied" class="sr-only"> · aplicado</span></span
        >
        <i
          v-if="selectedOption?.applied"
          class="fa-solid fa-check shrink-0 text-green-600 dark:text-green-400"
          aria-hidden="true"
        />
      </span>
      <i
        class="fa-solid fa-chevron-down shrink-0 text-xs text-gray-500 dark:text-gray-300"
        aria-hidden="true"
      />
    </button>

    <ul
      v-show="open"
      :id="listId"
      role="listbox"
      :aria-labelledby="labelledby"
      :aria-label="labelledby ? undefined : ariaLabel"
      class="absolute z-40 max-h-64 w-full overflow-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-white/20 dark:bg-rv-darkCard"
      :class="dropUp ? 'bottom-full mb-1' : 'top-full mt-1'"
      :style="listMaxHeight ? { maxHeight: `${listMaxHeight}px` } : undefined"
    >
      <li
        v-for="(option, index) in options"
        :id="optionId(option.value)"
        :key="String(option.value)"
        role="option"
        :data-value="String(option.value)"
        :aria-selected="String(option.value) === currentValue"
        class="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100"
        :class="{
          'bg-rv-pink/10 dark:bg-rv-pink/20': String(option.value) === currentValue,
          'bg-gray-100 dark:bg-rv-darkSurface': index === activeIndex,
        }"
        @mousedown.prevent
        @mouseenter="activeIndex = index"
        @click="choose(option)"
      >
        <span
          >{{ option.label
          }}<span v-if="option.applied" class="sr-only"> · aplicado</span></span
        >
        <!-- La opción aplicada lleva un check verde; si no, la elegida, uno normal. -->
        <i
          v-if="option.applied"
          class="fa-solid fa-check shrink-0 text-green-600 dark:text-green-400"
          aria-hidden="true"
        />
        <i
          v-else-if="String(option.value) === currentValue"
          class="fa-solid fa-check shrink-0 text-xs"
          aria-hidden="true"
        />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

export interface DiscListSelectOption {
  value: string | number;
  label: string;
  /** Marca la opción con un check verde (p. ej. el filtro guardado aplicado). */
  applied?: boolean;
}

const props = defineProps<{
  /** id del botón: los tests y las etiquetas lo usan. */
  id: string;
  modelValue: string | number | null | undefined;
  options: DiscListSelectOption[];
  /** id de la etiqueta visible que nombra el selector. */
  labelledby?: string;
  /** Nombre accesible cuando no hay etiqueta visible. */
  ariaLabel?: string;
  disabled?: boolean;
}>();
// Igual que un <select> nativo: el valor elegido llega siempre como texto.
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const open = ref(false);
/** La lista se abre hacia arriba cuando abajo no cabe (p. ej. al final de un modal). */
const dropUp = ref(false);
const listMaxHeight = ref<number | null>(null);
const activeIndex = ref(0);
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);

const listId = computed(() => `${props.id}-listbox`);
const currentValue = computed(() => String(props.modelValue ?? ""));
const selectedIndex = computed(() =>
  props.options.findIndex((option) => String(option.value) === currentValue.value)
);
const selectedOption = computed(() => props.options[selectedIndex.value]);
const selectedLabel = computed(() => selectedOption.value?.label ?? "");
const activeOption = computed(() => props.options[activeIndex.value]);

function optionId(value: string | number) {
  return `${props.id}-option-${String(value).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function scrollActiveIntoView() {
  void nextTick(() => {
    const option = activeOption.value;
    if (!option) return;
    document.getElementById(optionId(option.value))?.scrollIntoView?.({ block: "nearest" });
  });
}

/** Altura máxima de la lista (max-h-64) más su margen. */
const LIST_SPACE = 264;

/** Límite inferior y superior visibles: la ventana o el contenedor con scroll que recorta. */
function visibleBounds(element: HTMLElement) {
  let top = 0;
  let bottom = window.innerHeight;
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "visible") continue;
    const rect = node.getBoundingClientRect();
    top = Math.max(top, rect.top);
    bottom = Math.min(bottom, rect.bottom);
  }
  return { top, bottom };
}

function decideDirection() {
  const button = trigger.value;
  if (!button) return;
  const rect = button.getBoundingClientRect();
  const bounds = visibleBounds(button);
  const below = bounds.bottom - rect.bottom;
  const above = rect.top - bounds.top;
  dropUp.value = below < LIST_SPACE && above > below;
  // Si tampoco cabe entera en el lado elegido, se encoge y hace scroll por dentro.
  const room = (dropUp.value ? above : below) - 8;
  listMaxHeight.value = room < LIST_SPACE - 8 ? Math.max(room, 120) : null;
}

function openList() {
  if (props.disabled || !props.options.length) return;
  decideDirection();
  activeIndex.value = Math.max(0, selectedIndex.value);
  open.value = true;
  scrollActiveIntoView();
}

/** Pliega la lista; con refocus el foco vuelve al botón sin pintar el anillo de teclado. */
function close(refocus = false) {
  open.value = false;
  if (refocus) trigger.value?.focus({ focusVisible: false } as FocusOptions);
}

function toggle() {
  if (open.value) close();
  else openList();
}

function choose(option: DiscListSelectOption) {
  const value = String(option.value);
  if (value !== currentValue.value) emit("update:modelValue", value);
  close(true);
}

function move(to: number) {
  const last = props.options.length - 1;
  if (last < 0) return;
  activeIndex.value = Math.min(Math.max(to, 0), last);
  scrollActiveIntoView();
}

/** Teclado del patrón combobox: flechas, Inicio/Fin, Intro/Espacio, Escape y primera letra. */
function onKeydown(event: KeyboardEvent) {
  const { key } = event;
  if (!open.value) {
    if (["ArrowDown", "ArrowUp", "Enter", " ", "Home", "End"].includes(key)) {
      event.preventDefault();
      openList();
      if (key === "Home") move(0);
      if (key === "End") move(props.options.length - 1);
    }
    return;
  }
  if (key === "ArrowDown") move(activeIndex.value + 1);
  else if (key === "ArrowUp") move(activeIndex.value - 1);
  else if (key === "Home" || key === "PageUp") move(0);
  else if (key === "End" || key === "PageDown") move(props.options.length - 1);
  else if (key === "Enter" || key === " ") {
    if (activeOption.value) choose(activeOption.value);
  } else if (key === "Escape") close();
  else if (key === "Tab") {
    close();
    return;
  } else if (key.length === 1 && /\S/.test(key)) {
    const letter = key.toLocaleLowerCase();
    const start = activeIndex.value + 1;
    const ordered = [...props.options.slice(start), ...props.options.slice(0, start)];
    const match = ordered.find((option) => option.label.toLocaleLowerCase().startsWith(letter));
    if (match) move(props.options.indexOf(match));
  } else return;
  event.preventDefault();
}

function isInside(target: EventTarget | null) {
  return target instanceof Node && Boolean(root.value?.contains(target));
}

/** Pinchar fuera del selector lo pliega. */
function onDocumentPointerDown(event: PointerEvent) {
  if (!isInside(event.target)) close();
}

/** Salir hacia otro control también lo pliega. */
function closeOnFocusLeave(event: FocusEvent) {
  if (open.value && event.relatedTarget && !isInside(event.relatedTarget)) close();
}

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener("pointerdown", onDocumentPointerDown, true);
  else document.removeEventListener("pointerdown", onDocumentPointerDown, true);
});

onBeforeUnmount(() => document.removeEventListener("pointerdown", onDocumentPointerDown, true));
</script>
