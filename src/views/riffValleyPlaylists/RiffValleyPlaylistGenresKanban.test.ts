// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RiffValleyPlaylistGenresKanban from "./RiffValleyPlaylistGenresKanban.vue";
import {
  getRiffValleyPlaylistGenres,
  updateRiffValleyPlaylist,
  type RiffValleyPlaylist,
} from "@services/riff-valley-playlists/riffValleyPlaylists";
import { getRvUsers } from "@/modules/identity/users/api/users";
import SwalService from "@services/swal/SwalService";
import { getSpotifyConnection } from "@services/spotify/festivalPlaylists";
import { updateGenrePlaylist } from "@services/spotify/genrePlaylists";
import type { SyncedGenrePlaylist } from "@services/spotify/genrePlaylists";

const serviceMocks = vi.hoisted(() => ({
  getGenres: vi.fn(),
  updateLocal: vi.fn(),
  removePlaylist: vi.fn(),
  createContent: vi.fn(),
  getUsers: vi.fn(),
  connectSpotify: vi.fn(),
  getConnection: vi.fn(),
  createGenre: vi.fn(),
  createLinkedGenre: vi.fn(),
  linkExistingGenre: vi.fn(),
  updateSyncedGenre: vi.fn(),
  swalError: vi.fn(),
  swalSuccess: vi.fn(),
  swalConfirm: vi.fn(),
}));

vi.mock("@services/riff-valley-playlists/riffValleyPlaylists", () => ({
  getRiffValleyPlaylistGenres: serviceMocks.getGenres,
  updateRiffValleyPlaylist: serviceMocks.updateLocal,
  removeRiffValleyPlaylist: serviceMocks.removePlaylist,
  createRiffValleyPlaylistContent: serviceMocks.createContent,
  toISO: (date: Date) => date.toISOString(),
}));
vi.mock("@/modules/identity/users/api/users", () => ({ getRvUsers: serviceMocks.getUsers }));
vi.mock("@services/swal/SwalService", () => ({
  default: {
    error: serviceMocks.swalError,
    success: serviceMocks.swalSuccess,
    confirm: serviceMocks.swalConfirm,
  },
}));
vi.mock("@services/spotify/festivalPlaylists", () => ({
  connectSpotify: serviceMocks.connectSpotify,
  getSpotifyConnection: serviceMocks.getConnection,
}));
vi.mock("@services/spotify/genrePlaylists", () => ({
  createGenrePlaylist: serviceMocks.createGenre,
  createLinkedGenrePlaylist: serviceMocks.createLinkedGenre,
  linkExistingGenrePlaylist: serviceMocks.linkExistingGenre,
  updateGenrePlaylist: serviceMocks.updateSyncedGenre,
}));
vi.mock("@/modules/identity/auth/stores/auth", () => ({
  useAuthStore: () => ({
    userId: "user-1",
    username: "Editor",
    image: undefined,
  }),
}));

const linkedPlaylist = (
  overrides: Partial<RiffValleyPlaylist> = {},
): RiffValleyPlaylist => ({
  id: "playlist-1",
  name: "Nombre actual",
  status: "in_progress",
  link: "https://open.spotify.com/playlist/spotify-1",
  spotifyPlaylistId: "spotify-1",
  type: "genero",
  updateDate: "2026-10-20T00:00:00.000Z",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  content: null,
  ...overrides,
});

const syncedPlaylist = (
  overrides: Partial<SyncedGenrePlaylist> = {},
): SyncedGenrePlaylist => ({
  id: "playlist-1",
  name: "Nombre actualizado",
  description: null,
  status: "in_progress",
  link: "https://open.spotify.com/playlist/spotify-1",
  spotifyPlaylistId: "spotify-1",
  imageUrl: null,
  isPublic: true,
  type: "genero",
  updateDate: "2026-10-20T00:00:00.000Z",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-20T00:00:00.000Z",
  playlistArtists: [],
  ...overrides,
});

