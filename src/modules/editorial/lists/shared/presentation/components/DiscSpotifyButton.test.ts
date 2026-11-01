// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { error, resolveSpotifyAlbum } = vi.hoisted(() => ({
  error: vi.fn(),
  resolveSpotifyAlbum: vi.fn(),
}));

vi.mock("@services/swal/SwalService", () => ({ default: { error } }));
vi.mock("@services/spotify/spotifyLookup", () => ({ resolveSpotifyAlbum }));

import RadarDiscSpotifyButton from "./DiscSpotifyButton.vue";

describe("RadarDiscSpotifyButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSpotifyAlbum.mockResolvedValue({
      listenUrl: "https://open.spotify.com/album/resolved-album",
    });
  });

  it("opens the disc album URL directly when it is available", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const wrapper = mount(RadarDiscSpotifyButton, {
      props: {
        discName: "Album",
        artistName: "Artist",
        albumUrl: "https://open.spotify.com/album/direct-album",
      },
    });

    expect(wrapper.get("button").attributes("aria-label")).toBe("Abrir Album en Spotify");
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(open).toHaveBeenCalledWith(
      "https://open.spotify.com/album/direct-album",
      "_blank",
      "noopener,noreferrer"
    );
    expect(resolveSpotifyAlbum).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it("resolves Spotify by album and artist when no valid album link is stored", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const wrapper = mount(RadarDiscSpotifyButton, {
      props: { discName: "Album", artistName: "Artist", albumUrl: "https://bandcamp.com/album" },
    });

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(resolveSpotifyAlbum).toHaveBeenCalledWith("Album", "Artist");
    expect(open).toHaveBeenCalledWith(
      "https://open.spotify.com/album/resolved-album",
      "_blank",
      "noopener,noreferrer"
    );
    open.mockRestore();
  });

  it("reports when Spotify has no matching album", async () => {
    resolveSpotifyAlbum.mockResolvedValue(null);
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const wrapper = mount(RadarDiscSpotifyButton, {
      props: { discName: "Unknown Album", artistName: "Unknown Artist" },
    });

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(open).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("No se pudo encontrar el disco en Spotify.");
    open.mockRestore();
  });
});
