import { beforeEach, describe, expect, it, vi } from "vitest";
import { albumLinksApi } from "../../src/integrations/spotify/infrastructure/albumLinksApi";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { get } }));

describe("album links API adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves an album through the backend and maps its link and cover", async () => {
    get.mockResolvedValueOnce({ data: {
      listenUrl: "https://open.spotify.com/album/album-1",
      coverUrl: "https://images.test/cover.jpg",
    } });
    const session = await albumLinksApi.openSession();

    await expect(session?.findAlbum({ albumName: "Disco", artistName: "Artista" })).resolves.toEqual({
      status: "found",
      link: "https://open.spotify.com/album/album-1",
      image: "https://images.test/cover.jpg",
    });
    expect(get).toHaveBeenCalledWith("/discs/spotify/album", {
      params: { albumName: "Disco", artistName: "Artista" },
    });
  });

  it("maps backend 404 to not-found", async () => {
    get.mockRejectedValueOnce({ response: { status: 404 } });
    const session = await albumLinksApi.openSession();

    await expect(session?.findAlbum({ albumName: "Ausente", artistName: "Artista" }))
      .resolves.toEqual({ status: "not-found" });
  });

  it("maps backend errors to failed", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    get.mockRejectedValueOnce({ response: { status: 502 } });
    const session = await albumLinksApi.openSession();

    await expect(session?.findAlbum({ albumName: "Disco", artistName: "Artista" }))
      .resolves.toEqual({ status: "failed" });
    log.mockRestore();
  });

  it("maps missing optional fields to the existing neutral values", async () => {
    get.mockResolvedValueOnce({ data: {} });
    const session = await albumLinksApi.openSession();

    await expect(session?.findAlbum({ albumName: "Disco", artistName: "Artista" })).resolves.toEqual({
      status: "found",
      link: "",
      image: null,
    });
  });
});
