<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import { useBestAssignmentsQuery, useBestVotesQuery } from "../../application/bestDetailQueries";
import { useBestDetailMutations } from "../../application/useBestDetailMutations";
import type { UserDiscRateListItem } from "@services/rates/rates";
import SwalService from "@services/swal/SwalService";

const props = withDefaults(defineProps<{ listId: string; date: string; active?: boolean }>(), {
  active: true,
});
const auth = useAuthStore();
const votesQuery = useBestVotesQuery(
  () => props.date,
  () => props.active
);
const assignmentsQuery = useBestAssignmentsQuery(() => props.listId);
const mutations = useBestDetailMutations(() => props.listId);
const votes = computed(() => votesQuery.data.value ?? []);
const assignments = computed(() => assignmentsQuery.data.value ?? []);
const monthLabel = computed(() => {
  const date = new Date(props.date);
  return Number.isNaN(date.getTime())
    ? "este periodo"
    : date.toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
});

function assignedTo(discId: string) {
  return assignments.value.find((assignment) => assignment.disc?.id === discId);
}

function formatRate(rate: string | number | null) {
  return rate == null ? "-" : Number.parseFloat(String(rate));
}

async function assignToMe(vote: UserDiscRateListItem) {
  if (!auth.userId) {
    SwalService.error("No se pudo identificar al usuario");
    return;
  }
  try {
    await mutations.assign({
      userId: auth.userId,
      discId: vote.disc.id,
      listId: props.listId,
      genre: vote.disc.genre?.name,
    });
    SwalService.success("Disco asignado a ti");
  } catch {
    SwalService.error("No se pudo asignar el disco");
  }
}
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Tus votos de discos (sin EPs) lanzados en
        <span class="font-semibold capitalize">{{ monthLabel }}</span
        >, de mayor a menor nota.
      </p>
      <span
        v-if="!votesQuery.isPending.value"
        class="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
        >{{ votes.length }} {{ votes.length === 1 ? "voto" : "votos" }}</span
      >
    </div>
    <div
      v-if="votesQuery.isPending.value"
      role="status"
      class="py-10 text-center text-gray-500 dark:text-gray-400"
    >
      <i class="fa-solid fa-spinner fa-spin mb-2 text-2xl" aria-hidden="true"></i>
      <p class="text-sm">Cargando tus votos…</p>
    </div>
    <div
      v-else-if="votesQuery.isError.value"
      role="alert"
      class="py-10 text-center text-sm text-red-600 dark:text-red-300"
    >
      No se pudieron cargar tus votos.
      <button type="button" class="underline" @click="votesQuery.refetch()">Reintentar</button>
    </div>
    <div
      v-else-if="!votes.length"
      class="rounded-3xl border-2 border-dashed border-gray-200 py-12 text-center text-gray-400 dark:border-white/10 dark:text-gray-500"
    >
      <i class="fa-regular fa-star mb-3 text-4xl opacity-30" aria-hidden="true"></i>
      <p class="text-sm font-medium">No has votado ningún disco de este mes.</p>
    </div>
    <ul v-else class="divide-y divide-gray-100 dark:divide-white/10">
      <li
        v-for="vote in votes"
        :key="vote.id"
        class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex min-w-0 items-center gap-3">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100 font-bold text-gray-400 dark:border-white/10 dark:bg-rv-darkSurface"
          >
            <img
              v-if="vote.disc.image"
              :src="vote.disc.image"
              :alt="vote.disc.name"
              class="h-full w-full object-cover"
            />
            <span v-else>{{ vote.disc.artist?.name?.charAt(0) }}</span>
          </div>
          <div class="min-w-0">
            <p
              class="truncate text-sm font-semibold text-gray-900 dark:text-white"
              :title="vote.disc.name"
            >
              {{ vote.disc.name }}
            </p>
            <div class="flex min-w-0 items-center gap-2">
              <p
                class="truncate text-xs text-gray-500 dark:text-gray-400"
                :title="vote.disc.artist?.name"
              >
                {{ vote.disc.artist?.name }}
              </p>
              <span
                v-if="vote.disc.genre"
                class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                :style="{ backgroundColor: vote.disc.genre.color || '#9ca3af' }"
                >{{ vote.disc.genre.name }}</span
              >
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3 sm:shrink-0">
          <span
            class="rounded-lg bg-amber-100 px-2.5 py-1 text-sm font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            title="Tu nota"
            ><i class="fa-solid fa-star mr-1 text-[10px]" aria-hidden="true"></i
            >{{ formatRate(vote.rate) }}</span
          >
          <span
            v-if="assignedTo(vote.disc.id)"
            class="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300"
            ><i class="fa-solid fa-check mr-1" aria-hidden="true"></i
            >{{
              assignedTo(vote.disc.id)?.user?.id === auth.userId
                ? "Asignado a ti"
                : `Asignado a ${assignedTo(vote.disc.id)?.user?.username ?? "otro usuario"}`
            }}</span
          >
          <button
            v-else
            type="button"
            :disabled="mutations.isPending.value"
            class="min-h-11 rounded-lg border-0 bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            @click="assignToMe(vote)"
          >
            Asignarme
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
