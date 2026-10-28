// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resolveSpotifyAlbum, getSpotifyAlbumDetails } = vi.hoisted(() => ({
  resolveSpotifyAlbum: vi.fn(),
  getSpotifyAlbumDetails: vi.fn(),
}));

vi.mock("@services/spotify/spotifyLookup", () => ({ resolveSpotifyAlbum, getSpotifyAlbumDetails }));

import DiscDetail from "./DiscDetail.vue";

const disc = { id: "disc-1", name: "Disco de prueba", artist: { name: "Artista de prueba" } };

function keydown(target: HTMLElement, key: string, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe("DiscDetail", () => {
  let wrapper: ReturnType<typeof mount> | undefined;
  let opener: HTMLButtonElement;

  beforeEach(() => {
    resolveSpotifyAlbum.mockReset().mockResolvedValue(null);
    getSpotifyAlbumDetails.mockReset();
    document.body.style.overflow = "clip";
    opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    opener.remove();
    document.body.style.overflow = "";
  });

  it("names the modal, keeps theme surfaces, and focuses the accessible close control", async () => {
    wrapper = mount(DiscDetail, { props: { disc }, attachTo: document.body });
    await nextTick();

    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.attributes("aria-modal")).toBe("true");
    expect(dialog.attributes("aria-label")).toBe("Detalle del disco Disco de prueba");
    expect(dialog.classes()).toContain("bg-white");
    expect(dialog.classes()).toContain("dark:bg-rv-darkCard");
    expect(wrapper.get(".py-20 span").classes()).toContain("dark:text-gray-500");
    expect(wrapper.get("button").attributes("aria-label")).toBe("Cerrar detalle del disco");
    expect(wrapper.get("button").classes()).toContain("focus-visible:outline-2");
    expect(document.activeElement).toBe(wrapper.get("button").element);
    expect(document.body.style.overflow).toBe("hidden");
    await flushPromises();
    expect(wrapper.get(".py-16 p").classes()).toContain("dark:text-gray-400");
  });

  it("traps Tab in both directions and closes on Escape", async () => {
    resolveSpotifyAlbum.mockResolvedValueOnce({ spotifyId: "spotify-1" });
    getSpotifyAlbumDetails.mockResolvedValueOnce({
      name: "Disco de prueba",
      listenUrl: "https://open.spotify.com/album/spotify-1",
      coverUrl: null,
      artistNames: ["Artista de prueba"],
      releaseDate: "2020",
      totalTracks: 1,
      tracks: [{ id: "track-1", name: "Tema", number: 1, durationMs: 90000, previewUrl: null }],
    });
    wrapper = mount(DiscDetail, { props: { disc }, attachTo: document.body });
    await flushPromises();

    const closeButton = wrapper.get("button").element as HTMLButtonElement;
    const spotifyLink = wrapper.get('a[href="https://open.spotify.com/album/spotify-1"]')
      .element as HTMLAnchorElement;
    spotifyLink.focus();
    const tabAtEnd = keydown(spotifyLink, "Tab");
    expect(tabAtEnd.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(closeButton);

    closeButton.focus();
    const reverseTabAtStart = keydown(closeButton, "Tab", true);
    expect(reverseTabAtStart.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(spotifyLink);

    const escape = keydown(spotifyLink, "Escape");
    expect(escape.defaultPrevented).toBe(true);
    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(escape.cancelBubble).toBe(true);
  });

  it("restores body scrolling and focus after closing", async () => {
    wrapper = mount(DiscDetail, { props: { disc }, attachTo: document.body });
    await nextTick();

    wrapper.unmount();
    await nextTick();

    expect(document.body.style.overflow).toBe("clip");
    expect(document.activeElement).toBe(opener);
    await flushPromises();
  });
});
