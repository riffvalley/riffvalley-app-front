<template>
  <div
    v-if="!modal || show"
    :class="modal ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4' : ''"
  >
    <section
      ref="dialogElement"
      :class="
        modal
          ? 'max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-rv-darkCard'
          : 'container mx-auto px-4 py-6 md:py-8'
      "
      :role="modal ? 'dialog' : undefined"
      :aria-modal="modal ? 'true' : undefined"
      :aria-labelledby="modal ? 'reunion-editor-title' : undefined"
      :tabindex="modal ? -1 : undefined"
    >
      <div
        v-if="modal"
        class="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-rv-darkCard"
      >
        <div class="min-w-0">
          <h2
            id="reunion-editor-title"
            class="truncate text-xl font-bold text-gray-900 dark:text-white"
          >
            {{ reunion?.title || "Reunión" }}
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ reunion ? formatDate(reunion.date) : "" }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-rv-darkSurface"
          aria-label="Cerrar"
          @click="emit('close')"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div v-if="detailQuery.isPending.value" class="p-8 text-center text-gray-500" role="status">
        Cargando reunión…
      </div>
      <div
        v-else-if="detailQuery.isError.value && !reunion"
        class="p-8 text-center text-red-600"
        role="alert"
      >
        No se pudo cargar la reunión.
        <button type="button" class="ml-2 underline" @click="detailQuery.refetch()">
          Reintentar
        </button>
      </div>
      <div v-else-if="reunion" :class="modal ? 'p-4 md:p-6' : ''">
        <p
          v-if="detailQuery.isError.value"
          class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          La reunión no está disponible en este momento. El borrador se conserva.
        </p>
        <header v-if="!modal" class="mb-5 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h1 class="truncate text-2xl font-bold text-gray-900 dark:text-white">
              {{ reunion.title }}
            </h1>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ formatDate(reunion.date) }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600"
            title="Editar reunión"
            aria-label="Editar reunión"
            @click="beginEditReunion"
          >
            <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
          </button>
        </header>
        <div v-else class="mb-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg bg-yellow-500 px-3 py-2 text-white hover:bg-yellow-600"
            title="Editar reunión"
            aria-label="Editar reunión"
            @click="beginEditReunion"
          >
            <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="rounded-lg bg-red-500 px-3 py-2 text-white hover:bg-red-600"
            title="Eliminar reunión"
            aria-label="Eliminar reunión"
            @click="confirmDeleteReunion"
          >
            <i class="fa-solid fa-trash" aria-hidden="true"></i>
          </button>
        </div>

        <form
          v-if="editReunionOpen"
          class="mb-6 space-y-4 rounded-lg bg-gray-100 p-4 dark:bg-rv-darkSurface"
          @submit.prevent="submitReunion"
        >
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Editar reunión</h3>
          <label class="block font-medium text-gray-700 dark:text-gray-300" for="reunion-title"
            >Título
            <input
              id="reunion-title"
              v-model="reunionDraft.title"
              class="mt-1 w-full rounded-lg border border-gray-300 p-2 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200"
              required
            />
          </label>
          <label class="block font-medium text-gray-700 dark:text-gray-300" for="reunion-date"
            >Fecha
            <input
              id="reunion-date"
              v-model="reunionDraft.date"
              type="datetime-local"
              class="mt-1 w-full rounded-lg border border-gray-300 p-2 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200"
              required
            />
          </label>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 dark:bg-rv-darkCard dark:text-gray-200"
              @click="cancelEditReunion"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="mutations.updateReunionMutation.isPending.value"
              class="rounded-lg bg-rv-purple px-4 py-2 text-white hover:bg-rv-pink disabled:opacity-50"
            >
              Guardar cambios
            </button>
          </div>
        </form>

        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Puntos de la reunión</h2>
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg bg-rv-purple px-4 py-2 text-sm text-white transition-colors hover:bg-rv-pink"
            @click="newPointOpen = !newPointOpen"
          >
            <i class="fa-solid fa-plus" aria-hidden="true"></i><span>Añadir punto</span>
          </button>
        </div>
        <form
          v-if="newPointOpen"
          class="mb-6 space-y-4 rounded-lg bg-gray-100 p-4 dark:bg-rv-darkSurface"
          @submit.prevent="submitNewPoint"
        >
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Añadir nuevo punto</h3>
          <label class="block font-medium text-gray-700 dark:text-gray-300" for="new-point-title"
            >Título
            <input
              id="new-point-title"
              v-model="newPointDraft.title"
              class="mt-1 w-full rounded-lg border border-gray-300 p-2 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200"
              required
            />
          </label>
          <label class="block font-medium text-gray-700 dark:text-gray-300" for="new-point-content"
            >Contenido
            <textarea
              id="new-point-content"
              v-model="newPointDraft.content"
              rows="3"
              class="mt-1 w-full rounded-lg border border-gray-300 p-2 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200"
            />
          </label>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 dark:bg-rv-darkCard dark:text-gray-200"
              @click="newPointOpen = false"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="mutations.createPointMutation.isPending.value"
              class="rounded-lg bg-rv-purple px-4 py-2 text-white hover:bg-rv-pink disabled:opacity-50"
            >
              Añadir punto
            </button>
          </div>
        </form>

        <ul class="space-y-4">
          <li
            v-for="point in reunion.points"
            :key="point.id"
            class="rounded-lg border border-gray-300 bg-white p-4 shadow-md dark:border-white/10 dark:bg-rv-darkCard"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-3">
                <input
                  :checked="Boolean(point.done)"
                  type="checkbox"
                  class="h-6 w-6 shrink-0"
                  :aria-label="point.done ? `Reabrir ${point.title}` : `Completar ${point.title}`"
                  :disabled="mutations.updatePointMutation.isPending.value"
                  @change="changePointDone(point, $event)"
                />
                <strong class="truncate text-gray-900 dark:text-white">{{ point.title }}</strong>
              </div>
              <div class="flex shrink-0 gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-yellow-500 px-3 py-1.5 text-white hover:bg-yellow-600"
                  :aria-label="`Editar ${point.title}`"
                  @click="beginEditPoint(point)"
                >
                  <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-red-500 px-3 py-1.5 text-white hover:bg-red-600"
                  :aria-label="`Eliminar ${point.title}`"
                  @click="confirmDeletePoint(point)"
                >
                  <i class="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-blue-500 px-3 py-1.5 text-white hover:bg-blue-600"
                  :aria-label="
                    expandedPoints.has(point.id)
                      ? `Ocultar contenido de ${point.title}`
                      : `Mostrar contenido de ${point.title}`
                  "
                  @click="toggleExpandedPoint(point.id)"
                >
                  <i
                    :class="
                      expandedPoints.has(point.id)
                        ? 'fa-solid fa-minus'
                        : 'fa-solid fa-chevron-down'
                    "
                    aria-hidden="true"
                  ></i>
                </button>
              </div>
            </div>
            <p
              v-if="expandedPoints.has(point.id)"
              class="mt-4 whitespace-pre-line rounded-lg bg-gray-100 p-4 text-sm text-gray-600 dark:bg-rv-darkSurface dark:text-gray-300"
            >
              {{ point.content }}
            </p>
            <form
              v-if="editingPointId === point.id"
              class="mt-4 space-y-4 rounded-lg bg-gray-100 p-4 dark:bg-rv-darkSurface"
              @submit.prevent="submitPoint"
            >
              <h3 class="font-semibold text-gray-900 dark:text-white">Editar punto</h3>
              <label
                class="block font-medium text-gray-700 dark:text-gray-300"
                :for="`point-title-${point.id}`"
                >Título
                <input
                  :id="`point-title-${point.id}`"
                  v-model="pointDraft.title"
                  class="mt-1 w-full rounded-lg border border-gray-300 p-2 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200"
                  required
                />
              </label>
              <label
                class="block font-medium text-gray-700 dark:text-gray-300"
                :for="`point-content-${point.id}`"
                >Contenido
                <textarea
                  :id="`point-content-${point.id}`"
                  v-model="pointDraft.content"
                  rows="3"
                  class="mt-1 w-full rounded-lg border border-gray-300 p-2 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200"
                />
              </label>
              <div class="flex justify-end gap-3">
                <button
                  type="button"
                  class="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 dark:bg-rv-darkCard dark:text-gray-200"
                  @click="cancelEditPoint"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  :disabled="mutations.updatePointMutation.isPending.value"
                  class="rounded-lg bg-rv-purple px-4 py-2 text-white hover:bg-rv-pink disabled:opacity-50"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </li>
        </ul>
        <form
          v-if="editingPointId && editingPointMissing"
          class="mt-4 space-y-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20"
          @submit.prevent="submitPoint"
        >
          <p class="text-sm text-amber-900 dark:text-amber-200" role="alert">
            Este punto cambió de reunión o se eliminó. Tu borrador se conserva.
          </p>
          <label class="block font-medium text-gray-700 dark:text-gray-300" for="orphan-point-title"
            >Título
            <input
              id="orphan-point-title"
              v-model="pointDraft.title"
              class="mt-1 w-full rounded-lg border border-gray-300 p-2 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200"
              required
            />
          </label>
          <label
            class="block font-medium text-gray-700 dark:text-gray-300"
            for="orphan-point-content"
            >Contenido
            <textarea
              id="orphan-point-content"
              v-model="pointDraft.content"
              rows="3"
              class="mt-1 w-full rounded-lg border border-gray-300 p-2 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200"
            />
          </label>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 dark:bg-rv-darkCard dark:text-gray-200"
              @click="cancelEditPoint"
            >
              Descartar borrador
            </button>
            <button
              type="submit"
              :disabled="mutations.updatePointMutation.isPending.value"
              class="rounded-lg bg-rv-purple px-4 py-2 text-white hover:bg-rv-pink disabled:opacity-50"
            >
              Intentar guardar
            </button>
          </div>
        </form>
        <p
          v-if="reunion.points.length === 0"
          class="py-8 text-center text-gray-400 dark:text-gray-500"
          role="status"
        >
          No hay puntos en esta reunión
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import SwalService from "@services/swal/SwalService";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useReunionEditor } from "../composables/useReunionEditor";
import type { Point } from "../../types/reunions";

