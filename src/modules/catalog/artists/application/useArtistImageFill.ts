import { computed, onScopeDispose, readonly, shallowRef } from "vue";
import {
  fillArtistImages,
  previewArtistImageFill,
} from "../api/artistImageFill";
import type {
  ArtistImageFillBatchResult,
  ArtistImageFillOutcome,
  ArtistImageFillPreview,
  ArtistImageFillResultItem,
} from "../types/artistApi";

const MAX_BATCH_SIZE = 10;

interface ArtistImageFillSummary {
  processed: number;
  updated: number;
  notFound: number;
  ambiguous: number;
  failed: number;
  concurrentUpdates: number;
  batches: number;
}

const emptySummary = (): ArtistImageFillSummary => ({
  processed: 0,
  updated: 0,
  notFound: 0,
  ambiguous: 0,
  failed: 0,
  concurrentUpdates: 0,
  batches: 0,
});

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function validatePreview(preview: ArtistImageFillPreview): void {
  if (
    !isNonNegativeInteger(preview.eligible) ||
    !Number.isInteger(preview.batchSize) ||
    preview.batchSize < 1 ||
    preview.batchSize > MAX_BATCH_SIZE ||
    !isNonNegativeInteger(preview.estimatedBatches) ||
    preview.estimatedBatches !== Math.ceil(preview.eligible / preview.batchSize) ||
    (preview.eligible > 0 && !preview.startCursor)
  ) {
    throw new Error("La respuesta de preview de imágenes no es válida.");
  }
}

function validateBatch(
  batch: ArtistImageFillBatchResult,
  cursor: string | null,
  batchSize: number,
): void {
  const counts = [
    batch.updated,
    batch.notFound,
    batch.ambiguous,
    batch.failed,
    batch.concurrentUpdates,
  ];
  const resultCounts: Record<ArtistImageFillOutcome, number> = {
    updated: 0,
    not_found: 0,
    ambiguous: 0,
    failed: 0,
    concurrent_update: 0,
  };
  if (!Array.isArray(batch.results)) {
    throw new Error("El lote de imágenes devolvió resultados no válidos.");
  }
  for (const result of batch.results) {
    if (
      !result ||
      typeof result.artistId !== "string" ||
      !result.artistId ||
      !Object.hasOwn(resultCounts, result.outcome)
    ) {
      throw new Error("El lote de imágenes devolvió un resultado desconocido.");
    }
    resultCounts[result.outcome]++;
  }

  const countsMatchResults =
    resultCounts.updated === batch.updated &&
    resultCounts.not_found === batch.notFound &&
    resultCounts.ambiguous === batch.ambiguous &&
    resultCounts.failed === batch.failed &&
    resultCounts.concurrent_update === batch.concurrentUpdates;
  if (
    !isNonNegativeInteger(batch.processed) ||
    batch.processed > batchSize ||
    !counts.every(isNonNegativeInteger) ||
    batch.processed !== batch.results.length ||
    batch.processed !== counts.reduce((total, count) => total + count, 0) ||
    !countsMatchResults ||
    typeof batch.hasMore !== "boolean"
  ) {
    throw new Error("El lote de imágenes devolvió agregados incoherentes.");
  }
  if (
    (batch.hasMore &&
      (!batch.nextCursor || batch.nextCursor === cursor || batch.processed === 0)) ||
    (!batch.hasMore && batch.nextCursor !== null)
  ) {
    throw new Error("El lote de imágenes devolvió un cursor de continuación no válido.");
  }
}

export function useArtistImageFill() {
  const preview = shallowRef<ArtistImageFillPreview | null>(null);
  const summary = shallowRef<ArtistImageFillSummary>(emptySummary());
  const results = shallowRef<ArtistImageFillResultItem[]>([]);
  const isLoadingPreview = shallowRef(false);
  const isRunning = shallowRef(false);
  const isComplete = shallowRef(false);
  const isStopped = shallowRef(false);
  const error = shallowRef<string | null>(null);
  const requestController = shallowRef<AbortController | null>(null);
  let disposed = false;

  const progressPercent = computed(() => {
    if (isComplete.value) return 100;
    const total = preview.value?.eligible ?? 0;
    if (total === 0) return 0;
    return Math.min(99, Math.floor((summary.value.processed / total) * 100));
  });
  const currentBatch = computed(() => summary.value.batches + 1);

  async function loadPreview(): Promise<ArtistImageFillPreview> {
    const controller = new AbortController();
    requestController.value = controller;
    isLoadingPreview.value = true;
    error.value = null;
    preview.value = null;
    summary.value = emptySummary();
    results.value = [];
    isComplete.value = false;
    isStopped.value = false;
    try {
      const response = await previewArtistImageFill(controller.signal);
      validatePreview(response);
      if (!disposed && !controller.signal.aborted) preview.value = response;
      return response;
    } catch (cause) {
      if (!disposed && !controller.signal.aborted) {
        error.value = cause instanceof Error ? cause.message : "No se pudo consultar el preview.";
      }
      throw cause;
    } finally {
      if (!disposed) {
        isLoadingPreview.value = false;
        if (requestController.value === controller) requestController.value = null;
      }
    }
  }

  async function start(previewResponse: ArtistImageFillPreview): Promise<void> {
    validatePreview(previewResponse);
    if (isRunning.value || disposed || previewResponse.eligible === 0) return;
    preview.value = previewResponse;
    summary.value = emptySummary();
    results.value = [];
    error.value = null;
    isStopped.value = false;
    isComplete.value = false;
    isRunning.value = true;

    const controller = new AbortController();
    requestController.value = controller;
    let cursor = previewResponse.startCursor;
    try {
      while (!disposed && !controller.signal.aborted) {
        const batch = await fillArtistImages(
          { cursor, batchSize: previewResponse.batchSize },
          controller.signal,
        );
        if (disposed || controller.signal.aborted) return;
        validateBatch(batch, cursor, previewResponse.batchSize);

        summary.value = {
          processed: summary.value.processed + batch.processed,
          updated: summary.value.updated + batch.updated,
          notFound: summary.value.notFound + batch.notFound,
          ambiguous: summary.value.ambiguous + batch.ambiguous,
          failed: summary.value.failed + batch.failed,
          concurrentUpdates: summary.value.concurrentUpdates + batch.concurrentUpdates,
          batches: summary.value.batches + 1,
        };
        results.value = [...results.value, ...batch.results];

        if (!batch.hasMore) {
          isComplete.value = true;
          break;
        }
        cursor = batch.nextCursor;
      }
    } catch (cause) {
      if (disposed) return;
      if (controller.signal.aborted) {
        isStopped.value = true;
      } else {
        error.value = cause instanceof Error ? cause.message : "Error al procesar un lote de imágenes.";
      }
    } finally {
      if (!disposed) {
        isRunning.value = false;
        if (requestController.value === controller) requestController.value = null;
      }
    }
  }

  function stop(): void {
    if (!isRunning.value) return;
    isStopped.value = true;
    requestController.value?.abort();
  }

  onScopeDispose(() => {
    disposed = true;
    requestController.value?.abort();
  });

  return {
    preview: readonly(preview),
    summary: readonly(summary),
    results: readonly(results),
    isLoadingPreview: readonly(isLoadingPreview),
    isRunning: readonly(isRunning),
    isComplete: readonly(isComplete),
    isStopped: readonly(isStopped),
    error: readonly(error),
    progressPercent,
    currentBatch,
    loadPreview,
    start,
    stop,
  };
}
