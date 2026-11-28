<script setup lang="ts">
import { computed, inject, ref, watch } from "vue";
import { discCardDialogKey } from "@/composables/discCardDialog";
import { useAuthStore } from "@/modules/identity/auth";
import { getDiscRates } from "@services/rates/rates";

/**
 * «Votar disco» / «Editar nota» en las tarjetas del Calendario: el mismo botón y la
 * misma ficha votable que en el modal de Artistas. Solo aparece si el disco ya ha salido.
 */
const props = withDefaults(
  defineProps<{
    disc: { id: string; name: string; releaseDate: string | Date; userRate?: unknown };
    /** Tarjeta pintada con el color del género (Calendario baby): borde y texto blancos. */
    tinted?: boolean;
    /** «md» iguala la altura de los botones de acción del Calendario completo. */
    size?: "sm" | "md";
  }>(),
  { tinted: false, size: "sm" },
);

const discCardDialog = inject(discCardDialogKey, null);
const authStore = useAuthStore();
const rated = ref(Boolean(props.disc.userRate));
watch(
  () => props.disc.userRate,
  (value) => (rated.value = Boolean(value)),
);

// Se compara solo el día (en hora local): un disco de hoy ya se puede votar.
function dayKey(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
const released = computed(() => {
  if (!props.disc.releaseDate) return false;
  return dayKey(props.disc.releaseDate) <= dayKey(new Date());
});

async function refreshRated(): Promise<void> {
  try {
    const rates = await getDiscRates(props.disc.id);
    rated.value = rates.some((rate) => rate.user?.id === authStore.userId);
  } catch {
    // Si no se puede comprobar, lo más probable tras cambiar algo es que haya nota.
    rated.value = true;
  }
}

function openVoteCard(): void {
  discCardDialog?.open(props.disc.id, {
    onClose: (changed) => {
      if (changed) void refreshRated();
    },
  });
}

const buttonClass = computed(() => [
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border bg-transparent font-semibold transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1",
  props.size === "md" ? "px-3 py-1.5 text-xs" : "px-2 py-0.5 text-[11px]",
  props.tinted
    ? "border-white/50 text-white hover:border-white hover:bg-white/25 focus-visible:outline-white"
    : "border-gray-300 text-gray-600 hover:border-rv-pink hover:bg-rv-pink hover:text-white focus-visible:outline-rv-pink dark:border-white/20 dark:text-gray-300 dark:hover:border-rv-pink dark:hover:text-white",
]);
</script>

<template>
  <button
    v-if="discCardDialog && released"
    type="button"
    :class="buttonClass"
    :aria-label="`${rated ? 'Editar tu nota de' : 'Votar'} ${disc.name}`"
    aria-haspopup="dialog"
    data-test="calendar-disc-vote"
    @click="openVoteCard"
  >
    {{ rated ? "Editar nota" : "Votar disco" }}
    <i class="fa-solid fa-arrow-right text-[9px] opacity-70" aria-hidden="true"></i>
  </button>
</template>
