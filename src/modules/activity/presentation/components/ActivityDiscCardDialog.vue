<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import DiscCard from "@components/DiscCardComponent.vue";
import {
  activityDiscCardQueryKey,
  activityDiscCardStaleTime,
  fetchActivityDiscCard,
} from "../../application/activityDiscCardQuery";
import { toActivityDiscCardProps } from "../../application/activityDiscCard";

const props = defineProps<{ discId: string }>();
const emit = defineEmits<{ close: [] }>();
const authStore = useAuthStore();
const closeButton = ref<HTMLButtonElement | null>(null);
const dialogElement = ref<HTMLElement | null>(null);
const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
const previousBodyOverflow = document.body.style.overflow;
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
  document.body.style.overflow = "hidden";
  dialogElement.value?.addEventListener("keydown", onKeydown);
  closeButton.value?.focus();
});

onBeforeUnmount(() => {
  dialogElement.value?.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = previousBodyOverflow;
  if (opener?.isConnected) opener.focus();
});
</script>

<template>
  <div class="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-3 sm:items-center sm:p-6">
    <section
      ref="dialogElement"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-disc-card-title"
      tabindex="-1"
      class="relative my-2 w-full max-w-xl rounded-xl bg-gray-50 p-4 text-gray-900 shadow-xl dark:bg-rv-darkBg dark:text-white sm:my-6 sm:p-6"
    >
      <div class="mb-4 flex items-center justify-between gap-4">
        <h2 id="activity-disc-card-title" class="text-lg font-semibold">Ficha del disco</h2>
        <button
          ref="closeButton"
          type="button"
          class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-blueDark dark:border-white/20 dark:text-white dark:hover:bg-white/10 dark:focus-visible:outline-rv-pink"
          aria-label="Cerrar ficha del disco"
          @click="close"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <p v-if="query.isPending.value" role="status" aria-live="polite" aria-busy="true" class="py-8 text-center text-sm text-gray-600 dark:text-gray-300">
        Cargando la ficha del disco…
      </p>
      <div v-else-if="query.isError.value" role="alert" class="py-5 text-sm text-red-700 dark:text-red-300">
        <p>No se pudo cargar la ficha del disco.</p>
        <button
          type="button"
          class="mt-3 rounded-lg border border-gray-300 px-3 py-2 font-semibold text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-blueDark dark:border-white/20 dark:text-white dark:hover:bg-white/10 dark:focus-visible:outline-rv-pink"
          @click="query.refetch()"
        >
          Reintentar
        </button>
      </div>
      <DiscCard v-else-if="cardProps" v-bind="cardProps" />
    </section>
  </div>
</template>
