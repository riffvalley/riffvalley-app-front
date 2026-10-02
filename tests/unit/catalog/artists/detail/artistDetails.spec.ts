// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import ArtistDetail from "../../../../../src/components/ArtistDetail.vue";
import { artistDetailsApi } from "../../../../../src/integrations/spotify/infrastructure/artistDetailsApi";

const { get, fetchDetails, fetchBiography } = vi.hoisted(() => ({
  get: vi.fn(), fetchDetails: vi.fn(), fetchBiography: vi.fn(),
}));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { get } }));
vi.mock("@/app/dependencies/artistDetail", () => ({ fetchArtistDetails: fetchDetails }));
vi.mock("@/app/dependencies/artistBiography", () => ({ fetchArtistBiography: fetchBiography }));

const foundDetails = {
  artist: {
    name: "Banda de Spotify", imageUrl: "https://images.test/artist.jpg", genres: ["rock"],
    followers: 1200, popularity: 85, spotifyUrl: "https://open.spotify.com/artist/artist-1",
  },
  topTracks: [{
    id: "track-1", name: "Canción principal", albumName: "Disco", albumImageUrl: "https://images.test/album.jpg",
    previewUrl: "https://preview.test/track.mp3", spotifyUrl: "https://open.spotify.com/track/track-1", durationMs: 61000,
  }],
};

describe("Spotify artist detail integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps a complete profile and top tracks from the Riff Valley API", async () => {
    get.mockResolvedValueOnce({ data: {
      spotifyId: "artist-1", name: "Banda", imageUrl: "https://images.test/artist.jpg", genres: ["rock"],
      followers: 1200, popularity: 85, listenUrl: "https://open.spotify.com/artist/artist-1",
    } }).mockResolvedValueOnce({ data: [{
      id: "track-1", name: "Canción", albumName: "Disco", albumImageUrl: "https://images.test/album.jpg",
      previewUrl: "https://preview.test/track.mp3", listenUrl: "https://open.spotify.com/track/track-1", durationMs: 61000,
    }] });

    await expect(artistDetailsApi.findArtistDetails({ discName: "Disco Uno", artistName: "Artista Uno" }))
      .resolves.toEqual({ status: "found", details: {
        artist: { name: "Banda", imageUrl: "https://images.test/artist.jpg", genres: ["rock"], followers: 1200,
          popularity: 85, spotifyUrl: "https://open.spotify.com/artist/artist-1" },
        topTracks: [{ id: "track-1", name: "Canción", albumName: "Disco",
          albumImageUrl: "https://images.test/album.jpg", previewUrl: "https://preview.test/track.mp3",
          spotifyUrl: "https://open.spotify.com/track/track-1", durationMs: 61000 }],
      } });
    expect(get.mock.calls).toEqual([
      ["/spotify/artists/search", { params: { artistName: "Artista Uno" } }],
      ["/spotify/artists/artist-1/top-tracks"],
    ]);
  });

  it("reports an artist not found without requesting top tracks", async () => {
    get.mockResolvedValueOnce({ data: null });
    await expect(artistDetailsApi.findArtistDetails({ discName: "Missing", artistName: "Band" }))
      .resolves.toEqual({ status: "not-found" });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("keeps absent optional fields optional and normalizes a missing duration", async () => {
    get.mockResolvedValueOnce({ data: { spotifyId: "artist-1", name: "Banda" } })
      .mockResolvedValueOnce({ data: [{ id: "track-1", name: "Sin extras", durationMs: null }] });
    await expect(artistDetailsApi.findArtistDetails({ discName: "Disco", artistName: "Banda" }))
      .resolves.toEqual({ status: "found", details: {
        artist: { name: "Banda", genres: [], imageUrl: undefined, followers: undefined,
          popularity: undefined, spotifyUrl: undefined },
        topTracks: [{ id: "track-1", name: "Sin extras", albumName: undefined,
          albumImageUrl: undefined, previewUrl: undefined, spotifyUrl: undefined, durationMs: 0 }],
      } });
  });

  it("returns an empty top tracks list when the backend has no tracks", async () => {
    get.mockResolvedValueOnce({ data: { spotifyId: "artist-1", name: "Banda" } })
      .mockResolvedValueOnce({ data: [] });
    await expect(artistDetailsApi.findArtistDetails({ discName: "Disco", artistName: "Banda" }))
      .resolves.toEqual({ status: "found", details: {
        artist: { name: "Banda", imageUrl: undefined, genres: [], followers: undefined,
          popularity: undefined, spotifyUrl: undefined },
        topTracks: [],
      } });
  });

  it("maps backend errors to failed", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    get.mockRejectedValue(new Error("provider down"));
    await expect(artistDetailsApi.findArtistDetails({ discName: "Disco", artistName: "Banda" }))
      .resolves.toEqual({ status: "failed" });
    log.mockRestore();
  });
});

describe("ArtistDetail compatibility facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchDetails.mockResolvedValue({ status: "found", details: foundDetails });
    fetchBiography.mockResolvedValue({ bio: { summary: "Biografía Last.fm" }, tags: { tag: [{ name: "tag-rock" }] } });
  });

  function render() {
    return mount(ArtistDetail, { props: { discName: "Disco", artistName: "Banda" } });
  }

  it("keeps its props, close event, Spotify presentation and independent Last.fm section", async () => {
    const wrapper = render();
    expect(wrapper.text()).toContain("Buscando en Spotify...");
    await flushPromises();
    expect(fetchDetails).toHaveBeenCalledWith({ discName: "Disco", artistName: "Banda" });
    expect(fetchBiography).toHaveBeenCalledWith("Banda");
    expect(wrapper.text()).toContain("Banda de Spotify");
    expect(wrapper.text()).toContain("Popularidad 85/100");
    expect(wrapper.text()).toContain("Top canciones");
    expect(wrapper.text()).toContain("Biografía Last.fm");
    expect(wrapper.text()).toContain("tag-rock");
    expect(wrapper.find("audio").attributes("src")).toBe("https://preview.test/track.mp3");
    expect(wrapper.find('a[href="https://open.spotify.com/artist/artist-1"]').exists()).toBe(true);
    await wrapper.find("div.fixed").trigger("click");
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(2);
    wrapper.unmount();
  });

  it("shows Spotify content when the independent Last.fm request fails", async () => {
    fetchBiography.mockResolvedValue(null);
    const wrapper = render();
    await flushPromises();
    expect(wrapper.text()).toContain("Banda de Spotify");
    expect(wrapper.text()).toContain("Top canciones");
    expect(wrapper.text()).not.toContain("Biografía Last.fm");
    wrapper.unmount();
  });

  it.each([
    ["not-found", "No se encontró ningún álbum en Spotify con esos datos"],
    ["artist-not-found", "No se encontró un artista válido en el álbum"],
    ["failed", "Error al buscar el artista en Spotify"],
    ["token-unavailable", "No se pudo obtener el token de Spotify"],
  ] as const)("keeps the %s status message", async (status, message) => {
    fetchDetails.mockResolvedValue({ status });
    const wrapper = render();
    await flushPromises();
    expect(wrapper.text()).toContain(message);
    expect(wrapper.text()).not.toContain("Top canciones");
    wrapper.unmount();
  });
});
