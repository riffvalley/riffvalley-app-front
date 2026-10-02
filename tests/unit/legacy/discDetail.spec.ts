// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount as mountComponent, flushPromises } from "@vue/test-utils";
import DiscDetail from "../../../src/components/DiscDetail.vue";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { get } }));

async function settle() { await flushPromises(); }
function mount() {
  const wrapper = mountComponent(DiscDetail, {
    props: { disc: { name: "Álbum & Uno", artist: { name: "Banda" } } },
  });
  return { wrapper };
}

const album = {
  name: "Álbum", artistNames: ["Banda", "Invitado"],
  coverUrl: "https://cover.test/image", releaseDate: "2026-09-30",
  totalTracks: 2, listenUrl: "https://open.spotify.com/album/1",
  tracks: [
    { id: "1", name: "Primera", number: 1, durationMs: 61000, previewUrl: "https://preview.test/1" },
    { id: "2", name: "Segunda", number: 2, durationMs: 3600000, previewUrl: null },
  ],
};

describe("disc detail legacy contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockReset();
  });

  it("loads the resolved album and keeps text, track order, previews and links", async () => {
    get.mockResolvedValueOnce({ data: { spotifyId: "1" } })
      .mockResolvedValueOnce({ data: album });
    const { wrapper } = mount();
    expect(wrapper.text()).toContain("Buscando en Spotify...");
    await settle();
    expect(get).toHaveBeenNthCalledWith(1, "/discs/spotify/album", {
      params: { albumName: "Álbum & Uno", artistName: "Banda" },
    });
    expect(get).toHaveBeenNthCalledWith(2, "/discs/spotify/album/1");
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
    ["not-found", "Álbum no encontrado en Spotify"],
    ["backend error", "Error al buscar el álbum en Spotify"],
  ])("keeps the %s message and lets users close the overlay or button", async (failure, message) => {
    if (failure === "not-found") get.mockRejectedValue({ response: { status: 404 } });
    if (failure === "backend error") get.mockRejectedValue(new Error("offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { wrapper } = mount();
    await settle();
    expect(wrapper.text()).toContain(message);
    expect(wrapper.text()).not.toContain("Buscando en Spotify...");
    await wrapper.find("div.fixed").trigger("click");
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(2);
    if (failure === "not-found") expect(get).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    log.mockRestore();
  });

  it("keeps albums without images, external links or previews usable, and searches again on reopen", async () => {
    get.mockImplementation(async (url: string) => ({ data: url.endsWith("/album")
      ? { spotifyId: "1" }
      : { ...album, coverUrl: undefined, listenUrl: undefined,
        tracks: [{ ...album.tracks[0], previewUrl: null }] },
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
    expect(get).toHaveBeenCalledTimes(4);
    second.unmount();
  });

  it("translates album detail HTTP errors rather than exposing provider payloads", async () => {
    get.mockResolvedValueOnce({ data: { spotifyId: "1" } })
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
