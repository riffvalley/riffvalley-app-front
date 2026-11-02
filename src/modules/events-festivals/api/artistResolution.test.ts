import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@services/api/api";
import type { ArtistResolutionResult } from "./entityResolutionContracts";
import { resolveArtistsBatch } from "./artistResolution";

vi.mock("@services/api/api", () => ({ default: { post: vi.fn() } }));

describe("resolveArtistsBatch", () => {
  beforeEach(() => vi.mocked(api.post).mockReset());

  it("posts the names and forwards cancellation, retaining legacy artist", async () => {
    const results: ArtistResolutionResult[] = [
      {
        index: 0,
        name: "Architects",
        status: "existing" as const,
        artist: { id: "artist-1", name: "Architects" },
        candidates: [],
      },
    ];
    const signal = new AbortController().signal;
    vi.mocked(api.post).mockResolvedValue({ data: { results } });

    await expect(resolveArtistsBatch(["Architects"], signal)).resolves.toEqual(results);
    expect(api.post).toHaveBeenCalledWith(
      "/artists/resolve-batch",
      { names: ["Architects"] },
      { signal }
    );
  });

  it("rejects batches over the endpoint limit without making a request", async () => {
    await expect(
      resolveArtistsBatch(Array.from({ length: 101 }, (_, index) => `Artist ${index}`))
    ).rejects.toThrow("como máximo 100");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("rejects a response that does not preserve one result per input", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { results: [] } });
    await expect(resolveArtistsBatch(["Architects"])).rejects.toThrow("un resultado por entrada");
  });

  it("retains null legacy artist for ambiguity and orders by index", async () => {
    const ambiguous: Extract<ArtistResolutionResult, { status: "ambiguous" }> = {
      index: 1,
      name: "Alias collision",
      status: "ambiguous" as const,
      code: "ARTIST_AMBIGUOUS" as const,
      artist: null,
      candidates: [
        { id: "artist-1", name: "Artist One" },
        { id: "artist-2", name: "Artist Two" },
      ],
    };
    const existing: Extract<ArtistResolutionResult, { status: "existing" }> = {
      index: 0,
      name: "Architects",
      status: "existing" as const,
      artist: { id: "artist-3", name: "Architects" },
      candidates: [],
    };
    vi.mocked(api.post).mockResolvedValue({ data: { results: [ambiguous, existing] } });

    await expect(resolveArtistsBatch(["Architects", "Alias collision"])).resolves.toEqual([
      existing,
      ambiguous,
    ]);
    expect(ambiguous.artist).toBeNull();
    expect(ambiguous.status).toBe("ambiguous");
  });

  it("rejects duplicate and out-of-range response indices", async () => {
    const result = (index: number): Extract<ArtistResolutionResult, { status: "new" }> => ({
      index,
      name: "New act",
      status: "new" as const,
      artist: null,
      candidates: [],
    });
    vi.mocked(api.post).mockResolvedValue({ data: { results: [result(0), result(0)] } });
    await expect(resolveArtistsBatch(["New act", "New act"])).rejects.toThrow("índices duplicados");

    vi.mocked(api.post).mockResolvedValue({ data: { results: [result(1)] } });
    await expect(resolveArtistsBatch(["New act"])).rejects.toThrow("fuera de rango");
  });
});
