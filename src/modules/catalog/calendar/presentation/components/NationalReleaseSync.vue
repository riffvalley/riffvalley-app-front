<template>
  <div class="flex justify-end">
    <button
      type="button"
      class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rv-pink px-4 py-2 text-sm font-semibold text-rv-navy shadow-sm transition-colors hover:bg-rv-pink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="pending"
      @click="syncMonth"
    >
      <span aria-hidden="true">🇪🇸</span>
      Sincronizar lanzamientos nacionales
    </button>
  </div>

  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
    >
      <section
        ref="dialog"
        class="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-rv-darkCard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="national-release-sync-title"
        tabindex="-1"
      >
        <header
          class="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-white/10 sm:px-6"
        >
          <h2
            id="national-release-sync-title"
            class="text-lg font-extrabold tracking-tight text-rv-navy dark:text-white sm:text-xl"
          >
            Sincronización de lanzamientos
          </h2>
          <span
            class="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-rv-navy dark:bg-rv-darkSurface dark:text-gray-100"
          >
            {{ monthLabel }} {{ year }}
          </span>
        </header>

        <div
          v-if="pending"
          class="flex min-h-48 flex-col items-center justify-center gap-4 px-6 py-10 text-center"
          role="status"
          aria-live="polite"
        >
          <i
            class="fa-solid fa-compact-disc animate-spin text-3xl text-rv-pink"
            aria-hidden="true"
          ></i>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
            Sincronizando lanzamientos del calendario…
          </p>
        </div>

        <div v-else class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div
            v-if="errorMessage"
            class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            <p class="font-semibold">No se pudo completar la sincronización</p>
            <p class="mt-1 break-words">{{ errorMessage }}</p>
          </div>

          <template v-else-if="result">
            <p class="text-sm text-gray-700 dark:text-gray-200">
              <span class="font-semibold text-rv-navy dark:text-white"
                >{{ monthLabel }} {{ result.year }}</span
              >
              · {{ result.scanned }} discos revisados
            </p>

            <section
              v-for="section in releaseSections"
              :key="section.key"
              class="mt-5"
              :aria-labelledby="`sync-${section.key}-heading`"
            >
              <h3
                :id="`sync-${section.key}-heading`"
                class="text-base font-bold text-rv-navy dark:text-white"
              >
                {{ section.title }}
                <span
                  class="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-sm tabular-nums dark:bg-rv-darkSurface"
                  >{{ section.releases.length }}</span
                >
              </h3>
              <p
                v-if="section.releases.length === 0"
                class="mt-2 text-sm text-gray-600 dark:text-gray-300"
              >
                {{ section.emptyMessage }}
              </p>
              <ul v-else class="mt-3 space-y-2">
                <li
                  v-for="release in section.releases"
                  :key="release.id"
                  class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-rv-darkSurface"
                >
                  <p class="font-semibold text-rv-navy dark:text-white">
                    {{ release.artistName }} — {{ release.discName }}
                  </p>
                  <dl
                    class="mt-2 grid grid-cols-1 gap-x-5 gap-y-1 text-xs text-gray-600 dark:text-gray-300 sm:grid-cols-2"
                  >
                    <div>
                      <dt class="inline font-medium">ID del disco:</dt>
                      <dd class="inline break-all">
                        {{
                          release.discId ??
                          release.disc?.id ??
                          release.suggestedDisc?.id ??
                          "No disponible"
                        }}
                      </dd>
                    </div>
                    <div>
                      <dt class="inline font-medium">ID de National Release:</dt>
                      <dd class="inline break-all">{{ release.id }}</dd>
                    </div>
                  </dl>
                </li>
              </ul>
            </section>

            <section class="mt-6" aria-labelledby="sync-errors-heading">
              <h3 id="sync-errors-heading" class="text-base font-bold text-rv-navy dark:text-white">
                Errores
                <span
                  class="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-sm tabular-nums text-red-800 dark:bg-red-950/50 dark:text-red-200"
                  >{{ result.errors.length }}</span
                >
              </h3>
              <p
                v-if="result.errors.length === 0"
                class="mt-2 text-sm text-gray-600 dark:text-gray-300"
              >
                No hubo errores.
              </p>
              <ul v-else class="mt-3 space-y-2">
                <li
                  v-for="item in result.errors"
                  :key="item.discId"
                  class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30"
                >
                  <p class="font-semibold text-red-900 dark:text-red-100">{{ item.discName }}</p>
                  <p class="mt-1 break-words text-sm text-red-800 dark:text-red-200">
                    {{ item.message }}
                  </p>
                  <p class="mt-2 break-all text-xs text-red-800/80 dark:text-red-200/80">
                    ID del disco: {{ item.discId }}
                  </p>
                </li>
              </ul>
            </section>
          </template>
        </div>

        <footer
          v-if="!pending"
          class="flex justify-end border-t border-gray-200 px-5 py-4 dark:border-white/10 sm:px-6"
        >
          <button
            ref="closeButton"
            type="button"
            class="min-h-11 rounded-lg bg-rv-pink px-5 py-2 text-sm font-semibold text-rv-navy transition-colors hover:bg-rv-pink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
            @click="closeDialog"
          >
            Cerrar
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import axios from "axios";
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef } from "vue";
import {
  syncNationalReleasesMonth,
  type SyncNationalReleasesMonthResponse,
} from "@services/national-releases/nationalReleases";

const props = defineProps<{
  month: number;
  year: number;
}>();

const monthLabel = computed(() =>
  new Intl.DateTimeFormat("es-ES", { month: "long" }).format(new Date(props.year, props.month, 1))
);
const isOpen = shallowRef(false);
const pending = shallowRef(false);
const result = shallowRef<SyncNationalReleasesMonthResponse | null>(null);
const errorMessage = shallowRef("");
const dialog = shallowRef<HTMLElement | null>(null);
const closeButton = shallowRef<HTMLButtonElement | null>(null);
const triggerElement = shallowRef<HTMLElement | null>(null);

onMounted(() => document.addEventListener("keydown", onDialogKeydown));

const releaseSections = computed(() => {
  if (!result.value) return [];
  return [
    {
      key: "created",
      title: "Creados",
      releases: result.value.created,
      emptyMessage: "No se crearon lanzamientos.",
    },
    {
      key: "linked",
      title: "Vinculados",
      releases: result.value.linked,
      emptyMessage: "No se vincularon lanzamientos.",
    },
  ];
});

async function syncMonth(): Promise<void> {
  if (pending.value) return;

  triggerElement.value =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  result.value = null;
  errorMessage.value = "";
  pending.value = true;
  isOpen.value = true;
  await nextTick();
  dialog.value?.focus();

  try {
    result.value = await syncNationalReleasesMonth({
      month: props.month + 1,
      year: props.year,
    });
  } catch (error) {
    const responseMessage = axios.isAxiosError<{ message?: string | string[] }>(error)
      ? error.response?.data?.message
      : null;
    errorMessage.value = Array.isArray(responseMessage)
      ? responseMessage.join(" ")
      : responseMessage || (error instanceof Error ? error.message : "Error desconocido.");
  } finally {
    pending.value = false;
    await nextTick();
    closeButton.value?.focus();
  }
}

function closeDialog(): void {
  if (pending.value) return;
  isOpen.value = false;
  void nextTick(() => triggerElement.value?.focus());
}

function onDialogKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && !pending.value) {
    event.preventDefault();
    closeDialog();
    return;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    if (!pending.value) closeButton.value?.focus();
  }
}

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onDialogKeydown);
  if (isOpen.value) triggerElement.value?.focus();
});
</script>
