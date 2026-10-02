// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import type { AlbumEntry, ManualImportResponse } from "@/services/imports/imports";
import ImportPage from "@/views/importPage/ImportPage.vue";

const { get, fetchManualData, updateDisc, fetchCatalog, success, error } = vi.hoisted(() => ({
  get: vi.fn(),
  fetchManualData: vi.fn(),
  updateDisc: vi.fn(),
  fetchCatalog: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/shared/infrastructure/http/client", () => ({ default: { get } }));
vi.mock("@services/imports/imports", () => ({ fetchManualData }));
vi.mock("@services/discs/discs", () => ({ updateDisc }));
vi.mock("@/app/dependencies/catalog", () => ({ fetchCatalog }));
vi.mock("@/modules/catalog", () => ({ useCatalogStore: () => ({ genres: [], countries: [] }) }));
vi.mock("@services/swal/SwalService", () => ({ default: { success, error } }));

interface ImportPageTestInstance {
  selectedDate: string;
  albums: AlbumEntry[];
  responseData: ManualImportResponse | null;
  spotifyFound: Record<string, boolean>;
  processData(): Promise<void>;
  buscarEnlacesSpotify(): Promise<void>;
}

describe("ImportPage album link resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateDisc.mockResolvedValue(undefined);
  });

  it("updates found albums with link and image while not-found and failed albums do not stop the batch", async () => {
    fetchManualData.mockResolvedValueOnce({
      message: "Importación completada",
      data: {
        savedDiscs: [
          { discId: "disc-1", artistId: "artist-1", message: 'Artist "Nirvana" => Disc "Nevermind"' },
          { discId: "disc-2", artistId: "artist-2", message: 'Artist "Nirvana" => Disc "Missing"' },
          { discId: "disc-3", artistId: "artist-3", message: 'Artist "Soundgarden" => Disc "Badmotorfinger"' },
          { discId: "disc-4", artistId: "artist-4", message: 'Artist "Pearl Jam" => Disc "Ten"' },
        ],
        existingDiscs: [],
      },
    });
    get.mockResolvedValueOnce({ data: {
      listenUrl: "https://open.spotify.com/album/nevermind",
      coverUrl: "https://images.test/nevermind.jpg",
    } })
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockRejectedValueOnce({ response: { status: 502 } })
      .mockResolvedValueOnce({ data: {
        listenUrl: "https://open.spotify.com/album/ten",
        coverUrl: "https://images.test/ten.jpg",
      } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = mount(ImportPage, { global: { stubs: { SearchableSelect: true } } });
    const vm = wrapper.vm as unknown as ImportPageTestInstance;
    vm.selectedDate = "1991-09-24";
    vm.albums = [{ line: "Nirvana – Nevermind" }];

    await vm.processData();
    expect(fetchManualData).toHaveBeenCalledWith("September 24, 1991", [{ line: "Nirvana – Nevermind" }]);

    await vm.buscarEnlacesSpotify();

    expect(get).toHaveBeenCalledTimes(4);
    expect(get).toHaveBeenNthCalledWith(1, "/discs/spotify/album", {
      params: { albumName: "Nevermind", artistName: "Nirvana" },
    });
    expect(updateDisc).toHaveBeenNthCalledWith(1, "disc-1", {
      link: "https://open.spotify.com/album/nevermind",
      image: "https://images.test/nevermind.jpg",
      verified: true,
    });
    expect(updateDisc).toHaveBeenNthCalledWith(2, "disc-4", {
      link: "https://open.spotify.com/album/ten",
      image: "https://images.test/ten.jpg",
      verified: true,
    });
    expect(updateDisc).toHaveBeenCalledTimes(2);
    expect(vm.spotifyFound).toEqual({
      "disc-1": true,
      "disc-2": false,
      "disc-3": false,
      "disc-4": true,
    });
    expect(success).toHaveBeenCalledWith("2 de 4 discos actualizados con datos de Spotify");
    await flushPromises();
    wrapper.unmount();
    log.mockRestore();
  });
});
