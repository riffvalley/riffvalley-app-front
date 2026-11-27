<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from "vue";
import SearchableSelect from "@components/SearchableSelect.vue";
import type { Country } from "@services/countries/countries";

const props = defineProps<{
  artistName: string;
  image: string | null;
  countryId: string;
  countries: Country[];
  countriesLoading: boolean;
  saving: boolean;
  error: string | null;
}>();
const emit = defineEmits<{
  close: [];
  save: [payload: { image: string; countryId: string }];
}>();

const image = shallowRef(props.image ?? "");
const countryId = shallowRef(props.countryId);
const dialog = useTemplateRef<HTMLElement>("dialog");
const imageInput = useTemplateRef<HTMLInputElement>("imageInput");

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    emit("close");
    return;
  }
  if (event.key !== "Tab" || !dialog.value) return;
  // El buscador del SearchableSelect se teletransporta a body y gestiona su propio foco.
  if (document.activeElement instanceof HTMLElement && document.activeElement.closest(".teleport-overlay")) return;
  const focusable = [...dialog.value.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => element.tabIndex >= 0 && !element.hasAttribute("hidden"));
  if (!focusable.length) { event.preventDefault(); dialog.value.focus(); return; }
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (!dialog.value.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
  else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

onMounted(async () => {
  document.addEventListener("keydown", onKeydown);
  await nextTick();
  imageInput.value?.focus();
});
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[110] grid place-items-center bg-black/70 p-3 backdrop-blur-sm" data-test="artist-metadata-editor-overlay" @click.self="emit('close')">
      <section
        ref="dialog"
        class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-rv-darkSurface sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="artist-metadata-title"
        tabindex="-1"
        data-test="artist-metadata-editor"
      >
        <h2 id="artist-metadata-title" class="pr-8 text-lg font-bold text-rv-navy dark:text-white">Editar artista</h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ artistName }}</p>

        <form class="mt-5 space-y-4" @submit.prevent="emit('save', { image: image.trim(), countryId })">
          <label class="block text-sm font-semibold text-gray-800 dark:text-gray-100" for="artist-image-reference">
            Referencia de imagen
            <input
              id="artist-image-reference"
              ref="imageInput"
              v-model="image"
              type="url"
              placeholder="https://…"
              class="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkCard dark:text-white"
              data-test="artist-image-reference"
            />
            <span class="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">Deja el campo vacío para conservar la imagen actual.</span>
          </label>

          <div role="group" aria-labelledby="artist-country-label">
            <span id="artist-country-label" class="text-sm font-semibold text-gray-800 dark:text-gray-100">País</span>
            <p v-if="countriesLoading" class="mt-1 text-sm text-gray-600 dark:text-gray-300" role="status">Cargando países…</p>
            <SearchableSelect
              v-else
              v-model="countryId"
              :options="countries"
              title="name"
              trackby="id"
              placeholder="Buscar país…"
              trigger-placeholder="Mantener país actual"
              all-label="Mantener país actual"
              :max="4000"
              menu-variant="panel"
              menu-z-index="120000"
              class="mt-1.5 w-full"
              data-test="artist-country-select"
            />
          </div>

          <p v-if="error" class="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/50 dark:bg-red-950/30 dark:text-red-200" role="alert">{{ error }}</p>

          <div class="flex flex-wrap justify-end gap-2 pt-1">
            <button type="button" class="min-h-10 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:text-gray-100 dark:hover:bg-white/10" :disabled="saving" @click="emit('close')">Cancelar</button>
            <button type="submit" class="min-h-10 rounded-lg bg-rv-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rv-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-rv-pink dark:hover:text-white dark:focus-visible:ring-offset-rv-darkSurface" :disabled="saving" :aria-busy="saving">
              {{ saving ? "Guardando…" : "Guardar cambios" }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>
