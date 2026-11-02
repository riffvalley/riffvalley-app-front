import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@services/api/api";
import { resolveArtistsBatch } from "./artistResolution";

vi.mock("@services/api/api", () => ({ default: { post: vi.fn() } }));

describe("resolveArtistsBatch", () => {
  beforeEach(() => vi.mocked(api.post).mockReset());

  it("posts the names and forwards cancellation", async () => {
    const results = [{ name: "Architects", artist: { id: "artist-1", name: "Architects" } }];
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
    await expect(resolveArtistsBatch(["Architects"])).rejects.toThrow("no coincide");
  });
});
