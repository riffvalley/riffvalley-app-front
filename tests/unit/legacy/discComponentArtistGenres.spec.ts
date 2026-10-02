// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

const { fire, fetchArtistProfile, updateDisc } = vi.hoisted(() => ({
  fire: vi.fn(), fetchArtistProfile: vi.fn(), updateDisc: vi.fn(),
}));
vi.mock("sweetalert2", () => ({ default: { fire } }));
vi.mock("@services/discs/discs", () => ({ updateDisc, deleteDisc: vi.fn() }));
vi.mock("@services/national-releases/nationalReleases", () => ({ createNationalReleaseFromDisc: vi.fn() }));
vi.mock("@services/artist/artist", () => ({ updateArtist: vi.fn(), postArtist: vi.fn() }));
vi.mock("@services/swal/SwalService", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import DiscComponent from "../../../src/views/discsCalendar/components/DiscComponent.vue";

const disc = () => ({
  id: "disc-1", name: "Disco", releaseDate: "2025-01-01", artist: { id: "artist-1", name: "Banda" },
  genreId: "genre-1", link: null, image: null, ep: false, debut: false, verified: false, pinned: false,
  nationalReleaseId: null,
});

function render() {
  return mount(DiscComponent, {
    props: {
      disc: disc() as never,
      genres: [], countries: [], fetchArtistProfile,
      pendingUserId: "user-1", pendingState: { pendingId: null, loaded: true }, pendingSubmitting: false,
      initializePending: vi.fn(), togglePending: vi.fn(),
    },
    global: { stubs: { SearchableSelect: true, EditModal: true, DiscDetail: true, ArtistDetail: true, SpotifyArtistButton: true } },
  });
}

describe("DiscComponent artist genre lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("copies found genres onto the disc and keeps the success notice", async () => {
    fetchArtistProfile.mockResolvedValue({ status: "found", profile: { genres: ["rock", "post-punk"] } });
    const wrapper = render();
    const target = wrapper.props("disc") as ReturnType<typeof disc> & { genero?: string };

    await wrapper.vm.buscarGeneroSpotify(target as never);

    expect(fetchArtistProfile).toHaveBeenCalledWith("Banda");
    expect(target.genero).toBe("rock, post-punk");
    expect(fire).toHaveBeenCalledWith(expect.objectContaining({
      title: "¡Éxito!", text: "El género del último track: rock, post-punk", icon: "success",
    }));
    wrapper.unmount();
  });

  it("keeps the no-genres notice for an empty profile", async () => {
    fetchArtistProfile.mockResolvedValue({ status: "found", profile: { genres: [] } });
    const wrapper = render();
    await wrapper.vm.buscarGeneroSpotify(wrapper.props("disc") as never);
    expect(fire).toHaveBeenCalledWith(expect.objectContaining({ title: "Sin géneros", icon: "warning" }));
    wrapper.unmount();
  });

  it("keeps the not-found notice when the backend has no artist", async () => {
    fetchArtistProfile.mockResolvedValue({ status: "not-found" });
    const wrapper = render();
    await wrapper.vm.buscarGeneroSpotify(wrapper.props("disc") as never);
    expect(fire).toHaveBeenCalledWith(expect.objectContaining({ title: "Artista no encontrado", icon: "warning" }));
    wrapper.unmount();
  });

  it("keeps the error notice when the backend request fails", async () => {
    fetchArtistProfile.mockResolvedValue({ status: "failed" });
    const wrapper = render();
    await wrapper.vm.buscarGeneroSpotify(wrapper.props("disc") as never);
    expect(fire).toHaveBeenCalledWith(expect.objectContaining({
      title: "Error", text: "Ocurrió un error al buscar el género del último track.", icon: "error",
    }));
    wrapper.unmount();
  });
});
