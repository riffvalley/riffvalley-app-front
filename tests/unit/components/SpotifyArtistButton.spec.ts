// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findArtistLink, error } = vi.hoisted(() => ({ findArtistLink: vi.fn(), error: vi.fn() }));

vi.mock("@/integrations/spotify", () => ({ findArtistLink }));
vi.mock("@services/swal/SwalService", () => ({ default: { error } }));

import SpotifyArtistButton from "@components/SpotifyArtistButton.vue";

describe("SpotifyArtistButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("abre el enlace encontrado en una pestaña nueva", async () => {
    findArtistLink.mockResolvedValue("https://open.spotify.com/artist/123");
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const wrapper = mount(SpotifyArtistButton, { props: { artistName: "Nirvana" } });

    await wrapper.get("button").trigger("click");

    expect(findArtistLink).toHaveBeenCalledWith("Nirvana");
    expect(open).toHaveBeenCalledWith("https://open.spotify.com/artist/123", "_blank");
    expect(error).not.toHaveBeenCalled();
  });

  it("muestra el mensaje actual cuando no hay resultado", async () => {
    findArtistLink.mockResolvedValue(undefined);
    const wrapper = mount(SpotifyArtistButton, { props: { artistName: "Desconocido" } });

    await wrapper.get("button").trigger("click");

    expect(error).toHaveBeenCalledWith("No se pudo encontrar el enlace del artista en Spotify.");
  });

  it("muestra el mensaje actual cuando la operación falla", async () => {
    findArtistLink.mockRejectedValue(new Error("fallo"));
    const wrapper = mount(SpotifyArtistButton, { props: { artistName: "Nirvana" } });

    await wrapper.get("button").trigger("click");

    expect(error).toHaveBeenCalledWith("Ocurrió un error al intentar abrir el enlace.");
  });
});
