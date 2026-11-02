<script setup lang="ts">
import { onMounted, reactive, useTemplateRef, watch } from "vue";
import { venueTypes } from "../../application/useVenueImport";
import type { UpdateVenueCatalogPayload, VenueCatalogVenue } from "../../types/venueCatalog";

const props = defineProps<{
  venue: VenueCatalogVenue;
  saving: boolean;
  error: string;
}>();

const emit = defineEmits<{
  cancel: [];
  save: [payload: UpdateVenueCatalogPayload];
}>();

const form = reactive<UpdateVenueCatalogPayload>({
  name: props.venue.name,
  type: props.venue.type,
  status: props.venue.status,
});
const nameInput = useTemplateRef<HTMLInputElement>("nameInput");

onMounted(() => nameInput.value?.focus());

watch(
  () => props.venue,
  (venue) => {
    form.name = venue.name;
    form.type = venue.type;
    form.status = venue.status;
  }
);

function submit() {
  emit("save", { name: form.name.trim(), type: form.type, status: form.status });
}

function keepFocusInside(event: KeyboardEvent) {
  if (event.key !== "Tab") return;
  const dialog = event.currentTarget as HTMLElement;
  const focusable = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'
    )
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="venue-edit-title"
      tabindex="-1"
      class="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-rv-darkCard sm:p-6"
    >
      <h3 id="venue-edit-title" class="text-lg font-semibold text-rv-navy dark:text-white">
        Editar recinto
      </h3>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ venue.name }}</p>
      <form class="mt-5 space-y-4" @submit.prevent="submit">
        <div>
          <label
            for="venue-edit-name"
            class="mb-1 block text-sm font-medium text-gray-800 dark:text-gray-100"
            >Nombre
            <input
              id="venue-edit-name"
              ref="nameInput"
              v-model="form.name"
              required
              maxlength="180"
              autocomplete="off"
              class="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
              @keydown="keepFocusInside"
              @keydown.esc.prevent.stop="emit('cancel')"
            />
          </label>
        </div>
        <div>
          <label
            for="venue-edit-type"
            class="mb-1 block text-sm font-medium text-gray-800 dark:text-gray-100"
            >Tipo
            <select
              id="venue-edit-type"
              v-model="form.type"
              class="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
              @keydown="keepFocusInside"
              @keydown.esc.prevent.stop="emit('cancel')"
            >
              <option v-for="type in venueTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </label>
        </div>
        <div>
          <label
            for="venue-edit-status"
            class="mb-1 block text-sm font-medium text-gray-800 dark:text-gray-100"
            >Estado
            <select
              id="venue-edit-status"
              v-model="form.status"
              class="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
              @keydown="keepFocusInside"
              @keydown.esc.prevent.stop="emit('cancel')"
            >
              <option value="active">Activa</option>
              <option value="closed">Cerrada</option>
              <option value="temporary">Temporal</option>
            </select>
          </label>
        </div>
        <p v-if="error" class="text-sm text-red-700 dark:text-red-300" role="alert">{{ error }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="min-h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:text-white"
            :disabled="saving"
            @click="emit('cancel')"
            @keydown="keepFocusInside"
            @keydown.esc.prevent.stop="emit('cancel')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="min-h-10 rounded-lg bg-rv-navy px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-wait disabled:opacity-60"
            :disabled="saving || !form.name.trim()"
            @keydown="keepFocusInside"
            @keydown.esc.prevent.stop="emit('cancel')"
          >
            {{ saving ? "Guardando…" : "Guardar cambios" }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
