<template>
  <main class="flex min-h-screen flex-col bg-gray-50 dark:bg-rv-darkBg">
    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <section
        class="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-rv-darkCard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-reunion-title"
      >
        <header
          class="flex items-center justify-between border-b border-gray-100 px-5 pb-4 pt-5 dark:border-white/10"
        >
          <div class="flex items-center gap-2">
            <span
              class="rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
              >Reunión</span
            >
            <h2 id="create-reunion-title" class="text-base font-bold text-gray-900 dark:text-white">
              Nueva reunión
            </h2>
          </div>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-rv-darkSurface dark:hover:text-white"
            aria-label="Cerrar"
            @click="showForm = false"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <form class="space-y-4 px-5 py-4" @submit.prevent="submitCreate">
          <label
            for="reunion-name"
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >Nombre
            <input
              id="reunion-name"
              v-model="form.name"
              required
              class="mt-1.5 w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:ring-2 focus:ring-rv-purple/30 dark:bg-rv-darkSurface dark:text-gray-200"
              placeholder="Nombre de la reunión…"
            />
          </label>
          <label
            for="reunion-notes"
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >Notas
            <textarea
              id="reunion-notes"
              v-model="form.notes"
              rows="3"
              class="mt-1.5 w-full resize-none rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:ring-2 focus:ring-rv-purple/30 dark:bg-rv-darkSurface dark:text-gray-200"
              placeholder="Descripción o notas…"
            />
          </label>
          <fieldset>
            <legend
              class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Fecha <span class="text-red-500">*</span>
            </legend>
            <div class="flex gap-2">
              <input
                v-model="form.date"
                type="date"
                required
                aria-label="Fecha"
                class="min-w-0 flex-1 rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:ring-2 focus:ring-rv-purple/30 dark:bg-rv-darkSurface dark:text-gray-200"
              />
              <select
                v-model="form.time"
                required
                aria-label="Hora"
                class="w-32 rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:ring-2 focus:ring-rv-purple/30 dark:bg-rv-darkSurface dark:text-gray-200"
              >
                <option value="" disabled>Hora</option>
                <option v-for="slot in timeSlots" :key="slot" :value="slot">{{ slot }}</option>
              </select>
            </div>
          </fieldset>
          <label
            for="reunion-author"
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >Autor
            <select
              id="reunion-author"
              v-model="form.authorId"
              required
              class="mt-1.5 w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:ring-2 focus:ring-rv-purple/30 dark:bg-rv-darkSurface dark:text-gray-200"
            >
              <option value="" disabled>Seleccionar autor…</option>
              <option v-for="user in authors" :key="user.id" :value="user.id">
                {{ user.username }}
              </option>
            </select>
          </label>
          <div class="flex justify-end gap-2 pt-1">
            <button
              type="button"
              class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:bg-rv-darkSurface dark:text-gray-300 dark:hover:bg-rv-darkBg"
              @click="showForm = false"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="mutations.createReunionFromContentMutation.isPending.value"
              class="transform rounded-xl bg-rv-purple px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-rv-pink disabled:opacity-50"
            >
              Crear reunión
            </button>
          </div>
        </form>
      </section>
    </div>

    <div class="flex-1 overflow-y-auto p-4 md:p-6">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
          <i class="fa-solid fa-comments mr-2" aria-hidden="true"></i>Reuniones
        </h1>
        <button
          type="button"
          class="flex transform items-center gap-2 rounded-xl bg-gradient-to-r from-rv-purple to-rv-pink px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:opacity-90"
          @click="showForm = true"
        >
          <i class="fa-solid fa-plus text-xs" aria-hidden="true"></i><span>Nueva reunión</span>
        </button>
      </div>
      <p v-if="listQuery.isPending.value" role="status" class="py-8 text-center text-gray-500">
        Cargando reuniones…
      </p>
      <div v-else-if="listQuery.isError.value" class="py-8 text-center text-red-600" role="alert">
        No se pudieron obtener las reuniones.
        <button type="button" class="underline" @click="listQuery.refetch()">Reintentar</button>
      </div>
      <template v-else>
        <div class="mb-8">
          <ReunionTable
            title="Reuniones Actuales"
            :reuniones="currentReunions"
            @edit="openEditor"
            @refresh="listQuery.refetch()"
          />
        </div>
        <section>
          <button
            type="button"
            class="mb-4 flex w-full cursor-pointer select-none items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left transition-all hover:shadow-sm dark:border-white/10 dark:bg-rv-darkCard"
            :aria-expanded="showPastReunions"
            @click="showPastReunions = !showPastReunions"
          >
            <span class="flex items-center gap-3"
              ><span
                class="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 dark:bg-rv-darkSurface"
                ><i
                  class="fa-solid fa-clock-rotate-left text-sm text-gray-500 dark:text-gray-400"
                  aria-hidden="true"
                ></i></span
              ><span class="text-lg font-bold text-gray-900 dark:text-white">Reuniones Pasadas</span
              ><i
                class="fa-solid fa-chevron-down text-xs text-gray-400 transition-transform duration-300"
                :class="{ 'rotate-180': showPastReunions }"
                aria-hidden="true"
              ></i
            ></span>
            <span
              class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500 dark:bg-rv-darkSurface dark:text-gray-400"
              >{{ pastReunions.length }}</span
            >
          </button>
          <div v-show="showPastReunions">
            <div v-if="pastReunions.length">
              <div class="mb-4 flex flex-col gap-3 sm:flex-row">
                <label
                  for="past-year"
                  class="flex-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >Año
                  <select
                    id="past-year"
                    v-model="selectedYear"
                    class="mt-1.5 w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-normal normal-case text-gray-800 dark:bg-rv-darkSurface dark:text-gray-200"
                  >
                    <option :value="null">Selecciona un año</option>
                    <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
                  </select>
                </label>
                <label
                  v-if="selectedYear !== null"
                  for="past-month"
                  class="flex-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >Mes
                  <select
                    id="past-month"
                    v-model="selectedMonth"
                    class="mt-1.5 w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-normal normal-case text-gray-800 dark:bg-rv-darkSurface dark:text-gray-200"
                  >
                    <option :value="null">Selecciona un mes</option>
                    <option v-for="month in months" :key="month" :value="month">
                      {{ monthNames[month] }}
                    </option>
                  </select>
                </label>
              </div>
              <div
                v-if="selectedMonth !== null"
                class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <button
                  v-for="reunion in filteredPastReunions"
                  :key="reunion.id"
                  type="button"
                  class="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-rv-darkCard"
                  @click="openEditor(reunion.id)"
                >
                  <span class="mb-2 flex items-start justify-between gap-2"
                    ><span class="text-sm font-bold leading-snug text-gray-900 dark:text-white">{{
                      reunion.title
                    }}</span
                    ><i
                      class="fa-solid fa-arrow-up-right-from-square mt-0.5 shrink-0 text-[10px] text-gray-300 transition-colors group-hover:text-rv-purple dark:text-gray-600"
                      aria-hidden="true"
                    ></i
                  ></span>
                  <span
                    class="mb-3 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500"
                    ><i class="fa-regular fa-calendar text-[10px]" aria-hidden="true"></i
                    >{{ formatDate(reunion.date) }}</span
                  >
                  <span
                    v-if="reunion.points.length"
                    class="flex items-center justify-between border-t border-gray-50 pt-2 dark:border-white/5"
                    ><span class="text-xs text-gray-400"
                      >{{ reunion.points.filter((point) => point.done).length }}/{{
                        reunion.points.length
                      }}
                      completados</span
                    ><span class="flex gap-0.5"
                      ><i
                        v-for="point in reunion.points.slice(0, 6)"
                        :key="point.id"
                        class="h-2 w-2 rounded-full"
                        :class="point.done ? 'bg-green-400' : 'bg-gray-200 dark:bg-white/15'"
                        aria-hidden="true"
                      ></i
                      ><span v-if="reunion.points.length > 6" class="ml-1 text-[9px] text-gray-400"
                        >+{{ reunion.points.length - 6 }}</span
                      ></span
                    ></span
                  >
                  <span
                    v-else
                    class="block border-t border-gray-50 pt-2 text-xs text-gray-300 dark:border-white/5 dark:text-gray-600"
                    >Sin puntos</span
                  >
                </button>
              </div>
              <p v-else class="py-8 text-center text-gray-400 dark:text-gray-500" role="status">
                Selecciona un {{ selectedYear === null ? "año" : "mes" }} para ver las reuniones
              </p>
            </div>
            <p v-else class="py-12 text-center text-gray-400 dark:text-gray-500">
              <i class="fa-solid fa-inbox mb-2 text-4xl" aria-hidden="true"></i
              ><span class="block">No hay reuniones pasadas</span>
            </p>
          </div>
        </section>
      </template>
    </div>
    <ReunionEditor
      :id="selectedReunionId"
      modal
      :show="selectedReunionId !== null"
      @close="selectedReunionId = null"
      @deleted="selectedReunionId = null"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef, watch } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import { getRvUsers, type RvUser } from "@/modules/identity/users";
