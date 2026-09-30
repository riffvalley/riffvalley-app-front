// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount as mountComponent, flushPromises } from "@vue/test-utils";
import DiscDetail from "../../src/components/DiscDetail.vue";

const { get, token } = vi.hoisted(() => ({ get: vi.fn(), token: vi.fn() }));
vi.mock("axios", () => ({ default: { get } }));
vi.mock("@helpers/SpotifyFunctions.ts", () => ({ obtenerTokenSpotify: token }));

async function settle() { await flushPromises(); }
function mount() {
  const wrapper = mountComponent(DiscDetail, {
    props: { disc: { name: "Álbum & Uno", artist: { name: "Banda" } } },
  });
  return { wrapper };
}

const album = {
  name: "Álbum", artists: [{ name: "Banda" }, { name: "Invitado" }],
  images: [{ url: "https://cover.test/image" }], release_date: "2026-09-30",
  total_tracks: 2, external_urls: { spotify: "https://open.spotify.com/album/1" },
  tracks: { items: [
    { id: "1", name: "Primera", track_number: 1, duration_ms: 61000, preview_url: "https://preview.test/1" },
    { id: "2", name: "Segunda", track_number: 2, duration_ms: 3600000, preview_url: null },
  ] },
};

describe("disc detail legacy contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockReset();
    token.mockResolvedValue("token");
  });

  it("loads the first Spotify match and keeps text, track order, previews and links", async () => {
    get.mockResolvedValueOnce({ data: { albums: { items: [{ id: "1" }, { id: "ignored" }] } } })
      .mockResolvedValueOnce({ data: album });
    const { wrapper } = mount();
    expect(wrapper.text()).toContain("Buscando en Spotify...");
    await settle();
    expect(get).toHaveBeenNthCalledWith(1,
      `https://api.spotify.com/v1/search?q=${encodeURIComponent("album:Álbum & Uno artist:Banda")}&type=album&limit=1`,
      { headers: { Authorization: "Bearer token" } });
    expect(get).toHaveBeenNthCalledWith(2, "https://api.spotify.com/v1/albums/1",
      { headers: { Authorization: "Bearer token" } });
    expect(wrapper.text()).toContain("Banda, Invitado");
    expect(wrapper.text()).toContain("2026-09-30");
    expect(wrapper.text()).toContain("2 canciones");
    expect(wrapper.text()).toContain("1h 1m 1s");
    expect(wrapper.text()).toContain("1:01");
    expect(wrapper.findAll("li").map((el) => el.text()))
      .toEqual([expect.stringContaining("Primera"), expect.stringContaining("Segunda")]);
    expect(wrapper.find("audio").attributes("src")).toBe("https://preview.test/1");
    expect(wrapper.findAll("a").map((el) => el.attributes("href")))
      .toEqual(["https://cover.test/image", "https://open.spotify.com/album/1"]);
    wrapper.unmount();
  });

  it.each([
    ["token", "No se pudo obtener el token de Spotify"],
    ["empty", "Álbum no encontrado en Spotify"],
    ["network", "Error al buscar el álbum en Spotify"],
  ])("keeps the %s error and lets users close the overlay or button", async (failure, message) => {
    if (failure === "token") token.mockResolvedValue(undefined);
    if (failure === "empty") get.mockResolvedValue({ data: { albums: { items: [] } } });
    if (failure === "network") get.mockRejectedValue(new Error("offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { wrapper } = mount();
    await settle();
    expect(wrapper.text()).toContain(message);
    expect(wrapper.text()).not.toContain("Buscando en Spotify...");
    await wrapper.find("div.fixed").trigger("click");
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(2);
    if (failure === "token") expect(get).not.toHaveBeenCalled();
    if (failure === "empty") expect(get).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    log.mockRestore();
  });

  it("keeps albums without images, external links or previews usable, and searches again on reopen", async () => {
    get.mockImplementation(async (url: string) => ({ data: url.includes("/search?")
      ? { albums: { items: [{ id: "1" }] } }
      : { ...album, images: undefined, external_urls: undefined,
        tracks: { items: [{ ...album.tracks.items[0], preview_url: null }] } },
    }));
    const first = mount().wrapper;
    await settle();
    expect(first.text()).toContain("Primera");
    expect(first.findAll("a")).toHaveLength(0);
    expect(first.findAll("audio")).toHaveLength(0);
    // Clicking content must not emit the overlay's close event.
    await first.find("h2").trigger("click");
    expect(first.emitted("close")).toBeUndefined();
    first.unmount();
    const second = mount().wrapper;
    await settle();
    expect(token).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledTimes(4);
    second.unmount();
  });

  it("translates album detail HTTP errors rather than exposing provider payloads", async () => {
    get.mockResolvedValueOnce({ data: { albums: { items: [{ id: "1" }] } } })
      .mockRejectedValueOnce({ response: { status: 429, data: { error: "provider message" } } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { wrapper } = mount();
    await settle();
    expect(wrapper.text()).toContain("Error al buscar el álbum en Spotify");
    expect(wrapper.text()).not.toContain("provider message");
    wrapper.unmount();
    log.mockRestore();
  });
});
