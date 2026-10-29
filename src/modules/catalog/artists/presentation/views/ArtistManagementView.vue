<template>
  <div class="px-3 py-5 sm:px-6 max-w-5xl mx-auto">
    <div ref="scrollSentinel" class="h-px w-full"></div>

    <div v-if="isSuperadmin" class="mb-5 flex justify-end">
      <button
        type="button"
        :disabled="isLoadingPreview || isFillingImages"
        :aria-busy="isLoadingPreview || isFillingImages"
        @click="fillAllImages"
        class="inline-flex items-center gap-2 rounded-xl border border-green-700 bg-white px-3 py-2 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:border-green-400 dark:bg-rv-darkCard dark:text-green-400 dark:hover:bg-green-950/30 dark:focus-visible:ring-offset-rv-darkBg"
        title="Buscar en Spotify imágenes para artistas sin foto"
      >
        <i class="fa-brands fa-spotify" aria-hidden="true"></i>
        <span aria-live="polite">
          {{ isLoadingPreview ? "Consultando…" : isFillingImages ? "Procesando…" : "Rellenar imágenes" }}
        </span>
      </button>
    </div>

    <p v-if="fillError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/50 dark:bg-red-950/30 dark:text-red-200" role="alert">
      {{ fillError }}
    </p>

    <ArtistImageFillProgress
      v-if="fillPreview && (isFillingImages || isFillComplete || isFillStopped || fillSummary.batches > 0)"
      :processed="fillSummary.processed"
      :total="fillPreview.eligible"
      :percent="fillProgressPercent"
      :batch="isFillComplete ? fillSummary.batches : currentFillBatch"
      :images-added="fillSummary.updated"
      :not-found="fillSummary.notFound"
      :ambiguous="fillSummary.ambiguous"
      :errors="fillSummary.failed"
      :concurrent-updates="fillSummary.concurrentUpdates"
      :running="isFillingImages"
      :stopped="isFillStopped"
      :failed="Boolean(fillError)"
      :complete="isFillComplete"
      @stop="stopFillingImages"
    />

    <ArtistDirectory />

    <Transition name="scroll-top-fade">
      <button
        v-if="showScrollTop"
        type="button"
        @click="scrollToTop"
        class="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-rv-pink text-white shadow-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink focus-visible:ring-offset-2"
        aria-label="Volver arriba"
      >
        <i class="fa-solid fa-chevron-up text-sm" aria-hidden="true"></i>
      </button>
    </Transition>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onMounted,
  onUnmounted,
  ref,
} from "vue";
import Swal from "sweetalert2";
import { useQueryClient } from "@tanstack/vue-query";
import { hasMinimumRole } from "@/modules/identity/shared";
import { useAuthStore } from "@/modules/identity/auth";
import { useArtistImageFill } from "@/modules/catalog/artists/application/useArtistImageFill";
import { artistDirectoryQueryKey } from "@/modules/catalog/artists/application/useArtistDirectory";
import ArtistImageFillProgress from "@/modules/catalog/artists/presentation/components/ArtistImageFillProgress.vue";
import ArtistDirectory from "@/modules/catalog/artists/presentation/components/ArtistDirectory.vue";

export default defineComponent({
  name: "ArtistManagement",
  components: { ArtistDirectory, ArtistImageFillProgress },
  setup() {
    const authStore = useAuthStore();
    const queryClient = useQueryClient();
    const imageFill = useArtistImageFill();
    const isSuperadmin = computed(() =>
      hasMinimumRole(authStore.role, "superadmin"),
    );

    const fillAllImages = async () => {
      try {
        if (!isSuperadmin.value || imageFill.isRunning.value || imageFill.isLoadingPreview.value) return;
        const preview = await imageFill.loadPreview();
        if (preview.eligible === 0) {
          await Swal.fire({
            icon: "info",
            title: "No hay artistas pendientes de imagen",
            timer: 2500,
            showConfirmButton: false,
            toast: true,
            position: "top-end",
          });
          return;
        }

        const confirmation = await Swal.fire({
          title: "¿Rellenar imágenes automáticamente?",
          text: `Hay ${preview.eligible} artistas pendientes. Se estiman ${preview.estimatedBatches} lotes de hasta ${preview.batchSize} artistas.`,
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#22c55e",
          cancelButtonColor: "#6b7280",
          confirmButtonText: "Sí, rellenar",
          cancelButtonText: "Cancelar",
        });
        if (!confirmation.isConfirmed || !isSuperadmin.value) return;

        await imageFill.start(preview);
        if (imageFill.summary.value.processed > 0) {
          await queryClient.invalidateQueries({ queryKey: artistDirectoryQueryKey });
        }
      } catch (cause) {
        if (
          cause instanceof Error &&
          (cause.name === "AbortError" || cause.name === "CanceledError")
        ) return;
        await Swal.fire({
          icon: "error",
          title: "No se pudo consultar el proceso de imágenes",
          text: "Inténtalo de nuevo más tarde.",
          timer: 3000,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
      }
    };

    const showScrollTop = ref(false);
    const scrollSentinel = ref<HTMLElement | null>(null);
    let sentinelObserver: IntersectionObserver | null = null;

    const scrollToTop = () => {
      let element: Element | null = scrollSentinel.value?.parentElement ?? null;
      while (element) {
        if (element.scrollTop > 0) {
          element.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        if (element === document.documentElement) break;
        element = element.parentElement;
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    onMounted(() => {
      if (typeof IntersectionObserver === "undefined") return;
      sentinelObserver = new IntersectionObserver(
        ([entry]) => {
          showScrollTop.value = !entry.isIntersecting;
        },
        { threshold: 0 },
      );
      if (scrollSentinel.value) sentinelObserver.observe(scrollSentinel.value);
    });

    onUnmounted(() => sentinelObserver?.disconnect());

    return {
      fillAllImages,
      currentFillBatch: imageFill.currentBatch,
      fillError: imageFill.error,
      fillPreview: imageFill.preview,
      fillProgressPercent: imageFill.progressPercent,
      fillSummary: imageFill.summary,
      isFillComplete: imageFill.isComplete,
      isFillingImages: imageFill.isRunning,
      isFillStopped: imageFill.isStopped,
      isLoadingPreview: imageFill.isLoadingPreview,
      isSuperadmin,
      scrollSentinel,
      scrollToTop,
      showScrollTop,
      stopFillingImages: imageFill.stop,
    };
  },
});
</script>

<style scoped>
.scroll-top-fade-enter-active,
.scroll-top-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.scroll-top-fade-enter-from,
.scroll-top-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