import SwalService from "@services/swal/SwalService";
import { useReunionsListQuery } from "../../application/reunionsQueries";
import { useReunionsMutations } from "../../application/useReunionsMutations";
import ReunionTable from "../components/ReunionTable.vue";
import ReunionEditor from "../components/ReunionEditor.vue";
import { reportVisibleReunions } from "../composables/reunionsVisibility";

const auth = useAuthStore();
const session = {
  userId: computed(() => auth.userId),
  generation: computed(() => auth.authSessionGeneration),
  role: computed(() => auth.role),
};
const listQuery = useReunionsListQuery(session);
const mutations = useReunionsMutations(session);
const reunions = computed(() => listQuery.data.value ?? []);
const showForm = shallowRef(false);
const showPastReunions = shallowRef(false);
const selectedReunionId = shallowRef<string | null>(null);
const selectedYear = shallowRef<number | null>(null);
const selectedMonth = shallowRef<number | null>(null);
const authors = shallowRef<RvUser[]>([]);
const form = reactive({ name: "", notes: "", date: "", time: "", authorId: "" });
const timeSlots = Array.from(
  { length: 48 },
  (_, index) => `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`
);
const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const todayStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};
const currentReunions = computed(() =>
  reunions.value
    .filter((item) => new Date(item.date).setHours(0, 0, 0, 0) >= todayStart().getTime())
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
);
const pastReunions = computed(() =>
  reunions.value
    .filter((item) => new Date(item.date).setHours(0, 0, 0, 0) < todayStart().getTime())
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
);
const years = computed(() =>
  [...new Set(pastReunions.value.map((item) => new Date(item.date).getFullYear()))].sort(
    (a, b) => b - a
  )
);
const months = computed(() =>
  selectedYear.value === null
    ? []
    : [
        ...new Set(
          pastReunions.value
            .filter((item) => new Date(item.date).getFullYear() === selectedYear.value)
            .map((item) => new Date(item.date).getMonth())
        ),
      ].sort((a, b) => b - a)
);
const filteredPastReunions = computed(() =>
  pastReunions.value.filter((item) => {
    const date = new Date(item.date);
    return selectedYear.value === date.getFullYear() && selectedMonth.value === date.getMonth();
  })
);
const visibleReunions = computed(() => {
  const visible = [...currentReunions.value];
  if (showPastReunions.value && selectedMonth.value !== null) {
    visible.push(...filteredPastReunions.value);
  }
  const selected = reunions.value.find((item) => item.id === selectedReunionId.value);
  if (selected && !visible.some((item) => item.id === selected.id)) visible.push(selected);
  return visible;
});
reportVisibleReunions(visibleReunions);

