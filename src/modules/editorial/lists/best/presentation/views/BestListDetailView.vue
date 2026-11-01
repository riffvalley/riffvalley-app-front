<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Swal from "sweetalert2";
import SwalService from "@services/swal/SwalService";
import type { RadarListDetails } from "@services/list/list";
import { useBestDetailQuery } from "../../application/bestDetailQueries";
import { useBestDetailMutations } from "../../application/useBestDetailMutations";
import BestAssignments from "../components/BestAssignments.vue";
import BestDiscCatalog from "../components/BestDiscCatalog.vue";
import BestVotes from "../components/BestVotes.vue";
import { useListsRealtime } from "@/modules/editorial/lists/shared/application/useListsRealtime";

type BestListDetails = RadarListDetails & { wpPostId?: number | null; wpPostUrl?: string | null };
type DetailTab = "votos" | "seleccion";
const route = useRoute();
const router = useRouter();
const listId = computed(() => String(route.params.id ?? ""));
useListsRealtime(listId, "month");
const detailQuery = useBestDetailQuery(listId);
const mutations = useBestDetailMutations(listId);
const list = computed(() => detailQuery.data.value as BestListDetails | undefined);
const activeTab = ref<DetailTab>(readRequestedTab());
const assignmentCount = shallowRef<number | null>(null);
const nameDraft = ref("");
const publishingWp = ref(false);

function readRequestedTab(): DetailTab {
  return route.query.tab === "seleccion" ? "seleccion" : "votos";
}

watch(
  () => [listId.value, route.query.tab] as const,
  () => {
    activeTab.value = readRequestedTab();
  },
  { immediate: true }
);
watch(
  () => list.value?.name,
  (name) => {
    nameDraft.value = name ?? "";
  },
  { immediate: true }
);

function goBack() {
  void router.push("/discos/mejores");
}

function formatDateForInput(dateString?: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
}

function isValidDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function statusClass(status?: string | null) {
  const colors: Record<string, string> = {
    new: "text-blue-600 dark:text-blue-400",
    assigned: "text-green-600 dark:text-green-400",
    published: "text-purple-600 dark:text-purple-400",
  };
  return colors[status ?? ""] ?? "text-gray-600 dark:text-gray-400";
}

async function updateName() {
  if (!list.value || nameDraft.value === list.value.name) return;
  try {
    await mutations.updateList({ name: nameDraft.value });
  } catch {
    nameDraft.value = list.value.name;
    SwalService.error("No se pudo guardar el cambio");
  }
}

async function updateStatus(event: Event) {
  if (!list.value) return;
  try {
    await mutations.updateList({
      status: (event.target as HTMLSelectElement).value as "new" | "assigned" | "published",
    });
  } catch {
    SwalService.error("No se pudo guardar el cambio");
  }
}

async function updateRequiredDate(event: Event) {
  if (!list.value) return;
  const input = event.target as HTMLInputElement;
  const value = input.value;
  const previous = formatDateForInput(list.value.releaseDate);
  if (input.validity.badInput || !isValidDateInput(value)) {
    input.value = previous;
    SwalService.error(
      input.validity.badInput || value
        ? "La fecha de publicación no es válida."
        : "La fecha de publicación es obligatoria."
    );
    return;
  }
  if (value === previous) return;
  try {
    await mutations.updateList({ releaseDate: value });
  } catch {
    input.value = previous;
    SwalService.error("No se pudo guardar el cambio");
  }
}

async function updateOptionalDate(event: Event) {
  if (!list.value) return;
  const input = event.target as HTMLInputElement;
  const value = input.value;
  const previous = formatDateForInput(list.value.listDate);
  if (input.validity.badInput || (value !== "" && !isValidDateInput(value))) {
    input.value = previous;
    SwalService.error("La fecha indicada no es válida.");
    return;
  }
  const nextDate = value === "" ? null : value;
  if ((nextDate ?? "") === previous) return;
  try {
    await mutations.updateList({ listDate: nextDate });
  } catch {
    input.value = previous;
    SwalService.error("No se pudo guardar el cambio");
  }
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ??
      character
  );
}