const props = withDefaults(defineProps<{ id: string | null; modal?: boolean; show?: boolean }>(), {
  modal: false,
  show: true,
});
const emit = defineEmits<{ close: []; updated: []; deleted: [id: string] }>();
const dialogElement = ref<HTMLElement | null>(null);
let restoreFocusTo: HTMLElement | null = null;
const editor = useReunionEditor(() => props.id);
const {
  detailQuery,
  reunion,
  editReunionOpen,
  reunionDraft,
  newPointOpen,
  newPointDraft,
  editingPointId,
  editingPointMissing,
  pointDraft,
  expandedPoints,
  mutations,
  beginEditReunion,
  cancelEditReunion,
  saveReunion,
  addPoint,
  beginEditPoint,
  cancelEditPoint,
  savePoint,
  togglePointDone,
  removePoint,
  toggleExpandedPoint,
} = editor;

const focusableSelector =
  "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])";

watch(
  () => props.modal && props.show,
  async (isOpen) => {
    if (isOpen) {
      restoreFocusTo =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      await nextTick();
      dialogElement.value?.querySelector<HTMLElement>(focusableSelector)?.focus();
      return;
    }
    await nextTick();
    restoreFocusTo?.focus();
    restoreFocusTo = null;
  },
  { immediate: true }
);

