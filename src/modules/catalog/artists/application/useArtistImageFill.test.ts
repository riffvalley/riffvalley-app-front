import { effectScope, nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fillArtistImages, previewArtistImageFill } = vi.hoisted(() => ({
  fillArtistImages: vi.fn(),
  previewArtistImageFill: vi.fn(),
}));
vi.mock("../api/artistImageFill", () => ({ fillArtistImages, previewArtistImageFill }));

import { useArtistImageFill } from "./useArtistImageFill";

const preview = (eligible = 11, startCursor: string | null = "cursor-0") => ({
  eligible,
  batchSize: 10,
  estimatedBatches: Math.ceil(eligible / 10),
  startCursor,
});

function batch(
  outcomes: Array<"updated" | "not_found" | "ambiguous" | "failed" | "concurrent_update">,
  nextCursor: string | null,
  hasMore: boolean,
) {
  const counts = {
    updated: outcomes.filter((item) => item === "updated").length,
    notFound: outcomes.filter((item) => item === "not_found").length,
    ambiguous: outcomes.filter((item) => item === "ambiguous").length,
    failed: outcomes.filter((item) => item === "failed").length,
    concurrentUpdates: outcomes.filter((item) => item === "concurrent_update").length,
  };
  return {
    processed: outcomes.length,
    ...counts,
    results: outcomes.map((outcome, index) => ({ artistId: `artist-${index}`, outcome })),
    nextCursor,
    hasMore,
  };
}

function createFill() {
  const scope = effectScope();
  const fill = scope.run(() => useArtistImageFill())!;
  return { fill, scope };
}

describe("useArtistImageFill", () => {
  beforeEach(() => {
    fillArtistImages.mockReset();
    previewArtistImageFill.mockReset();
  });

  it("loads preview, sends no batch for zero artists and rejects a limit above backend maximum", async () => {
    const { fill, scope } = createFill();
    previewArtistImageFill.mockResolvedValueOnce(preview(0, null));
    await expect(fill.loadPreview()).resolves.toMatchObject({ eligible: 0 });
    await fill.start(preview(0, null));
    expect(fillArtistImages).not.toHaveBeenCalled();

    await expect(fill.start({ ...preview(), batchSize: 11 })).rejects.toThrow("preview");
    scope.stop();
  });

  it("processes multiple cursors sequentially, accumulates results and completes at 100 percent", async () => {
    const { fill, scope } = createFill();
    let resolveFirst!: (value: ReturnType<typeof batch>) => void;
    let resolveSecond!: (value: ReturnType<typeof batch>) => void;
    fillArtistImages
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

    const running = fill.start(preview());
    expect(fillArtistImages).toHaveBeenCalledTimes(1);
    resolveFirst(batch(["updated", "not_found", "ambiguous", "failed", "concurrent_update", "updated", "not_found", "ambiguous", "failed", "not_found"], "cursor-1", true));
    await Promise.resolve();
    expect(fillArtistImages).toHaveBeenCalledTimes(2);
    expect(fill.summary.value.processed).toBe(10);
    expect(fill.progressPercent.value).toBe(90);
    expect(fill.currentBatch.value).toBe(2);

    resolveSecond(batch(["updated"], null, false));
    await running;
    await nextTick();
    expect(fillArtistImages).toHaveBeenNthCalledWith(1, { cursor: "cursor-0", batchSize: 10 }, expect.any(AbortSignal));
    expect(fillArtistImages).toHaveBeenNthCalledWith(2, { cursor: "cursor-1", batchSize: 10 }, expect.any(AbortSignal));
    expect(fill.summary.value).toMatchObject({ processed: 11, updated: 3, notFound: 3, ambiguous: 2, failed: 2, concurrentUpdates: 1, batches: 2 });
    expect(fill.results.value).toHaveLength(11);
    expect(fill.progressPercent.value).toBe(100);
    expect(fill.isComplete.value).toBe(true);
    scope.stop();
  });

  it("preserves partial progress and stops before requesting a continuation", async () => {
    const { fill, scope } = createFill();
    let resolveFirst!: (value: ReturnType<typeof batch>) => void;
    fillArtistImages.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
    const running = fill.start(preview());
    fill.stop();
    resolveFirst(batch(["updated"], "cursor-1", true));
    await running;
    expect(fillArtistImages).toHaveBeenCalledTimes(1);
    expect(fill.isStopped.value).toBe(true);
    expect(fill.progressPercent.value).not.toBe(100);
    expect(fill.summary.value.processed).toBe(0);
    scope.stop();
  });

  it("stops on HTTP errors, repeated cursors and incoherent batch results without retrying", async () => {
    const { fill, scope } = createFill();
    fillArtistImages.mockRejectedValueOnce(new Error("HTTP 503"));
    await fill.start(preview());
    expect(fillArtistImages).toHaveBeenCalledTimes(1);
    expect(fill.error.value).toContain("503");
    expect(fill.progressPercent.value).toBe(0);
    scope.stop();

    const repeated = createFill();
    fillArtistImages.mockResolvedValueOnce(batch(["updated"], "cursor-0", true));
    await repeated.fill.start(preview());
    expect(fillArtistImages).toHaveBeenCalledTimes(2);
    expect(repeated.fill.error.value).toContain("cursor");
    expect(repeated.fill.summary.value.processed).toBe(0);
    repeated.scope.stop();

    const incoherent = createFill();
    fillArtistImages.mockResolvedValueOnce({ ...batch(["updated"], null, false), processed: 2 });
    await incoherent.fill.start(preview());
    expect(fillArtistImages).toHaveBeenCalledTimes(3);
    expect(incoherent.fill.error.value).toContain("incoherentes");
    expect(incoherent.fill.isComplete.value).toBe(false);
    incoherent.scope.stop();
  });

  it("does not mutate state or request another batch after the scope is disposed", async () => {
    const { fill, scope } = createFill();
    let resolvePending!: (value: ReturnType<typeof batch>) => void;
    let requestSignal!: AbortSignal;
    fillArtistImages.mockImplementationOnce((...args) => {
      requestSignal = args[1];
      return new Promise((resolve) => { resolvePending = resolve; });
    });
    const running = fill.start(preview());
    scope.stop();
    expect(requestSignal.aborted).toBe(true);
    resolvePending(batch(["updated"], "cursor-1", true));
    await running;
    expect(fillArtistImages).toHaveBeenCalledTimes(1);
  });
});
