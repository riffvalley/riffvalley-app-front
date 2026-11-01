<template>
  <div class="p-4 md:p-6 min-h-screen bg-gray-50 dark:bg-rv-darkBg">
    <div class="max-w-7xl mx-auto">
      <!-- Volver / Eliminar -->
      <div class="mb-3 md:mb-5 flex items-center justify-between gap-2">
        <button
          @click="goBack"
          aria-label="Volver a Radares"
          class="inline-flex items-center gap-2 min-h-11 px-3 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-rv-darkCard border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:text-rv-purple dark:hover:text-rv-pink hover:border-rv-purple/30 dark:hover:border-rv-pink/30 shadow-sm transition-all"
        >
          <i class="fa-solid fa-arrow-left text-xs"></i>
          <span class="hidden sm:inline">Volver a Radares</span>
          <span class="sm:hidden">Radares</span>
        </button>

        <button
          v-if="list"
          @click="deleteRadar"
          :disabled="deleting"
          :aria-label="deleting ? 'Eliminando radar' : 'Eliminar radar'"
          class="inline-flex items-center gap-2 min-h-11 px-3 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-rv-darkCard border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 shadow-sm transition-all"
          title="Eliminar este radar"
        >
          <i class="fa-solid fa-trash text-xs"></i>
          <span class="hidden sm:inline">{{ deleting ? "Eliminando..." : "Eliminar radar" }}</span>
          <span class="sr-only sm:hidden">{{
            deleting ? "Eliminando radar" : "Eliminar radar"
          }}</span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-24 gap-3">
        <i class="fa-solid fa-spinner fa-spin text-3xl text-rv-purple"></i>
        <p class="text-sm text-gray-400 dark:text-gray-500">Cargando radar...</p>
      </div>

      <div
        v-else-if="detailQuery.isError.value"
        role="alert"
        class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-200"
      >
        <p>No se pudieron cargar los detalles de la lista.</p>
        <button
          class="mt-2 rounded-lg border border-current px-3 py-1.5 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          @click="detailQuery.refetch()"
        >
          Reintentar
        </button>
      </div>

      <div v-else-if="list" class="space-y-4 md:space-y-6">
        <!-- ─── Header ─── -->
        <div
          class="relative bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-indigo-900 dark:to-indigo-700 rounded-2xl shadow-lg overflow-hidden border border-purple-100 dark:border-transparent"
        >
          <!-- Icono decorativo (modo oscuro) -->
          <div
            class="absolute top-0 right-0 p-8 opacity-5 transform rotate-12 pointer-events-none hidden dark:block"
          >
            <i class="fa-solid fa-compact-disc text-8xl text-white"></i>
          </div>
          <!-- Decoración claro -->
          <div
            class="absolute top-0 right-0 w-72 h-72 bg-rv-purple/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none dark:hidden"
          ></div>
          <div
            class="absolute bottom-0 left-0 w-48 h-48 bg-rv-pink/5 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none dark:hidden"
          ></div>

          <div
            class="relative z-10 p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6"
          >
            <!-- Título -->
            <div class="flex-1 min-w-0">
              <input
                id="radar-list-name"
                aria-label="Nombre de la lista"
                v-model="list.name"
                @change="updateField({ name: list.name })"
                class="text-[15px] sm:text-lg md:text-3xl font-bold text-gray-900 dark:text-white bg-transparent border-none placeholder-gray-400 dark:placeholder-white/40 focus:ring-0 w-full min-w-0 p-0 leading-tight mb-1"
                placeholder="Nombre de la lista"
              />
            </div>

            <!-- Controles -->
            <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <!-- Status -->
              <div class="relative">
                <select
                  aria-label="Estado de la lista"
                  v-model="list.status"
                  @change="updateField({ status: list.status })"
                  :class="getStatusClass(list.status)"
                  class="appearance-none pl-3 pr-8 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border-0 focus:ring-1 focus:ring-white/20 shadow-sm transition-colors"
                >
                  <option value="new" class="text-gray-900">Nueva</option>
                  <option value="assigned" class="text-gray-900">Asignada</option>
                  <option value="published" class="text-gray-900">Publicada</option>
                </select>
                <i
                  class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-500 dark:text-white/60 pointer-events-none"
                ></i>
              </div>

              <!-- Fechas -->
              <div
                class="hidden md:flex items-center gap-1.5 bg-white/70 dark:bg-white/10 backdrop-blur-sm border border-purple-200 dark:border-white/20 rounded-xl px-3 py-2"
              >
                <i class="fa-regular fa-calendar text-gray-400 dark:text-white/50 text-xs"></i>
                <input
                  type="date"
                  :value="formatDateForInput(list.releaseDate)"
                  @change="updateRequiredEditorialDate"
                  class="bg-transparent border-none p-0 text-gray-700 dark:text-white text-xs font-bold focus:ring-0 cursor-pointer w-[105px]"
                  title="Fecha de publicación obligatoria"
                  aria-label="Fecha de publicación obligatoria"
                  required
                />
                <span class="text-gray-300 dark:text-white/30 text-xs">·</span>
                <input
                  type="date"
                  :value="formatDateForInput(list.listDate)"
                  :min="minListDate"
                  :max="maxListDate"
                  @change="updateOptionalDate('listDate', $event)"
                  class="bg-transparent border-none p-0 text-gray-700 dark:text-white text-xs font-bold focus:ring-0 cursor-pointer w-[82px]"
                  title="Fecha de lista"
                  aria-label="Fecha de lista"
                />
                <span class="text-gray-300 dark:text-white/30 text-xs">→</span>
                <i class="fa-regular fa-clock text-gray-400 dark:text-white/50 text-xs"></i>
                <input
                  type="date"
                  :value="formatDateForInput(list.closeDate)"
                  :min="minCloseDate"
                  :max="maxCloseDate"
                  @change="updateOptionalDate('closeDate', $event)"
                  class="bg-transparent border-none p-0 text-gray-700 dark:text-white text-xs font-bold focus:ring-0 cursor-pointer w-[82px]"
                  title="Fecha de cierre"
                  aria-label="Fecha de cierre"
                />
              </div>
            </div>
            <details class="radar-mobile-dates md:hidden w-full">
              <summary
                class="min-h-11 flex items-center justify-between rounded-xl border border-purple-200 dark:border-white/20 bg-white/70 dark:bg-white/10 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-100"
              >
                <span class="flex items-center gap-2"
                  ><i class="fa-regular fa-calendar" aria-hidden="true"></i> Fechas
                  editoriales</span
                >
                <i class="fa-solid fa-chevron-down text-xs" aria-hidden="true"></i>
              </summary>
              <div class="grid grid-cols-1 gap-3 pt-3">
                <label for="radar-mobile-release-date" class="radar-mobile-date-field">
                  <span>Publicación obligatoria</span>
                  <input
                    id="radar-mobile-release-date"
                    type="date"
                    :value="formatDateForInput(list.releaseDate)"
                    @change="updateRequiredEditorialDate"
                    aria-label="Fecha de publicación obligatoria"
                    required
                  />
                </label>
                <label for="radar-mobile-list-date" class="radar-mobile-date-field">
                  <span>Fecha de lista</span>
                  <input
                    id="radar-mobile-list-date"
                    type="date"
                    :value="formatDateForInput(list.listDate)"
                    :min="minListDate"
                    :max="maxListDate"
                    @change="updateOptionalDate('listDate', $event)"
                    aria-label="Fecha de lista"
                  />
                </label>
                <label for="radar-mobile-close-date" class="radar-mobile-date-field">
                  <span>Fecha de cierre</span>
                  <input
                    id="radar-mobile-close-date"
                    type="date"
                    :value="formatDateForInput(list.closeDate)"
                    :min="minCloseDate"
                    :max="maxCloseDate"
                    @change="updateOptionalDate('closeDate', $event)"
                    aria-label="Fecha de cierre"
                  />
                </label>
              </div>
            </details>
          </div>
        </div>

        <!-- ─── Asignaciones ─── -->
        <div
          class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden"
        >
          <div
            class="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100 dark:border-white/10 flex items-center gap-2"
          >
            <div
              class="w-7 h-7 rounded-lg bg-rv-purple/10 dark:bg-rv-purple/20 flex items-center justify-center"
            >
              <i class="fa-solid fa-users-viewfinder text-rv-purple text-xs"></i>
            </div>
            <h2 class="text-base font-bold text-gray-900 dark:text-white">Asignaciones</h2>
          </div>
          <div class="p-3 md:p-5">
            <RadarAssignments
              :list-id="list.id"
              :wp-weekly-posts="list.wpWeeklyPosts"
              @wp-published="mergeWeeklyWpPosts"
            />
          </div>
        </div>

        <!-- ─── Listado de Discos ─── -->
        <div
          class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden"
        >
          <div
            class="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100 dark:border-white/10 flex items-center gap-2"
          >
            <div
              class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"
            >
              <i class="fa-solid fa-compact-disc text-amber-500 dark:text-amber-400 text-xs"></i>
            </div>
            <h2 class="text-base font-bold text-gray-900 dark:text-white">
              Listado de Discos por Fecha
            </h2>
          </div>
          <div class="p-3 md:p-5">
            <RadarDiscCatalog v-if="list.listDate" :date="list.listDate" :list-id="list.id" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import {
  deleteList,
  updateList,
  type ListUpdatePayload,
  type RadarListDetails,
  type WpPost,
} from "@services/list/list";
import SwalService from "@services/swal/SwalService";
import { radarBestListsQueryKey } from "@/modules/editorial/lists/shared/application/useRadarBestListsQueries";
import {
  radarDetailQueryKeys,
  useRadarDetailQuery,
} from "@/modules/editorial/lists/radar/application/radarDetailQueries";
import RadarAssignments from "../components/RadarAssignments.vue";
import RadarDiscCatalog from "../components/RadarDiscCatalog.vue";
import { useListsRealtime } from "@/modules/editorial/lists/shared/application/useListsRealtime";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const auth = useAuthStore();
const listId = computed(() => String(route.params.id ?? ""));
useListsRealtime(listId, "week");
const detailQuery = useRadarDetailQuery(listId);
const list = shallowRef<RadarListDetails | null>(null);
const loading = computed(() => detailQuery.isPending.value);
const deleting = ref(false);