async function publishToWordPress() {
  if (!list.value) return;
  publishingWp.value = true;
  try {
    const result = await mutations.publishToWordPress();
    const linkHtml = `<a href="${escapeHtml(result.link)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">${escapeHtml(result.title)}</a>`;
    const removedText = result.removed ? ` (se han eliminado ${result.removed})` : "";
    if (result.skipped) {
      await Swal.fire({
        icon: "info",
        title: "Ya existía un borrador en WordPress",
        html: `Se ha enlazado la lista al post ya existente: ${linkHtml}`,
      });
    } else if (result.warning) {
      const changes: string[] = [];
      if (result.added !== undefined)
        changes.push(`${result.added} añadido${result.added === 1 ? "" : "s"}`);
      if (result.removed)
        changes.push(`${result.removed} eliminado${result.removed === 1 ? "" : "s"}`);
      await Swal.fire({
        icon: "warning",
        title: changes.length
          ? `Post actualizado (${changes.join(", ")})`
          : "Aviso al actualizar el post",
        html: `${escapeHtml(result.warning)}<br><br>${linkHtml}`,
      });
    } else if (result.added !== undefined && result.added > 0) {
      await Swal.fire({
        icon: "success",
        title: `Se han añadido ${result.added} discos nuevos al borrador${removedText}`,
        html: linkHtml,
      });
    } else if (result.added === 0) {
      await Swal.fire({
        icon: "info",
        title: `No hay discos nuevos que añadir${removedText}`,
        html: result.removed ? linkHtml : undefined,
      });
    } else {
      await Swal.fire({ icon: "success", title: "Borrador creado", html: linkHtml });
    }
  } catch (error: unknown) {
    const response =
      typeof error === "object" && error !== null && "response" in error ? error.response : null;
    const data =
      typeof response === "object" && response !== null && "data" in response
        ? response.data
        : null;
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Error al publicar en WordPress";
    SwalService.error(message);
  } finally {
    publishingWp.value = false;
  }
}
</script>

