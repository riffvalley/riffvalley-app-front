<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import DiscCard from "@components/DiscCardComponent.vue";
import { usePageScrollLock } from "@/composables/usePageScrollLock";
import {
  activityDiscCardQueryKey,
  activityDiscCardStaleTime,
  fetchActivityDiscCard,
} from "../../application/activityDiscCardQuery";
import { toActivityDiscCardProps } from "../../application/activityDiscCard";

const props = defineProps<{ discId: string }>();
const emit = defineEmits<{ close: []; updated: [] }>();
const authStore = useAuthStore();
const closeButton = ref<HTMLButtonElement | null>(null);
const dialogElement = ref<HTMLElement | null>(null);
const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
// Bloquea el scroll de la página de detrás mientras el modal está abierto.
usePageScrollLock();
const queryKey = computed(() =>
  activityDiscCardQueryKey(props.discId, authStore.userId, authStore.authSessionGeneration),
);
const query = useQuery({
  queryKey,
  enabled: computed(() =>
    authStore.authStatus === "authenticated" && authStore.isAuthenticated && Boolean(props.discId),
  ),
  queryFn: async ({ queryKey: requestedKey, signal }) => {
    const [, , requestedDiscId, requestedUserId, requestedGeneration] = requestedKey;
    return fetchActivityDiscCard(
      requestedDiscId,
      requestedUserId,
      requestedGeneration,
      authStore,
      signal,
    );
  },
  staleTime: activityDiscCardStaleTime,
});
const cardProps = computed(() => {
  const details = query.data.value;
  return details ? toActivityDiscCardProps(details.disc, details.rates, details.userId) : null;
});

function close(): void {
  emit("close");
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    // Que Escape cierre solo esta ficha y no el modal que la abrió debajo.
    event.stopPropagation();
    close();
    return;
  }
  if (event.key !== "Tab") return;

  const dialog = dialogElement.value;
  if (!dialog) return;
  const focusable = [...dialog.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.tabIndex >= 0 && !element.hasAttribute("hidden"));
  if (!focusable.length) {
    event.preventDefault();
    closeButton.value?.focus();
    return;
  }
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  dialogElement.value?.addEventListener("keydown", onKeydown);
  closeButton.value?.focus();
});

onBeforeUnmount(() => {
  dialogElement.value?.removeEventListener("keydown", onKeydown);
  if (opener?.isConnected) opener.focus();
});
</script>

<template>
  <!-- `m-auto` en la tarjeta la centra también en móvil (a mano del pulgar) sin recortarla si no cabe en pantalla. -->
  <div class="fixed inset-0 z-[60] flex overflow-y-auto bg-black/60 p-6 backdrop-blur-sm" data-test="activity-disc-card-overlay" @click.self="close">
    <!-- Sin marco propio: la tarjeta flota sola y el botón de cerrar estándar de los modales se apoya en su esquina. -->
    <section
      ref="dialogElement"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-disc-card-title"
      tabindex="-1"
      class="relative m-auto w-full max-w-[20rem] text-gray-900 focus:outline-none dark:text-white"
    >
      <h2 id="activity-disc-card-title" class="sr-only">Ficha del disco</h2>
      <button
        ref="closeButton"
        type="button"
        class="absolute -right-5 -top-5 z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-rv-navy p-0 text-white shadow-md transition hover:bg-rv-pink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink"
        aria-label="Cerrar ficha del disco"
        @click="close"
      >
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>

      <p v-if="query.isPending.value" role="status" aria-live="polite" aria-busy="true" class="rounded-xl bg-white px-4 py-8 text-center text-sm text-gray-600 shadow-xl dark:bg-rv-darkCard dark:text-gray-300">
        Cargando la ficha del disco…
      </p>
      <div v-else-if="query.isError.value" role="alert" class="rounded-xl bg-white px-4 py-5 text-sm text-red-700 shadow-xl dark:bg-rv-darkCard dark:text-red-300">
        <p>No se pudo cargar la ficha del disco.</p>
        <button
          type="button"
          class="mt-3 rounded-lg border border-gray-300 px-3 py-2 font-semibold text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-blueDark dark:border-white/20 dark:text-white dark:hover:bg-white/10 dark:focus-visible:outline-rv-pink"
          @click="query.refetch()"
        >
          Reintentar
        </button>
      </div>
      <DiscCard v-else-if="cardProps" v-bind="cardProps" @card-updated="emit('updated')" />
    </section>
  </div>
</template>
