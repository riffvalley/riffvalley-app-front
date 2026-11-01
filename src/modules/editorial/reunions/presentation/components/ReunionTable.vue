<template>
  <section>
    <h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">{{ title }}</h2>
    <div class="space-y-4">
      <article
        v-for="reunion in reuniones"
        :key="reunion.id"
        class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-rv-darkCard"
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            class="flex min-w-0 items-baseline gap-3 text-left"
            :aria-expanded="!collapsed.has(reunion.id)"
            @click="toggleReunion(reunion.id)"
          >
            <i
              class="fa-solid fa-chevron-down shrink-0 text-gray-400 transition-transform duration-300"
              :class="{ 'rotate-180': !collapsed.has(reunion.id) }"
              aria-hidden="true"
            ></i>
            <strong class="truncate text-lg text-gray-900 dark:text-white">{{
              reunion.title
            }}</strong>
            <span class="shrink-0 text-sm text-gray-600 dark:text-gray-400">{{
              formatDate(reunion.date)
            }}</span>
          </button>
          <div class="ml-2 flex shrink-0 gap-2">
            <button
              type="button"
              class="flex items-center gap-1 rounded-xl bg-rv-purple/10 px-3 py-1.5 text-sm font-semibold text-rv-purple transition-all hover:bg-rv-purple hover:text-white"
              title="Añadir punto"
              aria-label="Abrir puntos de la reunión"
              @click="emit('edit', reunion.id)"
            >
              <i class="fa-solid fa-plus" aria-hidden="true"></i
              ><span class="hidden sm:inline">Añadir</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-500 transition-all hover:bg-rv-purple/10 hover:text-rv-purple dark:bg-rv-darkSurface dark:text-gray-400"
              title="Recargar"
              aria-label="Recargar reunión"
              @click="refresh"
            >
              <i class="fa-solid fa-rotate-right" aria-hidden="true"></i
              ><span class="hidden sm:inline">Recargar</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1 rounded-xl bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-500 transition-all hover:bg-red-500 hover:text-white dark:bg-red-900/20 dark:text-red-400"
              title="Eliminar reunión"
              aria-label="Eliminar reunión"
              @click="confirmDelete(reunion)"
            >
              <i class="fa-regular fa-trash-can" aria-hidden="true"></i
              ><span class="hidden sm:inline">Borrar</span>
            </button>
          </div>
        </div>
        <div v-if="!collapsed.has(reunion.id)" class="space-y-2">
          <div
            v-for="point in reunion.points"
            :key="point.id"
            class="rounded-xl px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-rv-darkSurface"
            :class="point.done ? 'opacity-60' : ''"
          >
            <div class="flex items-start gap-2">
              <input
                :checked="Boolean(point.done)"
                type="checkbox"
                class="mt-1 shrink-0 cursor-pointer rounded"
                :aria-label="point.done ? `Reabrir ${point.title}` : `Completar ${point.title}`"
                :disabled="mutations.updatePointMutation.isPending.value"
                @change="toggleDone(reunion.id, point, $event)"
              />
              <button
                type="button"
                class="min-w-0 flex-1 cursor-pointer text-left"
                @click="togglePoint(point.id)"
              >
                <span
                  class="block text-sm font-medium text-gray-900 dark:text-white"
                  :class="point.done ? 'text-gray-400 line-through dark:text-gray-500' : ''"
                  >{{ point.title }}</span
                >
              </button>
              <button
                type="button"
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-rv-purple/10 hover:text-rv-purple dark:bg-rv-darkSurface"
                title="Editar punto"
                :aria-label="`Editar ${point.title}`"
                @click="emit('edit', reunion.id)"
              >
                <i class="fa-solid fa-edit" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:bg-rv-darkSurface dark:hover:bg-red-900/20"
                title="Eliminar punto"
                :aria-label="`Eliminar ${point.title}`"
                @click="confirmDeletePoint(point)"
              >
                <i class="fa-solid fa-trash" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="mt-1 shrink-0 text-xs text-gray-400"
                :aria-label="
                  expandedPoint === point.id ? `Ocultar ${point.title}` : `Mostrar ${point.title}`
                "
                @click="togglePoint(point.id)"
              >
                <i
                  class="fa-solid"
                  :class="expandedPoint === point.id ? 'fa-chevron-up' : 'fa-chevron-down'"
                  aria-hidden="true"
                ></i>
              </button>
            </div>
            <p
              v-if="expandedPoint === point.id"
              class="ml-6 mt-2 whitespace-pre-line border-t border-gray-200 pt-2 text-xs text-gray-700 dark:border-white/10 dark:text-gray-300"
            >
              {{ point.content }}
            </p>
          </div>
          <p
            v-if="reunion.points.length === 0"
            class="py-4 text-center text-sm text-gray-400 dark:text-gray-500"
          >
            No hay puntos
          </p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import SwalService from "@services/swal/SwalService";
import { useReunionsMutations } from "../../application/useReunionsMutations";
import type { Point, Reunion } from "../../types/reunions";

defineProps<{ title: string; reuniones: Reunion[] }>();
const emit = defineEmits<{ edit: [id: string]; refresh: [] }>();
const auth = useAuthStore();
const mutations = useReunionsMutations({
  userId: () => auth.userId,
  generation: () => auth.authSessionGeneration,
  role: () => auth.role,
});
const collapsed = shallowRef(new Set<string>());
const expandedPoint = shallowRef<string | null>(null);

function toggleReunion(id: string) {
  const next = new Set(collapsed.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  collapsed.value = next;
}

function togglePoint(id: string) {
  expandedPoint.value = expandedPoint.value === id ? null : id;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function refresh() {
  emit("refresh");
}

async function confirmDelete(reunion: Reunion) {
  const result = await SwalService.confirm(
    "¿Eliminar reunión?",
    `Vas a eliminar «${reunion.title}» y todos sus puntos. Esta acción no se puede deshacer.`,
    "Sí, eliminar",
    "Cancelar"
  );
  if (!result.isConfirmed) return;
  try {
    await mutations.deleteReunionMutation.mutateAsync(reunion.id);
    SwalService.success("Reunión eliminada");
  } catch {
    SwalService.error("No se pudo eliminar la reunión.");
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
    await mutations.deletePointMutation.mutateAsync(point.id);
    SwalService.success("Punto eliminado con éxito.");
  } catch {
    SwalService.error("No se pudo eliminar el punto.");
  }
}

async function toggleDone(_reunionId: string, point: Point, event: Event) {
  try {
    await mutations.updatePointMutation.mutateAsync({
      id: point.id,
      dto: { done: (event.target as HTMLInputElement).checked },
    });
  } catch {
    SwalService.error("No se pudo actualizar el estado del punto.");
  }
}
</script>