function mountBoard() {
  return mount(RiffValleyPlaylistGenresKanban, {
    global: { stubs: { GenrePlaylistManager: true } },
  });
}

async function openEditorialKanban() {
  const wrapper = mountBoard();
  await flushPromises();
  await wrapper
    .findAll('nav[aria-label="Secciones de géneros"] button')[1]
    .trigger("click");
  await wrapper
    .find('button[title="Editar campos editoriales"]')
    .trigger("click");
  return wrapper;
}

describe("RiffValleyPlaylistGenresKanban linked playlist editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRiffValleyPlaylistGenres).mockResolvedValue([
      linkedPlaylist(),
    ]);
    vi.mocked(getRvUsers).mockResolvedValue([]);
    vi.mocked(getSpotifyConnection).mockResolvedValue({
      connected: true,
      spotifyUserId: "riff-valley",
      displayName: "Riff Valley",
      canUploadImages: false,
      missingScopes: [],
      authorizationStatus: "connected",
      reauthorizationRequired: false,
      reauthorizationReason: null,
      authorizedAt: null,
      refreshTokenExpiresAt: null,
      daysUntilReauthorization: null,
    });
    vi.mocked(updateGenrePlaylist).mockResolvedValue(syncedPlaylist());
    vi.mocked(updateRiffValleyPlaylist).mockImplementation(async (id, dto) =>
      linkedPlaylist({ id, ...dto }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renames a linked playlist through the synchronized API and keeps its Spotify link read-only", async () => {
    const wrapper = await openEditorialKanban();
    const modal = wrapper.find(".fixed.inset-0");

    expect(
      modal.find('input[type="url"]').element.hasAttribute("readonly"),
    ).toBe(true);
    expect(
      modal.find<HTMLInputElement>('input[type="url"]').element.value,
    ).toBe("https://open.spotify.com/playlist/spotify-1");

    await modal.find('input[type="text"]').setValue("Nombre actualizado");
    const saveButton = modal
      .findAll("button")
      .find((button) => button.text().trim() === "Guardar");
    if (!saveButton) throw new Error("No se encontró el botón Guardar");
    await saveButton.trigger("click");
    await flushPromises();

    expect(updateGenrePlaylist).toHaveBeenCalledWith("playlist-1", {
      name: "Nombre actualizado",
    });
    expect(updateRiffValleyPlaylist).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Nombre actualizado");
    expect(SwalService.success).toHaveBeenCalledWith("Género actualizado");
    wrapper.unmount();
  });

  it("keeps unlinked playlist name, link and date in the local editorial PATCH", async () => {
    vi.mocked(getRiffValleyPlaylistGenres).mockResolvedValue([
      linkedPlaylist({ spotifyPlaylistId: null, name: "Nombre antiguo" }),
    ]);
    vi.mocked(updateRiffValleyPlaylist).mockResolvedValue(
      linkedPlaylist({
        spotifyPlaylistId: null,
        name: "Nombre local",
        link: "https://open.spotify.com/playlist/local-2",
        updateDate: "2026-10-15T00:00:00.000Z",
      }),
    );

    const wrapper = await openEditorialKanban();
    const modal = wrapper.find(".fixed.inset-0");

    expect(
      modal.find('input[type="url"]').element.hasAttribute("readonly"),
    ).toBe(false);
    await modal.find('input[type="text"]').setValue("Nombre local");
    await modal
      .find('input[type="url"]')
      .setValue("https://open.spotify.com/playlist/local-2");
    await modal.find('input[type="date"]').setValue("2026-10-15");
    const saveButton = modal
      .findAll("button")
      .find((button) => button.text().trim() === "Guardar");
    if (!saveButton) throw new Error("No se encontró el botón Guardar");
    await saveButton.trigger("click");
    await flushPromises();

    expect(updateRiffValleyPlaylist).toHaveBeenCalledWith("playlist-1", {
      name: "Nombre local",
      link: "https://open.spotify.com/playlist/local-2",
      updateDate: new Date("2026-10-15").toISOString(),
    });
    expect(updateGenrePlaylist).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("keeps a linked editorial date local without invoking Spotify", async () => {
    const wrapper = await openEditorialKanban();
    const modal = wrapper.find(".fixed.inset-0");

    await modal.find('input[type="date"]').setValue("2026-10-15");
    const saveButton = modal
      .findAll("button")
      .find((button) => button.text().trim() === "Guardar");
    if (!saveButton) throw new Error("No se encontró el botón Guardar");
    await saveButton.trigger("click");
    await flushPromises();

    expect(updateRiffValleyPlaylist).toHaveBeenCalledWith("playlist-1", {
      updateDate: new Date("2026-10-15").toISOString(),
    });
    expect(updateGenrePlaylist).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("retries a linked rename after the editorial date write fails without showing premature success", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.mocked(updateRiffValleyPlaylist)
      .mockRejectedValueOnce(new Error("PostgreSQL unavailable"))
      .mockResolvedValueOnce(
        linkedPlaylist({
          name: "Nombre actualizado",
          updateDate: "2026-10-15T00:00:00.000Z",
        }),
      );
    const wrapper = await openEditorialKanban();
    const modal = wrapper.find(".fixed.inset-0");
    await modal.find('input[type="text"]').setValue("Nombre actualizado");
    await modal.find('input[type="date"]').setValue("2026-10-15");
    const saveButton = modal
      .findAll("button")
      .find((button) => button.text().trim() === "Guardar");
    if (!saveButton) throw new Error("No se encontró el botón Guardar");

    await saveButton.trigger("click");
    await flushPromises();

    expect(updateGenrePlaylist).toHaveBeenNthCalledWith(1, "playlist-1", {
      name: "Nombre actualizado",
    });
    expect(updateRiffValleyPlaylist).toHaveBeenNthCalledWith(1, "playlist-1", {
      updateDate: new Date("2026-10-15").toISOString(),
    });
    expect(SwalService.error).toHaveBeenCalledWith("Error guardando género");
    expect(SwalService.success).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Nombre actual");
    expect(wrapper.find(".fixed.inset-0").exists()).toBe(true);

    const retryButton = wrapper
      .findAll(".fixed.inset-0 button")
      .find((button) => button.text().trim() === "Guardar");
    if (!retryButton)
      throw new Error("No se encontró el botón Guardar para reintentar");
    await retryButton.trigger("click");
    await flushPromises();

    expect(updateGenrePlaylist).toHaveBeenNthCalledWith(2, "playlist-1", {
      name: "Nombre actualizado",
    });
    expect(updateRiffValleyPlaylist).toHaveBeenCalledTimes(2);
    expect(SwalService.success).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Nombre actualizado");
    expect(consoleError).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("shows an error and does not confirm a failed Spotify rename", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.mocked(updateGenrePlaylist).mockRejectedValue(
      new Error("Spotify no disponible"),
    );
    const wrapper = await openEditorialKanban();
    const modal = wrapper.find(".fixed.inset-0");

    await modal.find('input[type="text"]').setValue("No guardado");
    const saveButton = modal
      .findAll("button")
      .find((button) => button.text().trim() === "Guardar");
    if (!saveButton) throw new Error("No se encontró el botón Guardar");
    await saveButton.trigger("click");
    await flushPromises();

    expect(SwalService.error).toHaveBeenCalledWith("Error guardando género");
    expect(SwalService.success).not.toHaveBeenCalled();
    expect(updateRiffValleyPlaylist).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Nombre actual");
    expect(wrapper.find(".fixed.inset-0").exists()).toBe(true);
    expect(consoleError).toHaveBeenCalled();
    wrapper.unmount();
  });
});
