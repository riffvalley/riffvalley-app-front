<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref, watch } from "vue";
import { feedbackCategories } from "../../types/categories";
import type { CreateFeedbackDto, FeedbackType } from "../../types/feedback";

const props = defineProps<{
  open: boolean;
  submitting: boolean;
  errorMessage: string;
}>();

const emit = defineEmits<{
  close: [];
  submit: [payload: CreateFeedbackDto];
}>();

const form = reactive<{
  type: FeedbackType;
  category: CreateFeedbackDto["category"] | "";
  title: string;
  description: string;
}>({
  type: "suggestion",
  category: "",
  title: "",
  description: "",
});

const dialog = ref<HTMLElement | null>(null);
const previousFocus = ref<HTMLElement | null>(null);
const submissionStarted = ref(false);
const focusableSelector =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

const titlePlaceholder = computed(() =>
  form.type === "bug" ? "¿Qué está fallando?" : "¿Qué te gustaría mejorar?"
);
const descriptionPlaceholder = computed(() =>
  form.type === "bug"
    ? "Explica qué estabas haciendo y qué ha ocurrido"
    : "Explica qué añadirías o cambiarías"
);
const descriptionHelp = computed(() =>
  form.type === "bug"
    ? "Indica, si es posible, los pasos para reproducir el error"
    : "Cuéntanos cómo podríamos mejorar la aplicación"
);
const submitLabel = computed(() => (form.type === "bug" ? "Comunicar bug" : "Enviar sugerencia"));
const typePresentation = computed(() =>
  form.type === "bug"
    ? {
        headerIcon: "fa-solid fa-bug",
        headerSurface: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
        submitButton: "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500",
        helpSurface:
          "border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-200",
      }
    : {
        headerIcon: "fa-solid fa-lightbulb",
        headerSurface: "bg-blue-100 text-rv-blue dark:bg-blue-900/40 dark:text-blue-300",
        submitButton: "bg-rv-blue hover:bg-blue-700 focus-visible:ring-blue-500",
        helpSurface:
          "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-200",
      }
);
const controlsDisabled = computed(() => props.submitting || submissionStarted.value);

function typeCardClass(type: FeedbackType): string {
  if (form.type !== type)
    return "border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-white/10 dark:bg-rv-darkSurface dark:hover:border-white/20";
  return type === "bug"
    ? "border-red-500 bg-red-50 dark:border-red-400 dark:bg-red-950/30"
    : "border-rv-blue bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30";
}

function typeIconClass(type: FeedbackType): string {
  if (type !== form.type) return "bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-300";
  return type === "bug"
    ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300"
    : "bg-blue-100 text-rv-blue dark:bg-blue-900/50 dark:text-blue-300";
}

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      dialog.value?.removeEventListener("keydown", handleDialogKeydown);
      submissionStarted.value = false;
      await nextTick();
      if (props.open) return;
      previousFocus.value?.focus();
      previousFocus.value = null;
      return;
    }

    previousFocus.value =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    Object.assign(form, { type: "suggestion", category: "", title: "", description: "" });
    submissionStarted.value = false;
    await nextTick();
    if (!props.open) return;
    dialog.value?.addEventListener("keydown", handleDialogKeydown);
    dialog.value?.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
  },
  { immediate: true }
);

watch(
  () => props.submitting,
  (submitting) => {
    if (!submitting) submissionStarted.value = false;
  }
);

onUnmounted(() => dialog.value?.removeEventListener("keydown", handleDialogKeydown));

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.stopPropagation();
    event.preventDefault();
    if (!controlsDisabled.value) emit("close");
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