function invalidateContentCalendar() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["editorial", "content-calendar", "deferred"] }),
    queryClient.invalidateQueries({
      queryKey: [
        "editorial",
        "contents",
        "content-calendar",
        auth.userId,
        auth.authSessionGeneration,
        auth.role,
      ],
    }),
  ]);
}

watch(listId, () => {
  list.value = null;
});
watch(
  detailQuery.data,
  (data) => {
    if (data && !list.value) list.value = { ...data };
  },
  { immediate: true }
);

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

function toLocalISODate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const maxListDate = computed(() => {
  if (!list.value?.listDate) return undefined;
  const d = new Date(list.value.listDate);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
});

const maxCloseDate = computed(() => {
  if (!list.value?.listDate) return undefined;
  const d = new Date(list.value.listDate);
  const day = d.getDay();
  const diffToSunday = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diffToSunday);
  d.setDate(d.getDate() + 3);
  return d.toISOString().split("T")[0];
});

const minListDate = computed(() => {
  if (!list.value?.listDate) return undefined;
  const d = new Date(list.value.listDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
});

const minCloseDate = computed(() => {
  if (!list.value?.listDate) return undefined;
  const d = new Date(list.value.listDate);
  d.setHours(0, 0, 0, 0);
  return toLocalISODate(d);
});

function getStatusClass(status: string) {
  const classes: Record<string, string> = {
    new: "bg-blue-500 hover:bg-blue-600 text-white",
    assigned: "bg-amber-500 hover:bg-amber-600 text-white",
    published: "bg-green-500 hover:bg-green-600 text-white",
  };
  return classes[status] || "bg-white/20 hover:bg-white/30 text-white";
}

async function deleteRadar() {
  if (!list.value || deleting.value) return;
  const confirmed = await SwalService.confirm(
    `¿Eliminar "${list.value.name}"?`,
    "Esta acción no se puede deshacer. Se eliminarán el radar, sus asignaciones y su evento del calendario de contenido.",
    "Sí, eliminar",
    "Cancelar"
  );
  if (!confirmed.isConfirmed) return;

  deleting.value = true;
  try {
    await deleteList(list.value.id);
    await queryClient.invalidateQueries({ queryKey: [...radarBestListsQueryKey, "radar"] });
    await invalidateContentCalendar();
    SwalService.success("Radar eliminado");
    router.push("/discos/radar");
  } catch {
    SwalService.error("No se pudo eliminar el radar");
  } finally {
    deleting.value = false;
  }
}

function goBack() {
  router.push("/discos/radar");
}

async function updateField(payload: ListUpdatePayload) {
  if (!list.value) return false;
  try {
    const updated = await updateList(list.value.id, payload);
    list.value = { ...list.value, ...updated, ...payload };
    queryClient.setQueryData(
      radarDetailQueryKeys.list(
        { userId: auth.userId, generation: auth.authSessionGeneration },
        list.value.id
      ),
      list.value
    );
    await queryClient.invalidateQueries({ queryKey: [...radarBestListsQueryKey, "radar"] });
    await invalidateContentCalendar();
    return true;
  } catch {
    SwalService.error("No se pudo guardar el cambio");
    return false;
  }
}

async function updateRequiredEditorialDate(event: Event) {
  if (!list.value) return;
  const input = event.target as HTMLInputElement;
  const value = input.value;
  const previousDate = formatDateForInput(list.value.releaseDate);
  const hasBadInput = input.validity.badInput;

  if (hasBadInput || !isValidDateInput(value)) {
    input.value = previousDate;
    const message =
      hasBadInput || value
        ? "La fecha de publicación no es válida."
        : "La fecha de publicación es obligatoria.";
    SwalService.error(message);
    return;
  }

  if (value === previousDate) return;

  try {
    const saved = await updateField({ releaseDate: value });
    if (!saved) input.value = previousDate;
  } catch {
    input.value = previousDate;
    SwalService.error("No se pudo guardar el cambio");
  }
}

async function updateOptionalDate(field: "listDate" | "closeDate", event: Event) {
  if (!list.value) return;
  const input = event.target as HTMLInputElement;
  const value = input.value;
  const previousDate = formatDateForInput(list.value[field]);

  if (input.validity.badInput || (value !== "" && !isValidDateInput(value))) {
    input.value = previousDate;
    SwalService.error("La fecha indicada no es válida.");
    return;
  }

  const nextDate = value === "" ? null : value;
  if ((nextDate ?? "") === previousDate) return;

  try {
    const saved = await updateField({ [field]: nextDate });
    if (!saved) input.value = previousDate;
  } catch {
    input.value = previousDate;
    SwalService.error("No se pudo guardar el cambio");
  }
}

function mergeWeeklyWpPosts(posts: WpPost[]) {
  if (!list.value) return;
  const existingWeeklyPosts = Array.isArray(list.value.wpWeeklyPosts)
    ? list.value.wpWeeklyPosts
    : [];
  const mergedWeeklyPosts = [...existingWeeklyPosts];
  for (const p of posts) {
    const record = { position: p.position, wpPostId: p.wpPostId, wpPostUrl: p.link };
    const idx = mergedWeeklyPosts.findIndex((e) => e.position === p.position);
    if (idx !== -1) mergedWeeklyPosts[idx] = record;
    else mergedWeeklyPosts.push(record);
  }
  list.value = { ...list.value, wpWeeklyPosts: mergedWeeklyPosts };
}
</script>

<style scoped>
.radar-mobile-dates summary {
  list-style: none;
  cursor: pointer;
}

.radar-mobile-dates summary::-webkit-details-marker {
  display: none;
}

.radar-mobile-date-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: rgb(75 85 99);
  font-size: 0.75rem;
  font-weight: 600;
}

.radar-mobile-date-field input {
  width: 100%;
  min-height: 44px;
  border: 1px solid rgb(209 213 219);
  border-radius: 0.7rem;
  background: white;
  padding: 0.55rem 0.75rem;
  color: rgb(31 41 55);
}

.radar-mobile-date-field input:focus-visible,
.radar-mobile-dates summary:focus-visible {
  outline: 2px solid rgb(124 58 237);
  outline-offset: 2px;
}

:global(html.dark) .radar-mobile-date-field {
  color: rgb(229 231 235);
}

:global(html.dark) .radar-mobile-date-field input {
  border-color: rgb(255 255 255 / 0.15);
  background: #1f2937;
  color: white;
}
</style>