watch(
  reunions,
  () => {
    if (selectedYear.value === null && years.value.length) selectedYear.value = years.value[0];
    if (selectedYear.value !== null && !years.value.includes(selectedYear.value))
      selectedYear.value = years.value[0] ?? null;
  },
  { immediate: true }
);
watch(selectedYear, () => {
  selectedMonth.value = months.value[0] ?? null;
});

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function openEditor(id: string) {
  selectedReunionId.value = id;
}

onMounted(async () => {
  try {
    authors.value = await getRvUsers();
    const riffValleyUser = authors.value.find(
      (user) => user.username.toLowerCase().replace(/\s+/g, "") === "riffvalley"
    );
    if (riffValleyUser) form.authorId = riffValleyUser.id;
  } catch {
    SwalService.error("No se pudieron cargar los usuarios.");
  }
});

async function submitCreate() {
  try {
    const publicationDate = new Date(`${form.date}T${form.time}`).toISOString();
    await mutations.createReunionFromContentMutation.mutateAsync({
      type: "reunion",
      name: form.name,
      notes: form.notes || undefined,
      publicationDate,
      authorId: form.authorId,
    });
    const authorId = form.authorId;
    Object.assign(form, { name: "", notes: "", date: "", time: "", authorId });
    showForm.value = false;
    SwalService.success("Reunión creada con éxito.");
  } catch {
    SwalService.error("No se pudo crear la reunión.");
  }
}
</script>