<template>
  <div class="-m-6 min-h-screen bg-gray-50/50 px-2 pb-4 pt-20 dark:bg-rv-darkBg md:m-0 md:p-6">
    <div class="mx-auto w-full min-w-0 max-w-7xl">
      <button
        type="button"
        class="mb-6 flex min-h-11 max-w-full flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-left text-gray-700 shadow-sm transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-300 dark:hover:bg-rv-darkSurface"
        @click="goBack"
      >
        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>Volver a Mejores del Mes
      </button>

      <div
        v-if="detailQuery.isPending.value"
        role="status"
        class="py-12 text-center text-gray-500 dark:text-gray-400"
      >
        <i class="fa-solid fa-spinner fa-spin mb-4 text-4xl text-rv-purple" aria-hidden="true"></i>
        <p>Cargando detalles…</p>
      </div>
      <div
        v-else-if="detailQuery.isError.value"
        role="alert"
        class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-200"
      >
        No se pudieron cargar los detalles de la lista.
        <button type="button" class="ml-2 underline" @click="detailQuery.refetch()">
          Reintentar
        </button>
      </div>
      <div v-else-if="list" class="space-y-8">
        <section
          class="relative overflow-hidden rounded-2xl border border-rv-pink/30 bg-rv-pink/10 shadow-lg dark:border-white/10 dark:bg-rv-darkCard"
        >
          <div
            class="pointer-events-none absolute right-0 top-0 hidden rotate-12 p-8 opacity-5 dark:block"
          >
            <i class="fa-solid fa-compact-disc text-8xl text-white" aria-hidden="true"></i>
          </div>
          <div class="relative z-10 p-3 sm:p-5 md:px-6">
            <div
              class="flex min-w-0 flex-col justify-between gap-4 md:flex-row md:items-center md:gap-6"
            >
              <input
                v-model="nameDraft"
                aria-label="Nombre de la lista"
                class="w-full min-w-0 rounded-lg border-0 bg-transparent p-0 text-2xl font-black leading-tight text-gray-900 focus:ring-0 dark:text-white md:flex-1 md:text-3xl"
                placeholder="Nombre de la lista"
                @change="updateName"
              />
              <div class="flex min-w-0 flex-wrap items-center gap-2 md:gap-3">
                <button
                  type="button"
                  :disabled="publishingWp"
                  class="flex min-h-11 items-center gap-2 rounded-xl border-0 bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:opacity-50"
                  title="El post se crea/actualiza siempre como borrador en WordPress, nunca se publica solo"
                  @click="publishToWordPress"
                >
                  <i class="fab fa-wordpress" aria-hidden="true"></i
                  ><span class="hidden sm:inline">{{
                    publishingWp
                      ? "Publicando…"
                      : list.wpPostId
                        ? "Añadir discos nuevos al post"
                        : "Crear post en WordPress"
                  }}</span
                  ><span class="sm:hidden">{{ publishingWp ? "…" : "WP" }}</span>
                </button>
                <a
                  v-if="list.wpPostUrl"
                  :href="list.wpPostUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex min-h-11 items-center gap-1.5 rounded-xl border border-indigo-200 bg-white/70 px-3 py-2 text-sm font-semibold text-indigo-600 backdrop-blur-sm transition-colors hover:bg-white dark:border-white/5 dark:bg-black/20 dark:text-indigo-300 dark:hover:bg-black/30"
                  ><i class="fa-solid fa-arrow-up-right-from-square text-xs" aria-hidden="true"></i
                  ><span class="hidden sm:inline">Ver borrador en WP</span></a
                >
                <div
                  class="flex min-h-11 items-center rounded-lg border border-indigo-200 bg-white/70 px-3 py-1.5 backdrop-blur-sm dark:border-white/5 dark:bg-black/20"
                >
                  <select
                    :value="list.status ?? 'new'"
                    class="cursor-pointer border-0 bg-transparent p-0 text-xs font-bold uppercase tracking-wide focus:ring-0 [&>option]:text-gray-900"
                    :class="statusClass(list.status)"
                    aria-label="Estado de la lista"
                    @change="updateStatus"
                  >
                    <option value="new">Nueva</option>
                    <option value="assigned">Asignada</option>
                    <option value="published">Publicada</option>
                  </select>
                </div>
                <div
                  class="flex min-h-11 min-w-0 max-w-full items-center overflow-hidden rounded-lg border border-indigo-200 bg-white/70 dark:border-white/5 dark:bg-black/20"
                >
                  <span
                    class="border-r border-indigo-100 bg-indigo-50 px-3 py-2 dark:border-white/5 dark:bg-white/5"
                    ><i
                      class="fa-regular fa-calendar text-indigo-400 dark:text-indigo-300"
                      aria-hidden="true"
                    ></i></span
                  ><input
                    id="best-release-date"
                    type="date"
                    :value="formatDateForInput(list.releaseDate)"
                    class="h-full w-auto min-w-0 max-w-full cursor-pointer border-0 bg-transparent px-3 py-1.5 text-sm font-bold text-gray-700 transition-colors hover:bg-indigo-50 focus:ring-0 dark:text-white dark:hover:bg-white/5"
                    title="Fecha de publicación obligatoria"
                    aria-label="Fecha de publicación obligatoria"
                    required
                    @change="updateRequiredDate"
                  />
                </div>
                <div
                  class="flex min-h-11 min-w-0 max-w-full items-center overflow-hidden rounded-lg border border-indigo-200 bg-white/70 dark:border-white/5 dark:bg-black/20"
                >
                  <span
                    class="border-r border-indigo-100 bg-indigo-50 px-3 py-2 dark:border-white/5 dark:bg-white/5"
                    ><i
                      class="fa-regular fa-calendar-days text-indigo-400 dark:text-indigo-300"
                      aria-hidden="true"
                    ></i></span
                  ><input
                    id="best-list-date"
                    type="date"
                    :value="formatDateForInput(list.listDate)"
                    class="h-full w-auto min-w-0 max-w-full cursor-pointer border-0 bg-transparent px-3 py-1.5 text-sm font-bold text-gray-700 transition-colors hover:bg-indigo-50 focus:ring-0 dark:text-white dark:hover:bg-white/5"
                    title="Fecha de lista (opcional)"
                    aria-label="Fecha de lista (opcional)"
                    @change="updateOptionalDate"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          class="best-assignment-sheet overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-rv-darkCard"
        >
          <div
            class="flex min-w-0 flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-white/10 md:px-5 md:py-4"
          >
            <div
              class="flex h-7 w-7 items-center justify-center rounded-lg bg-rv-purple/10 dark:bg-rv-purple/20"
            >
              <i class="fa-solid fa-users-viewfinder text-xs text-rv-purple" aria-hidden="true"></i>
            </div>
            <h2 class="min-w-0 text-base font-bold text-gray-900 dark:text-white">Asignaciones</h2>
            <span
              v-if="assignmentCount !== null"
              class="ml-auto inline-flex min-h-8 items-center gap-1.5 rounded-full bg-rv-gradient px-3.5 text-xs font-bold text-white shadow-sm ring-1 ring-white/25"
              aria-live="polite"
            >
              <i class="fa-solid fa-compact-disc" aria-hidden="true"></i>
              {{ assignmentCount }} {{ assignmentCount === 1 ? "disco" : "discos" }}
            </span>
          </div>
          <div class="p-3 md:p-5">
            <BestAssignments :list-id="list.id" @assignment-count="assignmentCount = $event" />
          </div>
        </section>

        <section>
          <div
            class="mb-4 flex gap-1 border-b border-gray-200 dark:border-white/10"
            role="tablist"
            aria-label="Contenido de la lista mensual"
          >
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'votos'"
              aria-controls="best-panel-votos"
              class="-mb-px flex min-h-11 items-center gap-2 rounded-t-lg border-0 border-b-2 bg-transparent px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
              :class="
                activeTab === 'votos'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400'
              "
              @click="activeTab = 'votos'"
            >
              <i class="fa-solid fa-star" aria-hidden="true"></i>Mis votos
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'seleccion'"
              aria-controls="best-panel-seleccion"
              class="-mb-px flex min-h-11 items-center gap-2 rounded-t-lg border-0 border-b-2 bg-transparent px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
              :class="
                activeTab === 'seleccion'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400'
              "
              @click="activeTab = 'seleccion'"
            >
              <i class="fa-solid fa-compact-disc" aria-hidden="true"></i>Selección de discos
            </button>
          </div>
          <div
            id="best-panel-votos"
            v-show="activeTab === 'votos'"
            role="tabpanel"
            aria-label="Mis votos"
            class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-rv-darkCard"
          >
            <div class="mb-4 flex items-center gap-3">
              <div
                class="rounded-lg bg-amber-100 p-1.5 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              >
                <i class="fa-solid fa-star text-lg" aria-hidden="true"></i>
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">Mis votos del mes</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Asígnate los discos que ya has votado
                </p>
              </div>
            </div>
            <BestVotes
              v-if="list.listDate"
              :list-id="list.id"
              :date="list.listDate"
              :active="activeTab === 'votos'"
            />
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">
              La lista no tiene una fecha para consultar los votos del periodo.
            </p>
          </div>
          <div
            id="best-panel-seleccion"
            v-show="activeTab === 'seleccion'"
            role="tabpanel"
            aria-label="Selección de discos"
            class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-rv-darkCard"
          >
            <div class="mb-4 flex items-center gap-3">
              <div
                class="rounded-lg bg-pink-100 p-1.5 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400"
              >
                <i class="fa-solid fa-compact-disc text-lg" aria-hidden="true"></i>
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">Selección de discos</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Discos lanzados en este periodo
                </p>
              </div>
            </div>
            <BestDiscCatalog
              v-if="list.listDate"
              :list-id="list.id"
              :date="list.listDate"
              :active="activeTab === 'seleccion'"
            />
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">
              La lista no tiene una fecha para consultar el catálogo mensual.
            </p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
