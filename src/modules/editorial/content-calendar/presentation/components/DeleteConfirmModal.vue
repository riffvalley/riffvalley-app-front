<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import type { ContentType } from "@services/contents/contents";

interface Props {
  show: boolean;
  contentName: string;
  contentType: ContentType;
  pending?: boolean;
  errorMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  pending: false,
  errorMessage: "",
});

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();

const dialog = ref<HTMLElement | null>(null);
let previouslyFocusedElement: HTMLElement | null = null;
const focusableSelector = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

watch(
  () => props.show,
  async (show) => {
    const currentDialog = dialog.value;
    if (show) {
      previouslyFocusedElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      await nextTick();
      dialog.value?.addEventListener("keydown", handleDialogKeydown);
      dialog.value?.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
      return;
    }
    currentDialog?.removeEventListener("keydown", handleDialogKeydown);
    await nextTick();
    previouslyFocusedElement?.focus();
    previouslyFocusedElement = null;
  },
  { immediate: true }
);

onUnmounted(() => {
  dialog.value?.removeEventListener("keydown", handleDialogKeydown);
  previouslyFocusedElement?.focus();
});

const confirmationCopy = computed(() => {
  switch (props.contentType) {
    case "photos":
      return {
        title: "¿Eliminar fotografías?",
        message:
          "Se eliminará completamente esta entrada del calendario, incluidas sus notas y fechas.",
      };
    case "radar":
      return {
        title: "¿Eliminar Radar?",
        message:
          "Se eliminarán este Radar, su lista, las asignaciones de discos y el seguimiento local asociado. Los discos originales no se eliminarán.",
      };
    case "best":
      return {
        title: "¿Eliminar Best?",
        message:
          "Se eliminarán este Best, su lista, las asignaciones de discos y el seguimiento local asociado. Los discos originales no se eliminarán.",
      };
    case "reunion":
      return {
        title: "¿Eliminar reunión?",
        message:
          "Se eliminarán la reunión y todos sus puntos, además de la entrada del calendario.",
      };
    case "article":
      return {
        title: "¿Eliminar del calendario?",
        message: "Se eliminará la entrada de planificación, pero el artículo seguirá existiendo.",
      };
    case "riff_valley_playlist":
      return {
        title: "¿Eliminar del calendario?",
        message: "Se eliminará la entrada de planificación, pero la playlist seguirá existiendo.",
      };
    case "video":
      return {
        title: "¿Eliminar del calendario?",
        message:
          "Se eliminará la entrada de planificación, pero se conservarán el vídeo, su lista y las asignaciones asociadas.",
      };
    default:
      return {
        title: "¿Eliminar del calendario?",
        message: "Se eliminará la entrada de planificación.",
      };
  }
});

const description = computed(
  () => `Se eliminará «${props.contentName}». ${confirmationCopy.value.message}`
);

function cancel() {
  if (!props.pending) emit("cancel");
}

function confirm() {
  if (!props.pending) emit("confirm");
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    cancel();
    return;
  }
  if (event.key !== "Tab" || !dialog.value) return;

  const focusable = Array.from(dialog.value.querySelectorAll<HTMLElement>(focusableSelector));
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
    dialog.value.focus();
  } else if (
    event.shiftKey &&
    (document.activeElement === first || !dialog.value.contains(document.activeElement))
  ) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    (document.activeElement === last || !dialog.value.contains(document.activeElement))
  ) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <section
      role="alertdialog"
      ref="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      aria-describedby="delete-confirm-description"
      :aria-busy="pending"
      class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-rv-darkCard"
    >
      <div class="mb-4 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
        >
          <i class="fa-solid fa-trash text-xl text-red-600" aria-hidden="true"></i>
        </div>
        <h2 id="delete-confirm-title" class="text-lg font-bold text-gray-900 dark:text-white">
          {{ confirmationCopy.title }}
        </h2>
      </div>
      <p id="delete-confirm-description" class="mb-4 text-gray-700 dark:text-gray-300">
        {{ description }}
      </p>
      <p v-if="errorMessage" class="mb-4 text-sm text-red-700 dark:text-red-300" role="alert">
        {{ errorMessage }}
      </p>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          :disabled="pending"
          data-initial-focus
          class="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rv-darkSurface dark:text-gray-300 dark:hover:bg-rv-darkBg"
          @click="cancel"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="pending"
          class="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-60"
          @click="confirm"
        >
          <i class="fa-solid fa-trash" aria-hidden="true"></i>
          {{ pending ? "Eliminando…" : "Eliminar" }}
        </button>
      </div>
    </section>
  </div>
</template>
