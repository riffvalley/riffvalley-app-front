// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import ArtistDetail from "../../src/components/ArtistDetail.vue";
import { artistDetailsApi } from "../../src/integrations/spotify/infrastructure/artistDetailsApi";

const { get, token, fetchDetails, fetchBiography } = vi.hoisted(() => ({
  get: vi.fn(), token: vi.fn(), fetchDetails: vi.fn(), fetchBiography: vi.fn(),
}));
vi.mock("axios", () => ({ default: { get } }));
vi.mock("@helpers/SpotifyFunctions.ts", () => ({ obtenerTokenSpotify: token }));
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
    token.mockResolvedValue("spotify-token");
  });

  it("searches by disc and artist, uses the first album and artist, then fetches US top tracks", async () => {
    get.mockResolvedValueOnce({ data: { albums: { items: [
      { artists: [{ id: "first-artist" }] }, { artists: [{ id: "ignored-artist" }] },
    ] } } }).mockResolvedValueOnce({ data: {
      name: "Banda", images: [{ url: "https://images.test/artist.jpg" }], genres: ["rock"],
      followers: { total: 1200 }, popularity: 85, external_urls: { spotify: "https://open.spotify.com/artist/first-artist" },
    } }).mockResolvedValueOnce({ data: { tracks: [{
      id: "track-1", name: "Canción", album: { name: "Disco", images: [{ url: "https://images.test/album.jpg" }] },
      preview_url: "https://preview.test/track.mp3", external_urls: { spotify: "https://open.spotify.com/track/track-1" }, duration_ms: 61000,
    }] } });

    await expect(artistDetailsApi.findArtistDetails({ discName: "Disco Uno", artistName: "Artista Uno" }))
      .resolves.toEqual({ status: "found", details: {
        artist: { name: "Banda", imageUrl: "https://images.test/artist.jpg", genres: ["rock"], followers: 1200,
          popularity: 85, spotifyUrl: "https://open.spotify.com/artist/first-artist" },
        topTracks: [{ id: "track-1", name: "Canción", albumName: "Disco",
          albumImageUrl: "https://images.test/album.jpg", previewUrl: "https://preview.test/track.mp3",
          spotifyUrl: "https://open.spotify.com/track/track-1", durationMs: 61000 }],
      } });
    expect(get.mock.calls.map(([url]) => url)).toEqual([
      `https://api.spotify.com/v1/search?q=${encodeURIComponent("album:Disco Uno artist:Artista Uno")}&type=album&limit=5`,
      "https://api.spotify.com/v1/artists/first-artist",
      "https://api.spotify.com/v1/artists/first-artist/top-tracks?market=US",
    ]);
    expect(get.mock.calls[0][1]).toEqual({ headers: { Authorization: "Bearer spotify-token" } });
  });

  it("reports an empty search and an album without artists without requesting artist details", async () => {
    get.mockResolvedValueOnce({ data: { albums: { items: [] } } });
    await expect(artistDetailsApi.findArtistDetails({ discName: "Missing", artistName: "Band" }))
      .resolves.toEqual({ status: "not-found" });
    get.mockResolvedValueOnce({ data: { albums: { items: [{ artists: [] }] } } });
    await expect(artistDetailsApi.findArtistDetails({ discName: "No artist", artistName: "Band" }))
      .resolves.toEqual({ status: "artist-not-found" });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("keeps optional Spotify fields optional and reports provider errors", async () => {
    get.mockResolvedValueOnce({ data: { albums: { items: [{ artists: [{ id: "artist-1" }] }] } } })
      .mockResolvedValueOnce({ data: { name: "Banda" } })
      .mockResolvedValueOnce({ data: { tracks: [{ id: "track-1", name: "Sin extras", duration_ms: 0 }] } });
    await expect(artistDetailsApi.findArtistDetails({ discName: "Disco", artistName: "Banda" }))
      .resolves.toEqual({ status: "found", details: {
        artist: { name: "Banda", genres: [], imageUrl: undefined, followers: undefined,
          popularity: undefined, spotifyUrl: undefined },
        topTracks: [{ id: "track-1", name: "Sin extras", albumName: undefined,
          albumImageUrl: undefined, previewUrl: undefined, spotifyUrl: undefined, durationMs: 0 }],
      } });

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