function handleDialogKeydown(event: KeyboardEvent) {
  if (
    !props.modal ||
    !props.show ||
    !dialogElement.value ||
    document.querySelector(".swal2-container")
  )
    return;
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = [...dialogElement.value.querySelectorAll<HTMLElement>(focusableSelector)];
  if (focusable.length === 0) {
    event.preventDefault();
    dialogElement.value.focus();
    return;
  }
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(() => document.addEventListener("keydown", handleDialogKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", handleDialogKeydown));

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function submitReunion() {
  try {
    await saveReunion();
    emit("updated");
    SwalService.success("Reunión actualizada con éxito.");
  } catch {
    SwalService.error("No se pudo actualizar la reunión.");
  }
}

async function submitNewPoint() {
  try {
    await addPoint();
    SwalService.success("Punto añadido con éxito.");
  } catch {
    SwalService.error("No se pudo añadir el punto.");
  }
}

async function submitPoint() {
  try {
    await savePoint();
    SwalService.success("Punto actualizado con éxito.");
  } catch {
    SwalService.error("No se pudo actualizar el punto.");
  }
}

async function changePointDone(point: Point, event: Event) {
  const done = (event.target as HTMLInputElement).checked;
  try {
    await togglePointDone(point, done);
  } catch {
    SwalService.error("No se pudo actualizar el estado del punto.");
  }
}

async function confirmDeletePoint(point: Point) {
  const result = await SwalService.confirm(
    "¿Eliminar punto?",
    `¿Deseas eliminar «${point.title}»?`,
    "Sí, eliminar",
    "Cancelar"
  );
  if (!result.isConfirmed) return;
  try {
    await removePoint(point.id);
    SwalService.success("Punto eliminado con éxito.");
  } catch {
    SwalService.error("No se pudo eliminar el punto.");
  }
}

async function confirmDeleteReunion() {
  if (!props.id || !reunion.value) return;
  const result = await SwalService.confirm(
    "¿Eliminar reunión?",
    `Vas a eliminar «${reunion.value.title}» y todos sus puntos. Esta acción no se puede deshacer.`,
    "Sí, eliminar",
    "Cancelar"
  );
  if (!result.isConfirmed) return;
  try {
    await mutations.deleteReunionMutation.mutateAsync(props.id);
    emit("deleted", props.id);
    emit("close");
    SwalService.success("Reunión eliminada");
  } catch {
    SwalService.error("No se pudo eliminar la reunión.");
  }
}
</script>
