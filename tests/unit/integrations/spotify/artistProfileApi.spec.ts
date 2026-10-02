import { beforeEach, describe, expect, it, vi } from "vitest";
import { artistProfileApi } from "../../../../src/integrations/spotify/infrastructure/artistProfileApi";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { get } }));

describe("artistProfileApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the profile genres from the Riff Valley artist search endpoint", async () => {
    get.mockResolvedValueOnce({ data: { genres: ["rock", "post-punk"] } });

    await expect(artistProfileApi.findArtistProfile({ artistName: "Banda" }))
      .resolves.toEqual({ status: "found", profile: { genres: ["rock", "post-punk"] } });
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/spotify/artists/search", {
      params: { artistName: "Banda" },
    });
  });

  it("returns not-found for an empty profile and failed for backend errors", async () => {
    get.mockResolvedValueOnce({ data: null });
    await expect(artistProfileApi.findArtistProfile({ artistName: "Desconocido" }))
      .resolves.toEqual({ status: "not-found" });

    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    get.mockRejectedValueOnce(new Error("backend down"));
    await expect(artistProfileApi.findArtistProfile({ artistName: "Banda" }))
      .resolves.toEqual({ status: "failed" });
    log.mockRestore();
    expect(get).toHaveBeenCalledTimes(2);
  });
});
