<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import type { ListedEvent } from "../../types/eventListing";
import { useDeleteEventMutation } from "../../application/useEventManagement";
import SwalService from "@/services/swal/SwalService";

const props = defineProps<{ event: ListedEvent; canManage: boolean }>();
const emit = defineEmits<{ close: []; deleted: [] }>();
const dialogElement = ref<HTMLElement | null>(null);
const cancelButton = ref<HTMLButtonElement | null>(null);
let previouslyFocused: HTMLElement | null = null;
const mutation = useDeleteEventMutation();
const busy = computed(() => mutation.isPending.value);

function onDialogKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && !busy.value) {
    emit("close");
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = dialogElement.value?.querySelectorAll<HTMLElement>("button:not(:disabled)");
  if (!focusable?.length) return;
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

onMounted(() => {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  window.addEventListener("keydown", onDialogKeydown);
  void nextTick(() => cancelButton.value?.focus());
});

onUnmounted(() => {
  window.removeEventListener("keydown", onDialogKeydown);
  previouslyFocused?.focus();
});

function formatDate(event: ListedEvent): string {
  const date = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  return event.type === "festival" && event.endDate && event.endDate !== event.startDate
    ? `${date(event.startDate)} – ${date(event.endDate)}`
    : date(event.startDate);
}

async function remove() {
  if (!props.canManage || busy.value) return;
  try {
    await mutation.mutateAsync(props.event.id);
    await SwalService.success("Evento eliminado correctamente.");
    emit("deleted");
    emit("close");
  } catch {
    // The dialog remains open so the user can retry or cancel.
  }
}
</script>

<template>
  <div class="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
    <section
      ref="dialogElement"
      tabindex="-1"
      class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-rv-darkCard"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="event-delete-title"
      aria-describedby="event-delete-description"
    >
      <div class="mb-4 flex items-start gap-3">
        <span
          class="grid size-10 shrink-0 place-items-center rounded-full bg-red-100 text-lg font-bold text-red-800 dark:bg-red-950/60 dark:text-red-200"
          aria-hidden="true"
          >!</span
        >
        <div>
          <h2 id="event-delete-title" class="text-lg font-bold text-rv-navy dark:text-white">
            Eliminar definitivamente
          </h2>
          <p id="event-delete-description" class="mt-1 text-sm text-gray-700 dark:text-gray-200">
            Vas a eliminar este {{ event.type === "festival" ? "festival" : "concierto" }}:
          </p>
        </div>
      </div>
      <dl class="space-y-2 rounded-xl bg-gray-50 p-4 text-sm dark:bg-rv-darkSurface">
        <div>
          <dt class="inline font-semibold">Evento:</dt>
          <dd class="inline">
            {{
              event.name ||
              event.lineup.map(({ name }) => name).join(", ") ||
              "Concierto sin título"
            }}
          </dd>
        </div>
        <div>
          <dt class="inline font-semibold">Fecha:</dt>
          <dd class="inline">{{ formatDate(event) }}</dd>
        </div>
        <div>
          <dt class="inline font-semibold">Ubicación:</dt>
          <dd class="inline">
            {{ event.venue.name }}, {{ event.venue.locality.name }},
            {{ event.venue.locality.administrativeRegion.country.name }}
          </dd>
        </div>
      </dl>
      <p class="mt-4 text-sm font-semibold text-red-800 dark:text-red-200">
        Esta acción es destructiva y no se puede deshacer. Se eliminarán las apariciones del lineup
        pertenecientes al evento.
      </p>
      <p
        v-if="mutation.isError.value"
        class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
        role="alert"
      >
        No se pudo eliminar el evento. El listado no ha cambiado; puedes reintentar.
      </p>
      <footer class="mt-6 flex flex-wrap justify-end gap-3">
        <button
          ref="cancelButton"
          type="button"
          class="min-h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:text-white"
          :disabled="busy"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="min-h-10 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy || !canManage"
          @click="remove"
        >
          {{ busy ? "Eliminando…" : "Eliminar definitivamente" }}
        </button>
      </footer>
    </section>
  </div>
</template>