function handleSubmit() {
  if (controlsDisabled.value || !form.category || !form.title.trim() || !form.description.trim())
    return;

  submissionStarted.value = true;
  emit("submit", {
    title: form.title,
    description: form.description,
    type: form.type,
    category: form.category,
  });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      role="presentation"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-4"
      @click.self="!controlsDisabled && emit('close')"
    >
      <section
        ref="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-form-title"
        tabindex="-1"
        class="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-rv-darkCard sm:max-h-[calc(100dvh-2rem)] sm:p-6"
      >
        <header class="mb-5 flex items-center justify-between gap-4">
          <div class="flex min-w-0 items-center gap-3">
            <span
              :class="typePresentation.headerSurface"
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 ease-out motion-reduce:transition-none"
            >
              <i :class="typePresentation.headerIcon" aria-hidden="true"></i>
            </span>
            <h2 id="feedback-form-title" class="text-lg font-bold text-gray-900 dark:text-white">
              Enviar feedback
            </h2>
          </div>
          <button
            type="button"
            class="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Cerrar diálogo de envío"
            :disabled="controlsDisabled"
            @click="emit('close')"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <fieldset class="space-y-2" :disabled="controlsDisabled">
            <legend class="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
              Tipo de aportación <span aria-hidden="true" class="text-rv-pink">*</span>
            </legend>
            <div class="grid grid-cols-2 gap-3">
              <label
                for="feedback-form-type-suggestion"
                class="relative flex min-w-0 cursor-pointer"
              >
                <input
                  id="feedback-form-type-suggestion"
                  v-model="form.type"
                  type="radio"
                  name="feedback-type"
                  value="suggestion"
                  required
                  data-initial-focus
                  class="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  class="pointer-events-none absolute inset-0 z-10 rounded-xl transition-shadow duration-150 ease-out peer-focus-visible:ring-2 peer-focus-visible:ring-rv-pink peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-rv-darkCard motion-reduce:transition-none"
                ></span>
                <span
                  :class="typeCardClass('suggestion')"
                  class="feedback-type-card flex min-h-[7.25rem] w-full flex-col rounded-xl border p-3 transition-colors duration-150 ease-out motion-reduce:transition-none"
                >
                  <span class="mb-2 flex items-center justify-between gap-2">
                    <span
                      :class="typeIconClass('suggestion')"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150 ease-out motion-reduce:transition-none"
                    >
                      <i class="fa-solid fa-lightbulb" aria-hidden="true"></i>
                    </span>
                    <span
                      :class="
                        form.type === 'suggestion'
                          ? 'border-rv-blue bg-rv-blue text-white'
                          : 'border-gray-300 bg-transparent text-transparent dark:border-white/20'
                      "
                      class="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[0.625rem] transition-colors duration-150 ease-out motion-reduce:transition-none"
                    >
                      <i
                        v-if="form.type === 'suggestion'"
                        class="fa-solid fa-check"
                        aria-hidden="true"
                      ></i>
                    </span>
                  </span>
                  <span class="text-sm font-semibold text-gray-900 dark:text-white"
                    >Sugerencia</span
                  >
                  <span class="mt-0.5 text-xs text-gray-600 dark:text-gray-300"
                    >Propón una mejora</span
                  >
                </span>
              </label>
              <label for="feedback-form-type-bug" class="relative flex min-w-0 cursor-pointer">
                <input
                  id="feedback-form-type-bug"
                  v-model="form.type"
                  type="radio"
                  name="feedback-type"
                  value="bug"
                  required
                  class="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  class="pointer-events-none absolute inset-0 z-10 rounded-xl transition-shadow duration-150 ease-out peer-focus-visible:ring-2 peer-focus-visible:ring-rv-pink peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-rv-darkCard motion-reduce:transition-none"
                ></span>
                <span
                  :class="typeCardClass('bug')"
                  class="feedback-type-card flex min-h-[7.25rem] w-full flex-col rounded-xl border p-3 transition-colors duration-150 ease-out motion-reduce:transition-none"
                >
                  <span class="mb-2 flex items-center justify-between gap-2">
                    <span
                      :class="typeIconClass('bug')"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150 ease-out motion-reduce:transition-none"
                    >
                      <i class="fa-solid fa-bug" aria-hidden="true"></i>
                    </span>
                    <span
                      :class="
                        form.type === 'bug'
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-gray-300 bg-transparent text-transparent dark:border-white/20'
                      "
                      class="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[0.625rem] transition-colors duration-150 ease-out motion-reduce:transition-none"
                    >
                      <i
                        v-if="form.type === 'bug'"
                        class="fa-solid fa-check"
                        aria-hidden="true"
                      ></i>
                    </span>
                  </span>
                  <span class="text-sm font-semibold text-gray-900 dark:text-white">Bug</span>
                  <span class="mt-0.5 text-xs text-gray-600 dark:text-gray-300"
                    >Comunica un error</span
                  >
                </span>
              </label>
            </div>
          </fieldset>

          <label
            for="feedback-form-category"
            class="block text-sm font-semibold text-gray-800 dark:text-gray-100"
          >
            Apartado <span aria-hidden="true" class="text-rv-pink">*</span>
            <select
              id="feedback-form-category"
              v-model="form.category"
              required
              :disabled="controlsDisabled"
              class="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
            >
              <option disabled value="">Selecciona un apartado</option>
              <option
                v-for="category in feedbackCategories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.label }}
              </option>
            </select>
          </label>

          <label
            for="feedback-form-title-input"
            class="block text-sm font-semibold text-gray-800 dark:text-gray-100"
          >
            Título <span aria-hidden="true" class="text-rv-pink">*</span>
            <input
              id="feedback-form-title-input"
              v-model="form.title"
              type="text"
              maxlength="200"
              required
              :disabled="controlsDisabled"
              :placeholder="titlePlaceholder"
              class="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkSurface dark:text-white dark:placeholder:text-gray-400"
            />
          </label>

          <label
            for="feedback-form-description"
            class="block text-sm font-semibold text-gray-800 dark:text-gray-100"
          >
            Descripción <span aria-hidden="true" class="text-rv-pink">*</span>
            <textarea
              id="feedback-form-description"
              v-model="form.description"
              rows="4"
              required
              :disabled="controlsDisabled"
              :placeholder="descriptionPlaceholder"
              aria-describedby="feedback-form-description-help"
              class="w-full resize-y rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkSurface dark:text-white dark:placeholder:text-gray-400"
            ></textarea>
            <div
              id="feedback-form-description-help"
              :class="typePresentation.helpSurface"
              class="mt-1.5 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs transition-colors duration-150 ease-out motion-reduce:transition-none"
            >
              <i class="fa-solid fa-circle-info mt-0.5 shrink-0" aria-hidden="true"></i>
              <span>{{ descriptionHelp }}</span>
            </div>
          </label>

          <p
            v-if="errorMessage"
            id="feedback-form-error"
            role="alert"
            class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300"
          >
            {{ errorMessage }}
          </p>

          <div
            class="flex flex-col-reverse justify-end gap-2 border-t border-gray-200 pt-4 dark:border-white/10 sm:flex-row"
          >
            <button
              type="button"
              :disabled="controlsDisabled"
              class="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:text-gray-200 dark:hover:bg-white/5"
              @click="emit('close')"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="controlsDisabled"
              :class="typePresentation.submitButton"
              class="rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors duration-150 ease-out dark:focus-visible:ring-offset-rv-darkCard motion-reduce:transition-none"
            >
              <i v-if="submitting" class="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>
              {{ submitting ? "Enviando..." : submitLabel }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>
